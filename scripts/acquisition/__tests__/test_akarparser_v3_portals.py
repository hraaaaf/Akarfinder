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


    def test_suspicious_sale_price_stays_visible_but_requires_manual_review(self):
        raw = {"source_url": "https://example.test/fiche/13",
               "title": "Appartement à vendre",
               "city": "Casablanca", "district": "Maarif",
               "price_mad": 13000, "surface_m2": 75,
               "property_type": "apartment", "transaction_type": "sale",
               "observed_at": "2026-11-09T16:00:00Z"}
        rec = v3.parse_raw(raw, NOW)
        self.assertEqual(rec["fields"]["price_mad"], 13000.0)
        self.assertEqual(rec["quality"]["status"], "requires_manual_review")
        self.assertIn("LOW_SALE_PRICE_REQUIRES_REVIEW", rec["quality"]["review_reasons"])
        self.assertIn("LOW_SALE_PRICE_PER_M2_REQUIRES_REVIEW", rec["quality"]["review_reasons"])
        self.assertFalse(rec["quality"]["neon_product_admission_authorized"])
        raw.update(price_mad=400000, surface_m2=900)
        rec = v3.parse_raw(raw, NOW)
        self.assertEqual(rec["quality"]["status"], "requires_manual_review")
        self.assertNotIn("LOW_SALE_PRICE_REQUIRES_REVIEW", rec["quality"]["review_reasons"])
        self.assertIn("LOW_SALE_PRICE_PER_M2_REQUIRES_REVIEW", rec["quality"]["review_reasons"])

    def test_normal_rental_price_not_treated_as_low_sale(self):
        raw = {"source_url": "https://example.test/fiche/14",
               "title": "Studio à louer", "city": "Rabat", "district": "Agdal",
               "price_mad": 6200, "surface_m2": 52,
               "property_type": "studio", "transaction_type": "rent",
               "observed_at": "2026-11-09T16:00:00Z"}
        rec = v3.parse_raw(raw, NOW)
        self.assertEqual(rec["quality"]["status"], "ready_internal")
        self.assertEqual(rec["quality"]["review_reasons"], [])

    def test_mubawab_inconsistent_sell_businessfunction_not_trusted(self):
        import json
        obj = {"@context": "https://schema.org", "@type": "RealEstateListing",
               "name": "Studio à louer Rabat",
               "address": {"addressLocality": "Rabat"},
               "offers": {"@type": "Offer", "price": 6200, "priceCurrency": "MAD",
                          "businessFunction": "http://purl.org/goodrelations/v1#Sell"},
               "floorSize": {"@type": "QuantitativeValue", "value": 52,
                             "unitCode": "MTK"}}
        html = ("<html><head><script type='application/ld+json'>" +
                json.dumps(obj) + "</script></head><body>" +
                "<p>Immobilier Rabat</p><p>Appartements Rabat</p><p>Hassan</p>" +
                "<h1>Studio à louer Rabat</h1></body></html>")
        rec = v3.parse_raw({"raw_html": html,
                            "source_url": "https://www.mubawab.ma/fr/a/8123444/test",
                            "fetched_at": "2026-11-09T16:00:00Z"}, NOW)
        self.assertEqual(rec["fields"]["transaction_type"], "rent")
        self.assertEqual(rec["quality"]["status"], "requires_manual_review")
        self.assertIn("SCHEMA_SELL_CONTRADICTS_RENTAL_TEXT", rec["quality"]["review_reasons"])
        self.assertFalse(rec["quality"]["neon_product_admission_authorized"])

    def test_mubawab_sell_metadata_alone_not_transaction_proof(self):
        import json
        obj = {"@type": "RealEstateListing", "name": "Studio sympa",
               "address": {"addressLocality": "Rabat"},
               "offers": {"price": 920000, "priceCurrency": "MAD",
                          "businessFunction": "http://purl.org/goodrelations/v1#Sell"}}
        html = ("<html><head><script type='application/ld+json'>" +
                json.dumps(obj) + "</script></head><body>" +
                "<p>Immobilier Rabat</p><p>Appartements Rabat</p><p>Hassan</p>" +
                "</body></html>")
        rec = v3.parse_raw({"raw_html": html,
                            "source_url": "https://www.mubawab.ma/fr/a/8123445/test",
                            "fetched_at": "2026-11-09T16:00:00Z"}, NOW)
        self.assertIsNone(rec["fields"]["transaction_type"])
        self.assertEqual(rec["quality"]["status"], "partial")

    def test_manual_review_is_written_to_review_bucket_not_ready(self):
        import tempfile
        from pathlib import Path
        import json
        import gzip
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            inp = root / "sample.jsonl"
            good = {"source_url": "https://example.test/good",
                    "title": "Appartement à vendre", "city": "Casablanca",
                    "district": "Maarif", "price_mad": 900000,
                    "surface_m2": 85, "property_type": "apartment",
                    "transaction_type": "sale",
                    "observed_at": "2026-11-09T16:00:00Z"}
            low = dict(good, source_url="https://example.test/low",
                       price_mad=13000)
            inp.write_text(json.dumps(good) + "\n" + json.dumps(low) + "\n",
                           encoding="utf-8")
            result = v3.run(inp, root / "parsed", as_of=NOW)
            self.assertEqual(result["status_counts"]["input"], 2)
            self.assertEqual(result["status_counts"]["ready_internal"], 1)
            self.assertEqual(result["status_counts"]["requires_manual_review"], 1)
            with gzip.open(root / "parsed" / "review.jsonl.gz", "rt",
                           encoding="utf-8") as handle:
                items = [json.loads(line) for line in handle]
            self.assertEqual(len(items), 1)
            self.assertEqual(items[0]["quality"]["status"], "requires_manual_review")
            self.assertFalse(items[0]["quality"]["neon_product_admission_authorized"])

    def test_mubawab_primary_displayed_area_wins_but_disagreement_is_reviewed(self):
        import json
        ld = {"@type": "RealEstateListing",
              "name": "Appartement 119 m² avec terrasse à Val Fleuri",
              "description": "Appartement à vendre 120 m², belle terrasse",
              "offers": {"price": 1800000, "priceCurrency": "MAD"}}
        html = ("<html><head><script type='application/ld+json'>" +
                json.dumps(ld) + "</script></head><body>" +
                "<p>Immobilier Casablanca</p><p>Appartements Casablanca</p>" +
                "<p>Val Fleury</p><p>Obtenir un financement</p>" +
                "<p>100m²</p><p>3 Pièces</p></body></html>")
        rec = v3.parse_raw({"raw_html": html,
                            "source_url": "https://www.mubawab.ma/fr/a/8455001/terrasse",
                            "fetched_at": "2026-11-09T16:00:00Z"}, NOW)
        self.assertEqual(rec["fields"]["surface_total_m2"], 100.0)
        self.assertEqual(rec["field_evidence"]["surface_m2"]["path"],
                         "mubawab.detail_hero.primary_area_m2")
        self.assertEqual(rec["quality"]["status"], "requires_manual_review")
        self.assertIn("PRIMARY_AREA_DIFFERS_FROM_TITLE_AREA",
                      rec["quality"]["review_reasons"])
        self.assertFalse(rec["quality"]["neon_product_admission_authorized"])

    def test_mubawab_explicit_sale_in_source_description_not_schema_sell(self):
        import json
        ld = {"@type": "RealEstateListing", "name": "Studio meublé 28m²",
              "description": "Découvrez ce bien rare à la vente dans la Kasbah",
              "offers": {"price": 890000, "priceCurrency": "MAD",
                         "businessFunction": "http://purl.org/goodrelations/v1#Sell"}}
        html = ("<html><head><script type='application/ld+json'>" +
                json.dumps(ld) + "</script></head><body>" +
                "<p>Immobilier Rabat</p><p>Appartements Rabat</p>" +
                "<p>Les Oudayas</p><p>Obtenir un financement</p>" +
                "<p>28m²</p></body></html>")
        rec = v3.parse_raw({"raw_html": html,
                            "source_url": "https://www.mubawab.ma/fr/a/8455002/studio",
                            "fetched_at": "2026-11-09T16:00:00Z"}, NOW)
        self.assertEqual(rec["fields"]["transaction_type"], "sale")
        self.assertEqual(rec["fields"]["surface_total_m2"], 28.0)
        self.assertNotIn("SCHEMA_SELL_CONTRADICTS_RENTAL_TEXT",
                         rec["quality"]["review_reasons"])
        self.assertFalse(rec["quality"]["neon_product_admission_authorized"])

    def test_mubawab_studio_specific_listing_title_wins_generic_apartment_category(self):
        import json
        ld = {"@type": "RealEstateListing",
              "name": "Studio Neuf de 87 m² avec Grande Terrasse",
              "description": "Studio disponible à la vente",
              "offers": {"price": 1150000, "priceCurrency": "MAD"}}
        html = ("<html><head><script type='application/ld+json'>" +
                json.dumps(ld) + "</script></head><body>" +
                "<p>Immobilier Casablanca</p><p>Appartements Casablanca</p>" +
                "<p>Ferme Bretonne</p><p>Obtenir un financement</p>" +
                "<p>87m²</p></body></html>")
        rec = v3.parse_raw({"raw_html": html,
                            "source_url": "https://www.mubawab.ma/fr/a/8455100/studio",
                            "fetched_at": "2026-11-09T16:00:00Z"}, NOW)
        self.assertEqual(rec["fields"]["property_type"], "studio")
        self.assertEqual(rec["field_evidence"]["property_type"]["path"],
                         "mubawab.jsonld.listing.name.studio")
        self.assertEqual(rec["fields"]["surface_total_m2"], 87.0)
        self.assertFalse(rec["quality"]["neon_product_admission_authorized"])

    def test_mubawab_incidental_marketing_rental_inference_is_suppressed(self):
        import json
        listing = {"@type": "RealEstateListing",
                   "name": "Appartements neufs Palmier Casablanca dès 1,1 MDH",
                   "description": ("Projet immobilier neuf avec option de mise en location "
                                   "pour investisseurs, sans annonce de location directe"),
                   "offers": {"price": 1200000, "priceCurrency": "MAD",
                              "businessFunction": "http://purl.org/goodrelations/v1#Sell"}}
        html = ("<html><head><script type='application/ld+json'>" +
                json.dumps(listing) + "</script></head><body>" +
                "<p>Immobilier Casablanca</p><p>Appartements Casablanca</p>" +
                "<p>Palmier</p><p>Obtenir un financement</p><p>37m²</p></body></html>")
        rec = v3.parse_raw({"raw_html": html,
                            "source_url": "https://www.mubawab.ma/fr/a/8433291/appartements-neufs",
                            "fetched_at": "2026-11-09T16:00:00Z"}, NOW)
        self.assertIsNone(rec["fields"]["transaction_type"])
        self.assertNotEqual(rec["quality"]["status"], "ready_internal")
        self.assertFalse(rec["quality"]["neon_product_admission_authorized"])

    def test_mubawab_explicit_unaccented_a_louer_is_rental(self):
        import json
        listing = {"@type": "RealEstateListing",
                   "name": "Rare: a louer Studio neuf avec grande terrasse",
                   "offers": {"price": 6200, "priceCurrency": "MAD",
                              "businessFunction": "http://purl.org/goodrelations/v1#Sell"}}
        html = ("<html><head><script type='application/ld+json'>" +
                json.dumps(listing) + "</script></head><body>" +
                "<p>Immobilier Casablanca</p><p>Appartements Casablanca</p>" +
                "<p>Les Hôpitaux</p><p>Obtenir un financement</p><p>52m²</p></body></html>")
        rec = v3.parse_raw({"raw_html": html,
                            "source_url": "https://www.mubawab.ma/fr/a/8437981/rare-a-louer-studio",
                            "fetched_at": "2026-11-09T16:00:00Z"}, NOW)
        self.assertEqual(rec["fields"]["transaction_type"], "rent")
        self.assertIn("SCHEMA_SELL_CONTRADICTS_RENTAL_TEXT", rec["quality"]["review_reasons"])

if __name__ == "__main__":
    unittest.main()
