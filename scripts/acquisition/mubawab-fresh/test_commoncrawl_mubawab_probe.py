import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
import commoncrawl_mubawab_probe as m

class Tests(unittest.TestCase):
    def test_fixed_index_scopes(self):
        u=m.index_url('CC-MAIN-2026-43','a',500)
        self.assertTrue(u.startswith('https://index.commoncrawl.org/CC-MAIN-2026-43-index?'))
        self.assertIn('www.mubawab.ma%2Ffr%2Fa%2F%2A',u)
        with self.assertRaises(ValueError):m.index_url('http://example.com','a',500)
        with self.assertRaises(ValueError):m.index_url('CC-MAIN-2026-43','other',500)
        with self.assertRaises(ValueError):m.index_url('CC-MAIN-2026-43','a',1001)

    def test_archived_urls_and_status_validation(self):
        rows=[{'url':'https://www.mubawab.ma/fr/a/12345/foo','status':'200','timestamp':'20261010'},
              {'url':'https://www.mubawab.ma/fr/pa/45678/test','status':'404'},
              {'url':'https://evil.example/fr/a/98765/foo','status':'200'},
              {'url':'https://www.mubawab.ma/fr/a/12345/foo?tracking=1','status':'200'}]
        recs=m.indexed_records(rows,'CC-MAIN-2026-43','https://index.commoncrawl.org/sample')
        self.assertEqual(len(recs),2)
        self.assertEqual(recs[0]['id'],'12345')
        self.assertEqual(recs[0]['archive_crawl'],'CC-MAIN-2026-43')
        self.assertFalse(recs[0].get('is_live',False))

    def test_dedup_and_error_provenance(self):
        with tempfile.TemporaryDirectory() as d:
            def fake(url,limit):
                if 'fr%2Fpa%2F' in url: raise HTTPError(url,503,'temporarily unavailable',{},None)
                return ([{'url':'https://www.mubawab.ma/fr/a/12345/foo','status':'200','timestamp':'20261010'},
                         {'url':'https://www.mubawab.ma/fr/a/12345/foo','status':'200','timestamp':'20261010'},
                         {'url':'https://www.mubawab.ma/fr/a/98765/foo','status':'200','timestamp':'20261011'}],False)
            with patch.object(m.time,'sleep',side_effect=AssertionError('synthetic run must not wait')):
                out=m.run(['CC-MAIN-2026-43'],Path(d),max_rows=20,pause_seconds=0,fetch=fake)
            self.assertEqual(out['candidate_unique_ids'],2)
            self.assertEqual(out['queries_failed'],1)
            self.assertFalse(out['coverage_certified'])
            lines=(Path(d)/'commoncrawl_candidate_urls.jsonl').read_text().splitlines()
            self.assertEqual(len(lines),2)
            self.assertEqual(json.loads(lines[0])['source_kind'],'commoncrawl_archived_url_index')
            self.assertEqual(len(out['queries']),2)

    def test_read_limit_and_malformed_index(self):
        class Response:
            def __init__(self,items): self.items=items
            def __enter__(self):return self
            def __exit__(self,*a):pass
            def __iter__(self):return iter(self.items)
        make=lambda req,timeout:Response([b'{"url":"https://www.mubawab.ma/fr/a/12345/one"}\n',b'bad-json\n'])
        rows,limited=m.fetch_rows('https://index.commoncrawl.org/test',open_url=make,limit=1)
        self.assertEqual(len(rows),1);self.assertTrue(limited)
        with self.assertRaises(ValueError):m.fetch_rows('https://index.commoncrawl.org/test',open_url=make,limit=5)

if __name__=='__main__':unittest.main(verbosity=2)