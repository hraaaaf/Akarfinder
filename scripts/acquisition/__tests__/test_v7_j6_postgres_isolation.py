"""J6 isolated PostgreSQL 17 RLS rehearsal, never production."""
from __future__ import annotations
from datetime import datetime, timezone
import os
from pathlib import Path
import sys
from urllib.parse import urlsplit
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v3_raw_bulk import parse_raw
from radar10 import ingest
from v7_parallel.j6_staging_readiness import review_batch

BASE = Path(__file__).resolve().parents[1]
DSN = os.environ.get("RADAR_TEST_DSN")
AT = datetime(2026, 11, 13, tzinfo=timezone.utc)


def sample(offer="445495", slug="sale-el-jadida"):
    url = f"https://agenz.ma/fr/annonces/immo-sale/vente-appartements/{slug}/{offer}"
    return parse_raw({
        "source_url": url, "source_name": "agenz.ma",
        "source_offer_id": offer, "title": "Appartement à vendre",
        "city": "Salé", "district": "Salé El Jadida",
        "price_mad": 1650000, "surface_m2": 150,
        "property_type": "apartment", "transaction_type": "sale",
    }, AT)


@unittest.skipUnless(DSN, "Ephemeral CI PostgreSQL unavailable")
class J6PostgresTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.environ.get("AKAR_J6_EPHEMERAL_TEST_ONLY") != "true":
            raise AssertionError("EXPLICIT_EPHEMERAL_TEST_REQUIRED")
        url = urlsplit(DSN)
        if (url.hostname, url.port, url.path, url.username) != (
                "127.0.0.1", 5432, "/akarfinder_v7_j6_ci", "postgres"):
            raise AssertionError("EPHEMERAL_LOCALHOST_DSN_REQUIRED")
        import psycopg
        cls.psycopg = psycopg
        cls.admin = psycopg.connect(DSN, autocommit=True)
        if cls.admin.execute("SELECT current_database(), current_user").fetchone() != (
                "akarfinder_v7_j6_ci", "postgres"):
            cls.admin.close()
            raise AssertionError("WRONG_DATABASE_OR_ROLE")
        cls.admin.execute((BASE / "radar10" / "private_schema.sql").read_text(encoding="utf-8"))
        cls.admin.execute("CREATE ROLE v7_j6_unprivileged NOLOGIN")

    @classmethod
    def tearDownClass(cls):
        cls.admin.close()

    def setUp(self):
        self.admin.execute("TRUNCATE acquisition.radar_runs, acquisition.radar_candidates")

    def as_role(self, name):
        if name not in ("radar10_ingest", "v7_j6_unprivileged"):
            raise AssertionError("UNEXPECTED_TEST_ROLE")
        conn = self.psycopg.connect(DSN, autocommit=True)
        conn.execute("SET ROLE " + name)
        return conn

    def audit(self, n=1):
        return {"observed": n, "accepted": n, "rejected": {}}

    def test_quarantine_does_not_write_anything(self):
        result = review_batch([sample()])
        self.assertEqual(result["eligible_for_private_staging"], 0)
        self.assertEqual(result["db_writes"], 0)
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM acquisition.radar_candidates").fetchone()[0], 0)

    def test_private_writer_role_can_insert_and_replay(self):
        row = ingest.normalize(sample())
        with self.as_role("radar10_ingest") as conn:
            self.assertEqual(ingest.apply_batch(conn, [row], self.audit())["inserted"], 1)
            self.assertEqual(ingest.apply_batch(conn, [row], self.audit())["unchanged"], 1)
        self.assertEqual(self.admin.execute(
            "SELECT publication_eligible, freshness_independently_verified "
            "FROM acquisition.radar_candidates").fetchone(), (False, False))
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM acquisition.radar_runs").fetchone()[0], 2)

    def test_unprivileged_role_cannot_read_private_table(self):
        with self.as_role("v7_j6_unprivileged") as conn:
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                conn.execute("SELECT count(*) FROM acquisition.radar_candidates")

    def test_runtime_role_cannot_delete_or_publish(self):
        with self.as_role("radar10_ingest") as conn:
            ingest.apply_batch(conn, [ingest.normalize(sample())], self.audit())
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                conn.execute("DELETE FROM acquisition.radar_candidates")
            forbidden = (self.psycopg.errors.CheckViolation,
                         self.psycopg.errors.InsufficientPrivilege)
            with self.assertRaises(forbidden):
                conn.execute("UPDATE acquisition.radar_candidates SET publication_eligible=true")
            with self.assertRaises(forbidden):
                conn.execute("UPDATE acquisition.radar_candidates SET freshness_independently_verified=true")
        self.assertEqual(self.admin.execute(
            "SELECT publication_eligible, freshness_independently_verified "
            "FROM acquisition.radar_candidates").fetchone(), (False, False))

    def test_identity_collision_rolls_back_entire_batch(self):
        rows = [ingest.normalize(sample("445495", "sale-el-jadida")),
                ingest.normalize(sample("445495", "al-qods"))]
        with self.as_role("radar10_ingest") as conn:
            with self.assertRaises(self.psycopg.errors.UniqueViolation):
                ingest.apply_batch(conn, rows, self.audit(2))
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM acquisition.radar_candidates").fetchone()[0], 0)
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM acquisition.radar_runs").fetchone()[0], 0)

    def test_rls_and_public_isolation_exist(self):
        self.assertEqual(self.admin.execute(
            "SELECT rolcanlogin, rolbypassrls FROM pg_roles "
            "WHERE rolname='radar10_ingest'").fetchone(), (False, False))
        self.assertEqual(self.admin.execute(
            "SELECT relrowsecurity FROM pg_class WHERE oid IN "
            "('acquisition.radar_candidates'::regclass,"
            "'acquisition.radar_runs'::regclass)").fetchall(), [(True,), (True,)])
        self.assertFalse(self.admin.execute(
            "SELECT has_schema_privilege('v7_j6_unprivileged', 'acquisition', 'USAGE')").fetchone()[0])
        self.assertIsNone(self.admin.execute(
            "SELECT to_regclass('public.property_listings')").fetchone()[0])


if __name__ == "__main__":
    unittest.main()
