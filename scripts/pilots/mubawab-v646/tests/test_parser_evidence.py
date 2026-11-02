"""Deterministic HTML fixtures. SYNTHETIC, not a copy of a Mubawab page."""
import hashlib
from pathlib import Path
import tempfile
import unittest

import akarfinder_scraper as s
import benchmark_evidence as evidence


def card(ident: int, *, price: str = "1 200 000 DH",
         district: str = "Agdal, Rabat", modern: bool = True,
         surface: str = "100 m²", title: str = "Appartement à vendre") -> str:
    title_class = "listingTit" if modern else "listingTitle"
    details = (f'<div class="adDetails"><span class="adDetailFeature">{surface}</span>'
               '<span class="adDetailFeature">3 pièces</span>'
               '<span class="adDetailFeature">2 chambres</span>'
               '<span class="adDetailFeature">1 salle de bain</span></div>') if modern else (
               f'<div class="listingDetails"><span>{surface}</span>'
               '<span>3 pièces</span><span>2 chambres</span></div>')
    locality = f'<div class="listingH3">{district}</div>' if modern and district else ""
    price_class = "priceTag" if modern else "hardPrice"
    return (f'<article class="listingBox" linkref="/fr/a/{ident}/annonce">'
            f'<h2 class="{title_class}">{title}</h2>{locality}'
            f'<strong class="{price_class}">{price}</strong>{details}</article>')


SYNTHETIC_MODERN = (
    '<html><body>' +
    card(7800001) +
    card(7800002, price="Prix à consulter", district="Maârif, Casablanca", surface="80 m²") +
    card(7800003, price="2,5 MDH", district="Guéliz, Marrakech", surface="120 m²") +
    card(7800001) +
    '<div class="listingBox emptyBox"></div>' +
    '<div class="listingBox adBoostBox"><h3>Annonce sponsorisée sans détail</h3></div>' +
    '</body></html>'
)


