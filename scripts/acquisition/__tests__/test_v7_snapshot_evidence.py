"""Offline-only evidence integrity tests, no source requests or DB."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from v7_multisource.snapshot_evidence import (
    EvidenceError, _manifest, verify_evidence, offline_benchmark, capture_approved_once,
)

URL = "https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/444291"
RAW = b"""<!DOCTYPE html><html><head><title>Appartement a vendre</title>
<meta property="og:description" content="Situ\xC3\xA9 dans le quartier de Tabriquet">
</head><body><h1>Grand appartement</h1>
<p>1 100 000<s>DH</s></p><p>980 000 DH</p><p>Sal\xc3\xa9 - Al Qods</p>
<p>104 m\xc2\xb2</p><p>Frais de syndic : 100 DH</p></body></html>"""
NOW = datetime(2026, 11, 12, 22, 0, 0, tzinfo=timezone.utc)


class SnapshotIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.source = root / "source.html"
        self.manifest = root / "source.manifest.json"
        self.source.write_bytes(RAW)
        self.data = _manifest(URL, RAW, when=NOW, method="explicit_single_page_https_get")
        self.manifest.write_text(json.dumps(self.data), encoding="utf-8")

    def test_sha256_utc_manifest_exact_raw_bytes(self):
        result = verify_evidence(self.source, self.manifest)
        self.assertEqual(result["manifest"]["html_sha256"], hashlib.sha256(RAW).hexdigest())
        self.assertEqual(result["manifest"]["captured_at_utc"], "2026-11-12T22:00:00Z")
        self.assertEqual(result["raw_html"].encode(), RAW)

    def test_mubawab_valid_percent_utf8_original_url_manifest(self):
        mb = "https://www.mubawab.ma/fr/a/8449079/%C3%A0-vendre-%E2%80%93-bel-appartement-%C3%A0-hay-riad-rabat"
        manifest = _manifest(mb, RAW, when=NOW, method="explicit_single_page_https_get")
        self.manifest.write_text(json.dumps(manifest), encoding="utf-8")
        result = verify_evidence(self.source, self.manifest)
        self.assertEqual(result["manifest"]["source_url"], mb)
        for bad in ("%2fadmin", "%2e%2e", "%FF", "%C3"):
            with self.subTest(bad=bad), self.assertRaises(EvidenceError):
                _manifest("https://www.mubawab.ma/fr/a/8449079/" + bad,
                          RAW, when=NOW, method="explicit_single_page_https_get")

    def test_tampered_raw_bytes_are_rejected(self):
        self.source.write_bytes(RAW.replace(b"980 000", b"990 000"))
        with self.assertRaisesRegex(EvidenceError, "EVIDENCE_INTEGRITY_FAILED"):
            verify_evidence(self.source, self.manifest)

    def test_no_forged_status_date_or_extra_manifest_claim(self):
        for key, value in (
            ("http_status", 404), ("capture_method", "invented_live"),
            ("captured_at_utc", "2026-11-12"), ("source_url", "https://evil-agenz.ma/x"),
            ("bytes", len(RAW) + 1),
        ):
            modified = dict(self.data, **{key: value})
            with self.subTest(key=key):
                self.manifest.write_text(json.dumps(modified), encoding="utf-8")
                with self.assertRaises(EvidenceError):
                    verify_evidence(self.source, self.manifest)
        modified = dict(self.data, rights_verified=True)
        self.manifest.write_text(json.dumps(modified), encoding="utf-8")
        with self.assertRaisesRegex(EvidenceError, "INVALID_MANIFEST_FIELDS"):
            verify_evidence(self.source, self.manifest)

    def test_real_v3_l4_paths_without_site_calls(self):
        result = offline_benchmark(self.source, self.manifest)
        self.assertTrue(result["evidence_verified"])
        self.assertEqual(result["field_comparison"]["price_mad"]["v3"], 980000)
        self.assertEqual(result["field_comparison"]["surface_total_m2"]["v3"], 104)
        self.assertFalse(result["real_fields_ground_truthed"])
        self.assertFalse(result["public_admission_authorized"])
        self.assertEqual(result["source_network_requests"], 0)
        self.assertEqual(result["db_writes"], 0)

    def test_network_fetch_requires_both_runtime_and_cli_go(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(EvidenceError, "EXPLICIT_NETWORK_GO_REQUIRED"):
                capture_approved_once(URL, Path(self.tmp.name) / "new", approved=True)
        with patch.dict(os.environ, {"AKAR_SOURCE_NETWORK_APPROVED": "approved"}):
            with self.assertRaisesRegex(EvidenceError, "EXPLICIT_NETWORK_GO_REQUIRED"):
                capture_approved_once(URL, Path(self.tmp.name) / "new", approved=False)

    def test_symlink_and_empty_body_rejected(self):
        sym = Path(self.tmp.name) / "link.html"
        sym.symlink_to(self.source)
        with self.assertRaisesRegex(EvidenceError, "EVIDENCE_MISSING_OR_UNSAFE"):
            verify_evidence(sym, self.manifest)
        with self.assertRaisesRegex(EvidenceError, "INVALID_RAW_CAPTURE"):
            _manifest(URL, b"<main>synthetic-only", when=NOW,
                      method="explicit_single_page_https_get")


if __name__ == "__main__":
    unittest.main()
