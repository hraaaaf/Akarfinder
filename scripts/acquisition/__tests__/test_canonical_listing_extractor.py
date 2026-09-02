import importlib.util
import pathlib
import sys
import unittest

ACQ_DIR = pathlib.Path(__file__).parents[1]
MODULE_PATH = ACQ_DIR / "canonical_listing_extractor.py"
SPEC = importlib.util.spec_from_file_location("canonical_listing_extractor", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class CanonicalListingExtractorTests(unittest.TestCase):
    def test_mubawab_style_detail_extracts_supported_fields(self):
        html = """
        <html><head>
          <title>Appartement à vendre à Agdal Rabat - 1 850 000 DH</title>
          <meta name="description" content="Appartement de 120 m² avec 3 chambres, 2 salles de bain, parking. Orientation sud." />
          <script type="application/ld+json">
          {"@type":"Product","name":"Appartement Agdal","offers":{"@type":"Offer","price":"1850000"},
           "floorSize":{"@type":"QuantitativeValue","value":"120","unitCode":"MTK"},
           "address":{"@type":"PostalAddress","addressLocality":"Rabat","streetAddress":"Agdal"}}
          </script>
        </head><body>Appartement à vendre. 3 chambres. 2 salles de bain. Parking. Orientation: sud.</body></html>
        """
        out = MODULE.extract_canonical("https://www.mubawab.ma/fr/a/123456/appartement-agdal-rabat", html)
        self.assertEqual(out["page_kind"], "listing_detail")
        self.assertEqual(out["fields"]["classification.property_type"]["value"], "apartment")
        self.assertEqual(out["fields"]["offer.transaction_type"]["value"], "sale")
        self.assertEqual(out["fields"]["offer.price_amount"]["value"], 1850000)
        self.assertEqual(out["fields"]["surfaces.surface_total_m2"]["value"], 120)
        self.assertEqual(out["fields"]["layout.bedrooms_count"]["value"], 3)
        self.assertEqual(out["fields"]["layout.bathrooms_count"]["value"], 2)
        self.assertEqual(out["fields"]["location.city"]["value"], "Rabat")
        self.assertEqual(out["fields"]["location.neighborhood"]["value"], "Agdal")
        self.assertTrue(out["fields"]["features.has_parking"]["value"])
        self.assertEqual(out["fields"]["building.orientation"]["value"], "sud")

    def test_marocannonces_style_detail_preserves_first_property_concept(self):
        html = """
        <html><head><title>Terrain à vendre pour projet villa à Bouskoura</title></head>
        <body>Terrain à vendre, 450 m2, prix 2 100 000 DH. Idéal pour construction villa.</body></html>
        """
        out = MODULE.extract_canonical(
            "https://www.marocannonces.com/categorie/316/annonce/987654/terrain-bouskoura.html", html
        )
        self.assertEqual(out["page_kind"], "listing_detail")
        self.assertEqual(out["fields"]["classification.property_type"]["value"], "land")
        self.assertEqual(out["fields"]["offer.transaction_type"]["value"], "sale")
        self.assertEqual(out["fields"]["surfaces.surface_total_m2"]["value"], 450)
        self.assertEqual(out["fields"]["offer.price_amount"]["value"], 2100000)

    def test_long_tail_property_path_extracts_riad_not_villa(self):
        html = """
        <html><head><title>Riad à vendre à Essaouira</title>
        <meta name="description" content="Riad de 300 m², 5 chambres, 4 salles de bain, garage." /></head>
        <body>Riad à vendre à Essaouira. 5 chambres. 4 salles de bain. Garage.</body></html>
        """
        out = MODULE.extract_canonical("https://proimmobilier.ma/property/riad-medina-essaouira", html)
        self.assertEqual(out["page_kind"], "listing_detail")
        self.assertEqual(out["fields"]["classification.property_type"]["value"], "riad")
        self.assertTrue(out["fields"]["features.has_garage"]["value"])

    def test_discovery_page_is_not_promoted_to_listing(self):
        html = """
        <html><head><title>Appartements à vendre au Maroc</title></head>
        <body>Découvrez 1200 appartements à vendre. Prix dès 500 000 DH. Surfaces de 40 m2 à 200 m2.</body></html>
        """
        out = MODULE.extract_canonical("https://example.ma/acheter/appartement", html)
        self.assertEqual(out["page_kind"], "discovery")
        self.assertEqual(out["fields"], {})

    def test_ambiguous_page_rejects_unsupported_identity(self):
        html = "<html><head><title>Opportunité immobilière à Rabat</title></head><body>Très belle opportunité.</body></html>"
        out = MODULE.extract_canonical("https://example.ma/item/abc", html)
        self.assertEqual(out["page_kind"], "unknown")
        self.assertEqual(out["fields"], {})

    def test_no_negative_boolean_inference(self):
        html = """
        <html><head><title>Villa à vendre à Rabat</title></head>
        <body>Villa à vendre, 300 m2, 4 500 000 DH.</body></html>
        """
        out = MODULE.extract_canonical("https://example.ma/property/villa-rabat", html)
        self.assertEqual(out["page_kind"], "listing_detail")
        self.assertNotIn("features.has_parking", out["fields"])
        self.assertNotIn("features.has_garage", out["fields"])


if __name__ == "__main__":
    unittest.main()
