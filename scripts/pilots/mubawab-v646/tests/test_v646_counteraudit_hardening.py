"""Counteraudit P1: cross-cycle source cores, early shard screening, SQL rollback.
SYNTHETIC ONLY: no browser, network access or production DB.
"""
from __future__ import annotations

import asyncio
from pathlib import Path
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

import akarfinder_scraper as s
import benchmark_evidence as ev
from test_parser_evidence import card


def listing_page(partial: str | None = None) -> str:
    items = [card(9800000 + k, district="Agdal, Rabat") for k in range(10)]
    if partial == "price":
        items.append(card(9800010, district="Agdal, Rabat", price="Montant non précisé"))
    elif partial == "surface":
        items.append(card(9800010, district="Agdal, Rabat", surface="Surface non précisée"))
    else:
        items.append(card(9800010, district="Agdal, Rabat"))
    return "<html><body>" + "".join(items) + "</body></html>"


class P1CounterauditEndToEnd(unittest.TestCase):
    def run_offline_pipeline(self, html: str, *, fail_after_import: bool = False) -> int:
        async def gather(urls, *, engine, headed, browser_path, diagnostics):
            assert urls == [s.BASE_URL]
            diagnostics.append({"http_code": 200, "final_status": "ok"})
            return [s.FetchResult(s.BASE_URL, "ok", html=html, code=200, attempts=1)]
        def after_import(*args, **kwargs):
            raise RuntimeError("COUNTERAUDIT synthetic failure after import_listings")
        with (
            patch.object(s, "approved_shard_baseline", return_value=10),
            patch.object(s, "fetch_and_check_robots", return_value={"status": "checked"}),
            patch.object(s, "gather_results", side_effect=gather),
        ):
            if fail_after_import:
                with patch.object(s, "persist_price_reviews", side_effect=after_import):
                    return asyncio.run(s.main(engine="http"))
            return asyncio.run(s.main(engine="http"))

    def test_two_accepted_full_cycles_never_certify_composite_core(self):
        with tempfile.TemporaryDirectory() as tmp:
            cwd = os.getcwd()
            try:
                os.chdir(tmp)
                self.assertEqual(self.run_offline_pipeline(listing_page("price")), 0)
                self.assertEqual(self.run_offline_pipeline(listing_page("surface")), 0)
                conn = sqlite3.connect("akarfinder.db")
                conn.row_factory = sqlite3.Row
                try:
                    stored = dict(conn.execute("SELECT * FROM listings WHERE id='9800010'").fetchone())
                    self.assertIsNotNone(stored["price_mad"])
                    self.assertIsNotNone(stored["surface_m2"])
                    counts = ev.evaluate([dict(x) for x in conn.execute("SELECT * FROM listings")])
                    self.assertEqual(counts["complete_core_with_district"], 10)
                    self.assertEqual(counts["historically_enriched_core_with_district_not_a_source_observation"], 1)
                    self.assertEqual(counts["source_core_ids_without_observation_proof"], 0)
                finally:
                    conn.close()
            finally:
                os.chdir(cwd)

    def test_legacy_sqlite_without_source_provenance_is_not_certified(self):
        db = s.init_db(":memory:")
        try:
            db.execute("""INSERT INTO listings (id,title,price_mad,surface_m2,
                       district,location,link) VALUES (?,?,?,?,?,?,?)""",
                       ("9800999", "Appartement", 1200000, 100, "Agdal", "Rabat",
                        "https://www.mubawab.ma/fr/a/9800999/appartement"))
            counts = ev.evaluate([dict(r) for r in db.execute("SELECT * FROM listings")])
            self.assertEqual(counts["complete_core_with_district"], 0)
            self.assertEqual(counts["source_core_ids_without_observation_proof"], 1)
        finally:
            db.close()

    def test_rollback_preserves_existing_row_when_rerun_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            cwd = os.getcwd()
            try:
                os.chdir(tmp)
                self.assertEqual(self.run_offline_pipeline(listing_page()), 0)
                changed = listing_page().replace("1 200 000 DH", "1 300 000 DH")
                self.assertEqual(self.run_offline_pipeline(changed, fail_after_import=True), 4)
                db = sqlite3.connect("akarfinder.db")
                try:
                    self.assertEqual(db.execute("SELECT price_mad FROM listings WHERE id='9800000'").fetchone()[0], 1200000)
                    self.assertEqual(db.execute("SELECT COUNT(*) FROM field_change_log").fetchone()[0], 0)
                finally:
                    db.close()
            finally:
                os.chdir(cwd)

    def test_publish_failure_is_distinct_from_precommit_failure(self):
        # SQLite and the filesystem cannot commit together. A failure to
        # publish after DB commit must return code 5 rather than false code 4.
        with tempfile.TemporaryDirectory() as tmp:
            cwd = os.getcwd()
            try:
                os.chdir(tmp)
                real_replace = os.replace

                def fail_final_publish(src, dst):
                    if str(dst) == "akarfinder_data.json":
                        raise OSError("synthetic disk full after database commit")
                    return real_replace(src, dst)

                async def gather(urls, *, engine, headed, browser_path, diagnostics):
                    diagnostics.append({"http_code": 200, "final_status": "ok"})
                    return [s.FetchResult(s.BASE_URL, "ok", html=listing_page(), code=200)]
                with (
                    patch.object(s, "approved_shard_baseline", return_value=10),
                    patch.object(s, "fetch_and_check_robots", return_value={"status": "checked"}),
                    patch.object(s, "gather_results", side_effect=gather),
                    patch.object(s.os, "replace", side_effect=fail_final_publish),
                ):
                    self.assertEqual(asyncio.run(s.main(engine="http")), 5)
                db = sqlite3.connect("akarfinder.db")
                try:
                    self.assertEqual(db.execute("SELECT COUNT(*) FROM listings").fetchone()[0], 11)
                finally:
                    db.close()
            finally:
                os.chdir(cwd)

    def test_unlinked_non_numeric_villa_wrong_city_is_not_silently_ignored(self):
        hidden = ('<article class="listingBox">'
                  '<h2 class="listingTit">Villa à vendre Casablanca</h2>'
                  '<div class="listingH3">Maârif, Casablanca</div>'
                  '</article>')
        html = "<html><body>" + "".join(
            card(9810000 + i, district="Agdal, Rabat") for i in range(10)
        ) + hidden + "</body></html>"
        audit = s.parse_listings_audited(html, expected_city="Rabat", require_apartment=True,
                                       require_locality=True, baseline_eligible_cards=10)
        self.assertEqual(len(audit.listings), 10)
        self.assertFalse(audit.passes_quality)
        self.assertEqual(audit.shard_context_violations, 1)
        self.assertIn("shard_city_mismatch", audit.rejected)
        with tempfile.TemporaryDirectory() as tmp:
            cwd = os.getcwd()
            try:
                os.chdir(tmp)
                self.assertEqual(self.run_offline_pipeline(html), 2)
                self.assertFalse(Path("akarfinder.db").exists())
            finally:
                os.chdir(cwd)

    def test_exception_after_import_rolls_back_sqlite_rows_and_history(self):
        with tempfile.TemporaryDirectory() as tmp:
            cwd = os.getcwd()
            try:
                os.chdir(tmp)
                self.assertEqual(self.run_offline_pipeline(listing_page(), fail_after_import=True), 4)
                conn = sqlite3.connect("akarfinder.db")
                try:
                    self.assertEqual(conn.execute("SELECT COUNT(*) FROM listings").fetchone()[0], 0)
                    self.assertEqual(conn.execute("SELECT COUNT(*) FROM field_change_log").fetchone()[0], 0)
                finally:
                    conn.close()
            finally:
                os.chdir(cwd)

    def test_export_failure_rolls_back_sqlite_rows(self):
        with tempfile.TemporaryDirectory() as tmp:
            cwd = os.getcwd()
            try:
                os.chdir(tmp)
                async def gather(urls, *, engine, headed, browser_path, diagnostics):
                    diagnostics.append({"http_code": 200, "final_status": "ok"})
                    return [s.FetchResult(s.BASE_URL, "ok", html=listing_page(), code=200)]
                with (
                    patch.object(s, "approved_shard_baseline", return_value=10),
                    patch.object(s, "fetch_and_check_robots", return_value={"status": "checked"}),
                    patch.object(s, "gather_results", side_effect=gather),
                    patch.object(s, "export_reports", side_effect=RuntimeError("synthetic report fault")),
                ):
                    self.assertEqual(asyncio.run(s.main(engine="http")), 4)
                conn = sqlite3.connect("akarfinder.db")
                try:
                    self.assertEqual(conn.execute("SELECT COUNT(*) FROM listings").fetchone()[0], 0)
                finally:
                    conn.close()
            finally:
                os.chdir(cwd)


if __name__ == "__main__":
    unittest.main()
