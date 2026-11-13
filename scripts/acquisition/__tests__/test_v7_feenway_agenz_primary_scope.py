"""Scoped Agenz page evidence: 10 synthetic, purely offline contracts."""
import unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_multisource.feenway_agenz_primary_scope import evidence


def listing(*, primary='7 500DH / mois', description='Location longue durée : 7 700 DH / mois',
            area='Surface84 m²', similar='12 000DH / mois', secondary='Loyer mensuel 7 500 DH'):
    return ('<!doctype html><html><main><h1>Appartement à louer</h1>'
            '<section><h2>Description</h2><p>' + description + '</p></section>'
            '<section><h2>Caractéristiques</h2><ul><li>' + area + '</li></ul></section>'
            '<section><h2>Coût mensuel</h2>' + primary + '<p>' + secondary + '</p></section>'
            '<section><h2>Annonces similaires</h2><article>' + similar + '</article></section>'
            '</main></html>')


class ScopedProofTest(unittest.TestCase):
    def test_main_conflict_is_hard_review(self):
        r=evidence(listing())
        self.assertEqual((r['primary_rent_mad'],r['description_long_term_rent_mad']),(7500,7700))
        self.assertEqual(r['primary_rent_period'],'month')
        self.assertEqual(r['description_period'],'month')
        self.assertEqual(r['characteristics_surface_m2'],84)
        self.assertTrue(r['primary_price_description_conflict'])
        self.assertIn('AGENZ_PRIMARY_VS_DESCRIPTION_RENT_PRICE_CONFLICT',r['manual_review_reasons'])
        self.assertFalse(r['public_admission_authorized'])
    def test_same_values_not_conflict_but_never_admission(self):
        r=evidence(listing(description='Location longue durée : 7 500 DH / mois'))
        self.assertFalse(r['primary_price_description_conflict'])
        self.assertTrue(r['needs_manual_review'])
        self.assertFalse(r['availability_verified'])
    def test_recommendations_excluded(self):
        r=evidence(listing(description='Appartement propre',similar='7 700DH / mois'))
        self.assertEqual(r['primary_rent_mad'],7500)
        self.assertIsNone(r['description_long_term_rent_mad'])
        self.assertFalse(r['primary_price_description_conflict'])
    def test_multiple_primary_values_blocked(self):
        r=evidence(listing(primary='7 500 DH / mois et 10 000 DH / mois'))
        self.assertIsNone(r['primary_rent_mad'])
        self.assertIn('PRIMARY_RENT_PRICE_AMBIGUOUS',r['manual_review_reasons'])
    def test_multiple_surface_values_blocked(self):
        r=evidence(listing(area='Surface84 m²</li><li>Surface92 m²'))
        self.assertIsNone(r['characteristics_surface_m2'])
    def test_surface_outside_properties_not_counted(self):
        r=evidence(listing(area='Chambres2',similar='Studio Surface84 m²'))
        self.assertIsNone(r['characteristics_surface_m2'])
    def test_missing_main_returns_no_fields(self):
        r=evidence('<html><h2>Coût mensuel</h2>7500DH/mois</html>')
        self.assertIn('UNIQUE_SOURCE_MAIN_MISSING',r['manual_review_reasons'])
        self.assertIsNone(r['primary_rent_mad'])
    def test_unsafe_non_html_input_rejected(self):
        with self.assertRaises(ValueError):evidence(None)
    def test_no_description_cannot_invent_amount(self):
        r=evidence(listing().replace('<h2>Description</h2>','<h2>Informations</h2>'))
        self.assertIsNone(r['description_long_term_rent_mad'])
        self.assertIn('DESCRIPTION_SECTION_MISSING',r['manual_review_reasons'])
    def test_no_listing_price_from_similar(self):
        r=evidence(listing(primary='Aucun prix',secondary='Prix non communiqué'))
        self.assertIsNone(r['primary_rent_mad'])
        self.assertFalse(r['primary_price_description_conflict'])


if __name__ == '__main__':
    unittest.main()
