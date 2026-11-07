"""Fail-closed integration tests; all approvals here are synthetic."""
from __future__ import annotations
import gzip
import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from sys import path

path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v2_promotion_gate import evaluate, gate, stable_hash

NOW = datetime(2026, 11, 7, 20, 0, tzinfo=timezone.utc)


def sample(identity='123', country='Morocco', status='ready_internal'):
    canonical = {'property_id': identity, 'schema_version': '1.0',
                 'facts': {
                     'location': {'country': {'value': country}, 'city': {'value': 'Rabat'}},
                     'classification': {'property_type': {'value': 'apartment'}},
                     'surfaces': {'surface_total_m2': {'value': 75}}},
                 'offers': [{'offer_status': 'unknown', 'compliance_status': 'review_required',
                             'transaction_type': 'sale', 'price_amount': {'value': 600000}}]}
    return {'record_id': 'obs-' + identity, 'status': status,
            'source': {'domain': 'mubawab.ma', 'source_offer_id': identity, 'identity_state': 'explicit'},
            'extracted': {'title': 'Appartement', 'city': 'Rabat', 'country': country,
                          'property_type': 'apartment', 'transaction_type': 'sale',
                          'price_mad': 600000, 'surface_total_m2': 75,
                          'observed_at': '2026-10-28T15:00:00Z'},
            'quality': {'publication_allowed': False, 'issues': [], 'core_facts_present': True},
            'canonical_property_v1': canonical}


def approval(rec, **overrides):
    v = {'record_id': rec['record_id'],
         'canonical_sha256': stable_hash(rec['canonical_property_v1']),
         'reviewer_id': 'synthetic-reviewer', 'approved_for_neon': True,
         'rights_basis': 'partner_contract', 'rights_evidence_ref': 'private:contract-1',
         'verified_country': 'Morocco', 'country_evidence_ref': 'private:country-1',
         'availability': 'available', 'availability_evidence_ref': 'private:visit-1',
         'privacy_reviewed': True, 'privacy_evidence_ref': 'private:privacy-1',
         'dedup_disposition': 'unique_or_resolved', 'dedup_evidence_ref': 'private:cluster-1',
         'verified_at': '2026-11-05T08:00:00Z'}
    v.update(overrides)
    return v


class PromotionGateTests(unittest.TestCase):
    def test_no_attestation_never_promotes(self):
        self.assertIn('MISSING_EXTERNAL_ATTESTATION', evaluate(sample(), None, NOW))

    def test_ready_internal_with_complete_synthetic_proof(self):
        row = sample()
        self.assertEqual(evaluate(row, approval(row), NOW), [])

    def test_stale_availability_is_rejected(self):
        row = sample()
        self.assertIn('FRESHNESS_NOT_CURRENT', evaluate(row, approval(row, verified_at='2026-09-01T08:00:00Z'), NOW))

    def test_unknown_rights_or_absent_evidence_is_rejected(self):
        row = sample()
        self.assertIn('RIGHTS_NOT_EVIDENCED', evaluate(row, approval(row, rights_basis='source_page'), NOW))
        self.assertIn('RIGHTS_NOT_EVIDENCED', evaluate(row, approval(row, rights_evidence_ref=''), NOW))

    def test_country_not_proved_is_rejected(self):
        row = sample(country=None)
        self.assertIn('COUNTRY_NOT_EVIDENCED_MOROCCO', evaluate(row, approval(row), NOW))

    def test_country_attestation_is_required(self):
        row = sample()
        self.assertIn('COUNTRY_REVIEW_NOT_EVIDENCED', evaluate(row, approval(row, country_evidence_ref=''), NOW))

    def test_canonical_consistency_is_required(self):
        row = sample()
        row['extracted']['price_mad'] = 1200000
        self.assertIn('CANONICAL_FIELD_MISMATCH', evaluate(row, approval(row), NOW))

    def test_serp_cannot_promote_even_with_review(self):
        row = sample(status='partial')
        row['quality']['issues'] = ['serp_snippet_not_detail_observation']
        result = evaluate(row, approval(row), NOW)
        self.assertIn('NOT_PARSER_READY_INTERNAL', result)
        self.assertIn('PARSER_CONFLICT_OR_SERP', result)

    def test_tampered_canonical_content_is_rejected(self):
        row = sample()
        proof = approval(row)
        row['canonical_property_v1']['property_id'] = 'tampered'
        self.assertIn('ATTESTATION_CONTENT_MISMATCH', evaluate(row, proof, NOW))

    def test_wrong_review_and_dedup_are_rejected(self):
        row = sample()
        result = evaluate(row, approval(row, reviewer_id='', dedup_disposition='possible_match'), NOW)
        self.assertIn('NOT_EXPLICITLY_APPROVED', result)
        self.assertIn('DEDUP_NOT_RESOLVED', result)

    def test_file_gate_repeatable_and_source_unchanged(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            row = sample()
            raw = root / 'input.jsonl.gz'
            with gzip.open(raw, 'wt', encoding='utf-8') as f:
                f.write(json.dumps(row) + '\n')
            src_sha = hashlib.sha256(raw.read_bytes()).hexdigest()
            denied = gate(raw, root / 'no-proofs', as_of=NOW)
            self.assertEqual(denied['counts']['eligible_for_separate_import_review'], 0)
            proofs = root / 'proofs.jsonl'
            proofs.write_text(json.dumps(approval(row)) + '\n', encoding='utf-8')
            first = gate(raw, root / 'run1', attestations=proofs, as_of=NOW)
            second = gate(raw, root / 'run2', attestations=proofs, as_of=NOW)
            self.assertEqual(first['counts']['eligible_for_separate_import_review'], 1)
            self.assertEqual(first['export_sha256'], second['export_sha256'])
            self.assertEqual(hashlib.sha256(raw.read_bytes()).hexdigest(), src_sha)
            self.assertEqual(first['invariants']['neon_writes'], 0)
            with self.assertRaises(FileExistsError):
                gate(raw, root / 'run1', attestations=proofs, as_of=NOW)

    def test_duplicate_source_id_with_distinct_record_ids_blocked(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            a = sample('123')
            b = sample('123')
            b['record_id'] = 'different-record'
            inp = root / 'input.jsonl'
            inp.write_text(json.dumps(a) + '\n' + json.dumps(b) + '\n', encoding='utf-8')
            proofs = root / 'proofs.jsonl'
            proofs.write_text(json.dumps(approval(a)) + '\n' + json.dumps(approval(b)) + '\n', encoding='utf-8')
            result = gate(inp, root / 'out', attestations=proofs, as_of=NOW)
            self.assertEqual(result['counts']['eligible_for_separate_import_review'], 1)
            self.assertEqual(result['withheld_reason_counts']['DUPLICATE_APPROVED_SOURCE_ID'], 1)

    def test_duplicate_attestation_ids_refused(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            row = sample()
            inp = root / 'input.jsonl'
            inp.write_text(json.dumps(row) + '\n', encoding='utf-8')
            pr = root / 'proofs.jsonl'
            pr.write_text((json.dumps(approval(row)) + '\n')*2, encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'INVALID_OR_DUPLICATE_ATTESTATION_ID'):
                gate(inp, root / 'out', attestations=pr, as_of=NOW)


if __name__ == '__main__':
    unittest.main()
