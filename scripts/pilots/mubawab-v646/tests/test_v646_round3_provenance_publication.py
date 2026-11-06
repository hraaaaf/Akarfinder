"""Adversarial regression for independent V646 round-3 review.
All fixtures synthetic, SQLite in temp directory; zero real HTTP/Chromium/cloud.
"""
from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

import akarfinder_scraper as s
import benchmark_evidence as ev
from test_parser_evidence import card


def page(n: int = 10) -> str:
    return "<html><body>" + "".join(
        card(9950000 + k, district="Agdal, Rabat") for k in range(n)
    ) + "</body></html>"


class Round3P1(unittest.TestCase):
    def test_legacy_sqlite_without_provenance_column_is_not_source_complete(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "old.sqlite"
            with sqlite3.connect(db_path) as conn:
                conn.execute("""CREATE TABLE listings (
                    id TEXT PRIMARY KEY, title TEXT, price_mad INTEGER,
                    surface_m2 REAL, district TEXT, location TEXT, link TEXT)""")
                conn.execute("INSERT INTO listings VALUES (?,?,?,?,?,?,?)", (
                    "9950999", "Appartement", 1200000, 100, "Agdal", "Rabat",
                    "https://www.mubawab.ma/fr/a/9950999/appartement"))
            report = ev.inspect_sqlite(db_path, expected_rows=1)
            counts = report["counts"]
            self.assertEqual(counts["complete_core_with_district"], 0)
            self.assertEqual(counts["source_core_ids_without_observation_proof"], 1)
            self.assertEqual(counts["fields_present_among_unique_ids"]["title"], 1)

    def test_legacy_sqlite_without_column_explicit_mode_does_not_fall_back(self):
        row = {"id": "9950998", "title": "Appartement", "price_mad": 1200000,
               "surface_m2": 100, "district": "Agdal", "location": "Rabat",
               "link": "https://www.mubawab.ma/fr/a/9950998/appartement"}
        self.assertEqual(ev.evaluate([row], source_rows=False)["complete_core_with_district"], 0)
        self.assertEqual(ev.evaluate([row])["complete_core_with_district"], 1)

    def test_promo_with_conflicting_city_and_type_rejects_even_without_link(self):
        promo = ('<article class="listingBox adBoostBox">'
                 '<h2 class="listingTit">Villa à vendre Casablanca</h2>'
                 '<div class="listingH3">Maârif, Casablanca</div></article>')
        html = page(10).replace('</body></html>', promo + '</body></html>')
        audit = s.parse_listings_audited(html, expected_city="Rabat",
                                        require_apartment=True, require_locality=True,
                                        baseline_eligible_cards=10)
        self.assertEqual(len(audit.listings), 10)
        self.assertFalse(audit.passes_quality)
        self.assertEqual(audit.shard_context_violations, 1)
        self.assertIn("shard_city_mismatch", audit.rejected)

    def test_promoted_h3_villa_without_details_cannot_hide_in_shard(self):
        promo = ('<article class="listingBox adBoostBox">'
                 '<h3>Villa Casablanca</h3></article>')
        html = page(10).replace('</body></html>', promo + '</body></html>')
        audit = s.parse_listings_audited(html, expected_city="Rabat",
                                        require_apartment=True, require_locality=True,
                                        baseline_eligible_cards=10)
        self.assertFalse(audit.passes_quality)
        self.assertEqual(audit.shard_context_violations, 1)
        self.assertIn("shard_non_apartment_or_unconfirmed_type", audit.rejected)

    def test_blank_adboost_still_ignored_not_a_false_shard_block(self):
        promo = ('<article class="listingBox adBoostBox">'
                 '<h2>Annonce sponsorisée sans détail</h2></article>')
        html = page(10).replace('</body></html>', promo + '</body></html>')
        audit = s.parse_listings_audited(html, expected_city="Rabat",
                                        require_apartment=True, require_locality=True,
                                        baseline_eligible_cards=10)
        self.assertTrue(audit.passes_quality)
        self.assertEqual(audit.ignored.get("promotion_without_detail_link"), 1)


class PublicationConsistency(unittest.TestCase):
    def run_main(self, *, html: str | None = None, blocked: bool = False,
                 replace_fault: str | None = None) -> int:
        async def gather(urls, *, engine, headed, browser_path, diagnostics):
            if blocked:
                diagnostics.append({"final_status": "blocked", "http_code": 429})
                return [s.FetchResult(s.BASE_URL, "blocked", code=429)]
            diagnostics.append({"final_status": "ok", "http_code": 200})
            return [s.FetchResult(s.BASE_URL, "ok", code=200, html=html or page())]

        orig_replace = os.replace

        def replace(src, dst):
            if replace_fault is not None and str(dst) == replace_fault:
                raise OSError("counteraudit synthetic disk failure")
            return orig_replace(src, dst)

        with (patch.object(s, "approved_shard_baseline", return_value=10),
              patch.object(s, "fetch_and_check_robots", return_value={"status": "checked"}),
              patch.object(s, "gather_results", side_effect=gather),
              patch.object(s.os, "replace", side_effect=replace)):
            return asyncio.run(s.main(engine="http"))

    def test_complete_run_has_atomic_verifiable_file_and_db_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch_cwd(tmp):
                self.assertEqual(self.run_main(), 0)
                result = s.verify_publication()
                self.assertTrue(result["valid"], result)
                self.assertEqual(result["files_checked"], len(s.PUBLICATION_FILES)+1)
                marker = json.loads(Path(s.PUBLICATION_STATUS).read_text())
                self.assertEqual(marker["status"], "complete")
                self.assertEqual(set(marker["sha256"]), set(s.PUBLICATION_FILES)|{s.DB_NAME})

    def test_json_changed_after_success_makes_manifest_invalid(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch_cwd(tmp):
                self.assertEqual(self.run_main(), 0)
                Path("akarfinder_data.json").write_text('[]\n')
                evidence = s.verify_publication()
                self.assertFalse(evidence["valid"])
                self.assertEqual(evidence["reason"], "digest_mismatch")

    def test_partial_publication_has_no_valid_complete_marker(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch_cwd(tmp):
                self.assertEqual(self.run_main(), 0)
                old_md = Path("akarfinder_report.md").read_bytes()
                html2 = page().replace("1 200 000 DH", "1 300 000 DH")
                self.assertEqual(self.run_main(html=html2, replace_fault="akarfinder_report.md"), 5)
                self.assertEqual(Path("akarfinder_report.md").read_bytes(), old_md)
                self.assertEqual(json.loads(Path(s.PUBLICATION_STATUS).read_text())["status"], "failed")
                self.assertFalse(s.verify_publication()["valid"])
                with sqlite3.connect(s.DB_NAME) as conn:
                    self.assertEqual(conn.execute("SELECT price_mad FROM listings LIMIT 1").fetchone()[0], 1300000)

    def test_failed_run_invalidates_old_exports_without_destroying_them(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch_cwd(tmp):
                self.assertEqual(self.run_main(), 0)
                previous = Path("akarfinder_data.json").read_bytes()
                self.assertEqual(self.run_main(blocked=True), 2)
                self.assertEqual(Path("akarfinder_data.json").read_bytes(), previous)
                status = json.loads(Path(s.PUBLICATION_STATUS).read_text())
                self.assertEqual(status["status"], "failed")
                self.assertTrue(status["previous_exports_may_be_stale_or_mixed"])
                self.assertFalse(s.verify_publication()["valid"])

    def test_no_manifest_never_certifies_legacy_artifacts(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch_cwd(tmp):
                Path("akarfinder_data.json").write_text('[{}]')
                self.assertFalse(s.verify_publication()["valid"])


class patch_cwd:
    def __init__(self, path):
        self.path = path
    def __enter__(self):
        self.before = os.getcwd()
        os.chdir(self.path)
    def __exit__(self, *a):
        os.chdir(self.before)


if __name__ == "__main__":
    unittest.main()
