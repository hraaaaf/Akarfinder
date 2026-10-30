import csv
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import archive_import as ai


PAGE = '''<div class="listingBox"><h2><a href="/fr/a/123456/appartement">Bel appartement</a></h2>
<p>Maârif, Casablanca</p><p>110 m²</p><p>3 Pièces</p><p>2 Chambres</p><p>1 250 000 DH</p>
<img src="https://www.mubawab-media.com/foo/a.jpg"></div>'''
DETAIL = '''<html><head><link rel="canonical" href="https://www.mubawab.ma/fr/a/123456/appartement"/>
<meta property="og:image" content="https://www.mubawab-media.com/foo/b.webp" />
<meta name="description" content="Description propriétaire" /></head><body></body></html>'''


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.lists = self.root / 'lists'
        self.details = self.root / 'details'
        self.lists.mkdir()
        self.details.mkdir()
        (self.lists / 'a.html').write_text(PAGE)
        (self.details / '123456.html').write_text(DETAIL)
        self.db = self.root / 'db.sqlite'
        self.out = self.root / 'out'

    def tearDown(self):
        self.tmp.cleanup()

    def run_import(self, **extra):
        return ai.import_archive(list_dir=self.lists, detail_dir=self.details,
                                 db_path=self.db, out_dir=self.out, **extra)

    def test_cold_import_and_manifests(self):
        # No codepath invokes HTTP; explicit regression via mock nevertheless.
        with patch('requests.sessions.Session.get', side_effect=AssertionError('HTTP forbidden')):
            r = self.run_import()
        self.assertEqual(r['listing_count'], 1)
        self.assertEqual(r['detail_count'], 1)
        self.assertEqual(r['photo_url_references'], 2)
        self.assertFalse(r['site_crawl_performed'])
        self.assertFalse(r['coverage_certified'])
        self.assertEqual(r['error_total'], 0)
        rec = json.loads((self.out/'listings.jsonl').read_text().splitlines()[0])
        self.assertEqual(rec['price_dh'], 1250000)
        self.assertEqual(rec['detail']['description'], 'Description propriétaire')
        with (self.out/'photo_urls.csv').open() as stream:
            self.assertEqual(len(list(csv.DictReader(stream))), 2)
        with (self.out/'provenance.csv').open() as stream:
            self.assertEqual(len(list(csv.DictReader(stream))), 2)

    def test_resume_idempotent(self):
        first = self.run_import()
        second = self.run_import()
        self.assertEqual(second['listing_count'], 1)
        self.assertEqual(second['photo_url_references'], 2)
        self.assertEqual(second['duplicate_files'], 2)
        self.assertEqual(second['listings_inserted'], 0)
        self.assertEqual(first['listings.jsonl_sha256'], second['listings.jsonl_sha256'])

    def test_missing_detail_identity_refused(self):
        (self.details/'123456.html').unlink()
        (self.details/'not_an_id.html').write_text('<html><img src="https://www.mubawab-media.com/x.jpg"></html>')
        report = self.run_import()
        self.assertEqual(report['detail_count'], 0)
        self.assertEqual(report['unresolved_detail_pages'], 1)
        self.assertEqual(report['error_total'], 1)

    def test_local_images_with_provenance(self):
        pics = self.root/'images'/'123456'
        pics.mkdir(parents=True)
        (pics/'a.webp').write_bytes(b'not-a-verified-real-image')
        report = ai.import_archive(list_dir=self.lists, photos_dir=pics.parent,
                                   db_path=self.db, out_dir=self.out)
        self.assertEqual(report['local_photo_files'], 1)
        with (self.out/'local_images.csv').open() as stream:
            row = next(csv.DictReader(stream))
        self.assertEqual(row['listing_id'], '123456')
        self.assertEqual(len(row['sha256']), 64)

    def test_detail_cannot_claim_foreign_domain(self):
        (self.details/'123456.html').unlink()
        (self.details/'foreign.html').write_text('<link rel="canonical" href="https://example.com/fr/a/123456/a"/>')
        r = self.run_import()
        self.assertEqual(r['detail_count'], 0)
        self.assertEqual(r['unresolved_detail_pages'], 1)

    def test_file_budget(self):
        with self.assertRaises(ValueError):
            self.run_import(max_files=0)

class JsonlTests(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.TemporaryDirectory()
        self.root = Path(self.t.name)
        self.input = self.root / 'input'
        self.input.mkdir()
        self.out = self.root / 'out'
        self.db = self.root / 'db.sqlite'
        self.record = {'source': 'mubawab', 'id': '123456',
                       'url': 'https://www.mubawab.ma/fr/a/123456/appartement',
                       'price_dh': 1000000, 'area_m2': 85,
                       'photos': ['https://www.mubawab-media.com/foo/photo.avif']}

    def tearDown(self):
        self.t.cleanup()

    def test_jsonl_import_idempotent_and_no_network(self):
        (self.input / 'pilot.jsonl').write_text(json.dumps(self.record)+'\n')
        with patch('requests.sessions.Session.get', side_effect=AssertionError('HTTP forbidden')):
            r1 = ai.import_archive(jsonl_dir=self.input, db_path=self.db, out_dir=self.out)
            r2 = ai.import_archive(jsonl_dir=self.input, db_path=self.db, out_dir=self.out)
        self.assertEqual((r1['listing_count'], r1['photo_url_references'], r1['jsonl_imported']), (1, 1, 1))
        self.assertEqual(r2['duplicate_files'], 1)
        self.assertEqual(r1['listings.jsonl_sha256'], r2['listings.jsonl_sha256'])
        with (self.out/'provenance.csv').open() as stream:
            rows = list(csv.DictReader(stream))
        self.assertEqual(rows[0]['kind'], 'jsonl')

    def test_jsonl_invalid_record_rejected_atomically(self):
        bad = {**self.record, 'id': '987654'}
        (self.input / 'bad.jsonl').write_text(json.dumps(self.record)+'\n'+json.dumps(bad)+'\n')
        r = ai.import_archive(jsonl_dir=self.input, db_path=self.db, out_dir=self.out)
        self.assertEqual((r['listing_count'], r['error_total']), (0, 1))
        self.assertEqual(r['errors'][0]['reason'], 'invalid_jsonl')

    def test_photos_domain_scope(self):
        record = {**self.record, 'photos': ['https://example.com/photo.jpg','https://www.mubawab-media.com/foo/a.avif']}
        (self.input/'pilot.jsonl').write_text(json.dumps(record)+'\n')
        r = ai.import_archive(jsonl_dir=self.input, db_path=self.db, out_dir=self.out)
        self.assertEqual(r['photo_url_references'], 1)


if __name__ == '__main__':
    unittest.main()