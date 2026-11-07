#!/usr/bin/env python3
"""Q1E: deterministic, private, source-immutable stratified canary for AkarParser V2.

Purposefully does NOT fetch any webpages or connect to a remote database. All
raw listing data and review queues remain in the user-selected private folder.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import heapq
import io
import json
from pathlib import Path
import re
from typing import Any
from urllib.parse import urlsplit

import akarparser_v2 as parser

VERSION = 'akarparser-v2-canary-1.0'
GROUPS = ('mubawab', 'avito', 'agenz', 'domio', 'other')
TIERS = ('core_key_dated', 'core_unverified', 'partial', 'url_only')
FIELDS = ('title', 'description', 'city', 'district', 'property_type',
          'transaction_type', 'price_mad', 'surface_total_m2', 'bedrooms_count')


def group_for(row: dict[str, Any]) -> str:
    layers = parser.raw_layers(row)
    source, _ = parser.lookup(layers, 'source_name')
    url, _ = parser.lookup(layers, 'source_url')
    try:
        host = (urlsplit(str(url)).hostname or '') if url else ''
    except ValueError:
        host = ''  # Malformed source URL: classify as other, never invent domain.
    name = (str(source or '') + ' ' + host).lower()
    return next((g for g in GROUPS[:-1] if g in name), 'other')


def tier_for(row: dict[str, Any]) -> str:
    layers = parser.raw_layers(row)
    fields = {f: parser.lookup(layers, f)[0] for f in
              ('title', 'city', 'property_type', 'transaction_type', 'price',
               'surface', 'source_offer_id', 'observed_at', 'description', 'source_url')}
    full = bool(parser.clean(fields['title']) and parser.clean(fields['city'])
                and parser.enum_type(fields['property_type'], parser.TYPES)
                and parser.enum_type(fields['transaction_type'], parser.TRANSACTIONS)
                and parser.number(fields['price']) and parser.number(fields['surface']))
    if full:
        if parser.clean(fields['source_offer_id']) and parser.timestamp(fields['observed_at']):
            return 'core_key_dated'
        return 'core_unverified'
    if any(parser.clean(fields[f]) for f in ('title', 'description', 'city')) or parser.number(fields['price']) or parser.number(fields['surface']):
        return 'partial'
    return 'url_only'


def add_to_reservoir(heap: list, score: int, ordinal: int, row: dict[str, Any], cap: int) -> None:
    # Max-heap on a stable hash (and original row ordinal for tie breaking).
    item = (-score, -ordinal, row)
    if len(heap) < cap:
        heapq.heappush(heap, item)
    elif item[:2] > heap[0][:2]:
        heapq.heapreplace(heap, item)


def select_sample(input_file: Path, fmt: str, table: str | None, count: int):
    buckets: dict[tuple[str, str], list] = defaultdict(list)
    available: Counter = Counter()
    total = 0
    # Cap ensures even a single-source, single-tier dataset can fill the sample.
    for ordinal, row in enumerate(parser.iter_records(input_file, fmt, table)):
        group, tier = group_for(row), tier_for(row)
        available[(group, tier)] += 1
        stable = json.dumps(row, sort_keys=True, ensure_ascii=False, separators=(',', ':'), default=str)
        score = int(hashlib.sha256(stable.encode('utf-8')).hexdigest(), 16)
        add_to_reservoir(buckets[(group, tier)], score, ordinal, row, count)
        total += 1
    if total < count:
        raise ValueError(f'INSUFFICIENT_REAL_RECORDS: requested={count}, available={total}')

    choices: dict[tuple[str, str], list[tuple[int, int, dict]]] = {}
    for key, heap in buckets.items():
        choices[key] = sorted([(-a, -b, row) for a, b, row in heap], key=lambda v: (v[0], v[1]))
    selected: list[tuple[int, int, dict, str, str]] = []
    picked = set()

    def take(items: list[tuple[int,int,dict]], g: str, t: str, limit: int):
        n = 0
        for score, ordinal, row in items:
            if n >= limit or len(selected) >= count:
                break
            if ordinal in picked:
                continue
            picked.add(ordinal)
            selected.append((score, ordinal, row, g, t))
            n += 1

    # First protect rare tiers within each source, then fill its 1/5 quota.
    base, remainder = divmod(count, len(GROUPS))
    for pos, g in enumerate(GROUPS):
        quota = base + (1 if pos < remainder else 0)
        slot, tail = divmod(quota, len(TIERS))
        before = len(selected)
        for i, t in enumerate(TIERS):
            take(choices.get((g, t), []), g, t, slot + (1 if i < tail else 0))
        leftovers = sorted(
            [(s, o, r, t) for t in TIERS for s, o, r in choices.get((g, t), []) if o not in picked],
            key=lambda x: (x[0], x[1]))
        for score, ordinal, row, tier in leftovers:
            if len(selected) - before >= quota:
                break
            take([(score, ordinal, row)], g, tier, 1)

    if len(selected) < count:
        leftovers = sorted(
            [(s, o, r, g, t) for (g, t), items in choices.items()
             for s, o, r in items if o not in picked],
            key=lambda x: (x[0], x[1]))
        for score, ordinal, row, g, t in leftovers:
            if len(selected) >= count:
                break
            take([(score, ordinal, row)], g, t, 1)
    if len(selected) != count:
        raise AssertionError(f'CANARY_SELECTION_SHORTFALL: {len(selected)} / {count}')
    selected.sort(key=lambda x: (GROUPS.index(x[3]), TIERS.index(x[4]), x[0], x[1]))
    return selected, available, total


def write_gzip_jsonl(path: Path, values) -> None:
    with path.open('wb') as raw:
        with gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0) as gz:
            for value in values:
                gz.write((json.dumps(value, ensure_ascii=False, sort_keys=True, default=str) + '\n').encode('utf-8'))


def read_gzip_jsonl(path: Path):
    with gzip.open(path, 'rt', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def before_fields(row: dict) -> dict[str, Any]:
    layers = parser.raw_layers(row)
    result = {}
    for field in FIELDS:
        alias = {'price_mad': 'price', 'surface_total_m2': 'surface', 'bedrooms_count': 'bedrooms'}.get(field, field)
        value, _ = parser.lookup(layers, alias)
        result[field] = value
    return result


def actual_fields(item: dict) -> dict[str, Any]:
    extracted = item.get('extracted') or {}
    return {key: extracted.get(key) for key in FIELDS}


def run_canary(input_file: Path, out: Path, *, fmt: str = 'auto', table: str | None = None,
               count: int = 1000, review: int = 100) -> dict:
    if count <= 0 or review <= 0 or review > count:
        raise ValueError('INVALID_CANARY_SIZE')
    if not input_file.is_file():
        raise FileNotFoundError(input_file)
    if out.resolve() == input_file.resolve() or input_file.resolve().is_relative_to(out.resolve()):
        raise ValueError('PRIVATE_OUTPUT_CONTAINS_SOURCE')
    if out.exists() and any(out.iterdir()):
        raise FileExistsError('OUTPUT_MUST_BE_EMPTY_OR_NEW')
    actual_fmt = fmt if fmt != 'auto' else ('sqlite' if input_file.suffix.lower() in ('.sqlite','.db') else 'jsonl' if '.jsonl' in input_file.name or '.ndjson' in input_file.name else 'csv' if input_file.suffix.lower() == '.csv' else 'json')
    if actual_fmt == 'sqlite':
        wal = Path(str(input_file) + '-wal')
        if wal.is_file() and wal.stat().st_size > 0:
            raise ValueError('LIVE_SQLITE_WAL_NOT_SUPPORTED')
    source_sha = parser.sha_file(input_file)
    samples, available, total = select_sample(input_file, actual_fmt, table, count)
    if parser.sha_file(input_file) != source_sha:
        raise AssertionError('SOURCE_CHANGED_DURING_SELECTION')
    out.mkdir(parents=True, exist_ok=True)
    sampled_file = out / 'private_sample_1000.jsonl.gz'
    write_gzip_jsonl(sampled_file, (row for _, _, row, _, _ in samples))
    result_dir = out / 'parser_output'
    parser_manifest = parser.run(sampled_file, result_dir, fmt='jsonl')
    parsed = [*read_gzip_jsonl(result_dir / 'records.jsonl.gz'), *read_gzip_jsonl(result_dir / 'quarantine.jsonl.gz'), *read_gzip_jsonl(result_dir / 'duplicates.jsonl.gz')]
    if len(parsed) + parser_manifest['counts']['rejected_errors'] != count:
        raise AssertionError('PARSER_COUNT_MISMATCH')
    if any(p.get('quality', {}).get('publication_allowed') is not False for p in parsed):
        raise AssertionError('UNPROVEN_PUBLICATION_FLAG')
    if any(any(o.get('offer_status') not in ('unknown', None) or o.get('compliance_status') != 'review_required' for o in ((p.get('canonical_property_v1') or {}).get('offers') or [])) for p in parsed):
        raise AssertionError('UNPROVEN_ACTIVE_OR_RIGHTS')
    counters = Counter((g, t) for _, _, _, g, t in samples)
    # Same row ordering as parser output only if no exact duplicates. Coverage is
    # computed on the selected inputs and parsed outputs separately; never
    # interpret coverage gains as validated precision.
    pre = Counter()
    for _, _, row, _, _ in samples:
        for field, value in before_fields(row).items():
            if value not in (None, '', [], {}):
                pre[field] += 1
    post = Counter()
    for item in parsed:
        for field, value in actual_fields(item).items():
            if value not in (None, '', [], {}):
                post[field] += 1
    status_counts = Counter(p['status'] for p in parsed)
    issues = Counter(issue for p in parsed for issue in p['quality']['issues'])
    # Private annotation queue: stable group/status-balanced selection, no false
    # claim of review. Full evidence can only be checked against source.
    review_groups: dict[tuple[str, str], list] = defaultdict(list)
    for p in parsed:
        group = next((g for g in GROUPS[:-1] if g in str(p['source'].get('domain') or '').lower() or g in str(p['source'].get('source_name') or '').lower()), 'other')
        review_groups[(group, p['status'])].append(p)
    for group in review_groups:
        review_groups[group].sort(key=lambda r: r['record_id'])
    queue = []
    keys = sorted(review_groups)
    while len(queue) < review:
        changed = False
        for key in keys:
            if len(queue) >= review:
                break
            if review_groups[key]:
                item = review_groups[key].pop(0)
                queue.append({'record_id': item['record_id'], 'source': item['source'],
                              'extracted': item['extracted'], 'evidence': item['evidence'],
                              'manual_verdict': None, 'field_errors': [], 'reviewer_note': None,
                              'manually_reviewed': False})
                changed = True
        if not changed:
            break
    queue_path = out / 'private_review_queue_100.jsonl.gz'
    write_gzip_jsonl(queue_path, queue)
    if parser.sha_file(input_file) != source_sha:
        raise AssertionError('SOURCE_CHANGED_DURING_CANARY')
    manifest = {
        'version': VERSION, 'goal': 'stratified_real_data_canary',
        'source': {'filename': input_file.name, 'sha256': source_sha, 'format': actual_fmt, 'table': table,
                   'total_observed_rows': total, 'unchanged': True},
        'selection': {'requested': count, 'selected': len(samples), 'method': 'sha256_minimum_per_source_group_and_fact_tier',
                      'sample_by_group_tier': {f'{g}/{t}': counters[(g,t)] for g in GROUPS for t in TIERS},
                      'source_available_by_group_tier': {f'{g}/{t}': available[(g,t)] for g in GROUPS for t in TIERS}},
        'parser': {'version': parser.VERSION, 'counts': parser_manifest['counts'],
                   'source_sha_of_private_sample': parser.sha_file(sampled_file),
                   'status_counts': dict(status_counts), 'issues': dict(issues)},
        'coverage_not_precision': {'input_present': {k: pre[k] for k in FIELDS},
                                   'output_present': {k: post[k] for k in FIELDS}},
        'manual_review': {'queue_size': len(queue), 'completed': 0, 'threshold': '>=98% verified precision for price/area/property_type; not evaluated'},
        'invariants': {'cloud_writes': 0, 'production_writes': 0, 'publication_allowed': 0,
                       'independent_human_accuracy_certified': False, 'new_detailed_observations_certified': 0},
        'file_hashes': {'private_sample': parser.sha_file(sampled_file),
                        'review_queue': parser.sha_file(queue_path),
                        'parser_records': parser.sha_file(result_dir / 'records.jsonl.gz')},
    }
    (out / 'aggregate_report.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    return manifest


def main():
    ap = argparse.ArgumentParser(description='Run a PRIVATE 1000-row stratified canary; no network or DB writes')
    ap.add_argument('--input', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--format', default='auto', choices=('auto','sqlite','json','jsonl','csv'))
    ap.add_argument('--table')
    ap.add_argument('--sample-size', type=int, default=1000)
    ap.add_argument('--audit-size', type=int, default=100)
    args = ap.parse_args()
    result = run_canary(args.input, args.out, fmt=args.format, table=args.table,
                        count=args.sample_size, review=args.audit_size)
    print(json.dumps({'source_sha256': result['source']['sha256'], 'source_unchanged': True,
                      'sample_size': result['selection']['selected'],
                      'parser_statuses': result['parser']['status_counts'],
                      'review_queue': result['manual_review']['queue_size'],
                      'ready_for_massive_processing': False}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
