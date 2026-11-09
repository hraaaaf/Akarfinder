#!/usr/bin/env python3
"""Offline Q1E description coverage diagnostics. Outputs aggregate counts only."""
from __future__ import annotations
import argparse
from collections import Counter
import gzip
import json
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

ALIASES = ('description_snippet', 'description', 'short_description', 'snippet',
           'body', 'text', 'adDescription')
NESTED = ('extracted', 'raw_json', 'payload', 'raw_payload', 'listing_data', 'structured_data')
GROUPS = ('mubawab', 'avito', 'agenz', 'domio', 'other')


def records(path: Path):
    if not path.is_file():
        raise FileNotFoundError('SOURCE_NOT_AVAILABLE')
    open_file = gzip.open if path.name.endswith('.gz') else open
    with open_file(path, 'rt', encoding='utf-8') as stream:
        for line in stream:
            if not line.strip():
                raise ValueError('EMPTY_JSONL_ROW')
            row = json.loads(line)
            if not isinstance(row, dict):
                raise ValueError('NOT_A_JSON_OBJECT')
            yield row


def mapping(value: Any) -> dict:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.lstrip().startswith('{'):
        try:
            decoded = json.loads(value)
            return decoded if isinstance(decoded, dict) else {}
        except json.JSONDecodeError:
            pass
    return {}


def source_group(row: dict) -> str:
    source = str(row.get('source_name') or row.get('source_domain') or '')
    url = row.get('source_url') or row.get('listing_url') or ''
    try:
        host = urlsplit(str(url)).hostname or ''
    except ValueError:
        host = ''
    label = (source + ' ' + host).lower()
    return next((group for group in GROUPS[:-1] if group in label), 'other')


def summarize(path: Path, expected: int) -> dict:
    counts: Counter = Counter()
    for row in records(path):
        group = source_group(row)
        counts['total'] += 1
        counts['total_by_group:' + group] += 1
        present_any = False
        for layer, obj in [('row', row), *[(key, mapping(row.get(key))) for key in NESTED]]:
            layer_present = False
            for alias in ALIASES:
                value = obj.get(alias)
                if isinstance(value, str) and value.strip():
                    counts['alias:' + layer + '.' + alias] += 1
                    layer_present = True
            if layer_present:
                present_any = True
        if present_any:
            counts['with_description'] += 1
            counts['description_by_group:' + group] += 1
    if counts['total'] != expected:
        raise ValueError('COUNT_MISMATCH')
    return {'rows': counts['total'], 'with_description': counts['with_description'],
            'groups': {g: {'rows': counts['total_by_group:' + g],
                           'with_description': counts['description_by_group:' + g]} for g in GROUPS},
            'aliases': {key.removeprefix('alias:'): val for key, val in sorted(counts.items())
                        if key.startswith('alias:')}}


def parsed_summary(folder: Path, expected: int) -> dict:
    counts: Counter = Counter()
    for name in ('records', 'quarantine', 'duplicates'):
        for row in records(folder / (name + '.jsonl.gz')):
            counts['rows'] += 1
            extracted = row.get('extracted') or {}
            if isinstance(extracted, dict) and isinstance(extracted.get('description'), str) and extracted['description'].strip():
                counts['descriptions'] += 1
    if counts['rows'] != expected:
        raise ValueError('PARSED_COUNT_MISMATCH')
    return {'rows': counts['rows'], 'descriptions': counts['descriptions']}


def audit(source: Path, sample: Path, parsed_dir: Path, out: Path,
          source_size: int = 151900, sample_size: int = 1000) -> dict:
    if out.exists() or out.resolve() in (source.resolve(), sample.resolve()):
        raise FileExistsError('DESTINATION_MUST_BE_NEW')
    full = summarize(source, source_size)
    sampled = summarize(sample, sample_size)
    parsed = parsed_summary(parsed_dir, sample_size)
    if sampled['with_description'] and not parsed['descriptions']:
        state = 'SELECTED_DESCRIPTIONS_LOST_BY_PARSER'
    elif not sampled['with_description'] and full['with_description']:
        state = 'NO_DESCRIPTIONS_IN_SELECTED_SAMPLE'
    elif not full['with_description']:
        state = 'NO_RECOGNIZED_DESCRIPTIONS_IN_EXPORT'
    else:
        state = 'DESCRIPTION_COVERAGE_PRESENT_CHECK_PROVENANCE'
    result = {'kind': 'q1e_private_description_audit_v1', 'full_export': full,
              'sampled_input': sampled, 'parsed_output': parsed, 'finding': state,
              'source_rows_uploaded': 0, 'neon_writes': 0,
              'accuracy_certified': False}
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open('x', encoding='utf-8') as handle:
        json.dump(result, handle, ensure_ascii=False, sort_keys=True, indent=2)
        handle.write('\n')
    return result


def main():
    p = argparse.ArgumentParser(description='Private offline description audit')
    p.add_argument('--source', required=True, type=Path)
    p.add_argument('--sample', required=True, type=Path)
    p.add_argument('--parsed-dir', required=True, type=Path)
    p.add_argument('--out', required=True, type=Path)
    args = p.parse_args()
    report = audit(args.source, args.sample, args.parsed_dir, args.out)
    print(json.dumps({'finding': report['finding'],
                      'full_export_descriptions': report['full_export']['with_description'],
                      'sample_input_descriptions': report['sampled_input']['with_description'],
                      'parser_output_descriptions': report['parsed_output']['descriptions'],
                      'neon_writes': 0, 'source_rows_uploaded': 0}, sort_keys=True))


if __name__ == '__main__':
    main()
