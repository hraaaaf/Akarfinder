#!/usr/bin/env python3

import pathlib
import sys
import unittest

HERE = pathlib.Path(__file__).resolve()
sys.path.insert(0, str(HERE.parents[1]))

import canonical_listing_extractor_v2 as parser


class CanonicalListingExtractorV2Tests(unittest.TestCase):
    def test_structured_listing_recovers_all_critical_fields(self):
        html = '''
        <html><head>
          <title>Appartement à vendre à Casablanca</title>
          <script type="application/ld+json">{
            "@type":"Apartment",
            "address":{"@type":"PostalAddress","addressLocality":"Casablanca","addressRegion":"Maarif"},
            "offers":{"@type":"Offer","price":"1250000"},
            "floorSize":{"@type":"QuantitativeValue","value":"92"}
          }</script>
        </head><body>Appartement à vendre. Prix 1 250 000 DH. Superficie 92 m2.</body></html>
        '''
        result = parser.extract_canonical("https://example.ma/bien/appartement-casablanca", html)
        self.assertEqual(result["fields"]["location.city"]["value"], "Casablanca")
        self.assertEqual(result["fields"]["location.neighborhood"]["value"], "Maarif")
        self.assertEqual(result["fields"]["classification.property_type"]["value"], "apartment")
        self.assertEqual(result["fields"]["offer.price_amount"]["value"], 1250000)
        self.assertEqual(result["fields"]["surfaces.surface_total_m2"]["value"], 92)
        self.assertTrue(result["critical_complete"])

    def test_recovers_mdh_city_and_labeled_neighborhood(self):
        html = '''
        <html><head><title>Villa à vendre à Témara</title>
        <meta name="description" content="Quartier Wifaq, superficie 110 m2, prix 1.2 MDH"></head>
        <body>Villa à vendre. Quartier Wifaq. Superficie 110 m2. Prix 1.2 MDH.</body></html>
        '''
        result = parser.extract_canonical("https://example.ma/bien/villa-a-vendre-temara", html)
        self.assertEqual(result["fields"]["location.city"]["value"], "Témara")
        self.assertEqual(result["fields"]["location.neighborhood"]["value"], "Wifaq")
        self.assertEqual(result["fields"]["offer.price_amount"]["value"], 1200000)
        self.assertEqual(result["fields"]["surfaces.surface_total_m2"]["value"], 110)

    def test_labeled_total_surface_beats_first_generic_m2_hit(self):
        html = '''
        <html><head><title>Appartement à vendre à Rabat</title></head>
        <body>Appartement à vendre, terrasse 20 m2. Superficie totale: 105 m2. Prix 1 500 000 DH. Quartier Agdal.</body></html>
        '''
        result = parser.extract_canonical("https://example.ma/bien/appartement-rabat", html)
        self.assertEqual(result["fields"]["surfaces.surface_total_m2"]["value"], 105)
        self.assertEqual(result["fields"]["location.neighborhood"]["value"], "Agdal")

    def test_does_not_invent_neighborhood_when_no_evidence(self):
        html = '''
        <html><head><title>Appartement à vendre à Agadir</title></head>
        <body>Appartement à vendre à Agadir. Superficie 80 m2. Prix 900 000 DH.</body></html>
        '''
        result = parser.extract_canonical("https://example.ma/bien/appartement-agadir", html)
        self.assertEqual(result["fields"]["location.city"]["value"], "Agadir")
        self.assertNotIn("location.neighborhood", result["fields"])
        self.assertFalse(result["critical_complete"])


if __name__ == "__main__":
    unittest.main()
