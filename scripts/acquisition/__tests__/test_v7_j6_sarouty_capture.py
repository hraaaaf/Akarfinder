"""J6 Sarouty original-source attestation synthetic tests. Zero production effects."""
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
from v7_parallel.j6_authenticated_capture import (
    DOMAIN, SCHEMA, review_authenticated_capture,
)
from v7_parallel.j6_source_evidence import ProvenanceRejected, _listing_identity

URL = "https://www.sarouty.ma/acheter/appartement-sale-bab-al-bahr-894012/"
AT = datetime(2026, 11, 13, 17, 37, 19, tzinfo=timezone.utc)
KEY = bytes(range(32))  # Public fixture, never use as a real signing key.
KEY_ID = "test-sarouty-fixture"
HTML = """<!DOCTYPE html><html><head><title>Appartement a vendre - Sale</title>
<link rel="canonical" href="{url}">
<meta property="og:url" content="{url}">
<script type="application/ld+json">{{"@type":"Apartment",
 "name":"Appartement à vendre à Salé","address":{{"addressLocality":"Sale"}},
 "offers":{{"price":3500000,"priceCurrency":"MAD"}},
 "floorSize":{{"value":196,"unitCode":"MTK"}}}}</script>
</head><body><h1>Appartement à vendre à Salé</h1>
<p>3 500 000 DH</p><p>196 m²</p></body></html>"""


def sign(att):
    message = DOMAIN + json.dumps(
        {k: v for k, v in att.items() if k != "mac_sha256"},
        ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False
    ).encode("utf-8")
    att["mac_sha256"] = hmac.new(KEY, message, hashlib.sha256).hexdigest()
    return att


class J6SaroutyOfflineTests(unittest.TestCase):
    def setUp(self):
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)

    def fixture(self, html=None, url=URL):
        raw = (html or HTML.format(url=url)).encode("utf-8")
        self.html_file = self.root / "source.html"
        self.manifest_file = self.root / "source.manifest.json"
        self.html_file.write_bytes(raw)
        m = _manifest(url, raw, when=AT, method="explicit_single_page_https_get")
        self.manifest_file.write_text(json.dumps(m), encoding="utf-8")
        record = parse_raw({"source_url": url, "raw_html": raw.decode("utf-8")}, AT)
        record["source"]["source_offer_id"] = "894012"
        att = sign({
            "schema_version": SCHEMA, "key_id": KEY_ID,
            "issuer": "synthetic Sarouty CI source only",
            "source_domain": "sarouty.ma", "source_offer_id": "894012",
            "source_url": url,
            "html_sha256": m["html_sha256"],
            "manifest_sha256": hashlib.sha256(self.manifest_file.read_bytes()).hexdigest(),
            "captured_at_utc": "2026-11-13T17:37:19Z",
            "issued_at_utc": "2026-11-13T17:40:00Z",
            "expires_at_utc": "2026-11-14T17:40:00Z",
        })
        return record, att

    def gate(self, record, att):
        return review_authenticated_capture(
            record, self.html_file, self.manifest_file, att,
            trusted_key_hex=KEY.hex(), trusted_key_id=KEY_ID,
            now_utc=AT+timedelta(minutes=5),
        )

    def test_real_j4_l8_identity_recognizes_bounded_sarouty_url(self):
        self.assertEqual(_listing_identity(URL), ("sarouty.ma", "894012", URL))

    def test_synthetic_sarouty_replay_can_verify_but_never_stage(self):
        record, att = self.fixture()
        result = self.gate(record, att)
        self.assertTrue(result["capture_attestation_mac_valid"])
        self.assertEqual(result["attested_source_domain"], "sarouty.ma")
        self.assertEqual(result["attested_source_offer_id"], "894012")
        self.assertEqual(result["source_proof"]["v3_fields_replayed"], 7)
        self.assertFalse(result["source_proof"]["geolocation_verified"])
        self.assertFalse(result["source_truth_independently_verified"])
        self.assertFalse(result["durable_replay_ledger_verified"])
        self.assertFalse(result["eligible_for_private_staging"])
        self.assertEqual((result["source_http_requests"], result["db_writes"]), (0, 0))

    def test_missing_canonical_rejected_even_if_hash_and_mac_are_valid(self):
        record, att = self.fixture(html=HTML.format(url=URL).replace(
            '<link rel="canonical" href="'+URL+'">', ""))
        with self.assertRaisesRegex(ProvenanceRejected, "SAROUTY_HTML_CANONICAL_UNVERIFIED"):
            self.gate(record, att)

    def test_og_url_contradiction_rejected_even_with_signed_manifest(self):
        altered = HTML.format(url=URL).replace(
            '<meta property="og:url" content="'+URL+'">',
            '<meta property="og:url" content="'+URL.replace("894012", "894013")+'">')
        record, att = self.fixture(html=altered)
        with self.assertRaisesRegex(ProvenanceRejected, "SAROUTY_HTML_CANONICAL_UNVERIFIED"):
            self.gate(record, att)

    def test_foreign_sarouty_l8_url_rejected(self):
        with self.assertRaises(ProvenanceRejected):
            _listing_identity(URL.replace("894012", "wrong"))

    def test_signed_sarouty_identity_mismatch_rejected(self):
        record, att = self.fixture()
        att = sign(dict(att, source_offer_id="894013"))
        with self.assertRaisesRegex(ValueError, "ATTESTATION_MANIFEST_BINDING_MISMATCH"):
            self.gate(record, att)

    def test_sarouty_cannot_use_agenz_or_mubawab_identity(self):
        record, att = self.fixture()
        record["source"]["source_offer_id"] = "999999"
        with self.assertRaisesRegex(ProvenanceRejected, "SOURCE_IDENTITY_MISMATCH"):
            self.gate(record, att)


if __name__ == "__main__":
    unittest.main()
