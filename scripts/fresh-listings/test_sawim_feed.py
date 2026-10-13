import unittest
from datetime import datetime, timezone
from sawim_feed import normalize, merge_verified

URL = 'https://sawim.ma/annonce/Abc123/appartement'
FEED = 'https://sawim.ma/recherche.json?sort=recent&page=1'
ITEM = {'id': 'Abc123', 'url': URL, 'title': 'Appartement', 'city': 'Marrakech', 'quartier': 'Guéliz', 'property_type': 'appartement', 'price': 6000, 'currency': 'MAD', 'surface_m2': 56, 'posted_at': '2026-10-12T12:00:00Z', 'category': 'locations', 'price_per': 'month', 'cover': 'https://images.sawim.ma/photo.jpg', 'seller': {'phone': 'private'}}

class FeedTests(unittest.TestCase):
    def test_normalizes_declared_units_and_discards_media_contact(self):
        r = normalize(ITEM, FEED)
        self.assertEqual((r['ville'], r['quartier'], r['superficie'], r['prix'], r['devise']), ('Marrakech', 'Guéliz', 56, 6000, 'MAD'))
        self.assertEqual((r['transaction'], r['periode_prix']), ('location', 'mois'))
        for key in ('cover', 'seller', 'image_count', 'http_status', 'verifie_le'):
            self.assertNotIn(key, r)

    def test_identity_mismatch_is_rejected(self):
        with self.assertRaises(ValueError):
            normalize({**ITEM, 'id': 'Other'}, FEED)
        with self.assertRaises(ValueError):
            normalize({**ITEM, 'url': URL.replace('sawim.ma', 'other.test')}, FEED)

    def test_current_detail_price_and_date_are_used(self):
        r = normalize(ITEM, FEED)
        detail = {'prix': 6500, 'devise': 'MAD', 'date_publication': ITEM['posted_at'], 'preuves': {'prix': 'jsonld:current-detail'}}
        v = merge_verified(r, detail, datetime(2026, 10, 13, tzinfo=timezone.utc))
        self.assertEqual(v['prix'], 6500)
        self.assertEqual(v['preuves']['prix'], 'jsonld:current-detail')
        self.assertEqual(v['http_status'], 200)

    def test_missing_or_conflicting_detail_date_is_rejected(self):
        r = normalize(ITEM, FEED)
        for d in ({}, {'date_publication': '2025-01-01T00:00:00Z'}):
            v = merge_verified(r, d, datetime(2026, 10, 13, tzinfo=timezone.utc))
            self.assertEqual(v['erreur'], 'feed_detail_publication_mismatch')

    def test_foreign_currency_and_null_surface_are_not_fabricated(self):
        r = normalize({**ITEM, 'currency': 'EUR', 'price': 350000, 'surface_m2': None}, FEED)
        self.assertEqual((r['prix'], r['devise']), (350000, 'EUR'))
        self.assertNotIn('superficie', r)

    def test_null_detail_field_keeps_feed_evidence(self):
        r = normalize(ITEM, FEED)
        v = merge_verified(r, {'date_publication': ITEM['posted_at'], 'superficie': None, 'preuves': {'superficie': 'invalid-detail-field'}}, datetime(2026, 10, 13, tzinfo=timezone.utc))
        self.assertEqual(v['superficie'], 56)
        self.assertEqual(v['preuves']['superficie'], r['preuves']['superficie'])

if __name__ == '__main__':
    unittest.main()
