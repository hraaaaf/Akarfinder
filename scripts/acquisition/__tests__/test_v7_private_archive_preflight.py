import hashlib
import io
import json
import sys
import unittest
from zipfile import ZipFile, ZIP_DEFLATED
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from v7_parallel.v7_private_archive_preflight import _validated_pair, _entries, _json_bytes, EvidenceRejected

HTML = b'<!doctype html><html><title>synthetic fixture</title></html>'


def manifest(url='https://agenz.ma/fr/annonces/444291',raw=HTML):
    return json.dumps({'schema_version':'akarfinder-v7-raw-html-evidence-v1','source_url':url,'html_sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'http_status':200,'captured_at_utc':'2026-11-13T01:02:03Z'}).encode()


class PrivatePreflightTests(unittest.TestCase):
    def test_valid_synthetic(self):
        r=_validated_pair(HTML,manifest(),'agenz.ma')
        self.assertTrue(r['integrity']=='verified' and r['eligible_for_private_staging'] is False)

    def test_tampered_html(self):
        with self.assertRaises(EvidenceRejected): _validated_pair(HTML+b'!',manifest(),'agenz.ma')

    def test_forged_host(self):
        with self.assertRaises(EvidenceRejected): _validated_pair(HTML,manifest(url='https://agenz.ma.evil.tld/fr/a/444291'),'agenz.ma')

    def test_http_not_200(self):
        m=json.loads(manifest());m['http_status']=403
        with self.assertRaises(EvidenceRejected): _validated_pair(HTML,json.dumps(m).encode(),'agenz.ma')

    def test_duplicate_json(self):
        with self.assertRaises(EvidenceRejected): _json_bytes(b'{"source_url":"a","source_url":"b"}')

    def test_not_html(self):
        with self.assertRaises(EvidenceRejected): _validated_pair(b'challenge',manifest(raw=b'challenge'),'agenz.ma')

    def test_sarouty_slug_identity(self):
        r=_validated_pair(HTML,manifest('https://www.sarouty.ma/acheter/appartement-sale-bab-al-bahr-894012/'),'sarouty.ma')
        self.assertEqual(r['id'],'894012')

    def test_zip_member_traversal_refused(self):
        b=io.BytesIO()
        with ZipFile(b,'w',ZIP_DEFLATED) as z:
            z.writestr('source.html',HTML)
            z.writestr('../source.manifest.json',manifest())
        with ZipFile(io.BytesIO(b.getvalue())) as z:
            with self.assertRaises(EvidenceRejected): _entries(z,{'source.html','source.manifest.json'})

if __name__=='__main__':unittest.main()