"""Q1H: explicit primary offer and conflicting title are never guessed."""
from datetime import datetime, timezone
from pathlib import Path
import json
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import akarparser_v3_raw_bulk as v3

NOW = datetime(2026, 11, 10, 12, tzinfo=timezone.utc)

def doc(title, description, *, schema="Sell", price=1300000, number=8501111):
    listing = {"@type": "RealEstateListing", "name": title,
               "description": description,
               "offers": {"price": price, "priceCurrency": "MAD",
                          "businessFunction": "http://purl.org/goodrelations/v1#" + schema}}
    markup = ("<html><head><script type='application/ld+json'>"
              + json.dumps(listing, ensure_ascii=False)
              + "</script></head><body><p>Immobilier Rabat</p>"
                "<p>Appartements Rabat</p><p>Agdal</p>"
                "<p>Obtenir un financement</p><p>85m²</p></body></html>")
    return v3.parse_raw({"raw_html": markup,
                         "source_url": f"https://www.mubawab.ma/fr/a/{number}/listing",
                         "fetched_at": "2026-11-09T16:00:00Z"}, NOW)

class Q1HPrimaryTransactions(unittest.TestCase):
    def test_sale_in_first_sentence(self):
        a = doc("Appartement lumineux", "Nous mettons en vente cet appartement à Agdal.")
        self.assertEqual(a["fields"]["transaction_type"], "sale")
        self.assertEqual(a["field_evidence"]["transaction_type"]["method"], "portal_detail_explicit")
        self.assertFalse(a["quality"]["human_review_required"])

    def test_sale_heading_in_primary_description(self):
        a = doc("Villa de standing", "Villa en vente au centre, surface 170 m².")
        self.assertEqual(a["fields"]["transaction_type"], "sale")

    def test_rent_in_first_sentence_over_unreliable_schema_sell(self):
        a = doc("Villa d'exception", "Je propose une villa en location longue durée sur l'Avenue.",
                schema="Sell")
        self.assertEqual(a["fields"]["transaction_type"], "rent")
        self.assertIn("SCHEMA_SELL_CONTRADICTS_RENTAL_TEXT", a["quality"]["review_reasons"])
        self.assertTrue(a["quality"]["human_review_required"])
        self.assertFalse(a["quality"]["neon_product_admission_authorized"])

    def test_literal_en_location_not_investment(self):
        a = doc("Appartement meublé", "Cet appartement est en location longue durée pour famille.")
        self.assertEqual(a["fields"]["transaction_type"], "rent")

    def test_marketing_investment_stays_unknown(self):
        a = doc("Appartement investissement", "Projet avec option de mise en location pour investisseurs.")
        self.assertIsNone(a["fields"]["transaction_type"])
        self.assertFalse(a["quality"]["human_review_required"])

    def test_no_inference_from_schema_sell_alone(self):
        a = doc("Appartement lumineux", "Appartement calme, balcon et jardin.",
                schema="Sell")
        self.assertIsNone(a["fields"]["transaction_type"])

    def test_ambiguous_first_sentence_stays_unknown(self):
        a = doc("Appartement lumineux", "Appartement en vente ou en location selon besoin.")
        self.assertIsNone(a["fields"]["transaction_type"])

    def test_title_rent_description_sale_is_flagged_not_assigned(self):
        a = doc("Appartement à louer à Agdal",
                "AGENCE VOUS PROPOSE À LA VENTE ce même appartement avec terrasse.")
        self.assertIsNone(a["fields"]["transaction_type"])
        self.assertIn("PRIMARY_TITLE_DESCRIPTION_TRANSACTION_CONFLICT",
                      a["quality"]["review_reasons"])
        self.assertEqual(a["quality"]["status"], "partial")
        self.assertTrue(a["quality"]["human_review_required"])

    def test_title_sale_description_rent_is_flagged_not_assigned(self):
        a = doc("Appartement à vendre à Agdal",
                "Nous proposons ce même appartement en location longue durée.")
        self.assertIsNone(a["fields"]["transaction_type"])
        self.assertTrue(a["quality"]["human_review_required"])

    def test_matching_title_and_description_is_kept(self):
        a = doc("Villa à louer à Agdal",
                "Villa en location longue durée, immédiatement disponible.", schema="LeaseOut")
        self.assertEqual(a["fields"]["transaction_type"], "rent")
        self.assertNotIn("PRIMARY_TITLE_DESCRIPTION_TRANSACTION_CONFLICT",
                         a["quality"]["review_reasons"])

    def test_secondary_sentence_not_primary_without_old_explicit_proof(self):
        a = doc("Appartement lumineux", "Charmant logement à Agdal. "
                "Possibilité en location pour investisseur.")
        self.assertIsNone(a["fields"]["transaction_type"])

    def test_partial_review_flag_survives_status(self):
        a = doc("Villa à louer à Rabat", "Villa en vente à Rabat.")
        self.assertEqual(a["quality"]["status"], "partial")
        self.assertEqual(a["quality"]["human_review_required"], True)
        self.assertFalse(a["quality"]["neon_product_admission_authorized"])

    def test_vente_prefix_in_title_is_explicit_sale(self):
        a = doc("Vente duplex de 255 m²", "Duplex à Marjane\nNous mettons en vente un duplex.")
        self.assertEqual(a["fields"]["transaction_type"], "sale")
        self.assertIn("title.explicit_transaction", a["field_evidence"]["transaction_type"]["path"])

    def test_vente_ou_location_title_never_assigned_as_sale_only(self):
        for title in ("Vente ou location appartement", "Vente / Location villa"):
            with self.subTest(title=title):
                a = doc(title, "Bel appartement avec terrasse.")
                self.assertIsNone(a["fields"]["transaction_type"])
                self.assertIn("TITLE_CONTAINS_SALE_AND_RENT", a["quality"]["review_reasons"])
                self.assertTrue(a["quality"]["human_review_required"])

    def test_je_mets_en_vente_after_one_line_intro(self):
        a = doc("Immeuble inachevé", "Opportunité pour investisseurs\nJe mets en vente un immeuble.")
        self.assertEqual(a["fields"]["transaction_type"], "sale")

    def test_future_rental_option_not_an_explicit_rental_offer(self):
        a = doc("Vente appartement Agdal", "Vente directe avec possibilité de mise en location.")
        self.assertEqual(a["fields"]["transaction_type"], "sale")

if __name__ == "__main__":
    unittest.main()
