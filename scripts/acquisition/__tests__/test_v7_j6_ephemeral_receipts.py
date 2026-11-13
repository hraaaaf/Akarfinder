"""J6 isolated PostgreSQL17: operator policy CAS + one-time receipt only.

Never connect outside the CI localhost sentinel. Not a staging/admission test.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import os
from pathlib import Path
from urllib.parse import urlsplit
import unittest

DSN = os.getenv("RADAR_TEST_DSN")
ROOT = Path(__file__).resolve().parents[1]
PIN_A = "a" * 64
PIN_B = "b" * 64
MAC_A = "c" * 64
MAC_B = "d" * 64
HTML_A = "e" * 64
HTML_B = "f" * 64


@unittest.skipUnless(DSN, "J6 isolated PostgreSQL fixture absent")
class J6EphemeralReceiptTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.getenv("AKAR_J6_EPHEMERAL_TEST_ONLY") != "true":
            raise AssertionError("J6_EPHEMERAL_ONLY_REQUIRED")
        parts = urlsplit(DSN)
        if (parts.hostname, parts.port, parts.path, parts.username) != (
            "127.0.0.1", 5432, "/akarfinder_v7_j6_ci", "postgres"
        ):
            raise AssertionError("J6_LOCAL_DATABASE_SENTINEL_REQUIRED")
        import psycopg
        cls.psycopg = psycopg
        cls.admin = psycopg.connect(DSN, autocommit=True)
        if cls.admin.execute(
            "SELECT current_database(),current_user"
        ).fetchone() != ("akarfinder_v7_j6_ci", "postgres"):
            raise AssertionError("J6_DB_IDENTITY_MISMATCH")
        cls.admin.execute((ROOT/"v7_parallel"/"j6_ephemeral_receipt_ledger.sql")
                          .read_text(encoding="utf-8"))

    @classmethod
    def tearDownClass(cls):
        cls.admin.close()

    def setUp(self):
        self.admin.execute(
            "TRUNCATE v7_capture.capture_receipts, v7_capture.policy_head")

    def role(self, who):
        if who not in ("v7_capture_operator", "v7_capture_reviewer"):
            raise ValueError("UNKNOWN_CI_ROLE")
        conn = self.psycopg.connect(DSN, autocommit=True)
        conn.execute("SET ROLE " + who)
        return conn

    def advance(self, prev=0, new=1, pin=PIN_A):
        with self.role("v7_capture_operator") as con:
            return con.execute(
                "SELECT v7_capture.advance_policy(%s,%s,%s)",
                (prev, new, pin)).fetchone()[0]

    def receipt(self, gen=1, pin=PIN_A, mac=MAC_A,
                domain="sarouty.ma", offer="894012", html=HTML_A):
        with self.role("v7_capture_reviewer") as con:
            return con.execute(
                "SELECT v7_capture.record_review_receipt(%s,%s,%s,%s,%s,%s)",
                (gen, pin, mac, domain, offer, html)).fetchone()[0]

    def test_policy_bootstrap_only_once_and_rollback_rejected(self):
        self.assertTrue(self.advance())
        self.assertFalse(self.advance())
        self.assertFalse(self.advance(1, 1, PIN_B))
        self.assertFalse(self.advance(1, 3, PIN_B))
        self.assertTrue(self.advance(1, 2, PIN_B))
        self.assertFalse(self.advance(1, 2, PIN_A))
        self.assertFalse(self.advance(2, 1, PIN_A))
        self.assertEqual(self.admin.execute(
            "SELECT generation,registry_sha256 FROM v7_capture.policy_head"
        ).fetchone(), (2, PIN_B))

    def test_concurrent_registry_bootstrap_has_single_winner(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(self.advance,0,1,p)
                       for p in (PIN_A,PIN_B)]
            result = [f.result() for f in futures]
        self.assertEqual(sorted(result), [False, True])
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_capture.policy_head"
        ).fetchone()[0], 1)

    def test_receipt_before_policy_and_wrong_generation_or_pin_rejected(self):
        self.assertFalse(self.receipt())
        self.assertTrue(self.advance())
        self.assertFalse(self.receipt(gen=2))
        self.assertFalse(self.receipt(pin=PIN_B))
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_capture.capture_receipts"
        ).fetchone()[0], 0)

    def test_single_attestation_receipt_and_same_source_content_unique(self):
        self.assertTrue(self.advance())
        self.assertTrue(self.receipt())
        self.assertFalse(self.receipt())
        self.assertFalse(self.receipt(mac=MAC_B))
        self.assertFalse(self.receipt(html=HTML_B))
        self.assertEqual(self.admin.execute(
            "SELECT source_domain,source_offer_id,html_sha256 "
            "FROM v7_capture.capture_receipts"
        ).fetchall(), [("sarouty.ma", "894012", HTML_A)])

    def test_concurrent_identical_receipt_only_one_wins(self):
        self.assertTrue(self.advance())
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(self.receipt) for _ in range(2)]
            outcome = [future.result() for future in futures]
        self.assertEqual(sorted(outcome), [False, True])
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_capture.capture_receipts"
        ).fetchone()[0], 1)

    def test_old_generation_cannot_reserve_after_operator_rotation(self):
        self.assertTrue(self.advance())
        self.assertTrue(self.receipt())
        self.assertTrue(self.advance(1,2,PIN_B))
        self.assertFalse(self.receipt(mac=MAC_B, offer="894013"))
        self.assertTrue(self.receipt(gen=2,pin=PIN_B,mac=MAC_B,offer="894013"))
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_capture.capture_receipts"
        ).fetchone()[0], 2)

    def test_invalid_portal_ids_digests_rejected_without_rows(self):
        self.assertTrue(self.advance())
        for overrides in (
            {"domain":"evil.example"},
            {"offer":"../../../etc"},
            {"mac":"garbage"},
            {"html":"bad"},
            {"pin":"f"*63},
            {"gen":-1},
        ):
            with self.subTest(overrides=overrides):
                self.assertFalse(self.receipt(**overrides))
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_capture.capture_receipts"
        ).fetchone()[0],0)

    def test_separate_roles_cannot_cross_approve(self):
        with self.role("v7_capture_reviewer") as reviewer:
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                reviewer.execute(
                    "SELECT v7_capture.advance_policy(0,1,%s)",(PIN_A,))
        with self.role("v7_capture_operator") as operator:
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                operator.execute(
                    "SELECT v7_capture.record_review_receipt(1,%s,%s,%s,%s,%s)",
                    (PIN_A,MAC_A,"sarouty.ma","894012",HTML_A))
        self.assertFalse(self.admin.execute(
            "SELECT has_function_privilege('v7_capture_reviewer',"
            "'v7_capture.advance_policy(bigint,bigint,text)','EXECUTE')"
        ).fetchone()[0])

    def test_operator_and_reviewer_have_no_direct_table_or_delete_access(self):
        self.assertTrue(self.advance())
        for role in ("v7_capture_operator","v7_capture_reviewer"):
            with self.role(role) as con:
                with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                    con.execute("SELECT * FROM v7_capture.policy_head")
                with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                    con.execute("DELETE FROM v7_capture.capture_receipts")
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_capture.policy_head"
        ).fetchone()[0],1)

    def test_non_superuser_owner_and_force_rls_and_no_product_effects(self):
        self.assertEqual(self.admin.execute(
            "SELECT rolcanlogin,rolsuper,rolbypassrls,rolcreaterole "
            "FROM pg_roles WHERE rolname='v7_capture_owner'"
        ).fetchone(), (False,False,False,False))
        for table in ("policy_head","capture_receipts"):
            self.assertEqual(self.admin.execute(
                "SELECT relrowsecurity,relforcerowsecurity "
                "FROM pg_class WHERE oid=%s::regclass",
                ("v7_capture."+table,)
            ).fetchone(),(True,True))
        for signature in (
            "v7_capture.advance_policy(bigint,bigint,text)",
            "v7_capture.record_review_receipt(bigint,text,text,text,text,text)"
        ):
            self.assertEqual(self.admin.execute(
                "SELECT pg_get_userbyid(proowner) FROM pg_proc "
                "WHERE oid=%s::regprocedure",(signature,)
            ).fetchone()[0],"v7_capture_owner")
        self.assertIsNone(self.admin.execute(
            "SELECT to_regclass('public.property_listings')"
        ).fetchone()[0])
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_capture.capture_receipts"
        ).fetchone()[0],0)


if __name__ == "__main__":
    unittest.main()
