"""Domio primary unit-rate claims must not be admitted as a total listing price."""
from datetime import datetime, timezone
from pathlib import Path
import json
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import akarparser_v3_raw_bulk as parser

NOW = datetime(2026, 11, 10, 12, tzinfo=timezone.utc)
SOURCE_URL = "https://domio.ma/fr/appartement/vendre/casablanca/123001/test"

def listing(price, description, host=SOURCE_URL, *, primary=True):
    data = {"raw_html": None, "source_url": host,
            "fetched_at": "2026-11-09T16:00:00Z"}
    obj = {"@type": "RealEstateListing",
           "name": "Appartement Casablanca",
           "description": description,
           "address": {"addressLocality": "Casablanca"},
           "floorSize": {"value": "107", "unitCode": "MTK"},
           "price": {"@type": "PriceSpecification",
                     "price": str(price), "priceCurrency": "MAD"}}
    html = "<html><head><script type='application/ld+json'>" + json.dumps(obj, ensure_ascii=False) + "</script></head><body><p>Appartement • Acheter</p></body></html>"
    data["raw_html"] = html
    if not primary:
        # Make the description direct input instead of a primary JSON-LD fact.
        data["description"] = description
    return parser.parse_raw(data, NOW)


class DomioUnitRate(unittest.TestCase):
    def test_explicit_9500_dh_per_m2_is_not_total(self):
        record = listing(9500, "Appartement 107 m². Prix : 9 500 DH/m² (négociable)")
        self.assertIsNone(record["fields"]["price_mad"])
        self.assertIsNone(record["fields"]["price_amount_raw"])
        self.assertIsNone(record["fields"]["price_currency_raw"])
        self.assertIn("UNIT_PRICE_RATE_NOT_TOTAL_REQUIRES_REVIEW",
                      record["quality"]["review_reasons"])
        self.assertIn("DOMIO_UNIT_RATE_SUPPRESSED_AS_TOTAL",
                      record["quality"]["v2_issues"])
        self.assertFalse(record["quality"]["neon_product_admission_authorized"])

    def test_distinct_total_price_is_preserved(self):
        record = listing(1016500, "Prix indicatif 9 500 DH/m², vente au prix total 1 016 500 MAD.")
        self.assertEqual(record["fields"]["price_mad"], 1016500)
        self.assertNotIn("UNIT_PRICE_RATE_NOT_TOTAL_REQUIRES_REVIEW",
                         record["quality"]["review_reasons"])

    def test_plain_total_is_not_deleted(self):
        record = listing(1016500, "Prix total 1 016 500 DH pour appartement 107 m².")
        self.assertEqual(record["fields"]["price_mad"], 1016500)

    def test_unit_rate_detector_m2_and_par_m2(self):
        self.assertTrue(parser.explicit_unit_rate_equals_price("Prix : 9 500 DH/m²", 9500))
        self.assertTrue(parser.explicit_unit_rate_equals_price("9500 MAD par m2", 9500))
        self.assertFalse(parser.explicit_unit_rate_equals_price("Prix : 9 500 DH", 9500))
        self.assertFalse(parser.explicit_unit_rate_equals_price("Prix : 9 500 DH/m²", 950000))

    def test_mubawab_unchanged_by_domio_scope(self):
        record = listing(9500, "Prix : 9 500 DH/m²", host="https://www.mubawab.ma/fr/a/1234567/test")
        # Mubawab's separate safeguards are not substituted by the Domio rule.
        self.assertNotIn("DOMIO_UNIT_RATE_SUPPRESSED_AS_TOTAL",
                         record["quality"]["v2_issues"])

if __name__ == "__main__":
    unittest.main()
