import gzip
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v2_review_scorecard import prepare, score, numeric_equal


class IndependentReviewScorecardTests(unittest.TestCase):
    def fixture(self, root, n=3):
        q = root / 'private_review_queue_100.jsonl.gz'
        rows = []
        for i in range(n):
            rows.append({'record_id': f'obs-{i:04}', 'source': {'source_url': 'private'},
                         'extracted': {'price_mad': 500000+i, 'surface_total_m2': 80+i,
                                       'property_type': 'apartment'}})
        with gzip.open(q, 'wt', encoding='utf-8') as f:
            for item in rows:
                f.write(json.dumps(item)+'\n')
        a = root / 'private_annotations.jsonl'
        prepare(q, a, n)
        return q, a, rows

    def attest(self, a, rows):
        out = []
        for x, predicted in zip(a.read_text().splitlines(), rows):
            item = json.loads(x)
            item['reviewer_id'] = 'human-auditor-1'
            item['reviewed_at_utc'] = '2026-11-08T12:00:00Z'
            item['independent_source'] = {
                'kind': 'source_page_snapshot', 'capture_sha256': 'a'*64,
                'captured_at_utc': '2026-11-08T11:00:00Z'}
            for k in ('price_mad', 'surface_total_m2', 'property_type'):
                item['reference'][k] = {'status': 'verified', 'value': predicted['extracted'][k]}
            out.append(item)
        a.write_text('\n'.join(json.dumps(x) for x in out)+'\n')
        return out

    def test_prepare_does_not_guess_human_reviews_or_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); q,a,rows=self.fixture(root)
            self.assertEqual([json.loads(x)['reviewer_id'] for x in a.read_text().splitlines()], [None]*3)
            with self.assertRaises(FileExistsError):
                prepare(q,a,3)
            with self.assertRaises(ValueError):
                prepare(q,q,3)

    def test_unreviewed_cannot_pass(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);q,a,_=self.fixture(root)
            result=score(q,a,root/'report.json',expected_count=3,min_predicted_per_field=1)
            self.assertEqual(result['reviewer_evidence_metadata_rows_complete'],0)
            self.assertFalse(result['data_quality_gate_by_reviewer_declaration_passed'])
            self.assertFalse(result['neon_import_authorized'])

    def test_all_attested_point_estimate_pass_but_no_automatic_certification(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);q,a,rows=self.fixture(root)
            self.attest(a,rows)
            result=score(q,a,root/'report.json',expected_count=3,min_predicted_per_field=1)
            self.assertTrue(result['data_quality_gate_by_reviewer_declaration_passed'])
            self.assertEqual(result['fields']['price_mad']['correct'],3)
            self.assertFalse(result['independent_source_capture_authenticity_machine_verified'])
            self.assertFalse(result['neon_import_authorized'])
            with self.assertRaises(FileExistsError):
                score(q,a,root/'report.json',expected_count=3,min_predicted_per_field=1)

    def test_incorrect_reference_fails_precision(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);q,a,rows=self.fixture(root)
            annotations=self.attest(a,rows)
            annotations[0]['reference']['price_mad']['value']=1
            a.write_text('\n'.join(json.dumps(x) for x in annotations)+'\n')
            result=score(q,a,root/'report.json',expected_count=3,min_predicted_per_field=1)
            self.assertEqual(result['fields']['price_mad']['incorrect'],1)
            self.assertFalse(result['data_quality_gate_by_reviewer_declaration_passed'])

    def test_missing_evidence_fails_gate(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);q,a,rows=self.fixture(root)
            items=self.attest(a,rows)
            items[0]['independent_source']['capture_sha256']='not-a-sha'
            a.write_text('\n'.join(json.dumps(x) for x in items)+'\n')
            result=score(q,a,root/'report.json',expected_count=3,min_predicted_per_field=1)
            self.assertEqual(result['reviewer_evidence_metadata_rows_complete'],2)
            self.assertFalse(result['data_quality_gate_by_reviewer_declaration_passed'])

    def test_unverifiable_does_not_shrink_denominator_and_pass(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);q,a,rows=self.fixture(root)
            items=self.attest(a,rows)
            items[0]['reference']['price_mad']={'status':'unverifiable','value':None}
            a.write_text('\n'.join(json.dumps(x) for x in items)+'\n')
            result=score(q,a,root/'report.json',expected_count=3,min_predicted_per_field=1)
            self.assertEqual(result['fields']['price_mad']['unresolved'],1)
            self.assertFalse(result['data_quality_gate_by_reviewer_declaration_passed'])

    def test_wrong_ids_fail_even_if_same_count(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);q,a,rows=self.fixture(root)
            lines=[json.loads(x) for x in a.read_text().splitlines()]
            lines[0]['record_id']='unknown'
            a.write_text('\n'.join(json.dumps(x) for x in lines)+'\n')
            with self.assertRaisesRegex(ValueError,'REVIEW_RECORD_SET_MISMATCH'):
                score(q,a,root/'report.json',expected_count=3,min_predicted_per_field=1)

    def test_non_numeric_and_strict_decimals(self):
        self.assertTrue(numeric_equal('600000.00',600000))
        self.assertFalse(numeric_equal('600000.01',600000))
        self.assertFalse(numeric_equal('nan',0))
        self.assertFalse(numeric_equal(True,1))

    def test_missing_prediction_reported_separately(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);q,a,rows=self.fixture(root)
            rows[0]['extracted']['price_mad']=None
            with gzip.open(q,'wt',encoding='utf-8') as f:
                for row in rows:
                    f.write(json.dumps(row)+'\n')
            items=self.attest(a,rows)
            items[0]['reference']['price_mad']={'status':'verified','value':999}
            a.write_text('\n'.join(json.dumps(x) for x in items)+'\n')
            result=score(q,a,root/'report.json',expected_count=3,min_predicted_per_field=1)
            self.assertEqual(result['fields']['price_mad']['missed_in_extraction'],1)
            self.assertEqual(result['fields']['price_mad']['predicted_present'],2)
            self.assertTrue(result['fields']['price_mad']['observed_98pct_point_estimate_gate_passed'])
            self.assertFalse(result['neon_import_authorized'])


if __name__ == '__main__':
    unittest.main()
