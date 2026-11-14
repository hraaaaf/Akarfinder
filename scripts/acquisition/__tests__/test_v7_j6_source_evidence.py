"""Deterministic synthetic source byte evidence; no real HTML in Git."""
from __future__ import annotations
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v3_raw_bulk import parse_raw
from v7_multisource.snapshot_evidence import _manifest, EvidenceError
from v7_parallel.j6_source_evidence import review_original_bytes, ProvenanceRejected

AT = datetime(2026, 11, 13, 12, tzinfo=timezone.utc)
URL = "https://agenz.ma/fr/annonces/immo-sale/vente-appartements/agdal/444291"
RAW = ('<html><head><title>Appartement à vendre</title></head><body>'
       '<h1>Appartement à vendre à Rabat</h1><p>980 000 DH</p>'
       '<p>104 m²</p></body></html>').encode("utf-8")


class J6EvidenceTests(unittest.TestCase):
    def setUp(self):
        tmp = TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        self.html = root / "source.html"
        self.manifest = root / "source.manifest.json"
        self.html.write_bytes(RAW)
        self.proof = _manifest(
            URL, RAW, when=AT, method="explicit_single_page_https_get")
        self.manifest.write_text(json.dumps(self.proof), encoding="utf-8")
        self.record = parse_raw({"source_url": URL, "raw_html": RAW.decode("utf-8")}, AT)

    def run_gate(self, pin=None):
        return review_original_bytes(
            self.record, self.html, self.manifest,
            independently_pinned_html_sha256=pin if pin is not None
            else self.proof["html_sha256"])

    def test_matching_bytes_are_not_approval(self):
        res = self.run_gate()
        self.assertEqual(res["v3_fields_replayed"], 7)
        self.assertEqual((res["source_http_requests"], res["db_writes"]), (0, 0))
        self.assertFalse(res["eligible_for_private_staging"])
        self.assertFalse(res["capture_registry_authenticated_here"])

    def test_combined_provenance_and_staging_gate_is_no_write(self):
        from v7_parallel.j6_staging_readiness import review_with_verified_bytes
        result = review_with_verified_bytes(
            self.record, self.html, self.manifest,
            independently_pinned_html_sha256=self.proof["html_sha256"])
        self.assertTrue(result["source_proof"]["html_sha256"])
        self.assertEqual(result["readiness"]["eligible_for_private_staging"], 0)
        self.assertFalse(result["eligible_for_private_staging"])
        self.assertEqual(result["db_writes"], 0)
        self.assertIn("quarantined", result["status"])

    def test_missing_or_wrong_pin_rejected(self):
        with self.assertRaisesRegex(ProvenanceRejected, "SEPARATE_HTML_SHA256_PIN_REQUIRED"):
            self.run_gate(pin="")
        with self.assertRaisesRegex(ProvenanceRejected, "HTML_PIN_MISMATCH"):
            self.run_gate(pin="f"*64)

    def test_html_tampering_detected_before_replay(self):
        self.html.write_bytes(RAW + b" ")
        with self.assertRaises(EvidenceError):
            self.run_gate()

    def test_forged_price_rejected(self):
        self.record["fields"]["price_mad"] = 12345
        with self.assertRaisesRegex(ProvenanceRejected, "V3_REPLAY_FIELDS_DIFFER"):
            self.run_gate()

    def test_url_mismatch_rejected(self):
        self.record["source"]["source_url"] = URL.replace("agdal", "other")
        with self.assertRaisesRegex(ProvenanceRejected, "SOURCE_IDENTITY_MISMATCH"):
            self.run_gate()

    def test_v3_envelope_sha_not_html_sha(self):
        self.assertNotEqual(self.record["raw_sha256"], self.proof["html_sha256"])
        self.record["raw_sha256"] = self.proof["html_sha256"]
        with self.assertRaisesRegex(ProvenanceRejected, "V3_INPUT_ENVELOPE_MISMATCH"):
            self.run_gate()


if __name__ == "__main__":
    unittest.main()
