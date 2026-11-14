#!/usr/bin/env python3
"""J2 source-claim repair view: mask contradictions; never modify original claims.

Offline only. Every output row stays in private quarantine and cannot be used
for source verification, property deduplication, DB staging, or publication.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

PIN = re.compile(r'[0-9a-f]{64}\Z')
FW = re.compile(r'https://www\.feenway\.com/listings/[1-9][0-9]{0,11}\Z')
MATCHED = 'UNIQUE_SIX_FIELD_CONTENT_MATCH_NOT_SOURCE_VERIFIED'
AMBIG = 'AMBIGUOUS_SIX_FIELD_MATCH'
ROUTE = 'SOURCE_ROUTE_FORMAT_ONLY'
REVIEW = 'SOURCE_ROUTE_REVIEW'
MISSING = 'SOURCE_URL_MISSING'
DECISION = 'QUARANTINE_NO_STAGING_OR_PUBLIC_ADMISSION'
INPUT_SCHEMA = 'feenway_v7_j2_dual_identity_quarantine_v1'
MAX_COMPRESSED = 30_000_000
MAX_RAW = 160_000_000
MAX_LINE = 500_000
MAX_ROWS = 120_000

class RepairRejected(ValueError):
    pass


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1048576), b''):
            h.update(chunk)
    return h.hexdigest()


def source_key(r: dict):
    if r['source_url_status'] != ROUTE:
        return None
    return r['source_domain_hint'], r['source_offer_id_hint']


def validate(r: object, seen_urls: set, seen_feeways: set):
    if not isinstance(r, dict) or r.get('decision') != DECISION:
        raise RepairRejected('NOT_QUARANTINED')
    state, status = r.get('identity_link_state'), r.get('source_url_status')
    if state not in (MATCHED, AMBIG) or status not in (ROUTE, REVIEW, MISSING):
        raise RepairRejected('UNSUPPORTED_STATE')
    if any(r.get(k) is not False for k in (
        'feenway_identity_independently_verified',
        'source_detail_independently_verified',
        'availability_verified', 'physical_uniqueness_verified')):
        raise RepairRejected('PRETENDED_PROOF')
    fw = r.get('feenway_url')
    if state == MATCHED:
        if not isinstance(fw, str) or not FW.fullmatch(fw) or fw in seen_feeways:
            raise RepairRejected('INVALID_FEENWAY_ID')
        seen_feeways.add(fw)
    elif fw is not None:
        raise RepairRejected('AMBIGUOUS_FEENWAY_ID_MUST_BE_NULL')
    url = r.get('source_url')
    if status == MISSING:
        if url is not None or r.get('source_offer_id_hint') is not None:
            raise RepairRejected('MISSING_SOURCE_CONFLICT')
    else:
        if not isinstance(url, str) or len(url) > 2048 or url in seen_urls or '\\' in url:
            raise RepairRejected('INVALID_SOURCE_URL')
        try:
            p = urlsplit(url)
            bad = (p.scheme != 'https' or p.netloc != r.get('source_domain_hint')
                   or p.username is not None or p.password is not None
                   or p.port is not None or p.fragment or '\r' in url or '\n' in url)
        except ValueError as exc:
            raise RepairRejected('INVALID_SOURCE_URL') from exc
        if bad:
            raise RepairRejected('INVALID_SOURCE_HOST')
        seen_urls.add(url)
    if status == ROUTE:
        if not isinstance(r.get('source_offer_id_hint'), str) or not r['source_offer_id_hint']:
            raise RepairRejected('SOURCE_ID_HINT_REQUIRED')
    elif r.get('source_offer_id_hint') is not None:
        raise RepairRejected('UNPROVEN_SOURCE_ID_HINT')
    for k in ('price_mad_claim', 'surface_m2_claim'):
        val = r.get(k)
        if val is not None and (type(val) is not int or val < 0):
            raise RepairRejected('INVALID_NUMERIC_CLAIM')
    for k in ('title_claim', 'city_claim', 'district_claim'):
        if not isinstance(r.get(k), str) or len(r[k]) > 6000:
            raise RepairRejected('INVALID_TEXT_CLAIM')


def iterate(path: Path):
    raw_bytes = 0
    try:
        with gzip.open(path, 'rb') as f:
            while line := f.readline(MAX_LINE + 1):
                raw_bytes += len(line)
                if len(line) > MAX_LINE or raw_bytes > MAX_RAW:
                    raise RepairRejected('DECOMPRESSION_LIMIT')
                try:
                    yield json.loads(line)
                except (UnicodeError, ValueError) as exc:
                    raise RepairRejected('INVALID_JSONL') from exc
    except (OSError, EOFError) as exc:
        raise RepairRejected('INVALID_GZIP') from exc


def review_row(r: dict, group: dict | None):
    flags = []
    if r['identity_link_state'] == AMBIG:
        flags.append('FEENWAY_IDENTITY_AMBIGUOUS')
    if r['source_url_status'] != ROUTE:
        flags.append(r['source_url_status'])
    if group and group['n'] > 1:
        flags.append('SHARED_SOURCE_ID_MULTIPLE_URLS')
        for key, flag in [('prices', 'SOURCE_PRICE_CONFLICT'),
                          ('surfaces', 'SOURCE_SURFACE_CONFLICT'),
                          ('cities', 'SOURCE_CITY_CONFLICT'),
                          ('districts', 'SOURCE_DISTRICT_CONFLICT')]:
            if len(group[key]) > 1:
                flags.append(flag)
    city = r['city_claim'].strip()
    district = r['district_claim'].strip()
    if not city or city.isdigit() or city.casefold() == 'n/a':
        flags.append('CITY_UNRELIABLE')
        city = None
    if not district or district.casefold() == 'n/a':
        flags.append('DISTRICT_UNKNOWN')
        district = None
    eligible_hint = (r['identity_link_state'] == MATCHED
                     and r['source_url_status'] == ROUTE
                     and group is not None and group['n'] == 1)
    return {
        'feenway_url_claim': r.get('feenway_url'),
        'source_url_claim': r.get('source_url'),
        'source_offer_id_hint': r.get('source_offer_id_hint'),
        'raw_claims_unchanged': {
            'city': r['city_claim'], 'district': r['district_claim'],
            'price_mad': r.get('price_mad_claim'),
            'surface_m2': r.get('surface_m2_claim'), 'title': r['title_claim'],
        },
        'filtered_review_hints_UNVERIFIED': {
            'city': city if eligible_hint else None,
            'district': district if eligible_hint else None,
            'price_mad': r.get('price_mad_claim') if eligible_hint else None,
            'surface_m2': r.get('surface_m2_claim') if eligible_hint else None,
        },
        'review_flags': flags,
        'group_size_of_claimed_source_id': group['n'] if group else None,
        'original_source_verified': False,
        'freshness_verified': False,
        'physical_uniqueness_verified': False,
        'private_staging_authorized': False,
        'public_admission_authorized': False,
        'decision': 'REVIEW_ONLY_NO_ADMISSION',
    }


def safe_repair(inp: Path, pin: str, report: Path, out: Path) -> dict:
    if (not isinstance(pin, str) or not PIN.fullmatch(pin)
            or not inp.is_file() or inp.is_symlink()
            or inp.stat().st_size > MAX_COMPRESSED or digest(inp) != pin):
        raise RepairRejected('INPUT_PIN_INVALID')
    if (not report.is_file() or report.is_symlink() or report.stat().st_size > 100000):
        raise RepairRejected('REPORT_INVALID')
    try:
        contract = json.loads(report.read_text(encoding='utf-8'))
    except (OSError, ValueError, UnicodeError) as exc:
        raise RepairRejected('REPORT_NOT_JSON') from exc
    ids: dict[tuple[str, str], dict] = defaultdict(lambda: {
        'n': 0, 'prices': set(), 'surfaces': set(), 'cities': set(), 'districts': set()})
    seen_feeway, seen_source, counts, statuses = set(), set(), Counter(), Counter()
    total = 0
    for r in iterate(inp):
        total += 1
        if total > MAX_ROWS:
            raise RepairRejected('RECORD_LIMIT')
        validate(r, seen_source, seen_feeway)
        counts[r['identity_link_state']] += 1
        statuses[r['source_url_status']] += 1
        key = source_key(r)
        if key:
            group = ids[key]
            group['n'] += 1
            for field, claim in [('prices', 'price_mad_claim'),
                                 ('surfaces', 'surface_m2_claim'),
                                 ('cities', 'city_claim'),
                                 ('districts', 'district_claim')]:
                group[field].add(r.get(claim))
    if (not isinstance(contract, dict) or contract.get('schema_version') != INPUT_SCHEMA
            or contract.get('records_processed') != total
            or contract.get('identity_link_counts') != dict(counts)
            or contract.get('source_status_counts') != dict(statuses)
            or contract.get('public_admission_authorized') is not False
            or contract.get('private_staging_authorized') is not False):
        raise RepairRejected('REPORT_CONTRACT_MISMATCH')
    if digest(inp) != pin:
        raise RepairRejected('INPUT_CHANGED')
    if (out.exists() or out.is_symlink() or out.parent.is_symlink()
            or any((p / '.git').exists() for p in (out.parent, *out.parents))):
        raise RepairRejected('OUTPUT_NOT_PRIVATE_AND_NEW')
    mask_counts, row_count = Counter(), 0
    conflicting_groups = Counter()
    for group in ids.values():
        if group['n'] > 1:
            conflicting_groups['shared_source_id_groups'] += 1
            for key in ('prices', 'surfaces', 'cities', 'districts'):
                if len(group[key]) > 1:
                    conflicting_groups[key + '_conflict_groups'] += 1
    out.mkdir(parents=True, mode=0o700)
    try:
        with (out / 'normalized_review_only_QUARANTINE.jsonl.gz').open('xb') as raw:
            with gzip.GzipFile(fileobj=raw, filename='', mode='wb', mtime=0) as gz:
                with io.TextIOWrapper(gz, encoding='utf-8') as dst:
                    for r in iterate(inp):
                        view = review_row(r, ids.get(source_key(r)))
                        row_count += 1
                        mask_counts.update(view['review_flags'])
                        dst.write(json.dumps(view, sort_keys=True, ensure_ascii=False,
                                             separators=(',', ':')) + '\n')
        if row_count != total or digest(inp) != pin:
            raise RepairRejected('INPUT_CHANGED_DURING_WRITE')
        result = {
            'schema_version': 'feenway_j2_safe_review_hints_v1',
            'source_quarantine_sha256': pin,
            'records_processed': total,
            'identity_link_counts': dict(counts),
            'source_status_counts': dict(statuses),
            'review_flag_counts': dict(sorted(mask_counts.items())),
            'claimed_source_id_group_counts': dict(sorted(conflicting_groups.items())),
            'original_field_claims_modified': 0,
            'confirmed_source_field_corrections': 0,
            'source_http_requests': 0,
            'database_writes': 0,
            'physical_duplicate_deletions': 0,
            'public_admission_authorized': False,
            'private_staging_authorized': False,
            'note': 'Fields are suppressed in a derived view only; original claims untouched; no live source truth proven.',
        }
        (out / 'report.json').write_text(json.dumps(result, indent=2,
                                    sort_keys=True, ensure_ascii=False) + '\n', encoding='utf-8')
    except BaseException:
        for f in out.iterdir():
            if f.is_file():
                f.unlink()
        out.rmdir()
        raise
    return result


def main():
    p = argparse.ArgumentParser(description='FeenWay J2 offline claim safety correction')
    p.add_argument('--input-gzip', required=True, type=Path)
    p.add_argument('--input-sha256', required=True)
    p.add_argument('--input-report', required=True, type=Path)
    p.add_argument('--output', required=True, type=Path)
    a = p.parse_args()
    print(json.dumps(safe_repair(a.input_gzip, a.input_sha256, a.input_report, a.output),
                     ensure_ascii=False, sort_keys=True))

if __name__ == '__main__':
    main()
