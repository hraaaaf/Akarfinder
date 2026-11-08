#!/usr/bin/env python3
"""Offline, private human review template and scorecard for AkarParser V2.

No networking, no DB access, no auto-approval. A self-attested source capture
is NOT independently verified by this program and NEVER authorizes publication.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import gzip
import hashlib
import json
from pathlib import Path
import re
from typing import Any

FIELDS = ('price_mad', 'surface_total_m2', 'property_type')
KINDS = ('source_page_snapshot', 'trusted_archive_snapshot', 'source_document')
STATUSES = ('pending', 'verified', 'absent', 'unverifiable')
SHA_RE = re.compile(r'^[0-9a-f]{64}$')


def iter_jsonl(path: Path):
    opener = gzip.open if path.name.endswith('.gz') else open
    with opener(path, 'rt', encoding='utf-8') as stream:
        for no, line in enumerate(stream, 1):
            if line.strip():
                obj = json.loads(line)
                if not isinstance(obj, dict):
                    raise ValueError(f'NON_OBJECT_REVIEW_ROW:{no}')
                yield obj


def sha_file(path: Path) -> str:
    d = hashlib.sha256()
    with path.open('rb') as handle:
        for buf in iter(lambda: handle.read(1024 * 1024), b''):
            d.update(buf)
    return d.hexdigest()


def unique_rows(path: Path, expected_count: int) -> dict[str, dict]:
    rows: dict[str, dict] = {}
    for row in iter_jsonl(path):
        record_id = row.get('record_id')
        if not isinstance(record_id, str) or not record_id.strip():
            raise ValueError('MISSING_RECORD_ID')
        if record_id in rows:
            raise ValueError('DUPLICATE_RECORD_ID')
        rows[record_id] = row
    if len(rows) != expected_count:
        raise ValueError(f'EXPECTED_{expected_count}_REVIEW_ROWS_GOT_{len(rows)}')
    return rows


def prepare(queue: Path, annotations: Path, expected_count: int = 100) -> dict:
    rows = unique_rows(queue, expected_count)
    if annotations.resolve() == queue.resolve():
        raise ValueError('MUST_NOT_OVERWRITE_SOURCE_QUEUE')
    annotations.parent.mkdir(parents=True, exist_ok=True)
    with annotations.open('x', encoding='utf-8', newline='\n') as dst:
        for record_id in rows:
            item = {
                'record_id': record_id,
                'reviewer_id': None,
                'reviewed_at_utc': None,
                'independent_source': {'kind': None, 'capture_sha256': None,
                                       'captured_at_utc': None},
                'reference': {key: {'status': 'pending', 'value': None} for key in FIELDS},
                'reviewer_note': None,
            }
            dst.write(json.dumps(item, sort_keys=True, ensure_ascii=False) + '\n')
    return {'template_rows': len(rows), 'reviewed_rows': 0,
            'private_review_queue_sha256': sha_file(queue),
            'review_annotations_sha256': sha_file(annotations),
            'precision_certified': False, 'neon_import_authorized': False}


def utc_valid(value: Any) -> bool:
    if not isinstance(value, str) or not value:
        return False
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return parsed.tzinfo is not None and parsed.utcoffset().total_seconds() == 0
    except (ValueError, AttributeError):
        return False


def numeric_equal(actual: Any, expected: Any) -> bool:
    if isinstance(actual, bool) or isinstance(expected, bool):
        return False
    try:
        a, b = Decimal(str(actual)), Decimal(str(expected))
        return a.is_finite() and b.is_finite() and a == b
    except (InvalidOperation, ValueError, TypeError):
        return False


def field_equal(field: str, predicted: Any, reference: Any) -> bool:
    if field == 'property_type':
        return isinstance(predicted, str) and isinstance(reference, str) and predicted.strip().lower() == reference.strip().lower()
    return numeric_equal(predicted, reference)


def human_evidence_declared(row: dict) -> bool:
    reviewer = row.get('reviewer_id')
    evidence = row.get('independent_source')
    if not isinstance(reviewer, str) or not reviewer.strip() or not utc_valid(row.get('reviewed_at_utc')):
        return False
    if not isinstance(evidence, dict) or evidence.get('kind') not in KINDS:
        return False
    return (isinstance(evidence.get('capture_sha256'), str) and bool(SHA_RE.fullmatch(evidence['capture_sha256']))
            and utc_valid(evidence.get('captured_at_utc')))


def score(queue: Path, annotations: Path, out: Path, *, expected_count: int = 100,
          min_predicted_per_field: int = 50) -> dict:
    if out.resolve() in (queue.resolve(), annotations.resolve()):
        raise ValueError('OUTPUT_MUST_DIFFER_FROM_INPUT')
    raw = unique_rows(queue, expected_count)
    reviews = unique_rows(annotations, expected_count)
    if set(raw) != set(reviews):
        raise ValueError('REVIEW_RECORD_SET_MISMATCH')
    counts = {name: Counter() for name in FIELDS}
    reviewed_rows = 0
    for record_id, original in raw.items():
        review = reviews[record_id]
        evidence_ok = human_evidence_declared(review)
        if evidence_ok:
            reviewed_rows += 1
        extracted = original.get('extracted') or {}
        if not isinstance(extracted, dict):
            raise ValueError('INVALID_ORIGINAL_EXTRACTED')
        evidence = review.get('reference') or {}
        if not isinstance(evidence, dict):
            evidence = {}
        for field in FIELDS:
            counter = counts[field]
            predicted = extracted.get(field)
            predicted_present = predicted is not None and predicted != ''
            if predicted_present:
                counter['predicted_present'] += 1
            reference = evidence.get(field)
            status = reference.get('status') if isinstance(reference, dict) else None
            value = reference.get('value') if isinstance(reference, dict) else None
            if status not in STATUSES:
                raise ValueError('INVALID_REVIEW_FIELD_STATUS')
            if not evidence_ok or status in ('pending', 'unverifiable'):
                counter['unresolved'] += 1
                continue
            if status == 'verified':
                if value is None or value == '' or (field == 'property_type' and not isinstance(value, str)):
                    raise ValueError('VERIFIED_REFERENCE_VALUE_MISSING')
                if field != 'property_type' and not numeric_equal(value, value):
                    raise ValueError('INVALID_REFERENCE_NUMERIC_VALUE')
            if status == 'absent' and value is not None:
                raise ValueError('ABSENT_REFERENCE_MUST_BE_NULL')
            if predicted_present:
                counter['adjudicated_predicted'] += 1
                if status == 'verified' and field_equal(field, predicted, value):
                    counter['correct'] += 1
                else:
                    counter['incorrect'] += 1
            elif status == 'verified':
                counter['missed_in_extraction'] += 1
            else:
                counter['correctly_absent'] += 1
    fields = {}
    eligible = reviewed_rows == expected_count
    for field in FIELDS:
        c = counts[field]
        n = c['adjudicated_predicted']
        pct = round(100 * c['correct'] / n, 4) if n else None
        complete = c['unresolved'] == 0 and c['predicted_present'] == n
        enough = n >= min_predicted_per_field
        passed = complete and enough and n > 0 and c['correct'] * 100 >= 98 * n
        eligible = eligible and passed
        fields[field] = {
            'predicted_present': c['predicted_present'],
            'independently_adjudicated_predictions_declared': n,
            'correct': c['correct'], 'incorrect': c['incorrect'],
            'missed_in_extraction': c['missed_in_extraction'],
            'correctly_absent': c['correctly_absent'], 'unresolved': c['unresolved'],
            'observed_precision_percent': pct,
            'minimum_adjudicated_predictions_met': enough,
            'observed_98pct_point_estimate_gate_passed': passed,
        }
    report = {
        'kind': 'private_reviewer_declaration_scorecard_v1',
        'review_queue_sha256': sha_file(queue),
        'annotations_sha256': sha_file(annotations),
        'expected_rows': expected_count, 'reviewer_evidence_metadata_rows_complete': reviewed_rows,
        'data_quality_gate_by_reviewer_declaration_passed': eligible,
        'independent_source_capture_authenticity_machine_verified': False,
        'representativeness_of_wider_population_proven': False,
        'neon_import_authorized': False,
        'new_detailed_observations_certified': 0,
        'fields': fields,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open('x', encoding='utf-8') as handle:
        json.dump(report, handle, ensure_ascii=False, sort_keys=True, indent=2)
        handle.write('\n')
    return report


def main() -> None:
    ap = argparse.ArgumentParser(description='Q1E private, offline independent review template and scorecard')
    sub = ap.add_subparsers(dest='command', required=True)
    for name in ('prepare', 'score'):
        cmd = sub.add_parser(name)
        cmd.add_argument('--queue', required=True, type=Path)
        cmd.add_argument('--annotations', required=True, type=Path)
        cmd.add_argument('--expected-size', type=int, default=100)
        if name == 'score':
            cmd.add_argument('--out', required=True, type=Path)
            cmd.add_argument('--minimum-adjudicated-predictions', type=int, default=50)
    args = ap.parse_args()
    if args.expected_size <= 0:
        raise SystemExit('INVALID_EXPECTED_REVIEW_SIZE')
    if args.command == 'prepare':
        result = prepare(args.queue, args.annotations, args.expected_size)
    else:
        if args.minimum_adjudicated_predictions < 1:
            raise SystemExit('INVALID_MIN_PREDICTIONS')
        result = score(args.queue, args.annotations, args.out, expected_count=args.expected_size,
                       min_predicted_per_field=args.minimum_adjudicated_predictions)
    # Never print row values, URLs or evidence references to logs.
    print(json.dumps(result, sort_keys=True, ensure_ascii=False))


if __name__ == '__main__':
    main()
