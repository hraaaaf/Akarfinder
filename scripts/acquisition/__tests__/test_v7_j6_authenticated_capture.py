"""Synthetic signed-capture protocol: real V3 replay, zero external admission."""
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
from v7_multisource.snapshot_evidence import _manifest, EvidenceError
from v7_parallel.j6_authenticated_capture import (
    AttestationRejected, DOMAIN, SCHEMA, review_authenticated_capture,
)

AT = datetime(2026, 11, 13, 12, tzinfo=timezone.utc)
KEY = bytes(range(32))  # Publicly known test vector ONLY. Never an operator secret.
KEY_ID = "test-issuer-not-production"
URL = "https://agenz.ma/fr/annonces/immo-sale/vente-appartements/agdal/444291"
RAW = (b'<html><head><title>Appartement a vendre</title></head><body>'
       b'<h1>Appartement a vendre</h1><p>980 000 DH</p><p>104 m2</p></body></html>')


def sign(attestation):
    payload = DOMAIN + json.dumps(
        {k: v for k, v in attestation.items() if k != "mac_sha256"},
        ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False,
    ).encode("utf-8")
    attestation["mac_sha256"] = hmac.new(KEY, payload, hashlib.sha256).hexdigest()
    return attestation


class J6SignedCaptureTests(unittest.TestCase):
    def setUp(self):
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        self.html = root / "source.html"
        self.manifest = root / "source.manifest.json"
        self.html.write_bytes(RAW)
        self.source_manifest = _manifest(
            URL, RAW, when=AT, method="explicit_single_page_https_get")
        self.manifest.write_text(json.dumps(self.source_manifest), encoding="utf-8")
        self.record = parse_raw({"source_url": URL, "raw_html": RAW.decode()}, AT)
        self.att = sign({
            "schema_version": SCHEMA, "key_id": KEY_ID,
            "issuer": "CI synthetic fixture",
            "source_domain": "agenz.ma", "source_offer_id": "444291",
            "source_url": URL,
            "html_sha256": self.source_manifest["html_sha256"],
            "manifest_sha256": hashlib.sha256(self.manifest.read_bytes()).hexdigest(),
            "captured_at_utc": "2026-11-13T12:00:00Z",
            "issued_at_utc": "2026-11-13T12:05:00Z",
            "expires_at_utc": "2026-11-14T12:05:00Z",
        })

    def gate(self, att=None, **kwargs):
        return review_authenticated_capture(
            self.record, self.html, self.manifest,
            self.att if att is None else att,
            trusted_key_hex=kwargs.get("key", KEY.hex()),
            trusted_key_id=kwargs.get("key_id", KEY_ID),
            now_utc=kwargs.get("now", AT + timedelta(minutes=10)),
        )

    def test_signed_capture_and_real_v3_replay_still_quarantined(self):
        result = self.gate()
        self.assertTrue(result["capture_attestation_mac_valid"])
        self.assertEqual(result["source_proof"]["v3_fields_replayed"], 7)
        self.assertEqual(result["readiness"]["eligible_for_private_staging"], 0)
        self.assertFalse(result["issuer_independently_vetted_here"])
        self.assertFalse(result["durable_replay_ledger_verified"])
        self.assertEqual((result["source_http_requests"], result["db_writes"]), (0, 0))
        self.assertNotIn(KEY.hex(), str(result))

    def test_tampered_signature_rejected(self):
        altered = dict(self.att, mac_sha256="a" * 64)
        with self.assertRaisesRegex(AttestationRejected, "MAC_MISMATCH"):
            self.gate(altered)

    def test_wrong_or_missing_trusted_key_fails_closed(self):
        with self.assertRaisesRegex(AttestationRejected, "MAC_MISMATCH"):
            self.gate(key=("55" * 32))
        with self.assertRaisesRegex(AttestationRejected, "TRUSTED_KEY_REQUIRED"):
            self.gate(key="")
        with self.assertRaisesRegex(AttestationRejected, "TRUSTED_KEY_ID_MISMATCH"):
            self.gate(key_id="untrusted-other")

    def test_signed_url_and_id_mismatch_rejected_even_with_valid_mac(self):
        changed = sign(dict(self.att, source_offer_id="999999"))
        with self.assertRaisesRegex(AttestationRejected, "MANIFEST_BINDING_MISMATCH"):
            self.gate(changed)
        changed = sign(dict(self.att, source_url=URL.replace("agdal", "other")))
        with self.assertRaisesRegex(AttestationRejected, "MANIFEST_BINDING_MISMATCH"):
            self.gate(changed)

    def test_signed_manifest_changes_rejected(self):
        changed = sign(dict(self.att, manifest_sha256="0" * 64))
        with self.assertRaisesRegex(AttestationRejected, "MANIFEST_BINDING_MISMATCH"):
            self.gate(changed)
        self.html.write_bytes(RAW + b" ")
        with self.assertRaises(EvidenceError):
            self.gate()

    def test_signed_capture_does_not_approve_modified_v3_fields(self):
        self.record["fields"]["price_mad"] = 999
        with self.assertRaisesRegex(ValueError, "V3_REPLAY_FIELDS_DIFFER"):
            self.gate()

    def test_expiration_and_future_issuance_rejected(self):
        with self.assertRaisesRegex(AttestationRejected, "TIME_WINDOW_INVALID"):
            self.gate(now=AT + timedelta(days=3))
        changed = sign(dict(self.att, issued_at_utc="2026-11-13T12:20:00Z"))
        with self.assertRaisesRegex(AttestationRejected, "TIME_WINDOW_INVALID"):
            self.gate(changed)

    def test_expiry_limit_and_capture_issuance_gap(self):
        changed = sign(dict(self.att, expires_at_utc="2027-01-13T12:05:00Z"))
        with self.assertRaisesRegex(AttestationRejected, "TIME_WINDOW_INVALID"):
            self.gate(changed)
        changed = sign(dict(self.att, issued_at_utc="2026-11-30T12:05:00Z",
                            expires_at_utc="2026-12-01T12:05:00Z"))
        with self.assertRaisesRegex(AttestationRejected, "TIME_WINDOW_INVALID"):
            self.gate(changed)

    def test_schema_rejects_untrusted_extra_claim(self):
        changed = dict(self.att, private_staging_authorized=True)
        with self.assertRaisesRegex(AttestationRejected, "SCHEMA_INVALID"):
            self.gate(changed)

    def test_issuer_string_not_an_authentication_substitute(self):
        changed = sign(dict(self.att, issuer="trusted-but-not-actually-vetted"))
        result = self.gate(changed)
        self.assertFalse(result["issuer_independently_vetted_here"])
        self.assertFalse(result["eligible_for_private_staging"])


if __name__ == "__main__":
    unittest.main()
