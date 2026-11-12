"""H1 read-only extract/parse contract tests; never contact Neon or production."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
try:
    import akarparser_v3_historical_neon_batches as h1
except ModuleNotFoundError as exc:
    # The local canary sandbox lacks V3's source modules; CI imports real V3.
    if exc.name != 'akarparser_v3_raw_bulk':
        raise
    import types
    sys.modules['akarparser_v3_raw_bulk'] = types.ModuleType('akarparser_v3_raw_bulk')
    sys.modules['akarparser_v3_raw_bulk'].run = lambda *a,**kw: None
    import akarparser_v3_historical_neon_batches as h1

HOST = h1.EXPECTED_HOST
URL = f'postgresql://readonly:dummy@{HOST}/AkarFinder?sslmode=require'


def record(i: int, *, complete=True, agency=False):
    url = f'https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/{100000+i}' if agency else f'https://www.mubawab.ma/fr/a/{8000000+i}/exemple'
    return {'id':i,'canonical_fingerprint':'fp-'+str(i), 'title':'Appartement exemple '+str(i),
            'city':'Rabat','district':'Agdal','property_type':'apartment',
            'transaction_type':'sale','price_mad':1000000 if complete else None,
            'surface_m2':100 if complete else None, 'source_name':'agenz.ma' if agency else 'mubawab.ma',
            'source_url':url,'source_offer_id':'REF-AG-1' if agency else str(8000000+i),
            'index_first_seen_at':'2026-07-01T00:00:00+00:00',
            'description_snippet':'Appartement exemple', 'index_last_seen_at':None}


class FakeQuery:
    def __init__(self, rows):
        self.rows = sorted(rows,key=lambda r:r['id'])
        self.call_count = 0

    def __call__(self, sql, env):
        self.call_count += 1
        if 'H1_READONLY_OK' in sql:
            return ['H1_READONLY_OK']
        if 'AS priority_count' in sql:
            priority = sum(bool(r['price_mad'] and r['surface_m2']) for r in self.rows)
            x={'total':len(self.rows),'unique_id':len(self.rows),'unique_url':len(self.rows),
               'priority_count':priority,'min_id':self.rows[0]['id'],'highwater':self.rows[-1]['id']}
            return [json.dumps(x)]
        import re
        cursor=int(re.search(r'p\.id > (\d+)',sql).group(1))
        highwater=int(re.search(r'p\.id <= (\d+)',sql).group(1))
        size=int(re.search(r'ORDER BY p.id LIMIT (\d+)',sql).group(1))
        is_priority='AND (p.price_mad > 0' in sql
        subset=[r for r in self.rows if cursor<r['id']<=highwater and bool(r['price_mad'] and r['surface_m2'])==is_priority]
        return [json.dumps(r,ensure_ascii=False) for r in subset[:size]]


def fake_v3(input_path, output_path, *, as_of):
    raw = input_path.read_text(encoding='utf-8').splitlines()
    items=[json.loads(x) for x in raw]
    output_path.mkdir(parents=True,exist_ok=False)
    report={'input_count':len(items),'status_counts':{'input':len(items),'complete_requires_freshness':len(items)},
            'safety':{'db_writes':0,'network_requests':0,'neon_admission_authorized':False}}
    (output_path/'aggregate_report.json').write_text(json.dumps(report,sort_keys=True),encoding='utf-8')
    assert not any(x.get('observed_at') or x.get('published_at') or x.get('first_seen_at') for x in items)
    return report


class TestH1(unittest.TestCase):
    def test_credential_pin_and_no_write_owner(self):
        env=h1.checked_env(URL)
        self.assertIn('default_transaction_read_only=on',env['PGOPTIONS'])
        for bad in ['postgresql://neondb_owner:x@'+HOST+'/AkarFinder?sslmode=require',
                    'postgresql://readonly:x@evil.example/AkarFinder?sslmode=require',
                    'postgresql://readonly:x@'+HOST+'/neondb?sslmode=require',
                    'postgresql://readonly:x@'+HOST+'/AkarFinder?sslmode=disable']:
            with self.assertRaises(ValueError):h1.checked_env(bad)

    def test_priority_remaining_resume_checkpoint_hash_and_normalization(self):
        rows=[record(i,complete=(i%3 != 0),agency=(i==1)) for i in range(1,1002)]
        query=FakeQuery(rows)
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'private-priority'
            a=h1.run(URL,root,mode='priority',batch_size=100,max_batches=1,query=query,parser=fake_v3)
            self.assertEqual(a['processed'],100)
            self.assertFalse(a['complete'])
            self.assertEqual(a['db_writes'],0)
            contents=(root/'inputs'/'batch-00001.jsonl').read_text(encoding='utf-8').splitlines()
            self.assertEqual(len(contents),100)
            first=json.loads(contents[0]);self.assertEqual(first['source_offer_id'],'100001')
            self.assertEqual(first['agency_reference'],'REF-AG-1')
            self.assertIn('index_first_seen_at',first)
            self.assertNotIn('observed_at',first)
            b=h1.run(URL,root,mode='priority',batch_size=100,resume=True,query=query,parser=fake_v3)
            self.assertTrue(b['complete'])
            self.assertEqual(b['processed'],sum(i%3!=0 for i in range(1,1002)))
            self.assertEqual(b['processed']+h1.run(URL,Path(td)/'remaining',mode='remaining',batch_size=200,query=query,parser=fake_v3)['processed'],len(rows))
            done=h1.run(URL,root,mode='priority',batch_size=100,resume=True,query=query,parser=fake_v3)
            self.assertTrue(done['complete'])
            self.assertEqual(done['processed'],b['processed'])
            path=root/'inputs'/'batch-00001.jsonl'
            path.write_text(path.read_text(encoding='utf-8')+'tampered',encoding='utf-8')
            with self.assertRaisesRegex(RuntimeError,'SHA_MISMATCH'):
                h1.run(URL,root,mode='priority',batch_size=100,resume=True,query=query,parser=fake_v3)

    def test_actual_v3_parser_through_readonly_mock_query(self):
        if getattr(h1.parse_batch, '__name__', '') == '<lambda>':
            self.skipTest('actual V3 module available in GitHub CI, not in local sandbox')
        rows = [record(i, agency=(i==1)) for i in range(1, 6)]
        with tempfile.TemporaryDirectory() as td:
            done = h1.run(URL, Path(td)/'v3-real', mode='priority', batch_size=2,
                          query=FakeQuery(rows))
            self.assertTrue(done['complete'])
            self.assertEqual(done['processed'], 5)
            self.assertEqual(done['status_counts'].get('complete_requires_freshness'), 5)
            self.assertEqual(done['db_writes'], 0)

    def test_invalid_params_and_keyset(self):
        with self.assertRaises(ValueError):h1.select_sql('priority',0,100,0)
        with self.assertRaises(ValueError):h1.select_sql('unknown',0,100,5)
        with self.assertRaises(ValueError):h1.select_sql('priority',101,100,5)
        with self.assertRaises(RuntimeError):h1.normalize({'source_url':'https://x.test/id','title':'x','city':'Rabat','observed_at':'2026-01-01'})

    def test_no_raw_upload_or_production_sql_in_source(self):
        text=Path(h1.__file__).read_text(encoding='utf-8')
        for dangerous in ('INSERT INTO public.', 'UPDATE public.', 'DELETE FROM public.', 'upload-artifact', 'SUPABASE_SERVICE_ROLE_KEY'):
            self.assertNotIn(dangerous,text)
        self.assertIn('JOIN public.listing_sources s',h1.select_sql('remaining',0,5,2))
        self.assertIn('NOT (',h1.select_sql('remaining',0,5,2))


if __name__=='__main__':unittest.main()
