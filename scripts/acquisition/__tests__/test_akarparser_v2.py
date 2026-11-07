"""Offline, standard-library-only regression tests for AkarParser V2."""
from __future__ import annotations

import gzip
import hashlib
import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v2 import parse_record, run, sha_file


class TestAkarParserV2(unittest.TestCase):
    def setUp(self):
        self.observed = "2026-09-20T14:05:00+00:00"
        self.base = dict(listing_url="https://www.mubawab.ma/fr/a/12345678/example", source_offer_key="12345678",
                         title="Appartement 3 chambres à vendre Rabat", city="Rabat", property_type="apartment",
                         transaction_type="sale", price_mad=1450000, surface_m2=120, first_seen_at=self.observed,
                         description_snippet="3 chambres et parking")

    def record(self, **kwargs):
        return parse_record({**self.base, **kwargs}, generated_at="2026-11-07T12:00:00+00:00")

    def test_known_real_estate_record_is_internal_not_public(self):
        r = self.record()
        self.assertEqual(r["status"], "ready_internal")
        p = r["canonical_property_v1"]
        self.assertIsNone(p["facts"]["location"]["country"]["value"])
        self.assertEqual(p["offers"][0]["offer_status"], "unknown")
        self.assertEqual(p["offers"][0]["compliance_status"], "review_required")
        self.assertEqual(p["offers"][0]["price_period"], "unknown")
        self.assertFalse(r["quality"]["publication_allowed"])
        self.assertEqual(p["offers"][0]["first_observed_at"], self.observed)

    def test_absent_transaction_not_forced_sale(self):
        r = self.record(title="Appartement Rabat", transaction_type=None, description_snippet="Bel appartement")
        self.assertIsNone(r["extracted"]["transaction_type"])
        self.assertIsNone(r["canonical_property_v1"])
        self.assertNotEqual(r["status"], "ready_internal")

    def test_no_timestamp_not_promoted(self):
        r = self.record(first_seen_at=None, created_at="2026-11-07T12:00:00Z")
        self.assertEqual(r["status"], "complete_candidate")
        self.assertIsNone(r["extracted"]["observed_at"])
        self.assertIsNone(r["canonical_property_v1"])

    def test_url_only_is_candidate(self):
        r = parse_record({"canonical_url": "https://example.ma/category/apartments"}, generated_at="2026-11-07T12:00:00Z")
        self.assertEqual(r["status"], "candidate_url")
        self.assertIsNone(r["canonical_property_v1"])
        self.assertIsNone(r["extracted"]["price_mad"])

    def test_derived_identity_not_trusted(self):
        r = self.record(source_offer_key=None)
        self.assertEqual(r["status"], "complete_candidate")
        self.assertEqual(r["source"]["identity_state"], "url_candidate")

    def test_mismatched_id_quarantined(self):
        r = self.record(source_offer_key="99999999")
        self.assertEqual(r["status"], "quarantine")
        self.assertIn("source_id_conflicts_with_url", r["quality"]["issues"])

    def test_prices_not_silently_converted(self):
        r = self.record(price_mad=None, price="150000 EUR")
        self.assertIsNone(r["extracted"]["price_mad"])
        self.assertNotEqual(r["status"], "ready_internal")

    def test_pii_redaction(self):
        r = self.record(description_snippet="Appelez 0612345678 ou vendeur@example.com")
        self.assertEqual(r["extracted"]["description"], "Appelez [PHONE] ou [EMAIL]")

    def test_features_and_media_rights_remain_non_public(self):
        r = self.record(description_snippet="Avec piscine et terrasse, sans garage", image_urls=["https://example.ma/1.jpg"])
        p = r["canonical_property_v1"]
        self.assertEqual(p["facts"]["features"]["has_pool"]["value"], True)
        self.assertEqual(p["facts"]["features"]["has_terrace"]["value"], True)
        self.assertNotIn("has_garage", p["facts"]["features"])
        self.assertEqual(p["media"][0]["rights_status"], "unknown")
        self.assertEqual(p["media"][0]["publication_permission"], "unknown")

    def test_negative_longitude_preserved(self):
        r = self.record(latitude="33.97", longitude="-6.85")
        p = r["canonical_property_v1"]
        self.assertEqual(p["facts"]["location"]["longitude"]["value"], -6.85)
        self.assertEqual(p["facts"]["location"]["geo_precision"]["value"], "unknown")

    def test_conflicting_declared_currency_is_quarantined(self):
        r = self.record(price_currency="EUR")
        self.assertEqual(r["status"], "quarantine")
        self.assertIn("price_currency_conflicts_with_mad_field", r["quality"]["issues"])

    def test_html_jsonld_offer_price_and_script_noise_ignored(self):
        document = ("<html><head><title>Villa à vendre Rabat</title>"
                    "<script>var unrelated='9900000 MAD';</script>"
                    '<script type="application/ld+json">{"@type":"Offer","offers":{"price":"2150000","priceCurrency":"MAD"}}</script>'
                    "</head><body>Villa 160 m2 à vendre</body></html>")
        raw = dict(listing_url="https://example.ma/property/abc", source_offer_key="abc", city="Rabat", html=document, first_seen_at=self.observed)
        r = parse_record(raw, generated_at="2026-11-07T12:00:00Z")
        self.assertEqual(r["extracted"]["price_mad"], 2150000)
        self.assertEqual(r["extracted"]["surface_total_m2"], 160)
        self.assertEqual(r["extracted"]["property_type"], "villa")
        self.assertFalse(r["quality"]["publication_allowed"])

    def test_neon_style_linked_tables_join_as_read_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db = root / "neon_snapshot.sqlite"
            con = sqlite3.connect(db)
            con.execute("CREATE TABLE property_listings (id INTEGER PRIMARY KEY, title TEXT, city TEXT, property_type TEXT, transaction_type TEXT, price_mad INTEGER, surface_m2 INTEGER)")
            con.execute("CREATE TABLE listing_sources (id INTEGER PRIMARY KEY, property_listing_id INTEGER, source_name TEXT, listing_url TEXT, source_offer_key TEXT, first_seen_at TEXT)")
            con.execute("INSERT INTO property_listings VALUES (1, 'Appartement a vendre Rabat', 'Rabat', 'apartment', 'sale', 1450000, 120)")
            con.execute("INSERT INTO listing_sources VALUES (11, 1, 'mubawab.ma', 'https://www.mubawab.ma/fr/a/12345678/test', '12345678', ?)", (self.observed,))
            con.commit()
            con.close()
            before = sha_file(db)
            m = run(db, root / "out", table="property_listings")
            self.assertEqual(m["counts"]["ready_internal"], 1)
            self.assertEqual(sha_file(db), before)

    def test_sqlite_streaming_idempotent_source_immutable(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "source.sqlite"
            con = sqlite3.connect(source)
            con.execute("CREATE TABLE property_listings (listing_url TEXT, source_offer_key TEXT, title TEXT, city TEXT, property_type TEXT, transaction_type TEXT, price_mad INTEGER, surface_m2 INTEGER, first_seen_at TEXT)")
            row = (self.base[k] for k in ["listing_url", "source_offer_key", "title", "city", "property_type", "transaction_type", "price_mad", "surface_m2", "first_seen_at"])
            con.execute("INSERT INTO property_listings VALUES (?,?,?,?,?,?,?,?,?)", tuple(row))
            con.execute("INSERT INTO property_listings VALUES (?,?,?,?,?,?,?,?,?)", tuple(self.base[k] for k in ["listing_url", "source_offer_key", "title", "city", "property_type", "transaction_type", "price_mad", "surface_m2", "first_seen_at"]))
            con.commit()
            con.close()
            before = sha_file(source)
            r1 = run(source, root / "out1")
            r2 = run(source, root / "out2")
            self.assertTrue(r1["invariants"]["source_unchanged"])
            self.assertEqual(sha_file(source), before)
            self.assertEqual(r1["counts"]["input"], 2)
            self.assertEqual(r1["counts"]["ready_internal"], 1)
            self.assertEqual(r1["counts"]["exact_duplicate_observations"], 1)
            self.assertEqual(r1["files"]["records.jsonl.gz"]["sha256"], r2["files"]["records.jsonl.gz"]["sha256"])
            with gzip.open(root / "out1" / "records.jsonl.gz", "rt") as f:
                self.assertEqual(len([json.loads(line) for line in f]), 1)
            with self.assertRaises(FileExistsError):
                run(source, root / "out1")


if __name__ == "__main__":
    unittest.main()
