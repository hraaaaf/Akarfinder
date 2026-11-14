"""J2 FeenWay source-id collision triage: synthetic, fail-closed, no portal HTTP."""
from __future__ import annotations
import csv, gzip, hashlib, json, tempfile, unittest, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from v7_multisource.feenway_j2_quarantine_triage import triage,TriageRejected,MATCHED,AMBIGUOUS,DECISION,SCHEMA

def sample(fw='https://www.feenway.com/listings/1',src='https://www.mubawab.ma/fr/a/1888888/a',
           offer='1888888',fp='a'*64,state=MATCHED,status='SOURCE_ROUTE_FORMAT_ONLY',price=800000):
    return dict(feenway_url=fw,source_url=src,source_url_status=status,
                source_domain_hint='www.mubawab.ma' if src else None,
                source_offer_id_hint=offer,six_field_fingerprint_sha256=fp,
                identity_link_state=state,feenway_identity_independently_verified=False,
                source_detail_independently_verified=False,availability_verified=False,
                physical_uniqueness_verified=False,decision=DECISION,
                price_mad_claim=price,surface_m2_claim=80,
                city_claim='Rabat',district_claim='Agdal',quality_flags=[])

class Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);self.gz=self.root/'input.gz'
        self.report=self.root/'report.json';self.out=self.root/'out'
        self.rows=[sample()]
    def write(self):
        with gzip.open(self.gz,'wt',encoding='utf-8') as f:
            for row in self.rows: f.write(json.dumps(row)+'\n')
        states={};sources={}
        for row in self.rows:
            states[row['identity_link_state']]=states.get(row['identity_link_state'],0)+1
            sources[row['source_url_status']]=sources.get(row['source_url_status'],0)+1
        amb={r['six_field_fingerprint_sha256'] for r in self.rows if r['identity_link_state']==AMBIGUOUS}
        d=dict(schema_version=SCHEMA,records_processed=len(self.rows),
               identity_link_counts=states,source_status_counts=sources,
               content_fingerprint_ambiguous_groups=len(amb),
               content_fingerprint_ambiguous_rows=sum(r['identity_link_state']==AMBIGUOUS for r in self.rows),
               old_archive_sha256='1'*64,new_archive_sha256='2'*64,
               private_staging_authorized=False,public_admission_authorized=False)
        self.report.write_text(json.dumps(d))
        return hashlib.sha256(self.gz.read_bytes()).hexdigest()
    def runtriage(self):
        return triage(self.gz,self.write(),self.report,self.out)
    def test_valid_single_is_still_quarantined(self):
        r=self.runtriage()
        self.assertEqual(r['records'],1)
        self.assertEqual(r['unique_content_links_not_independently_verified'],1)
        self.assertFalse(r['public_admission_authorized'])
        self.assertEqual(r['database_writes'],0)
        self.assertEqual(r['verified_live_original_sources'],0)
    def test_source_id_price_conflict_not_physical_duplicate(self):
        self.rows.append(sample(fw='https://www.feenway.com/listings/2',src='https://www.mubawab.ma/fr/a/1888888/b',fp='b'*64,price=900000))
        r=self.runtriage()
        self.assertEqual(r['source_id_collision_groups'],1)
        self.assertEqual(r['source_id_collision_group_conflicts']['price_conflict'],1)
        self.assertEqual(r['confirmed_physical_duplicates'],0)
    def test_ambiguous_different_source_ids_not_linked(self):
        self.rows=[sample(fw=None,state=AMBIGUOUS,fp='f'*64),
                   sample(fw=None,state=AMBIGUOUS,fp='f'*64,offer='1777777',
                          src='https://www.mubawab.ma/fr/a/1777777/b')]
        r=self.runtriage()
        self.assertEqual(r['ambiguous_identity_rows'],2)
        self.assertEqual(r['ambiguous_group_categories']['MULTIPLE_SOURCE_ID_HINTS'],1)
        with (self.out/'ambiguous_identity_rows_QUARANTINE.csv').open(encoding='utf-8') as f:
            self.assertTrue(all(x['decision']=='AMBIGUOUS_NO_FEENWAY_ID_OR_ADMISSION' for x in csv.DictReader(f)))
    def test_ambiguous_same_source_id(self):
        self.rows=[sample(fw=None,state=AMBIGUOUS,fp='f'*64),
                   sample(fw=None,state=AMBIGUOUS,fp='f'*64,
                          src='https://www.mubawab.ma/fr/a/1888888/b')]
        r=self.runtriage()
        self.assertEqual(r['ambiguous_group_categories']['SAME_SOURCE_ID_HINT_MULTIPLE_URLS'],1)
        self.assertEqual(r['source_id_collision_groups_touching_ambiguity'],1)
    def test_missing_and_nonstandard_uris_stay_in_review(self):
        self.rows=[sample(src=None,offer=None,status='SOURCE_URL_MISSING'),
                   sample(fw='https://www.feenway.com/listings/2',fp='b'*64,
                          src='https://www.mubawab.ma/fr/pa/xyz',offer=None,status='SOURCE_ROUTE_REVIEW')]
        r=self.runtriage()
        self.assertEqual(r['source_url_gap_rows'],2)
    def test_bad_sha_rejected_before_output(self):
        pin=self.write()
        with self.assertRaisesRegex(TriageRejected,'PIN_OR_QUARANTINE_GZIP_INVALID'):
            triage(self.gz,'f'*64,self.report,self.out)
        self.assertFalse(self.out.exists())
    def test_tampered_report_rejected(self):
        pin=self.write();d=json.loads(self.report.read_text());d['records_processed']=9
        self.report.write_text(json.dumps(d))
        with self.assertRaisesRegex(TriageRejected,'INTAKE_REPORT_DISAGREES_WITH_ROWS'):
            triage(self.gz,pin,self.report,self.out)
        self.assertFalse(self.out.exists())
    def test_ambiguous_cannot_own_feenway_id(self):
        self.rows=[sample(state=AMBIGUOUS)]
        with self.assertRaisesRegex(TriageRejected,'AMBIGUOUS_FEENWAY_ID_MUST_BE_NULL'):
            self.runtriage()
    def test_availability_true_rejected(self):
        self.rows[0]['availability_verified']=True
        with self.assertRaisesRegex(TriageRejected,'INVALID_QUARANTINE_CONTRACT'):
            self.runtriage()
    def test_duplicate_source_rejected(self):
        self.rows.append(sample(fw='https://www.feenway.com/listings/2',fp='b'*64))
        with self.assertRaisesRegex(TriageRejected,'INVALID_OR_DUPLICATE_SOURCE_URL'):
            self.runtriage()
    def test_duplicate_feenway_rejected(self):
        self.rows.append(sample(src='https://www.mubawab.ma/fr/a/1777777/b',offer='1777777',fp='b'*64))
        with self.assertRaisesRegex(TriageRejected,'INVALID_OR_DUPLICATE_FEENWAY_ID'):
            self.runtriage()
    def test_host_mismatch_rejected(self):
        self.rows[0]['source_domain_hint']='www.avito.ma'
        with self.assertRaisesRegex(TriageRejected,'SOURCE_HOST_MISMATCH'):
            self.runtriage()
    def test_corrupt_jsonl_rejected(self):
        self.write()
        with gzip.open(self.gz,'at') as f:f.write('{not json}\n')
        pin=hashlib.sha256(self.gz.read_bytes()).hexdigest()
        with self.assertRaisesRegex(TriageRejected,'INVALID_QUARANTINE_JSONL'):
            triage(self.gz,pin,self.report,self.out)
    def test_excel_formula_protected(self):
        self.rows[0].update(source_url=None,source_offer_id_hint=None,source_url_status='SOURCE_URL_MISSING',
                            city_claim='=1+1')
        self.runtriage()
        with (self.out/'source_url_gaps_REVIEW_ONLY.csv').open(encoding='utf-8') as f:
            self.assertTrue(next(csv.DictReader(f))['city_claim'].startswith("'="))
    def test_repo_output_forbidden(self):
        d=self.root/'repo';d.mkdir();(d/'.git').mkdir()
        pin=self.write()
        with self.assertRaisesRegex(TriageRejected,'PRIVATE_NEW_OUTPUT_OUTSIDE_GIT_REQUIRED'):
            triage(self.gz,pin,self.report,d/'output')
    def test_oversized_line_rejected(self):
        self.write()
        with gzip.open(self.gz,'wb') as f:f.write(b'a'*500001+b'\n')
        pin=hashlib.sha256(self.gz.read_bytes()).hexdigest()
        with self.assertRaisesRegex(TriageRejected,'QUARANTINE_DECOMPRESSION_LIMIT'):
            triage(self.gz,pin,self.report,self.out)

if __name__=='__main__':
    unittest.main()
