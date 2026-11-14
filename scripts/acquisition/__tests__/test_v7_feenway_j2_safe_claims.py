"""Offline contract tests for derived safe review hints, never source truth."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_multisource.feenway_j2_safe_claims import safe_repair, RepairRejected, MATCHED, AMBIG, ROUTE, REVIEW, MISSING, DECISION


def row(n=1, *, price=7500, surface=80, city='Rabat', district='Agdal', source_id='12345678',
        source_url=None, state=MATCHED, route=ROUTE):
    if source_url is None and route != MISSING:
        source_url=f'https://www.avito.ma/fr/centre/bureaux/Test_{source_id}_{n}.htm'
    return dict(feenway_url=f'https://www.feenway.com/listings/{n}' if state==MATCHED else None,
                source_url=source_url, source_url_status=route, source_domain_hint='www.avito.ma' if route!=MISSING else None,
                source_offer_id_hint=source_id if route==ROUTE else None, identity_link_state=state,
                price_mad_claim=price, surface_m2_claim=surface, city_claim=city,
                district_claim=district,title_claim='Local à louer à Rabat - 7500 DH/mois',
                feenway_identity_independently_verified=False,
                source_detail_independently_verified=False,availability_verified=False,
                physical_uniqueness_verified=False,decision=DECISION)

class SafeClaims(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.inp=self.root/'input.jsonl.gz'
        self.rep=self.root/'report.json'
        self.output=self.root/'out'
        self.rows=[row()]

    def prepare(self):
        with gzip.open(self.inp,'wt',encoding='utf-8') as g:
            for r in self.rows:
                g.write(json.dumps(r)+'\n')
        states={};routes={}
        for r in self.rows:
            states[r['identity_link_state']]=states.get(r['identity_link_state'],0)+1
            routes[r['source_url_status']]=routes.get(r['source_url_status'],0)+1
        self.rep.write_text(json.dumps(dict(schema_version='feenway_v7_j2_dual_identity_quarantine_v1',
            records_processed=len(self.rows),identity_link_counts=states,source_status_counts=routes,
            public_admission_authorized=False,private_staging_authorized=False)))
        return hashlib.sha256(self.inp.read_bytes()).hexdigest()

    def runok(self):
        return safe_repair(self.inp,self.prepare(),self.rep,self.output)

    def outputs(self):
        with gzip.open(self.output/'normalized_review_only_QUARANTINE.jsonl.gz','rt',encoding='utf-8') as f:
            return [json.loads(l) for l in f]

    def test_single_route_preserves_unverified_hint(self):
        r=self.runok();x=self.outputs()[0]
        self.assertEqual(x['filtered_review_hints_UNVERIFIED']['price_mad'],7500)
        self.assertFalse(x['public_admission_authorized']);self.assertFalse(r['public_admission_authorized'])

    def test_shared_source_id_masks_even_same_price(self):
        self.rows.append(row(2,source_id='12345678'))
        self.runok();self.assertTrue(all(x['filtered_review_hints_UNVERIFIED']['price_mad'] is None for x in self.outputs()))

    def test_shared_source_id_conflicting_price_surface(self):
        self.rows.append(row(2,price=7700,surface=81,source_id='12345678'))
        r=self.runok();self.assertEqual(r['review_flag_counts']['SOURCE_PRICE_CONFLICT'],2)
        self.assertEqual(r['review_flag_counts']['SOURCE_SURFACE_CONFLICT'],2)
        self.assertEqual(r['claimed_source_id_group_counts']['prices_conflict_groups'],1)

    def test_different_native_id_keeps_both_review_hints(self):
        self.rows.append(row(2,source_id='12345679',price=7700))
        self.runok();self.assertEqual([x['filtered_review_hints_UNVERIFIED']['price_mad'] for x in self.outputs()],[7500,7700])

    def test_ambiguous_feeway_masks_hints(self):
        self.rows=[row(state=AMBIG)]
        self.runok();x=self.outputs()[0]
        self.assertIsNone(x['feenway_url_claim']);self.assertIsNone(x['filtered_review_hints_UNVERIFIED']['price_mad'])

    def test_nonstandard_route_masks_hints(self):
        self.rows=[row(route=REVIEW)]
        self.runok();self.assertIsNone(self.outputs()[0]['filtered_review_hints_UNVERIFIED']['surface_m2'])

    def test_missing_source_masks_hints(self):
        self.rows=[row(route=MISSING)]
        self.runok();self.assertIsNone(self.outputs()[0]['filtered_review_hints_UNVERIFIED']['city'])

    def test_numeric_city_no_invention(self):
        self.rows=[row(city='1')]
        r=self.runok();x=self.outputs()[0]
        self.assertIsNone(x['filtered_review_hints_UNVERIFIED']['city'])
        self.assertEqual(x['raw_claims_unchanged']['city'],'1')
        self.assertEqual(r['review_flag_counts']['CITY_UNRELIABLE'],1)

    def test_unavailable_district_no_invention(self):
        self.rows=[row(district='N/A')]
        self.runok();self.assertIsNone(self.outputs()[0]['filtered_review_hints_UNVERIFIED']['district'])

    def test_wrong_pin_fail_closed(self):
        self.prepare()
        with self.assertRaisesRegex(RepairRejected,'INPUT_PIN_INVALID'):
            safe_repair(self.inp,'f'*64,self.rep,self.output)
        self.assertFalse(self.output.exists())

    def test_corrupt_report_fail_closed(self):
        pin=self.prepare();self.rep.write_text('{}')
        with self.assertRaisesRegex(RepairRejected,'REPORT_CONTRACT_MISMATCH'):
            safe_repair(self.inp,pin,self.rep,self.output)
        self.assertFalse(self.output.exists())

    def test_duplicate_source_url_fails(self):
        self.rows.append(row(2,source_id='12345678',source_url=self.rows[0]['source_url']))
        with self.assertRaisesRegex(RepairRejected,'INVALID_SOURCE_URL'):
            self.runok()
        self.assertFalse(self.output.exists())

    def test_privileged_flag_fails(self):
        self.rows[0]['availability_verified']=True
        with self.assertRaisesRegex(RepairRejected,'PRETENDED_PROOF'):
            self.runok()

    def test_ambiguous_with_feeway_url_fails(self):
        self.rows[0]['identity_link_state']=AMBIG
        with self.assertRaisesRegex(RepairRejected,'AMBIGUOUS_FEENWAY_ID_MUST_BE_NULL'):
            self.runok()

    def test_no_overwrite(self):
        self.output.mkdir()
        with self.assertRaisesRegex(RepairRejected,'OUTPUT_NOT_PRIVATE_AND_NEW'):
            self.runok()

    def test_report_proves_no_mutation(self):
        r=self.runok();self.assertEqual(r['original_field_claims_modified'],0)
        self.assertEqual(r['confirmed_source_field_corrections'],0)
        self.assertEqual(r['database_writes'],0)

if __name__=='__main__':
    unittest.main()
