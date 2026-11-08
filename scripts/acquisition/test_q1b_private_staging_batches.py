"""Offline tests for the Q1B historical, private-only SQL staging builder."""
import gzip
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

MODULE = Path(__file__).with_name("q1b_private_staging_batches.py")
spec = importlib.util.spec_from_file_location("q1b_staging", MODULE)
q1b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(q1b)

BASE = {
    "source_domain": "example.invalid",
    "source_listing_id": "test-id",
    "canonical_url": "https://example.invalid/offer/1",
    "title": "Fictional private listing 1",
    "city": "Rabat",
    "district": "Agdal",
    "property_type": "apartment",
    "transaction_type": "sale",
    "price": "1000000",
    "currency": "MAD",
    "surface_m2": "65",
    "observation_timestamp": "2026-09-26T12:00:00Z",
    "first_seen_at": "2026-09-26T12:00:00Z",
    "last_seen_at": "2026-09-26T12:00:00Z",
    "rights_status": "UNKNOWN_NOT_PROVEN",
    "quality_status": "HISTORICAL_DETAILED",
    "evidence_stores": "synthetic_test",
}

class Q1BPrivateStagingTests(unittest.TestCase):
    def test_mapping_never_converts_foreign_currency_or_claims_rights(self):
        mapped = q1b.map_observation({**BASE, "currency": "EUR", "price": "120000"})
        self.assertEqual(mapped["price_amount"], "120000")
        self.assertEqual(mapped["price_currency"], "EUR")
        self.assertNotIn("rights_status", mapped)
        self.assertNotIn("seller_name", mapped)
        self.assertNotIn("image_urls", mapped)

    def test_unlicensed_source_status_is_mandatory(self):
        with self.assertRaisesRegex(ValueError, "rights"):
            q1b.map_observation({**BASE, "rights_status": "LICENSED"})
        with self.assertRaisesRegex(ValueError, "quality"):
            q1b.map_observation({**BASE, "quality_status": "ACTIVE"})

    def test_invalid_url_and_nonpositive_price_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "non-HTTPS"):
            q1b.map_observation({**BASE, "canonical_url": "http://example.invalid/offer/1"})
        with self.assertRaisesRegex(ValueError, "nonpositive"):
            q1b.map_observation({**BASE, "price": "-20"})

    def test_sql_uses_private_schema_and_does_not_allow_public_or_images(self):
        sql = q1b.query_for_chunk([q1b.map_observation(BASE)])
        self.assertIn("akarfinder_internal.historical_listing_observations", sql)
        self.assertIn("ON CONFLICT DO NOTHING", sql)
        self.assertIn("observed_at_raw", sql)
        self.assertNotIn("public.property_listings", sql)
        self.assertNotIn("image_urls", sql)
        self.assertNotIn("seller_name", sql)

    def test_two_raw_timestamp_formats_same_instant_are_preserved(self):
        # 23 source IDs in the REAL input have two distinct raw timestamps
        # which collapse to the same parsed instant. Retain both URL records.
        a = dict(BASE)
        b = {**BASE, "canonical_url": "https://example.invalid/offer/2",
             "observation_timestamp": "2026-09-26T12:00:00.000Z"}
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "input.jsonl.gz"
            with gzip.open(source, "wt", encoding="utf-8") as stream:
                for row in [a, b]:
                    stream.write(json.dumps(row) + "\n")
            with source.open("rb") as stream:
                digest = hashlib.file_digest(stream, "sha256").hexdigest()
            with patch.object(q1b, "EXPECTED_SHA256", digest), patch.object(q1b, "EXPECTED_ROWS", 2):
                output = q1b.prepare(source, Path(folder) / "out", 2)
            self.assertEqual(output["rows"], 2)
            payload = (Path(folder) / "out" / "batch-0000.sql").read_text(encoding="ascii")
            self.assertIn("2026-09-26T12:00:00.000Z", payload)
            self.assertIn("2026-09-26T12:00:00Z", payload)

    def test_changed_input_checksum_blocks_all_export(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "bad.jsonl.gz"
            with gzip.open(source, "wt", encoding="utf-8") as stream:
                stream.write(json.dumps(BASE) + "\n")
            with self.assertRaisesRegex(ValueError, "SHA256 changed"):
                q1b.prepare(source, Path(folder) / "output", 200)
            self.assertFalse((Path(folder) / "output").exists())

if __name__ == "__main__":
    unittest.main()
