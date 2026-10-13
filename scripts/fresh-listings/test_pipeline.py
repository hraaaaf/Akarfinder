import json
import math
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from pipeline import canonical, extract, number, robots_allowed, sieve, Client, export, NoRedirect
import sqlite3

NOW = datetime(2026, 10, 13, 15, tzinfo=timezone.utc)
URL = 'https://daragadir.com/annonces/annonces-immobilieres/vente/terrain-tilila.html'

def html(published='2026-10-12T12:00:00+00:00'):
    return f'''<link rel="canonical" href="{URL}"><meta property="article:published_time" content="{published}">
    <h1>Terrain à Agadir, Tilila : 150m² à 3 600 000 DH</h1><div class="entry-content">Prix : 3 600 000 DH</div>
    <aside><h2>Villa à Founty 250m² 8 000 000 DH</h2></aside><img src="https://example.com/photo.jpg">'''

def row():
    return {**extract(html(), URL), 'verifie_le': NOW.isoformat(), 'http_status': 200}

class PipelineTests(unittest.TestCase):
    def test_full_source_adapter(self):
        r = row()
        self.assertEqual((r['ville'], r['quartier'], r['superficie'], r['prix'], r['type']), ('Agadir', 'Tilila', 150, 3600000, 'terrain'))
        self.assertEqual(sieve(r, NOW), [])
        self.assertNotIn('photo', json.dumps(r))

    def test_old_and_future_dates(self):
        for d, reason in [('2025-07-22T14:10:03+00:00', 'older_than_7_days'), ('2026-10-14T00:00:00+00:00', 'future_publication_date')]:
            r = row()
            r['date_publication'] = d
            self.assertIn(reason, sieve(r, NOW))

    def test_exact_seven_day_boundary(self):
        r = row()
        r['date_publication'] = (NOW - timedelta(days=7)).isoformat()
        self.assertIn('older_than_7_days', sieve(r, NOW))

    def test_modified_is_not_published(self):
        r = extract('<meta property="article:modified_time" content="2026-10-13T00:00:00Z">' + html('').replace('article:published_time', 'unused'), URL)
        self.assertIn('missing_publication_date', sieve(r, NOW))

    def test_no_timezone_no_assumption(self):
        r = row()
        r['date_publication'] = '2026-10-12'
        self.assertIn('missing_publication_date', sieve(r, NOW))

    def test_missing_or_invalid_required_fields(self):
        for field in ['prix', 'superficie']:
            for value in [0, -1, None, True, math.nan, math.inf]:
                r = row()
                r[field] = value
                self.assertIn('invalid_' + field, sieve(r, NOW))
        r = row()
        r['quartier'] = 'inconnu'
        self.assertIn('missing_quartier', sieve(r, NOW))

    def test_related_jsonld_cannot_contaminate(self):
        ld = {'@type': 'Apartment', 'url': 'https://daragadir.com/other', 'offers': {'price': 50, 'priceCurrency': 'MAD'}, 'datePublished': NOW.isoformat()}
        r = extract(html('2025-07-22T14:10:03Z') + '<script type="application/ld+json">' + json.dumps(ld) + '</script>', URL)
        self.assertEqual(r['prix'], 3600000)
        self.assertEqual(r['date_publication'], '2025-07-22T14:10:03Z')

    def test_canonical_mismatch(self):
        r = extract(html().replace(f'href="{URL}"', 'href="https://daragadir.com/other"'), URL)
        self.assertEqual(r['erreur'], 'canonical_mismatch')

    def test_no_price_per_square_meter(self):
        r = extract(html().replace('DH', 'DH par m2'), URL)
        self.assertNotIn('prix', r)

    def test_money_formats(self):
        for raw, expected in [('3 600 000', 3600000), ('1.250.000', 1250000), ('1250000.00', 1250000), ('1 250 000,50', 1250000.5), ('150,5', 150.5)]:
            self.assertEqual(number(raw), expected)
        self.assertIsNone(number('sur demande'))

    def test_robots_wildcard_and_allow_precedence(self):
        robots = 'User-agent: *\nDisallow: /private/*\nAllow: /private/public$\nCrawl-delay: 2\n'
        self.assertEqual(robots_allowed(robots, 'https://site.test/private/secret'), (False, 2))
        self.assertEqual(robots_allowed(robots, 'https://site.test/private/public'), (True, 2))
        self.assertFalse(robots_allowed(robots, 'https://site.test/private/public?x=1')[0])

    def test_network_never_follows_photos_or_redirects(self):
        with patch.object(Client, 'get', return_value='User-agent: *\nAllow: /'):
            client = Client('https://daragadir.com')
        with self.assertRaises(ValueError):
            client.get('https://example.com/photo.jpg')
        with self.assertRaises(ValueError):
            NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.test')

    def test_resume_needs_current_live_verification(self):
        db = sqlite3.connect(':memory:')
        db.execute('CREATE TABLE observations (url TEXT PRIMARY KEY, payload TEXT)')
        r = {**row(), 'run_id': 'previous'}
        db.execute('INSERT INTO observations VALUES (?, ?)', (r['url'], json.dumps(r)))
        with tempfile.TemporaryDirectory() as directory:
            report = export(db, Path(directory), NOW, 200000, {'run_id': 'current'})
            self.assertEqual(report['accepted'], 0)
            self.assertEqual(report['reasons']['not_verified_in_current_run'], 1)
            self.assertEqual(json.loads((Path(directory) / 'annonces fraiches.json').read_text()), [])

    def test_bound_nested_item_and_no_date_invention(self):
        n = {'@type': 'RealEstateListing', 'url': URL, 'offers': {'price': 1250000, 'priceCurrency': 'MAD'}, 'itemOffered': {'@type': 'Apartment', 'address': {'addressLocality': 'Agadir', 'neighborhood': 'Tilila'}, 'floorSize': {'value': 130, 'unitCode': 'MTK'}}}
        r = extract('<script type="application/ld+json">' + json.dumps(n) + '</script>', URL)
        self.assertEqual(r['superficie'], 130)
        self.assertEqual(r['type'], 'appartement')
        self.assertEqual(r['prix'], 1250000)
        self.assertNotIn('date_publication', r)

    def test_foreign_currency_not_converted_and_invalid_area_unit(self):
        n = {'@type': 'RealEstateListing', 'url': URL, 'offers': {'price': 350000, 'priceCurrency': 'EUR'}, 'itemOffered': {'@type': 'Apartment', 'floorSize': {'value': 130, 'unitCode': 'MTR'}}}
        r = extract('<script type="application/ld+json">' + json.dumps(n) + '</script>', URL)
        self.assertNotIn('prix', r)
        self.assertNotIn('superficie', r)

    def test_unavailable_listing_and_noarchive_fail_closed(self):
        n = {'@type': 'RealEstateListing', 'url': URL, 'offers': {'price': 1250000, 'priceCurrency': 'MAD', 'availability': 'https://schema.org/SoldOut'}}
        r = extract('<script type="application/ld+json">' + json.dumps(n) + '</script>', URL)
        self.assertEqual(r['erreur'], 'listing_unavailable')
        r = extract('<meta name="robots" content="noarchive">' + html(), URL)
        self.assertEqual(r['erreur'], 'source_noindex_or_noarchive')

    def test_mubawab_primary_dom_recovers_district_and_area(self):
        url = 'https://www.mubawab.ma/fr/a/123/appartement'
        markup = '<div class="adBread"><a href="https://www.mubawab.ma/fr/sd/marrakech/palmeraie/appartements-a-vendre" title="Palmeraie">Palmeraie</a></div><div class="adDetails"><div class="adDetailFeature">130m²</div></div><aside><a href="https://www.mubawab.ma/fr/sd/rabat/agdal/villas" title="Agdal">Agdal</a><div class="adDetailFeature">500m²</div></aside>'
        r = extract(markup, url)
        self.assertEqual((r['quartier'], r['superficie']), ('Palmeraie', 130))
        self.assertNotIn('date_publication', r)

    def test_starting_price_is_not_exact_price(self):
        r = extract(html().replace('à 3 600 000 DH', 'à partir de 3 600 000 DH'), URL)
        self.assertNotIn('prix', r)

if __name__ == '__main__':
    unittest.main()
