#!/usr/bin/env python3
"""Private H1: read-only Neon Recovery -> id-keyset JSONL -> real offline AkarParser V3.

No production writes, network scraping, uploads, artifacts or publication.
The staging directory must be outside any git repository and remain private.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import parse_qs, urlsplit

from akarparser_v3_raw_bulk import run as parse_batch

EXPECTED_HOST = 'ep-falling-unit-b2hper1a.c-6.eu-central-1.aws.neon.tech'
EXPECTED_DATABASE = '/AkarFinder'
SECRET_NAME = 'Q1E_NEON_RECOVERY_READONLY_URL'
MODE = ('priority', 'remaining')
PRIORITY = "p.price_mad > 0 AND p.surface_m2 > 0 AND COALESCE(BTRIM(p.title),'') <> '' AND COALESCE(BTRIM(p.city),'') <> '' AND COALESCE(BTRIM(s.listing_url),'') <> ''"
PREFLIGHT = """
SELECT CASE WHEN current_setting('transaction_read_only') = 'on'
AND current_database()='AkarFinder' AND current_user <> 'neondb_owner'
AND has_table_privilege(current_user,'public.property_listings','SELECT')
AND has_table_privilege(current_user,'public.listing_sources','SELECT')
AND NOT has_table_privilege(current_user,'public.property_listings','INSERT')
AND NOT has_table_privilege(current_user,'public.property_listings','UPDATE')
AND NOT has_table_privilege(current_user,'public.property_listings','DELETE')
AND NOT has_table_privilege(current_user,'public.property_listings','TRUNCATE')
AND NOT has_table_privilege(current_user,'public.listing_sources','INSERT')
AND NOT has_table_privilege(current_user,'public.listing_sources','UPDATE')
AND NOT has_table_privilege(current_user,'public.listing_sources','DELETE')
AND NOT has_table_privilege(current_user,'public.listing_sources','TRUNCATE')
AND NOT has_schema_privilege(current_user,'public','CREATE')
THEN 'H1_READONLY_OK' ELSE 'H1_DENIED' END;
"""


def checked_env(connection: str) -> dict[str, str]:
    url = urlsplit(connection)
    if (url.scheme not in ('postgres', 'postgresql') or url.hostname != EXPECTED_HOST
            or url.path != EXPECTED_DATABASE or not url.username or not url.password
            or url.username == 'neondb_owner' or url.username.endswith('_owner')
            or parse_qs(url.query).get('sslmode', [''])[0] not in ('require', 'verify-full')):
        raise ValueError('RECOVERY_URL_MUST_BE_EXPECTED_TLS_NONOWNER_ROLE')
    env = dict(os.environ)
    env['PGDATABASE'] = connection
    env['PGOPTIONS'] = '-c default_transaction_read_only=on -c statement_timeout=120000 -c lock_timeout=5000'
    env['PGCONNECT_TIMEOUT'] = '15'
    return env


def psql_lines(sql: str, env: dict[str, str]) -> list[str]:
    done = subprocess.run(['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql],
                          env=env, text=True, capture_output=True, timeout=140, check=False)
    if done.returncode != 0:
        raise RuntimeError('H1_READONLY_QUERY_FAILED')  # never print private SQL rows or credentials
    return done.stdout.splitlines()


def select_sql(mode: str, cursor: int, highwater: int, limit: int) -> str:
    if mode not in MODE or not (0 <= cursor <= highwater and 1 <= limit <= 5000):
        raise ValueError('INVALID_KEYSET_PARAMETERS')
    predicate = '(' + PRIORITY + ')' if mode == 'priority' else 'NOT (' + PRIORITY + ')'
    return f"""
SELECT row_to_json(r)::text FROM (
 SELECT p.id, p.canonical_fingerprint, p.title, p.description_snippet,
 p.city, p.district, p.property_type, p.transaction_type, p.price_mad,
 p.surface_m2, p.rooms_count, p.bedrooms_count, p.bathrooms_count,
 p.built_surface_m2, p.plot_surface_m2, p.condition, p.orientation,
 p.images_count, s.source_name, s.listing_url AS source_url,
 s.source_offer_key AS source_offer_id, s.first_seen_at AS index_first_seen_at,
 s.last_seen_at AS index_last_seen_at, s.origin_type, s.compliance_status
 FROM public.property_listings p
 JOIN public.listing_sources s ON s.property_listing_id=p.id
 WHERE p.id > {cursor} AND p.id <= {highwater} AND {predicate}
 ORDER BY p.id LIMIT {limit}
) r;
"""


def snapshot_sql() -> str:
    return f"""
