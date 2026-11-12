"""Radar10: real V3 adapter and ephemeral PostgreSQL tests. No production services."""
from __future__ import annotations
from datetime import datetime, timezone
import gzip
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import akarparser_v3_raw_bulk as v3
from akarparser_v3_v646_bridge import bridge_v646_row
from radar10 import ingest, run_cycle

NOW = datetime(2026, 11, 12, 17, 0, tzinfo=timezone.utc)
HERE = Path(__file__).resolve().parents[1] / "radar10"
TEST_DSN = os.environ.get("RADAR_TEST_DSN")


def sample(id="9961000", price=1200000, *, slug="flat"):
    raw = dict(id=id,
        link=f"https://www.mubawab.ma/fr/a/{id}/{slug}",
        title="Appartement à vendre", location="Rabat", district="Agdal",
        price_mad=price, surface_m2=100, property_type_observed="apartment",
        transaction_type="sale", first_seen="2026-11-12T15:00:00Z",
        last_seen="2026-11-12T16:00:00Z")
    mapped = bridge_v646_row(raw)
    return v3.parse_raw(mapped, NOW)


class NormalizeTests(unittest.TestCase):
    def test_real_v3_stages_without_fake_freshness(self):
        record = sample()
        self.assertEqual(record["quality"]["status"], "complete_requires_freshness")
        item = ingest.normalize(record)
        self.assertEqual(item["source_offer_id"], "9961000")
        self.assertEqual(item["city"], "Rabat")
        self.assertEqual(item["price_mad"], 1200000)
        self.assertEqual(item["transaction_type"], "sale")
        self.assertNotIn("published_at", item)
        self.assertNotIn("observed_at", item)

    def test_reject_host_id_forgery_and_quarantine(self):
        cases = [lambda r: r["source"].update(source_url="https://evil.example/a/9961000"),
                 lambda r: r["source"].update(source_offer_id="1234567"),
                 lambda r: r["quality"].update(status="quarantine"),
                 lambda r: r["quality"].update(freshness_independently_verified=True)]
        for mutate in cases:
            row = sample()
            mutate(row)
            with self.subTest(mutate=mutate), self.assertRaises(ingest.InvalidCandidate):
                ingest.normalize(row)

    def test_loader_deduplicates_exact_urls_and_rejects_bad_content(self):
        good = sample()
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "all.jsonl.gz"
            with gzip.open(p, "wt", encoding="utf-8") as f:
                for obj in [good, good, {"untrusted": True}]:
                    f.write(json.dumps(obj) + "\n")
            rows, report = ingest.load_v3(p)
            self.assertEqual((report["observed"], report["accepted"], report["duplicates"]),
                             (3, 1, 1))
            self.assertEqual(sum(report["rejected"].values()), 1)
            self.assertEqual(len(rows), 1)

    def test_same_cycle_selection_excludes_stale_observations(self):
        start = datetime(2026, 11, 12, 17, tzinfo=timezone.utc)
        end = datetime(2026, 11, 12, 17, 1, tzinfo=timezone.utc)
        old = {"last_seen": "2026-11-11T15:00:00+00:00", "id": "old"}
        fresh = {"last_seen": "2026-11-12T17:00:10+00:00", "id": "current"}
        self.assertEqual(run_cycle.current_cycle_only([old, fresh], start, end), [fresh])
        with self.assertRaises(ValueError):
            run_cycle.current_cycle_only([old], start, end)
        with self.assertRaises(ValueError):
            run_cycle.current_cycle_only([{"last_seen": "2026-11-12T18:00:00+00:00"}], start, end)

    def test_staging_denies_old_snapshot_even_if_write_switch_is_present(self):
        with patch.dict(os.environ, {"RADAR_STAGING_WRITE_ENABLED": "approved"}):
            with self.assertRaisesRegex(PermissionError, "NEW_SOURCE_CYCLE"):
                run_cycle.perform(Path("/missing"), commit=True, collect=False)

    def test_fail_closed_flags_and_dsn_pin(self):
        self.assertFalse(run_cycle.target_is_pinned("postgresql://u:p@localhost/db"))
        self.assertTrue(run_cycle.target_is_pinned(
            "postgresql://radar10_runtime:p@db.mgqsckxsqdqbzqwkgvwo.supabase.co/postgres"))
        self.assertFalse(run_cycle.target_is_pinned(
            "postgresql://postgres:p@db.mgqsckxsqdqbzqwkgvwo.supabase.co/postgres"))
        with self.assertRaises(PermissionError):
            with patch.dict(os.environ, {"RADAR_STAGING_WRITE_ENABLED": ""}):
                run_cycle.perform(Path("/this/path/must/not/exist"), commit=True)


