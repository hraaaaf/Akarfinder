"""Synthetic offline contracts for FeenWay J2 external primary proof requests/receipts."""
from __future__ import annotations
import gzip
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_multisource.feenway_j2_primary_evidence import prepare,audit,ProofRejected,_url_key,_case_key

AVITO1='https://www.avito.ma/fr/casa/appartements/A_58917466.htm'
AVITO2='https://www.avito.ma/fr/casa/appartements/B_58917466.htm'
AGENZ='https://agenz.ma/fr/annonces/immo-marrakech/location-appartements/route-de-casablanca/169490'


def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def row(url, id, fw, price=7000):
    return {'decision':'REVIEW_ONLY_NO_ADMISSION','original_source_verified':False,
            'public_admission_authorized':False,'source_url_claim':url,'source_offer_id_hint':id,
            'feenway_url_claim':fw,'raw_claims_unchanged':{'title':'Apartment','city':'Casablanca',
                'district':'Anfa','price_mad':price,'surface_m2':85}}

class PrimaryProofTests(unittest.TestCase):
    def setUp(self):
        d=tempfile.TemporaryDirectory();self.addCleanup(d.cleanup)
        self.root=Path(d.name)
        self.gzip=self.root/'safe.gz'
        self.csv=self.root/'priority.csv'
        self.output=self.root/'requests'
        self.cases=[row(AVITO1,'58917466','https://www.feenway.com/listings/1'),
                    row(AVITO2,'58917466','https://www.feenway.com/listings/2',price=7100),
                    row(AGENZ,'169490','https://www.feenway.com/listings/3',price=7500)]
    def write(self):
        with gzip.open(self.gzip,'wt',encoding='utf-8') as f:
            for r in self.cases:f.write(json.dumps(r)+'\n')
        self.csv.write_text('source_domain,source_offer_id_hint\nwww.avito.ma,58917466\n',encoding='utf-8')
        return digest(self.gzip),digest(self.csv)
    def make(self):
        a,b=self.write(); return prepare(self.gzip,a,self.csv,b,self.output,max_groups=1)
    def evidence(self):
        self.make()
        r=self.output/'evidence_requests_QUARANTINE.json'
        root=self.root/'proofs';root.mkdir()
        return r,root
    def audit(self,r,root):return audit(r,digest(r),root,self.root/'audit')
    def supply(self,r,root,which=0,canonical=None,content=None):
        item=json.loads(r.read_text())['cases'][which]
        url=item['source_url']
        folder=root/item['case_key'];folder.mkdir()
        html=content if content is not None else ('<!doctype html><html><head><link rel="canonical" href="'+(canonical if canonical is not None else url)+'"></head><body>Test</body></html>')
        raw=html.encode('utf-8')
        (folder/'source.html').write_bytes(raw)
        manifest={'schema_version':'akarfinder-v7-raw-html-evidence-v1',
                  'source_url':url,'captured_at_utc':'2026-11-14T08:00:00Z','http_status':200,
                  'content_type':'text/html; charset=utf-8','html_sha256':hashlib.sha256(raw).hexdigest(),
                  'bytes':len(raw),'capture_method':'explicit_single_page_https_get'}
        (folder/'source.manifest.json').write_text(json.dumps(manifest))
        return folder
    def test_first_party_case_kit_counts_and_non_admission(self):
        x=self.make()
        self.assertEqual(x['total_requested_cases'],3)
        self.assertEqual(x['agenz_cases'],1)
        self.assertEqual(x['admitted'],0)
        pkt=json.loads((self.output/'evidence_requests_QUARANTINE.json').read_text())
        self.assertTrue(all(not v['admission_authorized'] for v in pkt['cases']))
    def test_missing_captures_are_not_validated(self):
        r,root=self.evidence(); out=self.audit(r,root)
        self.assertEqual(out['statuses'],{'SOURCE_CAPTURE_NOT_SUPPLIED':3})
        self.assertEqual(out['source_availabilities_verified'],0)
    def test_supplied_consistent_hash_still_untrusted(self):
        r,root=self.evidence();self.supply(r,root)
        out=self.audit(r,root)
        self.assertEqual(out['statuses']['SOURCE_CANONICAL_SELF_CLAIM_MATCH_NOT_AUTHENTICATED'],1)
        d=json.loads((self.root/'audit'/'receipt_QUARANTINE.json').read_text())
        row=d['cases'][0]
        self.assertTrue(row['supplied_bytes_integrity_verified'])
        self.assertFalse(row['independently_authenticated_original_source'])
        self.assertFalse(row['source_price_verified'])
    def test_html_with_xml_declaration_is_replayed_without_rewriting_bytes(self):
        r,root=self.evidence()
        html='<?xml version="1.0" encoding="UTF-8"?><!doctype html><html><head><link rel="canonical" href="'+AVITO1+'"></head><body>Listing</body></html>'
        self.supply(r,root,content=html)
        out=self.audit(r,root)
        self.assertEqual(out['statuses']['SOURCE_CANONICAL_SELF_CLAIM_MATCH_NOT_AUTHENTICATED'],1)
        self.assertEqual((root/json.loads(r.read_text())['cases'][0]['case_key']/'source.html').read_bytes(),html.encode('utf-8'))
    def test_receipt_is_utf8_for_unicode_source_url(self):
        r,root=self.evidence()
        packet=json.loads(r.read_text(encoding='utf-8'))
        source_url='https://www.avito.ma/fr/casa/appartements/Studio_à_louer_58917466.htm'
        packet['cases'][0]['source_url']=source_url
        packet['cases'][0]['case_key']=_case_key(source_url)
        r.write_text(json.dumps(packet,ensure_ascii=False),encoding='utf-8')
        self.audit(r,root)
        receipt=(self.root/'audit'/'receipt_QUARANTINE.json').read_bytes()
        self.assertIn(source_url.encode('utf-8'),receipt)
        self.assertEqual(json.loads(receipt.decode('utf-8'))['cases'][0]['source_url'],source_url)
    def test_changed_html_bytes_rejected(self):
        r,root=self.evidence();folder=self.supply(r,root)
        (folder/'source.html').write_text('<!doctype html><html>MODIFIED</html>')
        self.assertEqual(self.audit(r,root)['statuses']['INVALID_CAPTURE_REQUIRES_REVIEW'],1)
    def test_canonical_mismatch_review(self):
        r,root=self.evidence();self.supply(r,root,canonical=AVITO2)
        self.assertEqual(self.audit(r,root)['statuses']['SOURCE_CANONICAL_CONFLICT_REQUIRES_REVIEW'],1)
    def test_canonical_missing_review(self):
        r,root=self.evidence();self.supply(r,root,content='<!doctype html><html><head></head><body></body></html>')
        self.assertEqual(self.audit(r,root)['statuses']['SOURCE_CANONICAL_NOT_SUPPLIED'],1)
    def test_manifest_url_mismatch_rejected(self):
        r,root=self.evidence(); folder=self.supply(r,root)
        p=folder/'source.manifest.json';m=json.loads(p.read_text());m['source_url']=AVITO2;p.write_text(json.dumps(m))
        self.assertEqual(self.audit(r,root)['statuses']['INVALID_CAPTURE_REQUIRES_REVIEW'],1)
    def test_partial_capture_review(self):
        r,root=self.evidence(); folder=self.supply(r,root)
        (folder/'source.manifest.json').unlink()
        self.assertEqual(self.audit(r,root)['statuses']['INCOMPLETE_SOURCE_CAPTURE'],1)
    def test_symlink_capture_not_followed(self):
        r,root=self.evidence(); folder=self.supply(r,root)
        (folder/'source.html').unlink();(folder/'source.html').symlink_to(self.gzip)
        self.assertEqual(self.audit(r,root)['statuses']['EVIDENCE_SYMLINK_REJECTED'],1)
    def test_bad_packet_pin_before_output(self):
        r,root=self.evidence()
        with self.assertRaisesRegex(ProofRejected,'UNPINNED_OR_UNSAFE_INPUT'):
            audit(r,'0'*64,root,self.root/'audit')
        self.assertFalse((self.root/'audit').exists())
    def test_duplicate_case_rejected(self):
        r,root=self.evidence();d=json.loads(r.read_text());d['cases'].append(d['cases'][0]);r.write_text(json.dumps(d))
        with self.assertRaisesRegex(ProofRejected,'INVALID_OR_DUPLICATE_CASE_IDENTITY'):
            self.audit(r,root)
        self.assertFalse((self.root/'audit').exists())
    def test_case_cannot_enable_admission(self):
        r,root=self.evidence();d=json.loads(r.read_text());d['cases'][0]['admission_authorized']=True;r.write_text(json.dumps(d))
        with self.assertRaisesRegex(ProofRejected,'CASE_NOT_QUARANTINED'):
            self.audit(r,root)
    def test_wrong_priority_pin_rejected(self):
        a,b=self.write()
        with self.assertRaisesRegex(ProofRejected,'UNPINNED_OR_UNSAFE_INPUT'):
            prepare(self.gzip,a,self.csv,'f'*64,self.output,max_groups=1)
    def test_unsupported_host_and_tracking_query_rejected(self):
        with self.assertRaises(ProofRejected):_url_key('https://evil-avito.ma/fr/a/58917466')
        with self.assertRaises(ProofRejected):_url_key(AVITO1+'?utm=tracking')
    def test_missing_agenz_case_rejected(self):
        self.cases.pop()
        a,b=self.write()
        with self.assertRaisesRegex(ProofRejected,'AGENZ_HISTORIC_CASE_NOT_IN_INPUT'):
            prepare(self.gzip,a,self.csv,b,self.output,max_groups=1)
    def test_priority_source_count_mismatch(self):
        self.cases.pop(1)
        a,b=self.write()
        with self.assertRaisesRegex(ProofRejected,'PRIORITY_GROUP_NOT_RECONCILED_WITH_INPUT'):
            prepare(self.gzip,a,self.csv,b,self.output,max_groups=1)
    def test_malicious_out_inside_git(self):
        a,b=self.write();repo=self.root/'repo';repo.mkdir();(repo/'.git').mkdir()
        with self.assertRaisesRegex(ProofRejected,'OUTPUT_INSIDE_REPOSITORY_FORBIDDEN'):
            prepare(self.gzip,a,self.csv,b,repo/'x',max_groups=1)

if __name__=='__main__':unittest.main()

