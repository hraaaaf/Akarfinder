"""J6 Ed25519 V2 receipt protocol: PG17 localhost-only, synthetic digest tests.

No Ed25519 private key, no source GET, no live DB, no admission.
A receipt does NOT prove that PostgreSQL checked the signature.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import os
from urllib.parse import urlsplit
import unittest

ROOT=Path(__file__).resolve().parents[1]
DSN=os.getenv("RADAR_TEST_DSN")
PIN_A="a"*64
PIN_B="b"*64
SIG_A="c"*64
SIG_B="d"*64
HTML="e"*64

@unittest.skipUnless(DSN,"J6 isolated PG17 only")
class J6Ed25519ReceiptV2Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.getenv("AKAR_J6_EPHEMERAL_TEST_ONLY")!="true":
            raise AssertionError("EPHEMERAL_ONLY_FLAG_REQUIRED")
        u=urlsplit(DSN)
        if (u.hostname,u.port,u.path,u.username)!=(
            "127.0.0.1",5432,"/akarfinder_v7_j6_ci","postgres"
        ):
            raise AssertionError("PRIVATE_DB_ACCESS_PROHIBITED")
        import psycopg
        cls.psycopg=psycopg
        cls.admin=psycopg.connect(DSN,autocommit=True)
        if cls.admin.execute("SELECT current_database(),current_user").fetchone()!=(
            "akarfinder_v7_j6_ci","postgres"
        ):
            raise AssertionError("TEST_DB_SENTINEL_INVALID")
        cls.admin.execute((ROOT/"v7_parallel"/"j6_ed25519_ephemeral_receipt_v2.sql").read_text())

    @classmethod
    def tearDownClass(cls):
        cls.admin.close()

    def setUp(self):
        self.admin.execute("TRUNCATE v7_capture_ed.receipts,v7_capture_ed.policy_head")

    def role(self,name):
        if name not in ("v7_capture_ed_operator","v7_capture_ed_reviewer"):
            raise ValueError("UNEXPECTED_ROLE")
        conn=self.psycopg.connect(DSN,autocommit=True)
        conn.execute("SET ROLE "+name)
        return conn

    def advance(self,expected=0,nxt=1,pin=PIN_A):
        with self.role("v7_capture_ed_operator") as con:
            return con.execute(
                "SELECT v7_capture_ed.advance_policy(%s,%s,%s)",
                (expected,nxt,pin)
            ).fetchone()[0]

    def record(self,generation=1,pin=PIN_A,signature=SIG_A,key="synthetic-ed1",
               source="agenz.ma",offer="444291",html=HTML):
        with self.role("v7_capture_ed_reviewer") as con:
            return con.execute(
                "SELECT v7_capture_ed.record_receipt(%s,%s,%s,%s,%s,%s,%s)",
                (generation,pin,signature,key,source,offer,html)
            ).fetchone()[0]

    def test_single_bootstrap_and_nonrollback_policy(self):
        self.assertTrue(self.advance())
        self.assertFalse(self.advance())
        self.assertFalse(self.advance(1,1,PIN_B))
        self.assertTrue(self.advance(1,2,PIN_B))
        self.assertFalse(self.advance(1,2,PIN_A))
        self.assertEqual(self.admin.execute(
            "SELECT generation,registry_sha256 FROM v7_capture_ed.policy_head"
        ).fetchone(),(2,PIN_B))

    def test_current_operator_pin_mandatory_and_no_old_generation_receipt(self):
        self.assertFalse(self.record())
        self.assertTrue(self.advance())
        self.assertFalse(self.record(pin=PIN_B))
        self.assertFalse(self.record(generation=2))
        self.assertTrue(self.record())
        self.assertTrue(self.advance(1,2,PIN_B))
        self.assertFalse(self.record(signature=SIG_B,offer="444292"))
        self.assertTrue(self.record(generation=2,pin=PIN_B,signature=SIG_B,offer="444292"))

    def test_duplicate_signature_and_same_listing_bytes_refused(self):
        self.assertTrue(self.advance())
        self.assertTrue(self.record())
        self.assertFalse(self.record())
        self.assertFalse(self.record(signature=SIG_B))
        self.assertEqual(self.admin.execute(
            "SELECT proof_algorithm,key_id FROM v7_capture_ed.receipts"
        ).fetchone(),("Ed25519","synthetic-ed1"))

    def test_two_concurrent_receipts_single_winner(self):
        self.assertTrue(self.advance())
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures=[pool.submit(self.record) for _ in range(2)]
            self.assertEqual(sorted(f.result() for f in futures),[False,True])

    def test_legacy_hmac_and_ed25519_receipts_must_be_distinct(self):
        previous_hmac_count=self.admin.execute(
            "SELECT count(*) FROM v7_capture.capture_receipts"
        ).fetchone()[0]
        self.assertTrue(self.advance())
        self.assertTrue(self.record())
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_capture_ed.receipts"
        ).fetchone()[0],1)
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_capture.capture_receipts"
        ).fetchone()[0],previous_hmac_count)
        self.assertFalse(self.admin.execute(
            "SELECT has_table_privilege('v7_capture_ed_reviewer',"
            "'v7_capture.capture_receipts','INSERT')"
        ).fetchone()[0])

    def test_bad_source_id_key_digest_deny_without_rows(self):
        self.assertTrue(self.advance())
        for args in (
            {"source":"evil.invalid"},{"offer":"../evil"},
            {"signature":"f"*63},{"key":"key with spaces"},
            {"html":"xyz"},{"pin":"z"*64},
            {"generation":-1},
        ):
            with self.subTest(args=args):
                self.assertFalse(self.record(**args))
        self.assertEqual(self.admin.execute(
            "SELECT count(*) FROM v7_capture_ed.receipts"
        ).fetchone()[0],0)

    def test_verified_original_ed25519_v3_replay_reaches_only_v2_receipt(self):
        """Real V3+source HTML signature proof -> isolated Ed25519 receipt.

        Synthetic issuer ONLY. SQL does NOT verify signatures; the reviewer
        must call the verifier before the DB function and still cannot stage.
        """
        import hashlib
        import json
        import sys
        from datetime import timedelta
        from tempfile import TemporaryDirectory
        sys.path.insert(0, str(ROOT))
        from akarparser_v3_raw_bulk import parse_raw
        from v7_multisource.snapshot_evidence import _manifest
        from v7_parallel.j6_ed25519_capture import (
            Ed25519CaptureRejected, review_ed25519_capture
        )
        from test_v7_j6_ed25519_capture import (
            AT, HTML, URL, raw_registry, signed_att, KEY_ID
        )

        baseline_hmac_count = self.admin.execute(
            "SELECT count(*) FROM v7_capture.capture_receipts"
        ).fetchone()[0]
        with TemporaryDirectory() as work:
            html = Path(work) / "source.html"
            manifest = Path(work) / "source.manifest.json"
            html.write_bytes(HTML)
            m = _manifest(URL, HTML, when=AT, method="explicit_single_page_https_get")
            manifest.write_text(json.dumps(m), encoding="utf-8")
            actual_record = parse_raw(
                {"source_url":URL, "raw_html":HTML.decode()}, AT
            )
            registry = raw_registry()
            pin = hashlib.sha256(registry).hexdigest()
            att = signed_att(
                manifest_sha256=hashlib.sha256(manifest.read_bytes()).hexdigest()
            )
            args = dict(
                registry_json_bytes=registry,
                operator_pinned_registry_sha256=pin,
                now_utc=AT + timedelta(minutes=10),
            )
            invalid = dict(att, signature_hex="0" * 128)
            with self.assertRaises(Ed25519CaptureRejected):
                review_ed25519_capture(
                    actual_record, html, manifest, invalid, **args
                )
            self.assertEqual(
                self.admin.execute(
                    "SELECT count(*) FROM v7_capture_ed.receipts"
                ).fetchone()[0], 0
            )
            verified = review_ed25519_capture(
                actual_record, html, manifest, att, **args
            )
            self.assertTrue(verified["signature_valid"])
            self.assertTrue(verified["operator_public_registry_pin_checked"])
            self.assertEqual(verified["source_proof"]["v3_fields_replayed"], 7)
            self.assertFalse(verified["eligible_for_private_staging"])
            self.assertFalse(verified["public_admission_authorized"])
            self.assertEqual(verified["db_writes"], 0)
            self.assertNotIn("review_receipt_intent", verified)
            assert verified["attested_source_domain"] == "agenz.ma"
            assert verified["attested_source_offer_id"] == "444291"
            self.assertTrue(self.advance(pin=pin))
            self.assertTrue(self.record(
                pin=pin,
                signature=hashlib.sha256(bytes.fromhex(att["signature_hex"])).hexdigest(),
                key=KEY_ID,
                source=verified["attested_source_domain"],
                offer=verified["attested_source_offer_id"],
                html=hashlib.sha256(HTML).hexdigest(),
            ))
            self.assertFalse(self.record(
                pin=pin,
                signature=hashlib.sha256(bytes.fromhex(att["signature_hex"])).hexdigest(),
                key=KEY_ID,
                source=verified["attested_source_domain"],
                offer=verified["attested_source_offer_id"],
                html=hashlib.sha256(HTML).hexdigest(),
            ))
            self.assertEqual(self.admin.execute(
                "SELECT count(*) FROM v7_capture_ed.receipts"
            ).fetchone()[0], 1)
            self.assertEqual(self.admin.execute(
                "SELECT count(*) FROM v7_capture.capture_receipts"
            ).fetchone()[0], baseline_hmac_count)

    def test_separation_no_select_delete_or_cross_signing_and_force_rls(self):
        for role in ("v7_capture_ed_operator","v7_capture_ed_reviewer"):
            with self.role(role) as con:
                with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                    con.execute("SELECT * FROM v7_capture_ed.policy_head")
                with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                    con.execute("DELETE FROM v7_capture_ed.receipts")
        with self.role("v7_capture_ed_operator") as con:
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                con.execute(
                    "SELECT v7_capture_ed.record_receipt(1,%s,%s,%s,%s,%s,%s)",
                    (PIN_A,SIG_A,"synthetic-ed1","agenz.ma","444291",HTML))
        with self.role("v7_capture_ed_reviewer") as con:
            with self.assertRaises(self.psycopg.errors.InsufficientPrivilege):
                con.execute("SELECT v7_capture_ed.advance_policy(0,1,%s)",(PIN_A,))
        for tab in ("policy_head","receipts"):
            self.assertEqual(self.admin.execute(
                "SELECT relrowsecurity,relforcerowsecurity FROM pg_class "
                "WHERE oid=%s::regclass",("v7_capture_ed."+tab,)
            ).fetchone(),(True,True))
        for sig in (
            "v7_capture_ed.advance_policy(bigint,bigint,text)",
            "v7_capture_ed.record_receipt(bigint,text,text,text,text,text,text)",
        ):
            row=self.admin.execute(
                "SELECT pg_get_userbyid(proowner),proconfig "
                "FROM pg_proc WHERE oid=%s::regprocedure",(sig,)
            ).fetchone()
            self.assertEqual(row[0],"v7_capture_ed_owner")
            self.assertIn("search_path=pg_catalog,v7_capture_ed,pg_temp", [value.replace(" ","") for value in row[1]])

if __name__=="__main__":unittest.main()