@unittest.skipUnless(TEST_DSN, "Ephemeral PostgreSQL CI service not configured")
class PostgreSQLTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import psycopg
        cls.conn = psycopg.connect(TEST_DSN, autocommit=True)
        cls.conn.execute((HERE / "private_schema.sql").read_text(encoding="utf-8"))

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def setUp(self):
        self.conn.execute("TRUNCATE acquisition.radar_runs, acquisition.radar_candidates")

    @staticmethod
    def audit(n=1):
        return {"observed": n, "accepted": n, "duplicates": 0, "rejected": {}}

    def test_insert_then_unchanged_then_change(self):
        first = ingest.normalize(sample())
        result = ingest.apply_batch(self.conn, [first], self.audit())
        self.assertEqual(result["inserted"], 1)
        before = self.conn.execute("SELECT first_discovered_at FROM acquisition.radar_candidates").fetchone()[0]
        self.assertEqual(ingest.apply_batch(self.conn, [first], self.audit())["unchanged"], 1)
        second = ingest.normalize(sample(price=1300000))
        self.assertEqual(ingest.apply_batch(self.conn, [second], self.audit())["updated"], 1)
        row = self.conn.execute(
            "SELECT price_mad,first_discovered_at,publication_eligible, "
            "freshness_independently_verified FROM acquisition.radar_candidates").fetchone()
        self.assertEqual(row[0], 1300000)
        self.assertEqual(row[1], before)
        self.assertEqual(row[2:], (False, False))
        self.assertEqual(self.conn.execute("SELECT count(*) FROM acquisition.radar_runs").fetchone()[0], 3)

    def test_source_identity_collision_rolls_back_transaction(self):
        a = ingest.normalize(sample())
        b = ingest.normalize(sample(slug="different-url"))
        with self.assertRaises(Exception):
            ingest.apply_batch(self.conn, [a,b], self.audit(2))
        self.assertEqual(self.conn.execute("SELECT count(*) FROM acquisition.radar_candidates").fetchone()[0], 0)
        self.assertEqual(self.conn.execute("SELECT count(*) FROM acquisition.radar_runs").fetchone()[0], 0)

    def test_concurrent_transaction_lock_fails_closed(self):
        import psycopg
        with psycopg.connect(TEST_DSN, autocommit=True) as holder:
            with holder.transaction():
                holder.execute("SELECT pg_advisory_xact_lock(%s,%s)", ingest.LOCK_KEY)
                with self.assertRaises(ingest.BusyError):
                    ingest.apply_batch(self.conn, [ingest.normalize(sample())], self.audit())
        self.assertEqual(self.conn.execute("SELECT count(*) FROM acquisition.radar_candidates").fetchone()[0], 0)

    def test_restricted_nonlogin_role_and_rls(self):
        import psycopg
        role = self.conn.execute("SELECT rolcanlogin FROM pg_roles WHERE rolname='radar10_ingest'").fetchone()
        self.assertEqual(role, (False,))
        rls = self.conn.execute(
            "SELECT relrowsecurity FROM pg_class "
            "WHERE oid IN ('acquisition.radar_candidates'::regclass, "
            "'acquisition.radar_runs'::regclass)").fetchall()
        self.assertEqual(rls, [(True,), (True,)])
        with psycopg.connect(TEST_DSN, autocommit=True) as restricted:
            restricted.execute("SET ROLE radar10_ingest")
            restricted.execute("SELECT count(*) FROM acquisition.radar_candidates").fetchone()
            with self.assertRaises(psycopg.errors.InsufficientPrivilege):
                restricted.execute("DELETE FROM acquisition.radar_candidates")

    def test_publication_columns_cannot_be_true(self):
        ingest.apply_batch(self.conn, [ingest.normalize(sample())], self.audit())
        with self.assertRaises(Exception):
            self.conn.execute("UPDATE acquisition.radar_candidates SET publication_eligible=true")
        with self.assertRaises(Exception):
            self.conn.execute("UPDATE acquisition.radar_candidates SET freshness_independently_verified=true")
        self.assertIsNone(self.conn.execute("SELECT to_regclass('public.property_listings')").fetchone()[0])
