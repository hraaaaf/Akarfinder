"""J7 PostgreSQL 17 ephemeral gate with no live scheduler or network."""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor
import os
from pathlib import Path
import sys
from urllib.parse import urlsplit
from uuid import uuid4
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_parallel.j7_ten_minute_contract import offline_cycle_intent
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
DSN = os.getenv("AKAR_J7_TEST_DSN")
SLOT = offline_cycle_intent(datetime(2026, 11, 13, 9, 3, tzinfo=timezone.utc))["slot_index"]


@unittest.skipUnless(DSN, "J7 isolated postgres fixture unavailable")
class J7EphemeralLedgerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.getenv("AKAR_J7_EPHEMERAL_ONLY") != "true":
            raise AssertionError("J7_EPHEMERAL_FLAG_REQUIRED")
        parsed = urlsplit(DSN)
        if (parsed.hostname, parsed.port, parsed.path, parsed.username) != (
            "127.0.0.1", 5432, "/akarfinder_v7_j7_ci", "postgres"
        ):
            raise AssertionError("J7_LOCAL_TEST_DATABASE_ONLY")
        import psycopg
        cls.psycopg=psycopg
        cls.admin=psycopg.connect(DSN,autocommit=True)
        if cls.admin.execute("SELECT current_database(), current_user").fetchone() != (
            "akarfinder_v7_j7_ci", "postgres"
        ):
            cls.admin.close()
            raise AssertionError("J7_DB_SENTINEL_INVALID")
        cls.admin.execute((ROOT/"v7_parallel"/"j7_ephemeral_ledger.sql").read_text(encoding="utf-8"))
        cls.admin.execute("CREATE ROLE v7_schedule_observer NOLOGIN")

    @classmethod
    def tearDownClass(cls):
        cls.admin.close()

    def setUp(self):
        self.admin.execute("TRUNCATE v7_schedule.fenced_markers, v7_schedule.slots")

    def role(self, name="v7_schedule_worker"):
        if name not in ("v7_schedule_worker", "v7_schedule_observer"):
            raise ValueError("TEST_ROLE_INVALID")
        conn=self.psycopg.connect(DSN,autocommit=True)
        conn.execute("SET ROLE "+name)
        return conn

    def claim(self, slot=SLOT, token=None):
        token=token or uuid4()
        with self.role() as conn:
            ok=conn.execute(
                "SELECT v7_schedule.claim_slot(%s,%s)",(slot,token)
            ).fetchone()[0]
        return ok,token

    def test_claim_is_once_per_slot(self):
        first,_=self.claim()
        second,_=self.claim()
        self.assertTrue(first)
        self.assertFalse(second)
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_schedule.slots").fetchone()[0],1)

    def test_concurrent_distinct_tokens_get_one_claim(self):
        tokens=[uuid4(),uuid4()]
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures=[pool.submit(self.claim,SLOT,token) for token in tokens]
            results=[f.result()[0] for f in futures]
        self.assertEqual(sorted(results),[False,True])
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_schedule.slots").fetchone()[0],1)

    def test_wrong_token_cannot_finish_claim(self):
        ok,token=self.claim()
        self.assertTrue(ok)
        with self.role() as conn:
            self.assertFalse(conn.execute(
                "SELECT v7_schedule.finish_slot(%s,%s)",(SLOT,uuid4())
            ).fetchone()[0])
            self.assertTrue(conn.execute(
                "SELECT v7_schedule.finish_slot(%s,%s)",(SLOT,token)
            ).fetchone()[0])
            self.assertFalse(conn.execute(
                "SELECT v7_schedule.finish_slot(%s,%s)",(SLOT,token)
            ).fetchone()[0])
        self.assertEqual(self.admin.execute(
            "SELECT status FROM v7_schedule.slots").fetchone()[0],"completed")

    def test_failed_or_crashed_claim_never_autoretries(self):
        ok,token=self.claim()
        self.assertTrue(ok)
        with self.role() as conn:
            self.assertTrue(conn.execute(
                "SELECT v7_schedule.fail_slot(%s,%s)",(SLOT,token)
            ).fetchone()[0])
        again,_=self.claim()
        self.assertFalse(again)
        self.assertTrue(self.claim(SLOT+1)[0])

    def test_worker_has_no_direct_table_access(self):
        self.assertEqual(self.admin.execute(
            "SELECT rolcanlogin,rolbypassrls FROM pg_roles "
            "WHERE rolname='v7_schedule_worker'").fetchone(),(False,False))
        with self.role() as conn:
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                conn.execute("SELECT count(*) FROM v7_schedule.slots")
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                conn.execute("DELETE FROM v7_schedule.slots")

    def test_observer_cannot_execute_privileged_functions(self):
        with self.role("v7_schedule_observer") as conn:
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                conn.execute("SELECT v7_schedule.claim_slot(%s,%s)",(SLOT,uuid4()))
        self.assertFalse(self.admin.execute(
            "SELECT has_function_privilege('v7_schedule_observer', "
            "'v7_schedule.claim_slot(bigint,uuid)', 'EXECUTE')").fetchone()[0])

    def test_invalid_slot_is_rejected_and_no_row_written(self):
        self.assertFalse(self.claim(-1)[0])
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_schedule.slots").fetchone()[0],0)

    def test_local_test_ledger_never_enables_collection(self):
        self.assertTrue(self.claim()[0])
        plan=offline_cycle_intent(datetime(2026, 11, 13, 9, 3, tzinfo=timezone.utc))
        self.assertFalse(plan["live_source_fetch_authorized"])
        self.assertFalse(plan["durable_remote_ledger_connected"])
        self.assertFalse(plan["execution_authorized"])
        self.assertIsNone(self.admin.execute(
            "SELECT to_regclass('public.property_listings')").fetchone()[0])


    def marker(self, slot, token, name="snapshot-sha", sha="a"*64):
        with self.role() as conn:
            return conn.execute(
                "SELECT v7_schedule.record_fenced_marker(%s,%s,%s,%s)",
                (slot, token, name, sha)
            ).fetchone()[0]

    def test_fenced_marker_requires_exact_active_claim_token(self):
        ok, token = self.claim()
        self.assertTrue(ok)
        self.assertFalse(self.marker(SLOT, uuid4()))
        self.assertTrue(self.marker(SLOT, token))
        self.assertFalse(self.marker(SLOT, token))  # duplicate no-op, not success
        self.assertFalse(self.marker(SLOT, token, "snapshot-sha", "b"*64))
        self.assertEqual(self.admin.execute(
            "SELECT marker_name, evidence_sha256 FROM v7_schedule.fenced_markers"
        ).fetchall(), [("snapshot-sha", "a"*64)])
        with self.role() as conn:
            self.assertTrue(conn.execute(
                "SELECT v7_schedule.finish_slot(%s,%s)", (SLOT, token)
            ).fetchone()[0])
        self.assertFalse(self.marker(SLOT, token, "after-finish"))
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_schedule.fenced_markers"
        ).fetchone()[0], 1)

    def test_fenced_marker_rejects_invalid_inputs_and_unclaimed_slot(self):
        self.assertFalse(self.marker(SLOT, uuid4()))
        ok, token = self.claim()
        self.assertTrue(ok)
        self.assertFalse(self.marker(SLOT, token, "bad spaces"))
        self.assertFalse(self.marker(SLOT, token, "valid", "xyz"))
        self.assertFalse(self.marker(-1, token, "valid"))
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_schedule.fenced_markers"
        ).fetchone()[0], 0)

    def test_function_owner_is_dedicated_non_superuser_with_force_rls(self):
        self.assertEqual(self.admin.execute(
            "SELECT rolcanlogin, rolsuper, rolbypassrls, rolcreaterole "
            "FROM pg_roles WHERE rolname='v7_schedule_owner'"
        ).fetchone(), (False, False, False, False))
        self.assertEqual(self.admin.execute(
            "SELECT pg_get_userbyid(proowner) FROM pg_proc "
            "WHERE oid='v7_schedule.record_fenced_marker(bigint,uuid,text,text)'::regprocedure"
        ).fetchone()[0], "v7_schedule_owner")
        self.assertEqual(self.admin.execute(
            "SELECT relrowsecurity, relforcerowsecurity FROM pg_class "
            "WHERE oid='v7_schedule.slots'::regclass"
        ).fetchone(), (True, True))
        self.assertEqual(self.admin.execute(
            "SELECT relrowsecurity, relforcerowsecurity FROM pg_class "
            "WHERE oid='v7_schedule.fenced_markers'::regclass"
        ).fetchone(), (True, True))
        self.assertEqual(self.admin.execute(
            "SELECT pg_get_userbyid(proowner) FROM pg_proc "
            "WHERE oid='v7_schedule.claim_slot(bigint,uuid)'::regprocedure"
        ).fetchone()[0], "v7_schedule_owner")

    def test_fenced_marker_table_not_accessible_to_worker_or_observer(self):
        with self.role() as conn:
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                conn.execute("SELECT count(*) FROM v7_schedule.fenced_markers")
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                conn.execute("DELETE FROM v7_schedule.fenced_markers")
        with self.role("v7_schedule_observer") as conn:
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                conn.execute(
                    "SELECT v7_schedule.record_fenced_marker(%s,%s,%s,%s)",
                    (SLOT, uuid4(), "snapshot-sha", "a"*64))



if __name__=="__main__":
    unittest.main()
