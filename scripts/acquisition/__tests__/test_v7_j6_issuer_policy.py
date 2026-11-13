"""J6 operator-pinned issuer policy: synthetic tests, never real operator secrets."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v3_raw_bulk import parse_raw
from v7_multisource.snapshot_evidence import _manifest
from v7_parallel.j6_authenticated_capture import DOMAIN, SCHEMA
from v7_parallel.j6_issuer_policy import (
    IssuerPolicyRejected, REGISTRY_SCHEMA, _parse_registry,
    review_with_operator_issuer_policy,
)

AT = datetime(2026, 11, 13, 12, tzinfo=timezone.utc)
URL = "https://agenz.ma/fr/annonces/immo-sale/vente-appartements/agdal/444291"
RAW = (b'<html><head><title>Appartement a vendre</title></head><body>'
       b'<h1>Appartement a vendre</h1><p>980 000 DH</p><p>104 m2</p></body></html>')
KEY = bytes(range(32))
KEY_ID = "synthetic-ci-issuer-1"
ISSUER = "Akarfinder synthetic capture agent CI"
BASE_POLICY = {
    "key_id": KEY_ID, "issuer": ISSUER,
    "source_domains": ["agenz.ma"],
    "status": "active",
    "valid_from_utc": "2026-11-12T00:00:00Z",
    "valid_until_utc": "2026-12-01T00:00:00Z",
}


def sign(record):
    record = dict(record)
    msg = DOMAIN + json.dumps(
        {k: v for k, v in record.items() if k != "mac_sha256"},
        ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False,
    ).encode()
    record["mac_sha256"] = hmac.new(KEY, msg, hashlib.sha256).hexdigest()
    return record


def registry_json(entry=None, **changes):
    item = dict(BASE_POLICY) if entry is None else entry
    doc = {"schema_version": REGISTRY_SCHEMA, "generation": 1, "issuers": [item]}
    return json.dumps({**doc, **changes}, sort_keys=True).encode()


class IssuerRegistryTests(unittest.TestCase):
    def setUp(self):
        d = TemporaryDirectory()
        self.addCleanup(d.cleanup)
        self.html = Path(d.name) / "source.html"
        self.manifest = Path(d.name) / "source.manifest.json"
        self.html.write_bytes(RAW)
        man = _manifest(URL, RAW, when=AT, method="explicit_single_page_https_get")
        self.manifest.write_text(json.dumps(man), encoding="utf-8")
        self.record = parse_raw({"source_url": URL, "raw_html": RAW.decode()}, AT)
        self.att = sign({
            "schema_version": SCHEMA, "key_id": KEY_ID, "issuer": ISSUER,
            "source_domain": "agenz.ma", "source_offer_id": "444291",
            "source_url": URL, "html_sha256": man["html_sha256"],
            "manifest_sha256": hashlib.sha256(self.manifest.read_bytes()).hexdigest(),
            "captured_at_utc": "2026-11-13T12:00:00Z",
            "issued_at_utc": "2026-11-13T12:05:00Z",
            "expires_at_utc": "2026-11-14T12:05:00Z",
        })

    def review(self, *, registry=None, pin=None, att=None, keyring=None, now=None):
        raw = registry if registry is not None else registry_json()
        return review_with_operator_issuer_policy(
            self.record, self.html, self.manifest,
            self.att if att is None else att,
            registry_json_bytes=raw,
            operator_pinned_registry_sha256=(
                hashlib.sha256(raw).hexdigest() if pin is None else pin),
            operator_keyring_hex={KEY_ID: KEY.hex()} if keyring is None else keyring,
            now_utc=now or (AT + timedelta(minutes=10)),
        )

    def test_valid_registry_authenticates_only_operator_key_policy_not_real_truth(self):
        result = self.review()
        self.assertTrue(result["capture_attestation_mac_valid"])
        self.assertTrue(result["operator_registry_sha256_verified"])
        self.assertTrue(result["issuer_key_scope_and_window_matched"])
        self.assertEqual(result["operator_registry_generation"], 1)
        self.assertEqual(result["source_proof"]["v3_fields_replayed"], 7)
        self.assertFalse(result["issuer_independently_vetted_here"])
        self.assertFalse(result["registry_generation_rollback_prevented_here"])
        self.assertFalse(result["durable_replay_ledger_verified"])
        self.assertFalse(result["eligible_for_private_staging"])
        self.assertFalse(result["public_admission_authorized"])
        self.assertEqual((result["source_http_requests"], result["db_writes"]), (0, 0))
        self.assertNotIn(KEY.hex(), str(result))
        self.assertNotIn(self.record["source"]["source_url"], str(result))

    def test_wrong_external_operator_registry_sha_rejected(self):
        with self.assertRaisesRegex(IssuerPolicyRejected, "OPERATOR_PIN_MISMATCH"):
            self.review(pin="f"*64)
        with self.assertRaisesRegex(IssuerPolicyRejected, "OPERATOR_PIN_REQUIRED"):
            self.review(pin="")

    def test_unsigned_issuer_name_switch_rejected_even_if_mac_valid(self):
        altered = sign(dict(self.att, issuer="Another synthetic operator"))
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_NAME_NOT_ALLOWED_FOR_KEY"):
            self.review(att=altered)

    def test_scope_cannot_be_escalated_to_another_portal(self):
        altered = sign(dict(self.att, source_domain="sarouty.ma"))
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_SOURCE_SCOPE_MISMATCH"):
            self.review(att=altered)

    def test_revoked_key_never_admitted_even_with_valid_signature(self):
        raw = registry_json(entry={**BASE_POLICY, "status": "revoked"})
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_KEY_REVOKED"):
            self.review(registry=raw)

    def test_unknown_key_or_unavailable_external_key_rejected(self):
        altered = sign(dict(self.att, key_id="another-unregistered-issuer"))
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_KEY_NOT_TRUSTED"):
            self.review(att=altered)
        with self.assertRaisesRegex(IssuerPolicyRejected, "OPERATOR_SIGNING_KEY_UNAVAILABLE"):
            self.review(keyring={})

    def test_registry_rotation_old_operator_pin_invalid_and_revocation_effective(self):
        original = registry_json()
        updated = registry_json(entry={**BASE_POLICY, "status": "revoked"},
                                generation=2)
        with self.assertRaisesRegex(IssuerPolicyRejected, "OPERATOR_PIN_MISMATCH"):
            self.review(registry=updated,
                        pin=hashlib.sha256(original).hexdigest())
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_KEY_REVOKED"):
            self.review(registry=updated)
        # This library does not implement generation monotonicity/rollback.
        self.assertFalse(self.review()["registry_generation_rollback_prevented_here"])

    def test_bad_or_duplicate_json_key_rejected_even_when_digest_matches(self):
        bad = (b'{"schema_version":"'+REGISTRY_SCHEMA.encode()+
               b'","generation":1,"generation":2,"issuers":[]}')
        with self.assertRaisesRegex(IssuerPolicyRejected, "DUPLICATE_JSON_KEY"):
            self.review(registry=bad)
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_REGISTRY_INVALID_JSON"):
            self.review(registry=b"{invalid")

    def test_duplicate_key_id_entries_and_unknown_claims_rejected(self):
        raw = registry_json(issuers=[dict(BASE_POLICY), dict(BASE_POLICY)])
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_ENTRY_ID_INVALID"):
            self.review(registry=raw)
        raw = registry_json(entry={**BASE_POLICY, "public_admission": True})
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_ENTRY_SCHEMA_INVALID"):
            self.review(registry=raw)

    def test_bad_source_scope_and_invalid_status_rejected(self):
        for change in (
            {"source_domains":["evil.example"]},
            {"source_domains":["agenz.ma","agenz.ma"]},
            {"source_domains":[]},
        ):
            with self.subTest(change=change):
                with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_SOURCE_SCOPE_INVALID"):
                    self.review(registry=registry_json(entry={**BASE_POLICY,**change}))
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_STATUS_INVALID"):
            self.review(registry=registry_json(entry={**BASE_POLICY,"status":"pending"}))

    def test_window_invalid_issued_outside_or_expiry_after_policy(self):
        raw = registry_json(entry={
            **BASE_POLICY, "valid_until_utc": "2026-11-13T12:08:00Z"})
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_KEY_OUTSIDE_VALIDITY"):
            self.review(registry=raw)
        future = registry_json(entry={**BASE_POLICY,
            "valid_from_utc":"2026-11-14T00:00:00Z"})
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_KEY_OUTSIDE_VALIDITY"):
            self.review(registry=future)
        invalid = registry_json(entry={**BASE_POLICY,
            "valid_from_utc":"2026-12-01T00:00:00Z"})
        with self.assertRaisesRegex(IssuerPolicyRejected, "ISSUER_VALIDITY_RANGE_INVALID"):
            self.review(registry=invalid)

    def test_bound_registry_size_generation_and_clock(self):
        with self.assertRaisesRegex(IssuerPolicyRejected, "BOUNDED_REQUIRED"):
            self.review(registry=b"z"*16385)
        with self.assertRaisesRegex(IssuerPolicyRejected, "SCHEMA_INVALID"):
            self.review(registry=registry_json(generation=False))
        with self.assertRaisesRegex(IssuerPolicyRejected, "OPERATOR_CLOCK_REQUIRED"):
            self.review(now=datetime(2026,11,13,12,10))  # naive clock

    def test_valid_registry_does_not_override_tampered_v3_source_fields(self):
        self.record["fields"]["price_mad"] = 1
        with self.assertRaisesRegex(ValueError, "V3_REPLAY_FIELDS_DIFFER"):
            self.review()

    def test_invalid_key_from_external_keyring_does_not_fallback(self):
        with self.assertRaises(ValueError):
            self.review(keyring={KEY_ID:"00"*32})


if __name__ == "__main__":
    unittest.main()
