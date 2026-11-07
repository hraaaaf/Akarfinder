import unittest

from soukimmobilier_feed import normalize_url, sitemap_rows


class SoukImmobilierFeedTests(unittest.TestCase):
    def test_sitemap_urls_are_normalized_and_sorted_by_listing_id(self):
        xml = '''<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://soukimmobilier.com/fr/rabat/appartement/12</loc></url>
          <url><loc>https://www.soukimmobilier.com/fr/casablanca/commerce/20</loc></url>
        </urlset>'''
        rows = sitemap_rows(xml)
        self.assertEqual([row[0] for row in rows], [20, 12])
        self.assertTrue(all(row[1].startswith('https://www.soukimmobilier.com/') for row in rows))

    def test_cross_origin_sitemap_url_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'cross_origin'):
            normalize_url('https://example.com/fr/rabat/appartement/12')


if __name__ == '__main__':
    unittest.main()

