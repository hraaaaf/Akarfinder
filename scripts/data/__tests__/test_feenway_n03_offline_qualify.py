import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

MODULE=Path(__file__).resolve().parents[2]/'acquisition'/'feenway-n03-offline-qualify.py'
spec=importlib.util.spec_from_file_location('feenway_n01_offline',MODULE)
mod=importlib.util.module_from_spec(spec);sys.modules[spec.name]=mod;spec.loader.exec_module(mod)

class OfflineSafetyTest(unittest.TestCase):
 def test_listing_identity_rejects_aliases_and_query(self):
  self.assertEqual(mod.strict_id('https://www.feenway.com/listings/123'),'123')
  for bad in ['http://www.feenway.com/listings/123','https://evil.com/listings/123','https://www.feenway.com/listings/123?cursor=1','https://www.feenway.com/listings/123/','https://www.feenway.com/listings/000123','https://www.feenway.com/listings/abc','https://www.feenway.com/listings/12#foo','https://www.feenway.com/listings/0']:
   with self.subTest(url=bad),self.assertRaises(ValueError):mod.strict_id(bad)
 def test_jsonl_requires_fully_terminated_valid_rows(self):
  self.assertEqual(mod.load_jsonl(b'{"url":"x"}\n')[0]['url'],'x')
  for bad in [b'',b'{"url":"x"}',b'{"url":"x"}\n\n',b'{"bad":}\n']:
   with self.subTest(data=bad),self.assertRaises((ValueError,json.JSONDecodeError)):mod.load_jsonl(bad)
 def test_rejects_tampered_sha_or_invalid_provenance_and_nonzero_writes(self):
  with tempfile.TemporaryDirectory() as dir:
   root=Path(dir);name='batch.zip'
   rows=b'{"url":"https://www.feenway.com/listings/123","discovered_on":["https://www.feenway.com/immobilier/casa"]}\n'
   report={'complete':True,'errors':[],'pages_ok':50,'planned_pages':50,'pages_attempted':50,'not_in_six_count':1,'outside_manifest_sha256':mod.sha(rows),'listing_detail_requests':0,'db_writes':0,'listing_manifest_size':57056,'batch_number':5,'mode':'batch'}
   def pack(r,manifest):
    with zipfile.ZipFile(root/name,'w') as z:
     z.writestr('report.json',json.dumps(r));z.writestr('report.jsonl',manifest)
    return {'kind':'batch','batch':5,'file':name,'zip_sha256':mod.sha((root/name).read_bytes()),'artifact_id':123}
   info=pack(report,rows)
   got,meta=mod.verified_archive(root,info)
   self.assertEqual(meta['rows'],1)
   tampered=dict(info,zip_sha256='0'*64)
   with self.assertRaisesRegex(ValueError,'archive_sha256_mismatch'):mod.verified_archive(root,tampered)
   bad=pack({**report,'db_writes':1},rows)
   with self.assertRaisesRegex(ValueError,'incomplete_or_unsafe'):mod.verified_archive(root,bad)
   badrows=b'{"url":"https://www.feenway.com/listings/123","discovered_on":["https://evil.com/immobilier/casa"]}\n'
   bad=pack({**report,'outside_manifest_sha256':mod.sha(badrows)},badrows)
   with self.assertRaisesRegex(ValueError,'invalid_landing_provenance'):mod.verified_archive(root,bad)
 def test_rejects_incomplete_inventory(self):
  with self.assertRaisesRegex(ValueError,'required_artifacts_missing'):
   mod.qualify(Path('/not-needed'),{'schema':'FEENWAY_N01_LOCAL_ARCHIVE_INVENTORY_V1','archives':[]})

if __name__=='__main__':unittest.main()
