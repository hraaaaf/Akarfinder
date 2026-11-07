import json
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

from bulk_collect import merge_checkpoint
from pipeline import extract, title_district, atomic_json


class BulkTests(unittest.TestCase):
    def test_snapshot_recovers_transient_windows_file_lock(self):
        original = Path.replace
        attempts = []
        def replace(path, target):
            attempts.append(target)
            if len(attempts) < 3:
                raise PermissionError('transient reader lock')
            return original(path, target)
        with tempfile.TemporaryDirectory() as folder:
            destination = Path(folder) / 'report.json'
            with patch.object(Path, 'replace', replace), patch('pipeline.time.sleep'):
                atomic_json(destination, {'accepted': 840})
            self.assertEqual(json.loads(destination.read_text()), {'accepted': 840})

    def test_title_district_requires_one_city_specific_name(self):
        self.assertEqual(title_district('Appartement Agdal a Rabat', 'Rabat'), 'Agdal')
        self.assertEqual(title_district('Villa Haut Founty', 'Agadir'), 'Haut Founty')
        self.assertIsNone(title_district('Appartement proche de Agdal', 'Rabat'))
        self.assertIsNone(title_district('Agdal et Souissi', 'Rabat'))
        self.assertIsNone(title_district('Agdal', 'Unknown'))

    def test_merge_preserves_newer_verification(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'worker.sqlite'
            destination = sqlite3.connect(':memory:')
            destination.execute('CREATE TABLE observations (url TEXT PRIMARY KEY,payload TEXT NOT NULL)')
            old = {'url': 'https://example.com/a', 'verifie_le': '2026-10-13T01:00:00Z', 'http_status': 200}
            newer = {**old, 'verifie_le': '2026-10-14T01:00:00Z'}
            destination.execute('INSERT INTO observations VALUES (?,?)', (old['url'], json.dumps(newer)))
            with sqlite3.connect(source) as worker:
                worker.execute('CREATE TABLE observations (url TEXT PRIMARY KEY,payload TEXT NOT NULL)')
                worker.execute('INSERT INTO observations VALUES (?,?)', (old['url'], json.dumps(old)))
            worker.close()
            self.assertEqual(merge_checkpoint(destination, source), 0)
            self.assertEqual(json.loads(destination.execute('SELECT payload FROM observations').fetchone()[0]), newer)
            destination.close()

    def test_agenz_bound_fields_exclude_old_price_and_related_properties(self):
        url = 'https://agenz.ma/fr/annonces/immo-fes/vente-appartements/saada/720154'
        property_item = {'url': url, 'type': 'Apartment', 'floorSize': 146}
        breadcrumb = {'@type': 'BreadcrumbList', 'itemListElement': [
            {'name': 'Fes', 'item': 'https://agenz.ma/fr/acheter/immo-fes'},
            {'name': 'Saada', 'item': 'https://agenz.ma/fr/acheter/immo-fes/vente-appartements/saada'},
            {'item': property_item}]}
        listing = {'@type': 'RealEstateListing', 'url': url, 'datePosted': '2026-10-13T14:25:51Z', 'abstract': 'Appartement de 146 m2.'}
        page = '<script type="application/ld+json">' + json.dumps([listing, breadcrumb]) + '</script>'
        page += '<s data-price="950000">950000 DH</s><span item-prop="price"><span data-price="850000">850000</span><span data-currency-symbol>DH</span></span><aside><b data-price="1150000">1150000</b></aside>'
        row = extract(page, url)
        self.assertEqual((row['ville'], row['quartier'], row['superficie'], row['prix'], row['type']), ('Fes', 'Saada', 146, 850000, 'appartement'))
        unrelated = page.replace(url, 'https://agenz.ma/fr/annonces/immo-fes/vente-appartements/saada/999999')
        self.assertNotIn('prix', extract(unrelated, url))
        ambiguous = page.replace('Appartement de 146 m2.', 'Appartement de 146 m2 et terrasse de 20 m2.')
        self.assertNotIn('superficie', extract(ambiguous, url))
        fallback = page.split('<s data-price', 1)[0] + '<div id="avis-container" data-prix="850000"><span data-currency-symbol>DH</span></div><aside data-prix="1150000">Related</aside>'
        self.assertEqual(extract(fallback, url)['prix'], 850000)


if __name__ == '__main__':
    unittest.main()
