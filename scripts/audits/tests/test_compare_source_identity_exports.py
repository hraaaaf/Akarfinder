import csv
import tempfile
import unittest
from pathlib import Path

from scripts.audits.compare_source_identity_exports import compare, parse_identity


class SourceIdentityTests(unittest.TestCase):
    def test_source_parsers(self):
        self.assertEqual(parse_identity('domio.ma', 'https://domio.ma/fr/appartement/louer/rabat/123/a', '123'), ('ok', ('domio.ma', '123')))
        self.assertEqual(parse_identity('sarout.ma', 'https://sarout.ma/ar/annonce/55/a', '55'), ('ok', ('sarout.ma', '55')))
        self.assertEqual(parse_identity('agenz.ma', 'https://agenz.ma/fr/vente/9', '9'), ('ok', ('agenz.ma', '9')))
        self.assertEqual(parse_identity('domio.ma', 'https://domio.ma/fr/appartement/louer/rabat/123/a', '999')[0], 'mismatch')
        self.assertEqual(parse_identity('agenz.ma', 'https://agenz.ma/fr/vente/9', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')[0], 'opaque_key')
        self.assertEqual(parse_identity('sarouty.ma', 'https://sarouty.ma/fr/annonce/55/a', '')[0], 'unsupported')

    def test_intersection_and_locale_dedup(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = [Path(directory) / name for name in ('left.csv', 'right.csv')]
            data = [
                [('domio.ma', 'https://domio.ma/fr/appartement/louer/rabat/123/a', '123'), ('sarout.ma', 'https://sarout.ma/fr/annonce/55/a', '')],
                [('domio.ma', 'https://domio.ma/en/appartement/louer/rabat/123/a', ''), ('sarout.ma', 'https://sarout.ma/ar/annonce/55/a', '55'), ('sarout.ma', 'https://sarout.ma/fr/annonce/56/b', '')],
            ]
            for path, rows in zip(paths, data):
                with path.open('w', newline='') as handle:
                    writer = csv.writer(handle)
                    writer.writerow(['source_name', 'listing_url', 'source_offer_key'])
                    writer.writerows(rows)
            result = compare(*paths)['sources']
            self.assertEqual(result['domio.ma']['intersection'], 1)
            self.assertEqual(result['sarout.ma']['intersection'], 1)
            self.assertEqual(result['sarout.ma']['right_only'], 1)


if __name__ == '__main__':
    unittest.main()
