import io
import json
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
import parquet_index_probe as m

class Tests(unittest.TestCase):
    def test_official_hive_partition_manifest(self):
        sample='\n'.join([
          'cc-index/table/cc-main/warc/crawl=CC-MAIN-2026-43/subset=warc/part-00000-89ab12.c000.gz.parquet',
          'cc-index/table/cc-main/warc/crawl=CC-MAIN-2026-43/subset=robotstxt/part-00000-89ab12.c000.gz.parquet',
          'cc-index/table/cc-main/warc/crawl=CC-MAIN-2026-43/subset=warc/part-00001-89ab12.c000.gz.parquet',
          'cc-index/table/cc-main/warc/crawl=CC-MAIN-2026-39/subset=warc/part-00002-89ab12.c000.gz.parquet'])
        got=m.parse_manifest(sample,'CC-MAIN-2026-43')
        self.assertEqual(len(got),2)
        self.assertTrue(got[0].endswith('subset=warc/part-00000-89ab12.c000.gz.parquet'))
        with self.assertRaises(ValueError):m.parse_manifest(sample,'CC-MAIN-2026-39')

    def test_url_normalization(self):
        self.assertEqual(m.normalize_listing('http://mubawab.ma/fr/a/8444113/qq?foo=bar'),('8444113','https://www.mubawab.ma/fr/a/8444113/qq'))
        for bad in ['https://bad.example/fr/a/8444113/x','https://www.mubawab.ma/fr/login','https://www.mubawab.ma/fr/a/11/x','https://www.mubawab.ma/fr/a/8444113/../../private','https://www.mubawab.ma/fr/a/8444113%5cadmin']:
            self.assertIsNone(m.normalize_listing(bad),bad)
    def test_range_picker_two_shards_boundary(self):
        paths=[str(x) for x in range(8)]
        bounds=[('a','b'),('c','e'),('f','h'),('i','ma,mubawaba'),('ma,mubawabb','n'),('o','p'),('q','r'),('s','z')]
        def get(i):return (*bounds[int(i)],2)
        picked,called=m.pick_shards(paths,get,max_metadata=8,max_shards=2)
        self.assertEqual(picked,[3,4]);self.assertLessEqual(len(called),8)
    def test_range_picker_out_of_range(self):
        paths=[str(x) for x in range(8)]
        bounds=[('a','b'),('c','d'),('e','f'),('g','h'),('i','j'),('k','l'),('n','o'),('p','z')]
        picked,called=m.pick_shards(paths,lambda x:(*bounds[int(x)],1),max_metadata=8,max_shards=2)
        self.assertEqual(picked,[])
    def test_budget_prevents_uncapped_range_scanning(self):
        p=[str(x) for x in range(200)]
        with self.assertRaisesRegex(ValueError,'metadata budget'):
            m.pick_shards(p,lambda x:('a','zz',1),max_metadata=4,max_shards=2)
    def test_shard_budget_fail_closed(self):
        paths=[str(x) for x in range(8)]
        bounds=[('a','b'),('c','d'),('e','f'),('ma,mubawab','ma,mubawabzz'),('ma,mubawabzz','ma,mubawabzzz'),('ma,mubawac','ma,mubawaczz'),('n','o'),('p','z')]
        with self.assertRaisesRegex(ValueError,'shard budget'):
            m.pick_shards(paths,lambda x:(*bounds[int(x)],1),max_metadata=12,max_shards=1)
    def test_missing_footer_stats_fails_closed(self):
        class C:
            def execute(self,*args):return self
            def fetchone(self):return (None,None,0)
        with self.assertRaisesRegex(ValueError,'statistics absent'):
            m.file_surt_range(C(),'https://data.commoncrawl.org/some.parquet')
    def test_run_no_result_reports_failure(self):
        with tempfile.TemporaryDirectory() as t:
            with patch.object(m,'make_duckdb',side_effect=RuntimeError('offline')):
                rc=m.run(['CC-MAIN-2026-43'],Path(t),16,2,100)
            self.assertEqual(rc,2)
            doc=json.loads((Path(t)/'report.json').read_text())
            self.assertFalse(doc['coverage_certified']);self.assertEqual(doc['requests_to_mubawab'],0)
            self.assertEqual(doc['distinct_ids'],0)
            self.assertIn('offline',doc['setup_error'])

if __name__=='__main__': unittest.main()