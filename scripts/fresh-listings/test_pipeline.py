import json
import math
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from pipeline import canonical, explicit_quartier, extract, number, robots_allowed, sieve, Client, export, NoRedirect
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
    def test_boolean_class_attributes(self):
        r = extract(html() + "<div class><a class href='/'>Text</a></div>", URL)
        self.assertEqual(r["quartier"], "Tilila")

    def test_full_source_adapter(self):
        r = row()
        self.assertEqual((r['ville'], r['quartier'], r['superficie'], r['prix'], r['type']), ('Agadir', 'Tilila', 150, 3600000, 'terrain'))
        self.assertEqual(sieve(r, NOW), [])
        self.assertNotIn('photo', json.dumps(r))

    def test_old_and_future_dates(self):
        for d, reason in [('2025-07-22T14:10:03+00:00', 'older_than_30_days'), ('2026-10-14T00:00:00+00:00', 'future_publication_date')]:
            r = row()
            r['date_publication'] = d
            self.assertIn(reason, sieve(r, NOW))

    def test_exact_thirty_day_boundary(self):
        r = row()
        r['date_publication'] = (NOW - timedelta(days=30)).isoformat()
        self.assertIn('older_than_30_days', sieve(r, NOW))

    def test_description_fallback_is_bound_and_unambiguous(self):
        url = 'https://1immo.ma/appartement-123'
        node = {'@type': 'RealEstateListing', 'url': url, 'description': 'Appartement de 80m2, quartier Agdal.'}
        page = '<script type="application/ld+json">' + json.dumps(node) + '</script>'
        r = extract(page, url)
        self.assertEqual((r['superficie'], r['quartier']), (80, 'Agdal'))
        node['description'] = 'Appartement 80m2 et terrasse 20m2, quartier calme.'
        r = extract('<script type="application/ld+json">' + json.dumps(node) + '</script>', url)
        self.assertNotIn('superficie', r)
        self.assertNotIn('quartier', r)
        node['url'] = 'https://1immo.ma/autre-456'
        self.assertNotIn('quartier', extract('<script type="application/ld+json">' + json.dumps(node) + '</script>', url))

    def test_1immo_title_surface_fallback(self):
        url = 'https://1immo.ma/appartement-123'
        self.assertEqual(extract('<h1>Appartement 141 m2 a Safi</h1>', url)['superficie'], 141)
        self.assertNotIn('superficie', extract('<h1>Appartement 141 m2 terrasse 20 m2</h1>', url))

    def test_1immo_explicit_price_and_type_fallbacks(self):
        url = 'https://1immo.ma/local-commercial-123'
        node = {'@type': 'RealEstateListing', 'url': url, 'description': 'Prix ferme 1 250 000 DH.'}
        page = '<h1>Local commercial a vendre</h1><script type="application/ld+json">' + json.dumps(node) + '</script>'
        row = extract(page, url)
        self.assertEqual((row['prix'], row['devise'], row['type']), (1250000, 'MAD', 'local_commercial'))
        node['description'] = 'Prix a partir de 1 250 000 DH.'
        row = extract('<h1>Local commercial</h1><script type="application/ld+json">' + json.dumps(node) + '</script>', url)
        self.assertNotIn('prix', row)

    def test_soukimmobilier_url_type_and_title_district(self):
        url = 'https://www.soukimmobilier.com/fr/casablanca/commerce/58864850'
        node = {
            '@type': 'RealEstateListing', 'url': url, 'datePosted': NOW.isoformat(),
            'address': {'addressLocality': 'Casablanca'},
            'floorSize': {'value': 65, 'unitCode': 'MTK'},
            'offers': {'price': 13000, 'priceCurrency': 'MAD'},
        }
        page = '<h1>Magasin aménagé au quartier Maarif</h1><script type="application/ld+json">' + json.dumps(node) + '</script>'
        row = extract(page, url)
        self.assertEqual((row['type'], row['quartier']), ('local_commercial', 'Maarif'))
        self.assertEqual(row['preuves']['type'], 'soukimmobilier:canonical-url:property-category')

    def test_explicit_quartier_requires_one_labelled_non_generic_value(self):
        self.assertEqual(explicit_quartier('Appartement quartier Hay Salam résidence Tarik'), 'Hay Salam')
        self.assertEqual(explicit_quartier('Terrain dans le quartier El Mallah (Hay Salam)'), 'El Mallah')
        self.assertEqual(explicit_quartier('Terrain dans le quartier Charaf à Sidi Kacem'), 'Charaf')
        self.assertIsNone(explicit_quartier('Appartement dans un quartier calme'))

    def test_twenty_nine_days_is_fresh(self):
        r = row()
        r['date_publication'] = (NOW - timedelta(days=29)).isoformat()
        self.assertEqual(sieve(r, NOW), [])

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

    def test_resume_reuses_recent_verification_but_rejects_expired(self):
        db = sqlite3.connect(':memory:')
        db.execute('CREATE TABLE observations (url TEXT PRIMARY KEY, payload TEXT)')
        r = {**row(), 'run_id': 'previous'}
        db.execute('INSERT INTO observations VALUES (?, ?)', (r['url'], json.dumps(r)))
        with tempfile.TemporaryDirectory() as directory:
            report = export(db, Path(directory), NOW, 200000, {'run_id': 'current'})
            self.assertEqual(report['accepted'], 1)
            self.assertEqual(len(json.loads((Path(directory) / 'annonces fraiches.json').read_text())), 1)
            r['verifie_le'] = (NOW - timedelta(hours=25)).isoformat()
            db.execute('UPDATE observations SET payload = ?', (json.dumps(r),))
            report = export(db, Path(directory), NOW, 200000, {'run_id': 'current'})
            self.assertEqual(report['accepted'], 0)
            self.assertEqual(report['reasons']['verification_expired_or_future'], 1)

    def test_bound_nested_item_and_no_date_invention(self):
        n = {'@type': 'RealEstateListing', 'url': URL, 'offers': {'price': 1250000, 'priceCurrency': 'MAD'}, 'itemOffered': {'@type': 'Apartment', 'address': {'addressLocality': 'Agadir', 'neighborhood': 'Tilila'}, 'floorSize': {'value': 130, 'unitCode': 'MTK'}}}
        r = extract('<script type="application/ld+json">' + json.dumps(n) + '</script>', URL)
        self.assertEqual(r['superficie'], 130)
        self.assertEqual(r['type'], 'appartement')
        self.assertEqual(r['prix'], 1250000)
        self.assertNotIn('date_publication', r)

    def test_foreign_currency_preserved_and_invalid_area_unit(self):
        n = {'@type': 'RealEstateListing', 'url': URL, 'offers': {'price': 350000, 'priceCurrency': 'EUR'}, 'itemOffered': {'@type': 'Apartment', 'floorSize': {'value': 130, 'unitCode': 'MTR'}}}
        r = extract('<script type="application/ld+json">' + json.dumps(n) + '</script>', URL)
        self.assertEqual((r['prix'], r['devise']), (350000, 'EUR'))
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

    def test_date_posted_and_bound_main_entity(self):
        u = 'https://www.marocimmo.com/fr/annonces/studio-casablanca-702'
        n = {'@type': 'RealEstateListing', 'url': u, 'datePosted': '2026-10-12T12:00:00Z', 'offers': {'price': 1120000, 'priceCurrency': 'MAD'}, 'mainEntity': {'@type': 'Apartment', '@id': u + '#bien', 'address': {'addressLocality': 'Casablanca'}, 'containedInPlace': {'name': 'Maârif'}, 'floorSize': {'value': 39, 'unitCode': 'MTK'}}}
        r = extract('<script type="application/ld+json">' + json.dumps(n) + '</script>', u)
        self.assertEqual((r['ville'], r['quartier'], r['superficie'], r['prix']), ('Casablanca', 'Maârif', 39, 1120000))
        self.assertEqual(sieve({**r, 'verifie_le': NOW.isoformat(), 'http_status': 200}, NOW), [])

    def test_foreign_main_entity_is_not_rebound(self):
        n = {'@type': 'RealEstateListing', 'url': URL, 'mainEntity': {'@type': 'Apartment', 'url': 'https://daragadir.com/other', 'floorSize': {'value': 999, 'unitCode': 'MTK'}}}
        r = extract('<script type="application/ld+json">' + json.dumps(n) + '</script>', URL)
        self.assertNotIn('superficie', r)

    def test_conflicting_posted_and_published_dates(self):
        n = {'@type': 'RealEstateListing', 'url': URL, 'datePosted': '2026-10-12T12:00:00Z', 'datePublished': '2025-01-01T12:00:00Z'}
        r = extract('<script type="application/ld+json">' + json.dumps(n) + '</script>', URL)
        self.assertEqual(r['erreur'], 'conflicting_publication_dates')

    def test_offer_nested_property_and_explicit_dom_area(self):
        u = 'https://sawim.ma/annonce/Abc123/villa'
        n = {'@type': 'RealEstateListing', 'url': u, 'datePosted': '2026-10-12T12:00:00Z', 'mainEntity': {'@type': 'Offer', 'url': u, 'price': 2000000, 'priceCurrency': 'MAD', 'itemOffered': {'@type': 'House', 'address': {'addressLocality': 'Marrakech'}, 'containedInPlace': {'name': 'Targa, Marrakech'}}}}
        markup = '<dl><dt>Type de bien</dt><dd>Villa</dd><dt>Surface habitable</dt><dd>150 m²</dd></dl>'
        r = extract('<script type="application/ld+json">' + json.dumps(n) + '</script>' + markup, u)
        self.assertEqual((r['type'], r['quartier'], r['superficie'], r['prix']), ('villa', 'Targa', 150, 2000000))
        r = extract('<script type="application/ld+json">' + json.dumps(n) + '</script>' + markup.replace('150 m²', '150'), u)
        self.assertNotIn('superficie', r)

    def test_unicode_urls_are_encoded_without_double_encoding(self):
        self.assertEqual(canonical('https://www.avito.ma/fr/appartement_à_1.htm'), 'https://www.avito.ma/fr/appartement_%C3%A0_1.htm')
        self.assertEqual(canonical('https://www.avito.ma/fr/appartement_%C3%A0_1.htm'), 'https://www.avito.ma/fr/appartement_%C3%A0_1.htm')

    def test_avito_bound_cache_and_list_time_quarantine(self):
        from pipeline import avito_extract, Page
        u = 'https://www.avito.ma/fr/agdal/appartements/appartement_123.htm'
        ad = {'__typename': 'PublishedAd', 'listId': '123', 'listTime': '2026-10-12T12:00:00Z', 'price': {'withCurrency': '900000 DH', 'withoutCurrency': 900000}, 'monthlyPayment': {'withCurrency': '5000 DH', 'withoutCurrency': 5000}, 'category': {'__ref': 'Category:1'}, 'location': {'city': {'__ref': 'City:1'}, 'area': {'__ref': 'Area:1'}}, 'params': {'primary': [{'id': 'habitable_size', 'numericValue': 90, 'unit': 'm²'}]}}
        cache = {'ROOT_QUERY': {'getPublishedAd({"query":{"listId":"123"}})': {'ad': ad}}, 'City:1': {'name': 'Rabat'}, 'Area:1': {'name': 'Agdal'}, 'Category:1': {'name': 'Appartements'}}
        p = Page()
        p.next_data = {'props': {'pageProps': {'apolloState': cache}}}
        r = avito_extract(p, u)
        self.assertEqual((r['ville'], r['quartier'], r['superficie'], r['prix']), ('Rabat', 'Agdal', 90, 900000))
        self.assertEqual(r['erreur'], 'publication_semantics_unverified')
        self.assertNotIn('date_publication', r)
        self.assertEqual(avito_extract(p, u.replace('_123', '_999'))['erreur'], 'avito_missing_or_ambiguous_bound_ad')

    def test_catalogue_priority_and_xml_only_discovery(self):
        from pipeline import discover
        class Source:
            origin = 'https://site.test'
            robots = 'User-agent: *\nSitemap: https://site.test/sitemap.xml'
            def get(self, url, **kwargs):
                if url.endswith('sitemap.xml'):
                    return '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://site.test/ad/old</loc><lastmod>2026-10-13T00:00:00Z</lastmod></url><url><loc>https://site.test/ad/new</loc><lastmod>2026-10-12T00:00:00Z</lastmod></url></urlset>'
                return '<a href="/ad/new">new</a><img src="/photo.jpg">'
        urls, errors = discover(Source(), {'detail_pattern': '^/ad/', 'catalogues': ['https://site.test/latest']})
        self.assertEqual(urls, ['https://site.test/ad/new', 'https://site.test/ad/old'])
        self.assertEqual(errors, [])

    def test_conflicting_dates_across_two_bound_nodes(self):
        ld = [{'@type': 'RealEstateListing', 'url': URL, 'datePosted': '2026-10-12T12:00:00Z'}, {'@type': 'WebPage', 'url': URL, 'datePublished': '2025-01-01T12:00:00Z'}]
        r = extract('<script type="application/ld+json">' + json.dumps(ld) + '</script>', URL)
        self.assertEqual(r['erreur'], 'conflicting_publication_dates')

    def test_offline_replay_does_not_certify_http_verification(self):
        import contextlib
        import io
        from pipeline import main
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'input.json'
            source.write_text(json.dumps([row()]), encoding='utf-8')
            with patch('sys.argv', ['pipeline.py', '--input', str(source), '--output', str(root / 'result')]), contextlib.redirect_stdout(io.StringIO()):
                main()
            self.assertEqual(json.loads((root / 'result' / 'annonces fraiches.json').read_text()), [])
            report = json.loads((root / 'result' / 'rapport.json').read_text())
            self.assertEqual(report['reasons']['offline_replay_requires_live_verification'], 1)

    def test_marocimmo_bound_land_and_declared_type(self):
        u = 'https://www.marocimmo.com/fr/annonces/terrain-marrakech-689'
        n = {'@type': 'RealEstateListing', 'url': u, 'datePosted': '2026-10-12T12:00:00Z', 'mainEntity': {'@type': 'Place', '@id': u + '#bien', 'address': {'addressLocality': 'Marrakech'}, 'containedInPlace': {'name': 'Bab Doukkala'}, 'additionalProperty': {'name': 'Surface du terrain', 'value': 100, 'unitCode': 'MTK'}}, 'offers': {'price': 2500000, 'priceCurrency': 'MAD'}}
        r = extract('<script type="application/ld+json">' + json.dumps(n) + '</script><dl><dt>Type de bien</dt><dd>Terrain</dd></dl>', u)
        self.assertEqual((r['type'], r['ville'], r['quartier'], r['superficie']), ('terrain', 'Marrakech', 'Bab Doukkala', 100))
        unbound = {'@type': 'Place', 'url': u, 'address': {'addressLocality': 'wrong'}}
        self.assertNotIn('ville', extract('<script type="application/ld+json">' + json.dumps(unbound) + '</script>', u))

    def test_missing_robots_opt_in_and_access_challenges_stay_blocked(self):
        from urllib.error import HTTPError
        for code in (401, 403, 429, 500, 503):
            with patch.object(Client, 'get', side_effect=HTTPError('https://site.test/robots.txt', code, 'error', {}, None)), self.assertRaises(HTTPError):
                Client('https://site.test', allow_missing_robots=True)
        with patch.object(Client, 'get', side_effect=HTTPError('https://site.test/robots.txt', 404, 'missing', {}, None)):
            client = Client('https://site.test', allow_missing_robots=True)
            self.assertEqual(client.robots_status, 'missing_404')
            self.assertEqual(client.robots, '')

    def test_invalid_duplicate_date_does_not_override_precise_publication(self):
        ld = [{'@type': 'RealEstateListing', 'url': URL, 'datePosted': '2026-10-12T12:00:00Z'}, {'@type': 'RealEstateListing', 'url': URL, 'datePosted': '12/10/2026'}]
        r = extract('<script type="application/ld+json">' + json.dumps(ld) + '</script>', URL)
        self.assertEqual(r['date_publication'], '2026-10-12T12:00:00Z')
        self.assertNotIn('erreur', r)
        r = extract('<script type="application/ld+json">' + json.dumps(ld[1]) + '</script>', URL)
        self.assertNotIn('date_publication', r)

    def test_1immo_grid_surface_beats_ambiguous_title(self):
        u = 'https://1immo.ma/appartement-37273'
        ld = {'@type': 'BreadcrumbList', 'itemListElement': [{'item': 'https://1immo.ma/s/casablanca/appartement-a-vendre'}, {'item': u}]}
        markup = '<h1>99 m² et terrasse 49 m²</h1><div class="row bg-body-tertiary"><div class="fw-bolder">Surface (m²)</div><div class="text-sm-end">99</div></div><div class="row bg-body-tertiary"><div class="fw-bolder">Quartier</div><div class="text-sm-end">Sidi Belyout</div></div>'
        r = extract('<script type="application/ld+json">' + json.dumps(ld) + '</script>' + markup, u)
        self.assertEqual((r['superficie'], r['quartier'], r['type']), (99, 'Sidi Belyout', 'appartement'))

if __name__ == '__main__':
    unittest.main()

