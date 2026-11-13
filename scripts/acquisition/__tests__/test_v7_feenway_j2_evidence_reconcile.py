"""J2 FeenWay immutable evidence reconciliation adversarial synthetic tests."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_multisource.feenway_j2_evidence_reconcile import reconcile, ReconcileRejected

def archive(path, members):
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for k, v in members.items():
            z.writestr(k, v if isinstance(v, str) else json.dumps(v))
    return hashlib.sha256(path.read_bytes()).hexdigest()

def fixture(folder, *, two=False, conflict=True):
    a = {'feenway_url':'https://www.feenway.com/listings/186197',
         'original_url':'https://agenz.ma/fr/annonces/immo-marrakech/location-appartements/route-de-casablanca/169490',
         'source_domain_hint':'agenz.ma','source_offer_id_hint':'169490'}
    b = dict(a, feenway_url='https://www.feenway.com/listings/186198')
    candidates = [a,b] if two else [a]
    cases = [dict(feenway_url=c['feenway_url'],original_url=c['original_url'],
                  source_domain=c['source_domain_hint'],source_offer_id_hint=c['source_offer_id_hint'],
                  status='SOURCE_CANONICAL_ID_MATCH',public_admission_authorized=False) for c in candidates]
    original = folder/'orig.zip'
    digest = archive(original, {'upstream_report_QUARANTINE.json':
        {'planned_source_pages':len(candidates),'status_counts':{'SOURCE_CANONICAL_ID_MATCH':len(candidates)},
         'observed_at_utc':'2026-11-13T14:51:32Z'},
         'upstream_cases_QUARANTINE.jsonl':'\n'.join(map(json.dumps,cases))})
    deep = folder/'deep.zip'
    deepdigest = archive(deep, {'agenz_replay_QUARANTINE.json':{
        'feenway_url':a['feenway_url'], 'source_url':a['original_url'],
        'expected_source_id_hint':'169490','public_admission_authorized':False,
        'original_http_status':200,'source_canonical_id_claim_matches':True,
        'source_raw_html_sha256':'c'*64,
        'primary_source_scope':{'primary_price_description_conflict':conflict,
                                'availability_verified':False,'public_admission_authorized':False},
    }})
    return candidates, cases, original, digest, deep, deepdigest

class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.candidates,self.cases,self.orig,self.o_hash,self.deep,self.d_hash = fixture(self.path)

    def runok(self):
        return reconcile(self.candidates,self.orig,self.o_hash,self.deep,self.d_hash)

    def test_conflict_never_admits(self):
        r = self.runok()
        self.assertEqual(r['source_price_conflict_cases'],1)
        self.assertEqual(r['candidate_count'],1)
        self.assertEqual(r['cases'][0]['decision'],'REQUIRES_MANUAL_PRICE_REVIEW')
        self.assertEqual(r['admitted_listings'],0)
        self.assertEqual(r['independently_verified_active_listings'],0)
        self.assertFalse(r['public_admission_authorized'])

    def test_identity_claim_not_physical_uniqueness(self):
        r = self.runok()
        self.assertEqual(r['confirmed_physical_duplicate_groups'],0)
        self.assertFalse(r['cases'][0]['physical_uniqueness_verified'])

    def test_wrong_zip_pin_rejected(self):
        with self.assertRaisesRegex(ReconcileRejected,'PINNED_ARCHIVE_SHA256_MISMATCH'):
            reconcile(self.candidates,self.orig,'0'*64)

    def test_tampered_source_id_rejected(self):
        self.cases[0]['source_offer_id_hint']='999999'
        self.o_hash=archive(self.orig,{
            'upstream_report_QUARANTINE.json':{'planned_source_pages':1,
                'status_counts':{'SOURCE_CANONICAL_ID_MATCH':1}},
            'upstream_cases_QUARANTINE.jsonl':json.dumps(self.cases[0])})
        with self.assertRaisesRegex(ReconcileRejected,'SOURCE_IDENTITY_OR_RESULT_MISMATCH'):
            reconcile(self.candidates,self.orig,self.o_hash)

    def test_deep_claim_must_be_bound(self):
        self.d_hash=archive(self.deep,{'agenz_replay_QUARANTINE.json':{
            'feenway_url':self.candidates[0]['feenway_url'],
            'source_url':'https://agenz.ma/fake/9999',
            'expected_source_id_hint':'169490','public_admission_authorized':False,
            'original_http_status':200,'source_canonical_id_claim_matches':True,
            'source_raw_html_sha256':'c'*64,
            'primary_source_scope':{'availability_verified':False,'public_admission_authorized':False}}})
        with self.assertRaisesRegex(ReconcileRejected,'AGENZ_EVIDENCE_NOT_BOUND_TO_ORIGINAL'):
            self.runok()

    def test_missing_original_status_disagreement(self):
        self.o_hash=archive(self.orig,{
            'upstream_report_QUARANTINE.json':{'planned_source_pages':1,
                'status_counts':{'SOURCE_FETCH_UNAVAILABLE':1}},
            'upstream_cases_QUARANTINE.jsonl':json.dumps(self.cases[0])})
        with self.assertRaisesRegex(ReconcileRejected,'SOURCE_REPORT_STATUSES_MISMATCH'):
            reconcile(self.candidates,self.orig,self.o_hash)

    def test_shared_claimed_upstream_id_is_only_hint(self):
        self.candidates,self.cases,self.orig,self.o_hash,self.deep,self.d_hash=fixture(self.path,two=True)
        r=self.runok()
        self.assertEqual(r['candidate_shared_upstream_id_groups'],1)
        self.assertEqual(r['confirmed_physical_duplicate_groups'],0)
        self.assertEqual(r['admitted_listings'],0)

    def test_no_conflict_does_not_upgrade(self):
        self.candidates,self.cases,self.orig,self.o_hash,self.deep,self.d_hash=fixture(self.path,conflict=False)
        r=self.runok()
        self.assertEqual(r['source_price_conflict_cases'],0)
        self.assertEqual(r['cases'][0]['decision'],'IDENTITY_CLAIM_ONLY_NO_ADMISSION')

    def test_bad_zip_member_rejected(self):
        self.o_hash=archive(self.orig,{'../evil.json':'{}'})
        with self.assertRaisesRegex(ReconcileRejected,'UNSAFE_OR_UNEXPECTED_ARCHIVE_MEMBERS'):
            reconcile(self.candidates,self.orig,self.o_hash)

    def test_missing_agenz_hash_rejected(self):
        with self.assertRaisesRegex(ReconcileRejected,'AGENZ_ARCHIVE_AND_SHA_REQUIRED_TOGETHER'):
            reconcile(self.candidates,self.orig,self.o_hash,agenz_zip=self.deep)

    def test_duplicate_candidate_url_rejected(self):
        with self.assertRaisesRegex(ReconcileRejected,'INVALID_OR_DUPLICATE_CANDIDATE'):
            reconcile(self.candidates+self.candidates,self.orig,self.o_hash)

if __name__ == '__main__':
    unittest.main()
