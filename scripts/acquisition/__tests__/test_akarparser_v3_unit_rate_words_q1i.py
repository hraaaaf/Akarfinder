"""Q1I: explicit 'dirhams par mètre carré' never becomes total sale price."""
from datetime import datetime, timezone
from pathlib import Path
import json
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import akarparser_v3_raw_bulk as v3

NOW = datetime(2026, 11, 10, 12, tzinfo=timezone.utc)


def listing(price, description, host="mubawab.ma", sale_title="Appartement à vendre"):
    node = {"@type": "RealEstateListing", "name": sale_title,
            "description": description,
            "offers": {"price": price, "priceCurrency": "MAD",
                       "businessFunction": "http://purl.org/goodrelations/v1#Sell"}}
    html = "<html><head><script type='application/ld+json'>" + json.dumps(
        node, ensure_ascii=False) + "</script></head><body>" + (
        "<p>Immobilier Meknes</p><p>Appartements Meknes</p><p>Hamria</p><p>Obtenir un financement</p><p>70m²</p>"
        if host == "mubawab.ma" else "<p>Casablanca</p>") + "</body></html>"
    url = ("https://www.mubawab.ma/fr/a/8000567/test" if host == "mubawab.ma"
           else "https://domio.ma/fr/appartement/vendre/casablanca/100123/test")
    return v3.parse_raw({"raw_html": html, "source_url": url,
                         "fetched_at": "2026-11-09T15:40:00Z"}, NOW)


class WordedUnitRates(unittest.TestCase):
    def test_mubawab_dirhams_par_metre_carre_suppressed(self):
        for amount, description in (
            (7100, "Le prix de vente est de 7100 dirhams par mètre carré."),
            (12000, "Prix à partir de 12 000 dirhams par mètre carré."),
        ):
            with self.subTest(amount=amount):
                record = listing(amount, description)
                self.assertIsNone(record["fields"]["price_mad"])
                self.assertIsNone(record["fields"]["price_amount_raw"])
                self.assertIsNone(record["fields"]["price_currency_raw"])
                self.assertIn("UNIT_PRICE_RATE_NOT_TOTAL_REQUIRES_REVIEW",
                              record["quality"]["review_reasons"])
                self.assertTrue(record["quality"]["human_review_required"])
                self.assertFalse(record["quality"]["neon_product_admission_authorized"])

    def test_existing_m2_notation_still_suppressed(self):
        record = listing(9500, "Prix à partir de 9 500 DHS /m².")
        self.assertIsNone(record["fields"]["price_mad"])

    def test_domio_written_rate_suppressed_through_shared_rule(self):
        record = listing(7100, "Appartement à vendre. Prix : 7 100 dirhams par mètre carré.",
                         host="domio.ma")
        self.assertIsNone(record["fields"]["price_mad"])
        self.assertIn("DOMIO_UNIT_RATE_SUPPRESSED_AS_TOTAL",
                      record["quality"]["v2_issues"])

    def test_different_explicit_total_is_never_suppressed(self):
        record = listing(1250000, "Prix total 1 250 000 dirhams. "
                         "Prix moyen du quartier : 7 100 dirhams par mètre carré.")
        self.assertEqual(record["fields"]["price_mad"], 1250000)
        self.assertNotIn("UNIT_PRICE_RATE_NOT_TOTAL_REQUIRES_REVIEW",
                         record["quality"]["review_reasons"])

    def test_monthly_financing_is_not_unit_rate(self):
        record = listing(7100, "Financement 7 100 dirhams par mois. Aucun taux au mètre carré.")
        self.assertEqual(record["fields"]["price_mad"], 7100)

    def test_helper_rejects_unsupported_or_nonmatching(self):
        helper = v3.portals.primary_unit_rate_equals_amount
        self.assertFalse(helper(None, 7100))
        self.assertFalse(helper("7100 dirhams par mètre carré", None))
        self.assertFalse(helper("7100 dirhams par mètre carré", 12000))
        self.assertTrue(helper("7100 dirhams par mètre carré", 7100))
        self.assertTrue(helper("12 000 dirhams par metre carre", 12000))
        self.assertFalse(helper("1 200 000 dirhams au total", 1200000))


if __name__ == "__main__":
    unittest.main()