class ParserEvidenceTests(unittest.TestCase):
    def test_modern_html_card_counts_and_quality(self):
        audit = s.parse_listings_audited(SYNTHETIC_MODERN)
        self.assertEqual((audit.total_cards, audit.eligible_cards, len(audit.listings)), (6, 4, 4))
        self.assertEqual(audit.ignored, {"empty_placeholder": 1, "promotion_without_detail_link": 1})
        self.assertTrue(audit.passes_quality)
        self.assertEqual(audit.price_recognition_coverage, 1.0)
        self.assertEqual(audit.price_on_request_ratio, 0.25)
        self.assertEqual(audit.locality_coverage, 1.0)

    def test_fields_are_not_inferred_from_shard(self):
        row = s.parse_listings(SYNTHETIC_MODERN)[0]
        self.assertEqual(row["id"], "7800001")
        self.assertEqual(row["price_mad"], 1200000)
        self.assertEqual(row["surface_m2"], 100)
        self.assertEqual((row["rooms"], row["bedrooms"], row["bathrooms"]), (3, 2, 1))
        self.assertEqual((row["district"], row["location"]), ("Agdal", "Rabat"))
        self.assertIsNone(row["source_search_url"])
        self.assertIsNone(row["transaction_type"])

    def test_on_request_and_mdh(self):
        rows = s.parse_listings(SYNTHETIC_MODERN)
        self.assertIsNone(rows[1]["price_mad"])
        self.assertEqual(rows[1]["price_source_status"], "on_request")
        self.assertEqual(rows[2]["price_mad"], 2500000)
        self.assertEqual(rows[2]["location"], "Marrakech")

    def test_price_safety_no_invented_numbers(self):
        self.assertEqual(s.parse_price("1 250 000 DH"), 1250000)
        self.assertEqual(s.parse_price("125.000 MAD"), 125000)
        self.assertEqual(s.parse_price("2,5 MDH"), 2500000)
        for raw in ("1.500 MDH", "1 000-2 000 DH", "Prix sur demande", "900 EUR", "0 DH"):
            with self.subTest(raw=raw):
                self.assertIsNone(s.parse_price(raw))

    def test_surface_floor_not_concatenated(self):
        self.assertEqual(s.parse_surface("Étage 2 110 m²"), 110.0)
        self.assertEqual(s.parse_surface("Niveau 3 85 m2"), 85.0)
        self.assertIsNone(s.parse_surface("2 chambres"))

    def test_modern_locality_missing_causes_quality_failure(self):
        audit = s.parse_listings_audited(card(7800004, district=""))
        self.assertEqual(len(audit.listings), 1)
        self.assertEqual(audit.locality_coverage, 0)
        self.assertFalse(audit.passes_quality)
        self.assertIn("locality_coverage_below_threshold", audit.quality_reasons)

    def test_legacy_without_locality_is_not_strictly_complete(self):
        audit = s.parse_listings_audited(card(7800005, modern=False))
        self.assertEqual(len(audit.listings), 1)
        self.assertIsNone(audit.listings[0]["location"])
        self.assertEqual(evidence.evaluate(audit.listings)["complete_core_with_district"], 0)
        # Compatibility parser does not prove full field completeness.
        self.assertTrue(audit.passes_quality)

    def test_rejection_reasons_and_empty_page(self):
        html = ('<div class="listingBox"><span class="listingTit">No link</span></div>'
                '<div class="listingBox" linkref="/fr/a/7800090/x">'
                '<span class="listingTit">No feature</span></div>')
        audit = s.parse_listings_audited(html)
        self.assertEqual(audit.total_cards, 2)
        self.assertEqual(audit.rejected, {"missing_detail_link": 1, "missing_numeric_features": 1})
        self.assertFalse(audit.passes_quality)
        self.assertEqual(s.parse_listings_audited("<html><body></body></html>").total_cards, 0)

    def test_blocked_page_does_not_produce_listings(self):
        audit = s.parse_listings_audited("<html><head><title>Just a moment...</title></head><body></body></html>")
        self.assertEqual(audit.rejected.get("challenge_page"), 1)
        self.assertEqual(audit.listings, [])

    def test_possible_physical_duplicates_remain_separate_ids(self):
        rows = s.parse_listings(card(7800001) + card(7800002))
        for row in rows:
            row["transaction_type"] = "sale"
        hints = s.flag_possible_duplicates(rows)
        self.assertEqual(hints["7800001"], ["7800002"])
        self.assertEqual(hints["7800002"], ["7800001"])
        self.assertEqual(len(rows), 2)

    def test_html_replay_reports_unique_and_strict_fields(self):
        with tempfile.TemporaryDirectory() as tmp:
            modern = Path(tmp) / "synthetic_modern.html"
            legacy = Path(tmp) / "synthetic_legacy.html"
            modern.write_text(SYNTHETIC_MODERN, encoding="utf-8")
            legacy.write_text(card(7800006, modern=False), encoding="utf-8")
            result = evidence.replay_html([modern, legacy])
            self.assertEqual(result["mode"], "SYNTHETIC_HTML_REPLAY")
            self.assertEqual(result["live_network_requests"], 0)
            self.assertEqual(result["counts"]["observed_rows"], 5)
            self.assertEqual(result["counts"]["unique_source_ids"], 4)
            self.assertEqual(result["counts"]["duplicate_source_id_occurrences"], 1)
            self.assertEqual(result["counts"]["complete_core_with_district"], 3)
            self.assertEqual(result["counts"]["complete_core_with_district_numeric_price"], 2)

    def test_historical_sqlite_is_read_only_and_counted(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "archive.sqlite"
            conn = s.init_db(str(path))
            rows = s.parse_listings(card(7800001) + card(7800002, modern=False))
            for row in rows:
                row["transaction_type"] = "sale"
                row["source_search_url"] = s.BASE_URL
            s.import_listings(conn, rows)
            conn.close()
            before = hashlib.sha256(path.read_bytes()).hexdigest()
            result = evidence.inspect_sqlite(path, expected_rows=2)
            after = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(before, after)
            self.assertEqual(result["sqlite_integrity"], "ok")
            self.assertEqual(result["counts"]["unique_source_ids"], 2)
            self.assertEqual(result["counts"]["complete_core_with_district"], 1)
            with self.assertRaisesRegex(ValueError, "drift"):
                evidence.inspect_sqlite(path, expected_rows=97)

    def test_sqlite_import_deduplicates_by_id_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            conn = s.init_db(str(Path(tmp) / "test.sqlite"))
            rows = s.parse_listings(SYNTHETIC_MODERN)
            for row in rows:
                row["transaction_type"] = "sale"
                row["source_search_url"] = s.BASE_URL
            first, first_ids = s.import_listings(conn, rows)
            second, second_ids = s.import_listings(conn, rows)
            self.assertEqual((first.inserted, first.duplicates, len(first_ids)), (3, 1, 3))
            self.assertEqual((second.inserted, second.duplicates, len(second_ids)), (0, 1, 3))
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM listings").fetchone()[0], 3)
            conn.close()


if __name__ == "__main__":
    unittest.main()
