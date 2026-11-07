import gzip
import json
import sqlite3
import tempfile
import unittest
import zipfile
from pathlib import Path
import bulk_url_inventory as b

class Tests(unittest.TestCase):
    def test_strict_listing_url(self):
        self.assertEqual(b.normalized('http://mubawab.ma/fr/pa/12345/foo?tracking=1#part'),('12345','https://www.mubawab.ma/fr/pa/12345/foo'))
        for url in ('https://evil.com/fr/a/12345/x','https://www.mubawab.ma/fr/login',
                    'https://www.mubawab.ma/fr/a/12345/../../admin','https://www.mubawab.ma/fr/a/12/x',
                    'https://user:pass@www.mubawab.ma/fr/a/12345/x'):
            self.assertIsNone(b.normalized(url))
    def test_cdxj(self):
        lines=['x timestamp {"url":"https://www.mubawab.ma/fr/a/12345/foo"}',
               '{"original":"https://www.mubawab.ma/fr/pa/67890/bar"}',
               'https://www.mubawab.ma/fr/a/11111/z']
        self.assertEqual(len(list(b.iter_lines(lines))),3)
    def test_100k_sitemap_xml_gz_streaming_and_resume(self):
        with tempfile.TemporaryDirectory() as folder:
            t=Path(folder);z=t/'sitemaps.xml.gz';out=t/'out'
            with gzip.open(z,'wt') as file:
                file.write('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
                for i in range(100000,200000):
                    file.write(f'<url><loc>https://www.mubawab.ma/fr/a/{i}/listing</loc></url>')
                file.write('</urlset>')
            self.assertEqual(b.main(['--input',str(z),'--out',str(out)]),0)
            r=json.loads((out/'report.json').read_text())
            self.assertEqual((r['unique_ids'],r['unique_urls'],r['source_edges'],r['network_requests']),(100000,100000,100000,0))
            self.assertEqual(b.main(['--input',str(z),'--out',str(out),'--resume']),0)
            rr=json.loads((out/'report.json').read_text())
            self.assertEqual(rr['unique_ids'],100000)
            self.assertEqual(rr['input_stats'][0]['skipped'],'same_sha256')
    def test_zip_xml_cdx_and_dedupe(self):
        with tempfile.TemporaryDirectory() as folder:
            t=Path(folder);f=t/'index.zip';out=t/'run'
            xml=b'<urlset><url><loc>https://www.mubawab.ma/fr/a/12345/a</loc></url></urlset>'
            with zipfile.ZipFile(f,'w') as z:
                z.writestr('x.xml',xml)
                z.writestr('a.cdxj','urlkey 20261001 {"url":"https://www.mubawab.ma/fr/a/12345/a"}\n'
                           'urlkey 20261001 {"url":"https://www.mubawab.ma/fr/pa/67890/b"}\n')
            self.assertEqual(b.main(['--input',str(f),'--out',str(out)]),0)
            r=json.loads((out/'report.json').read_text())
            self.assertEqual((r['unique_ids'],r['unique_urls'],r['source_edges']),(2,2,3))
            self.assertEqual(len((out/'discovered_listing_links.jsonl').read_text().splitlines()),2)
    def test_changed_source_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            t=Path(folder);f=t/'in.txt';out=t/'run';f.write_text('https://www.mubawab.ma/fr/a/12345/a\n')
            self.assertEqual(b.main(['--input',str(f),'--out',str(out)]),0)
            f.write_text('https://www.mubawab.ma/fr/a/12346/b\n')
            self.assertEqual(b.main(['--input',str(f),'--out',str(out),'--resume']),2)
            self.assertEqual(json.loads((out/'report.json').read_text())['unique_ids'],1)

if __name__=='__main__':unittest.main()