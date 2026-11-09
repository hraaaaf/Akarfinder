"""Private stratified canary workflow: no network, no source mutation."""
from __future__ import annotations

import gzip
import hashlib
import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v2_canary import run_canary
from akarparser_v2 import sha_file


class TestRealInputCanaryRunner(unittest.TestCase):
    def fixture(self, root: Path):
        p = root / 'synthetic.sqlite'
        con = sqlite3.connect(p)
        con.execute('CREATE TABLE property_listings(id INTEGER PRIMARY KEY,title TEXT,city TEXT,property_type TEXT,transaction_type TEXT,price_mad INTEGER,surface_m2 INTEGER)')
        con.execute('CREATE TABLE listing_sources(id INTEGER PRIMARY KEY,property_listing_id INTEGER,source_name TEXT,listing_url TEXT,source_offer_key TEXT,first_seen_at TEXT)')
        source_names = ['mubawab.ma', 'avito.ma', 'agenz.ma', 'domio.ma', 'other.ma']
        for idx in range(250):
            g = idx // 50
            t = idx % 4
            source = source_names[g]
            title = 'Appartement à vendre Rabat' if t != 3 else None
            price = 1400000 if t in (0, 1) else None
            surface = 100 if t in (0,1,2) else None
            con.execute('INSERT INTO property_listings VALUES(?,?,?,?,?,?,?)',
                        (idx, title, 'Rabat' if t != 3 else None,
                         'apartment' if t != 3 else None, 'sale' if t != 3 else None,
                         price, surface))
            con.execute('INSERT INTO listing_sources VALUES(?,?,?,?,?,?)',
                        (idx, idx, source, f'https://{source}/fr/a/{10000000+idx}',
                         str(10000000+idx) if t == 0 else None,
                         '2026-09-20T14:05:00+00:00' if t == 0 else None))
        con.commit(); con.close()
        return p

    def test_stratified_canary_reproducible_and_source_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = self.fixture(root)
            source_digest = sha_file(path)
            a = run_canary(path, root / 'run-a', table='property_listings', count=100, review=20)
            b = run_canary(path, root / 'run-b', table='property_listings', count=100, review=20)
            self.assertEqual(a['source']['total_observed_rows'], 250)
            self.assertEqual(a['selection']['selected'], 100)
            self.assertEqual(a['manual_review']['completed'], 0)
            self.assertEqual(a['manual_review']['queue_size'], 20)
            self.assertEqual(a['parser']['counts']['input'], 100)
            self.assertEqual(a['parser']['counts']['rejected_errors'], 0)
            self.assertEqual(sum(a['parser']['status_counts'].values()), 100)
            self.assertTrue(a['source']['unchanged'])
            self.assertEqual(sha_file(path), source_digest)
            for name in ('private_sample_1000.jsonl.gz','private_review_queue_100.jsonl.gz','parser_output/records.jsonl.gz'):
                self.assertEqual(sha_file(root/'run-a'/name), sha_file(root/'run-b'/name))
            self.assertEqual(a['selection']['sample_by_group_tier'], b['selection']['sample_by_group_tier'])
            self.assertFalse(a['invariants']['independent_human_accuracy_certified'])

    def test_refuses_too_few_rows_and_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); path = self.fixture(root)
            with self.assertRaisesRegex(ValueError, 'INSUFFICIENT_REAL_RECORDS'):
                run_canary(path, root / 'too-few', table='property_listings', count=1000)
            run_canary(path, root / 'first', table='property_listings', count=100, review=10)
            with self.assertRaises(FileExistsError):
                run_canary(path, root / 'first', table='property_listings', count=100, review=10)
            with self.assertRaisesRegex(ValueError, 'INVALID_CANARY_SIZE'):
                run_canary(path, root / 'invalid', count=10, review=11)

    def test_refuses_live_wal(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); path = self.fixture(root)
            Path(str(path) + '-wal').write_bytes(b'live')
            with self.assertRaisesRegex(ValueError, 'LIVE_SQLITE_WAL_NOT_SUPPORTED'):
                run_canary(path, root / 'blocked', table='property_listings', count=20, review=5)

    def test_jsonl_gz_input_and_private_outputs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); path = root/'real_data_export.jsonl.gz'
            with path.open('wb') as raw:
                with gzip.GzipFile(fileobj=raw, filename='', mode='wb', mtime=0) as z:
                    for i in range(80):
                        item={'listing_url': f'https://www.mubawab.ma/fr/a/{10000000+i}/test',
                              'title':'Appartement a vendre Rabat','city':'Rabat',
                              'property_type':'apartment','transaction_type':'sale',
                              'price_mad':1500000,'surface_m2':100,
                              'source_offer_key':str(10000000+i),'first_seen_at':'2026-09-20T14:05:00+00:00'}
                        z.write((json.dumps(item)+'\n').encode())
            report = run_canary(path, root/'parsed', count=50, review=10)
            self.assertEqual(report['selection']['selected'], 50)
            self.assertEqual(report['parser']['counts']['ready_internal'], 50)
            self.assertEqual(report['invariants']['new_detailed_observations_certified'], 0)
            with gzip.open(root/'parsed'/'private_review_queue_100.jsonl.gz','rt',encoding='utf-8') as f:
                entries=[json.loads(line) for line in f]
            self.assertEqual(len(entries),10)
            self.assertTrue(all(e['manually_reviewed'] is False for e in entries))


if __name__ == '__main__':
    unittest.main()
