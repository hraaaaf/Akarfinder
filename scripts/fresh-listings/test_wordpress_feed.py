import unittest
from wordpress_feed import detail_values, leading_property_type

class WordPressTests(unittest.TestCase):
    def test_primary_details_only(self):
        html = '<div id="property-detail-wrap"><ul><li><strong>Prix:</strong><span>35 000.00Dhs</span></li><li><strong>Surface:</strong><span>800 m²</span></li></ul></div><aside><li><strong>Prix:</strong><span>90000000 Dhs</span></li><li><strong>Surface:</strong><span>9999 m²</span></li></aside>'
        self.assertEqual(detail_values(html), {'prix':35000,'devise':'MAD','superficie':800})
    def test_no_assumed_units_or_prices(self):
        html = '<div id="property-detail-wrap"><li><strong>Prix:</strong><span>Sur demande</span></li><li><strong>Surface:</strong><span>800</span></li></div>'
        self.assertEqual(detail_values(html), {})
    def test_explicit_leading_property_type(self):
        self.assertEqual(leading_property_type('https://limmobiliersansfrontieres.com/property/bureau-de-65-m2-a-louer/'), 'bureau')
        self.assertEqual(leading_property_type('https://limmobiliersansfrontieres.com/property/magasin-titre-de-550-m2/'), 'local_commercial')
        self.assertIsNone(leading_property_type('https://limmobiliersansfrontieres.com/property/bien-exceptionnel/'))

if __name__ == '__main__':
    unittest.main()

