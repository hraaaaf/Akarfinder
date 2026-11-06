"""Fail-closed V646 P1: no cross-row source cores or wrong-city/property shards.
Fixtures are synthetic. Zero network and production database access.
"""
from __future__ import annotations

import sqlite3
import unittest

import akarfinder_scraper as scraper
import benchmark_evidence as evidence
import live_canary
from test_parser_evidence import card


def page(n: int, *, title: str = "Appartement à vendre",
         location: str = "Agdal, Rabat") -> str:
    return "<html><body>" + "".join(
        card(9400000 + k, title=title, district=location) for k in range(n)
    ) + "</body></html>"


class SourceObservationCoherence(unittest.TestCase):
    def test_two_complementary_partial_rows_never_make_a_complete_core(self):
        first = {"id": "9477701", "title": "Appartement", "price_mad": 1200000,
                 "price_source_status": "numeric", "surface_m2": 90,
                 "location": None, "district": None,
                 "link": "https://www.mubawab.ma/fr/a/9477701/appartement"}
        second = {"id": "9477701", "title": None, "price_mad": None,
                  "price_source_status": None, "surface_m2": None,
                  "location": "Rabat", "district": "Agdal",
                  "link": "https://www.mubawab.ma/fr/a/9477701/appartement"}
        counts = evidence.evaluate([first, second])
        self.assertEqual(counts["unique_source_ids"], 1)
        self.assertEqual(counts["complete_core_with_district"], 0)
        self.assertEqual(counts["complete_core_without_district"], 0)
        self.assertEqual(
            counts["historically_enriched_core_with_district_not_a_source_observation"], 1
        )

    def test_one_actual_complete_row_still_counts_once(self):
        a = scraper.parse_listings(card(9400101))[0]
        b = dict(a, district=None, location=None, surface_m2=None)
        c = evidence.evaluate([a, b])
        self.assertEqual(c["complete_core_with_district"], 1)
        self.assertEqual(c["unique_source_ids"], 1)

    def test_import_does_not_concoct_a_complete_record_from_two_cards(self):
        full = scraper.parse_listings(card(9400102))[0]
        first = dict(full, location=None, district=None)
        second = dict(full, title=None, price_mad=None, price_source_status=None,
                      surface_m2=None)
        for row in (first, second):
            row["transaction_type"] = "sale"
        db = scraper.init_db(":memory:")
        try:
            stats, ids = scraper.import_listings(db, [first, second])
            stored = dict(db.execute("SELECT * FROM listings WHERE id=?", (full["id"],)).fetchone())
            self.assertEqual(stats.duplicates, 1)
            self.assertEqual(ids, [full["id"]])
            self.assertEqual(evidence.evaluate([stored])["complete_core_with_district"], 0)
        finally:
            db.close()


class StrictShardContext(unittest.TestCase):
    def test_wrong_city_fails_even_if_cards_are_otherwise_complete(self):
        x = scraper.parse_listings_audited(
            page(10, location="Maârif, Casablanca"), require_locality=True,
            expected_city="Rabat", require_apartment=True)
        self.assertFalse(x.passes_quality)
        self.assertEqual(x.rejected["shard_city_mismatch"], 10)
        self.assertIn("shard_context_violation", x.quality_reasons)

    def test_all_villas_fail_apartment_shard(self):
        x = scraper.parse_listings_audited(
            page(10, title="Villa à vendre"), require_locality=True,
            expected_city="Rabat", require_apartment=True)
        self.assertFalse(x.passes_quality)
        self.assertEqual(x.rejected["shard_non_apartment_or_unconfirmed_type"], 10)

    def test_mixed_or_unknown_type_fails_strictly(self):
        for title in ("Villa et appartement", "Propriété à vendre"):
            with self.subTest(title=title):
                x = scraper.parse_listings_audited(
                    page(10, title=title), require_locality=True,
                    expected_city="Rabat", require_apartment=True)
                self.assertFalse(x.passes_quality)
                self.assertGreater(x.shard_context_violations, 0)

    def test_valid_city_and_explicit_apartment_pass(self):
        x = scraper.parse_listings_audited(
            page(10, location="Maârif, Casablanca"), require_locality=True,
            expected_city="Casablanca", require_apartment=True)
        self.assertTrue(x.passes_quality)
        self.assertEqual(x.shard_context_violations, 0)

    def test_mismatch_of_one_card_rejects_entire_shard(self):
        html = "<html><body>" + "".join(
            card(9400200 + k, district="Agdal, Rabat") for k in range(9)) + (
            card(9400300, district="Maârif, Casablanca") + "</body></html>"
        )
        x = scraper.parse_listings_audited(
            html, require_locality=True, expected_city="Rabat", require_apartment=True)
        self.assertFalse(x.passes_quality)
        self.assertEqual(x.shard_context_violations, 1)

    def test_canary_summary_exposes_strict_context_proof(self):
        x = live_canary.summarise_html(
            page(10, title="Villa à vendre"), require_locality=True,
            expected_city="Rabat", require_apartment=True)
        self.assertFalse(x["quality_accepted"])
        self.assertEqual(x["shard_context_violations"], 10)
        self.assertIsNone(x["counts_for_accepted_page_only"])

    def test_city_derivation_restricted_to_bounded_pilot(self):
        self.assertEqual(
            scraper.expected_city_for_shard(
                "https://www.mubawab.ma/fr/sd/casablanca/ma%C3%A2rif/appartements-a-vendre"
            ), "Casablanca")
        with self.assertRaises(ValueError):
            scraper.expected_city_for_shard("https://www.mubawab.ma/fr/st/tanger/appartements-a-vendre")


if __name__ == "__main__":
    unittest.main()
