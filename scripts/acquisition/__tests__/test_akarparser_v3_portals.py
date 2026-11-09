"""Synthetic, scoped portal-adapter contracts. No real source HTML in Git."""
from datetime import datetime, timezone
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import akarparser_v3_raw_bulk as v3

NOW = datetime(2026, 11, 9, 17, tzinfo=timezone.utc)


class TestPortalAdapters(unittest.TestCase):
    def test_avito_listing_price_not_monthly_credit(self):
        html = """<html><head>
        <meta property="og:title" content="Appartement à vendre - 900 000 DH - Appartements à vendre à Casablanca">
        </head><body><div>Tout le Maroc</div><div>Casablanca</div><div>Roches Noires</div>
        <p>À partir de</p><div>5002 DH / moisFinancez votre bien</div>
        <h1>Appartement à vendre à Casablanca</h1><div>900 000 DH</div>
        <div>71Surface habitable</div></body></html>"""
        item = v3.parse_raw({"raw_html": html,
                             "source_url": "https://www.avito.ma/fr/roches_noires/appartements/Offre_58810316.htm",
                             "fetched_at": "2026-11-09T16:00:00Z"}, NOW)
        fields = item["fields"]
        self.assertEqual(fields["price_mad"], 900000.0)
        self.assertEqual(fields["city"], "Casablanca")
        self.assertEqual(fields["district"], "Roches Noires")
        self.assertEqual(fields["transaction_type"], "sale")
        self.assertEqual(fields["property_type"], "apartment")
        self.assertEqual(fields["surface_total_m2"], 71.0)
        self.assertFalse(item["quality"]["neon_product_admission_authorized"])

    def test_avito_no_price_fails_closed_even_with_mortgage(self):
        html = """<html><head><meta property="og:title"
        content="Appartement à vendre à Casablanca"></head><body>
        <div>Tout le Maroc</div><div>Casablanca</div><div>Roches Noires</div>
        <div>5002 DH / moisFinancez votre bien</div></body></html>"""
        item = v3.parse_raw({"raw_html": html,
                             "source_url": "https://www.avito.ma/fr/roches_noires/appartements/Offre_58810316.htm",
                             "fetched_at": "2026-11-09T16:00:00Z"}, NOW)
        self.assertIsNone(item["fields"]["price_mad"])
        self.assertNotEqual(item["quality"]["status"], "ready_internal")

    def test_agenz_location_and_classification_from_detail_route(self):
        raw = {"raw_html": "<html><head><title>Annonce fictive</title></head><body><h1>Fiche</h1></body></html>",
               "source_url": "https://agenz.ma/fr/annonces/immo-mohammedia/vente-appartements/hay-salam/985511",
               "title": "Appartement de test",
               "price_mad": 780000,
               "surface_m2": 76,
               "fetched_at": "2026-11-09T16:00:00Z"}
        item = v3.parse_raw(raw, NOW)
        fields = item["fields"]
        self.assertEqual(fields["city"], "Mohammedia")
        self.assertEqual(fields["district"], "Hay Salam")
        self.assertEqual(fields["transaction_type"], "sale")
        self.assertEqual(fields["property_type"], "apartment")
        self.assertEqual(item["quality"]["status"], "ready_internal")

    def test_mubawab_neighborhood_from_primary_breadcrumb_only(self):
        html = """<html><head><title>Appartement vente</title></head><body>
        <p>Immobilier Maroc</p><p>Immobilier Casablanca</p>
        <p>Appartements Casablanca</p><p>Les Hôpitaux</p><p>13</p>
        <div>Appartement à vendre 1 400 000 DH</div>
        <div>Surface 99 m²</div></body></html>"""
        raw = {"raw_html": html, "source_url": "https://www.mubawab.ma/fr/a/8419092/test",
               "fetched_at": "2026-11-09T16:00:00Z"}
        item = v3.parse_raw(raw, NOW)
        self.assertEqual(item["fields"]["city"], "Casablanca")
        self.assertEqual(item["fields"]["district"], "Les Hôpitaux")
        self.assertFalse(item["quality"]["neon_product_admission_authorized"])


if __name__ == "__main__":
    unittest.main()