SELECT row_to_json(s)::text FROM (
 SELECT COUNT(*) AS total, COUNT(DISTINCT p.id) AS unique_id,
        COUNT(DISTINCT s.listing_url) AS unique_url,
        COUNT(*) FILTER (WHERE {PRIORITY}) AS priority_count,
        MIN(p.id) AS min_id, MAX(p.id) AS highwater
 FROM public.property_listings p
 JOIN public.listing_sources s ON s.property_listing_id=p.id
) s;
"""


def checked_snapshot(query, env: dict[str, str]) -> dict:
    if query(PREFLIGHT, env) != ['H1_READONLY_OK']:
        raise RuntimeError('H1_ROLE_IS_NOT_READONLY')
    lines = query(snapshot_sql(), env)
    if len(lines) != 1:
        raise RuntimeError('H1_BAD_SNAPSHOT')
    row = json.loads(lines[0]); total = int(row['total'])
    if total < 1 or int(row['unique_id']) != total or int(row['unique_url']) != total:
        raise RuntimeError('H1_NON_UNIQUE_SOURCE_LINKAGE')
    priority = int(row['priority_count'])
    if not (0 <= priority <= total):
        raise RuntimeError('H1_BAD_PRIORITY_COUNT')
    return {'total': total, 'priority_count': priority, 'remaining_count': total-priority,
            'min_id': int(row['min_id']), 'highwater': int(row['highwater'])}


def normalize(item: dict) -> dict:
    """Preserve DB facts, separate historic index timestamps from actual source captures."""
    url = str(item.get('source_url') or '')
    source_id = item.get('source_offer_id')
    match = re.search(r'/([0-9]{3,12})/?(?:\?.*)?$', url)
    host = (urlsplit(url).hostname or '').lower().removeprefix('www.')
    if host == 'agenz.ma' and match:
        item['agency_reference'] = source_id
        item['source_offer_id'] = match.group(1)
    # A recovered index's timestamps do not prove page capture or publishing.
    for name in ('index_first_seen_at', 'index_last_seen_at'):
        if item.get(name) is None:
            item.pop(name, None)
    if 'observed_at' in item or 'published_at' in item or 'first_seen_at' in item:
        raise RuntimeError('H1_UNVERIFIED_FRESHNESS_CLAIM')
    if not item.get('source_url') or not item.get('title') or not item.get('city'):
        raise RuntimeError('H1_MISSING_CORE_IDENTITY')
    return item


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024*1024), b''):
            h.update(block)
    return h.hexdigest()


def safe_private_out(out: Path) -> Path:
    out = out.resolve()
    if any((parent/'.git').exists() for parent in (out, *out.parents)):
        raise ValueError('H1_PRIVATE_OUTPUT_CANNOT_BE_INSIDE_GIT')
    return out


def atomic_json(path: Path, data: dict):
    temp = path.with_suffix(path.suffix+'.tmp')
    with temp.open('x', encoding='utf-8') as stream:
        json.dump(data, stream, sort_keys=True, ensure_ascii=False, indent=2)
    temp.replace(path)


def verify_resume(out: Path, manifest: dict):
    expected = set()
    for batch in manifest['batches']:
        name = batch['input_file']
        expected.add(name)
        raw = out/'inputs'/name
        if not raw.is_file() or sha(raw) != batch['input_sha256']:
            raise RuntimeError('H1_RESUME_SHA_MISMATCH')
        report = out/'parsed'/batch['id']/'aggregate_report.json'
        if not report.is_file() or sha(report) != batch['report_sha256']:
            raise RuntimeError('H1_RESUME_REPORT_SHA_MISMATCH')
    actual = {p.name for p in (out/'inputs').glob('batch-*.jsonl')}
    if actual != expected:
        raise RuntimeError('H1_ORPHAN_OR_UNKNOWN_INPUT_FILE')


def run(url: str, out: Path, *, mode: str, batch_size: int=1000,
        max_batches: int | None=None, resume: bool=False, query=psql_lines,
        parser=parse_batch, as_of: datetime | None=None) -> dict:
    if mode not in MODE or not (1 <= batch_size <= 5000):
        raise ValueError('H1_INVALID_MODE_OR_BATCH_SIZE')
    if max_batches is not None and max_batches < 1:
        raise ValueError('H1_INVALID_BATCH_CAP')
    out = safe_private_out(out)
    env = checked_env(url)
    snapshot = checked_snapshot(query, env)
    if not resume and out.exists():
        raise FileExistsError('H1_OUTPUT_ALREADY_EXISTS')
    out.mkdir(parents=True, exist_ok=True)
    (out/'inputs').mkdir(exist_ok=True)
    (out/'parsed').mkdir(exist_ok=True)
    manifest_path = out/'manifest.json'
    if resume:
        if not manifest_path.is_file():
            raise RuntimeError('H1_RESUME_MANIFEST_MISSING')
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        if manifest['snapshot'] != snapshot or manifest['mode'] != mode or manifest['batch_size'] != batch_size:
            raise RuntimeError('H1_RESUME_SOURCE_DRIFT_OR_BATCH_SIZE_CHANGED')
        verify_resume(out, manifest)
    else:
        manifest = {'version': 'historical-h1-v1', 'mode': mode, 'snapshot': snapshot,
                    'batch_size': batch_size, 'batches': [], 'processed': 0,
                    'status_counts': {}, 'db_writes': 0, 'source_requests': 0,
                    'publication_authorized': False, 'complete': False}
        atomic_json(manifest_path, manifest)
    cursor = manifest['batches'][-1]['last_id'] if manifest['batches'] else 0
    added = 0
    while True:
        lines = query(select_sql(mode, cursor, snapshot['highwater'], batch_size), env)
        if not lines:
            break
        if len(lines) > batch_size:
            raise RuntimeError('H1_PAGE_EXCEEDS_LIMIT')
        rows = [normalize(json.loads(line)) for line in lines]
        ids = [int(x['id']) for x in rows]
        if ids != sorted(set(ids)) or ids[0] <= cursor or ids[-1] > snapshot['highwater']:
            raise RuntimeError('H1_INVALID_KEYSET_ORDER')
        name = f"batch-{len(manifest['batches'])+1:05d}"
        raw_path = out/'inputs'/f'{name}.jsonl'
        with raw_path.open('x', encoding='utf-8') as stream:
            for row in rows:
                stream.write(json.dumps(row,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n')
        report = parser(raw_path, out/'parsed'/name,
                        as_of=as_of or datetime.now(timezone.utc))
        if (report['input_count'] != len(rows) or report['status_counts'].get('errors',0)
                or report['safety']['db_writes'] != 0 or report['safety']['network_requests'] != 0
                or report['safety']['neon_admission_authorized']):
            raise RuntimeError('H1_V3_BATCH_INVALID')
        counts = Counter(manifest['status_counts']); counts.update(report['status_counts'])
        manifest['status_counts'] = dict(counts)
        manifest['batches'].append({'id': name, 'input_file': raw_path.name,
                                    'input_sha256': sha(raw_path),
                                    'report_sha256': sha(out/'parsed'/name/'aggregate_report.json'),
                                    'first_id': ids[0], 'last_id': ids[-1], 'count': len(rows)})
        manifest['processed'] += len(rows)
        atomic_json(manifest_path, manifest)
        cursor = ids[-1]; added += 1
        if max_batches is not None and added >= max_batches:
            break
    expected = snapshot['priority_count'] if mode == 'priority' else snapshot['remaining_count']
    if manifest['processed'] > expected:
        raise RuntimeError('H1_COHORT_OVERFLOW')
    if not lines:
        if manifest['processed'] != expected:
            raise RuntimeError('H1_COHORT_COUNT_MISMATCH')
        manifest['complete'] = True
        atomic_json(manifest_path, manifest)
    # Aggregate-only stdout: no title, description, listing URL or private records.
    return {'mode': mode, 'processed': manifest['processed'], 'expected': expected,
            'batches': len(manifest['batches']), 'complete': manifest['complete'],
            'status_counts': manifest['status_counts'], 'db_writes': 0,
            'source_requests': 0, 'publication_authorized': False}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--mode', choices=MODE, required=True)
    ap.add_argument('--batch-size', type=int, default=1000)
    ap.add_argument('--max-batches', type=int, default=None)
    ap.add_argument('--resume', action='store_true')
    args = ap.parse_args()
    secret = os.environ.get(SECRET_NAME, '')
    if not secret:
        raise SystemExit('H1_READONLY_CREDENTIAL_REQUIRED')
    try:
        print(json.dumps(run(secret,args.out,mode=args.mode,batch_size=args.batch_size,
                             max_batches=args.max_batches,resume=args.resume),sort_keys=True))
    except Exception:
        raise SystemExit('H1_FAILED_PRIVATE_DETAILS_SUPPRESSED') from None


if __name__ == '__main__':
    main()
