#!/usr/bin/env python3
"""Q1E: manual, read-only Neon Recovery canary; private rows never leave runner scratch."""
from __future__ import annotations
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
from urllib.parse import parse_qs, urlsplit

from akarparser_v2_canary import run_canary

EXPECTED_HOST = "ep-falling-unit-b2hper1a.c-6.eu-central-1.aws.neon.tech"
EXPECTED_DATABASE = "/AkarFinder"
PREFLIGHT_SQL = """
SELECT CASE WHEN current_setting('transaction_read_only') = 'on'
 AND current_user <> 'neondb_owner'
 AND has_table_privilege(current_user, 'public.property_listings', 'SELECT')
 AND has_table_privilege(current_user, 'public.listing_sources', 'SELECT')
 AND NOT has_table_privilege(current_user, 'public.property_listings', 'INSERT')
 AND NOT has_table_privilege(current_user, 'public.property_listings', 'UPDATE')
 AND NOT has_table_privilege(current_user, 'public.property_listings', 'DELETE')
 AND NOT has_table_privilege(current_user, 'public.property_listings', 'TRUNCATE')
 AND NOT has_table_privilege(current_user, 'public.listing_sources', 'INSERT')
 AND NOT has_table_privilege(current_user, 'public.listing_sources', 'UPDATE')
 AND NOT has_table_privilege(current_user, 'public.listing_sources', 'DELETE')
 AND NOT has_table_privilege(current_user, 'public.listing_sources', 'TRUNCATE')
 AND NOT has_schema_privilege(current_user, 'public', 'CREATE')
 THEN 'Q1E_READONLY_OK' ELSE 'Q1E_DENIED' END;
"""
# Five source-balanced cohorts. Raw fields are deliberately narrow; PII may
# still exist in title/description/URL and is never printed or uploaded.
QUERY = """
WITH records AS (
 SELECT p.id, p.title, p.description_snippet, p.city, p.district,
 p.property_type, p.transaction_type, p.price_mad, p.surface_m2,
 p.rooms_count, p.bedrooms_count, p.bathrooms_count, p.images_count,
 p.built_surface_m2, p.plot_surface_m2, p.condition, p.orientation,
 s.source_name, s.listing_url AS source_url,
 s.source_offer_key AS source_offer_id, s.first_seen_at AS observed_at,
 CASE WHEN lower(s.source_name) LIKE '%mubawab%' THEN 'mubawab'
      WHEN lower(s.source_name) LIKE '%avito%' THEN 'avito'
      WHEN lower(s.source_name) LIKE '%agenz%' THEN 'agenz'
      WHEN lower(s.source_name) LIKE '%domio%' THEN 'domio'
      ELSE 'other' END AS cohort
 FROM public.property_listings p
 JOIN public.listing_sources s ON s.property_listing_id=p.id
), ranked AS (
 SELECT *, row_number() OVER (
 PARTITION BY cohort ORDER BY md5(id::text || 'q1e-v1'), id) AS rn
 FROM records
)
SELECT row_to_json(x)::text FROM (
 SELECT id, title, description_snippet, city, district, property_type,
 transaction_type, price_mad, surface_m2, rooms_count, bedrooms_count,
 bathrooms_count, images_count, built_surface_m2, plot_surface_m2,
 condition, orientation, source_name, source_url, source_offer_id, observed_at
 FROM ranked WHERE rn <= 200 ORDER BY cohort, rn LIMIT 1000
) x;
"""

def checked_env(url: str) -> dict:
    x=urlsplit(url)
    if (x.scheme not in ('postgres','postgresql')
        or x.hostname != EXPECTED_HOST or x.path != EXPECTED_DATABASE
        or not x.username or not x.password
        or x.username in ('postgres','neondb_owner')
        or x.username.endswith('_owner')
        or parse_qs(x.query).get('sslmode',[''])[0] not in ('require','verify-full')):
        raise ValueError('NEON_RECOVERY_TLS_NONOWNER_REQUIRED')
    env=os.environ.copy()
    env['PGDATABASE']=url
    env['PGOPTIONS']='-c default_transaction_read_only=on -c statement_timeout=120000 -c lock_timeout=5000'
    env['PGCONNECT_TIMEOUT']='15'
    return env

def psql_query(sql: str, env: dict) -> list[str]:
    completed=subprocess.run(
        ['psql','-X','-qAt','-v','ON_ERROR_STOP=1','-c',sql],
        text=True, capture_output=True, env=env, timeout=140)
    if completed.returncode:
        raise RuntimeError('Q1E_DATABASE_QUERY_FAILED')
    return completed.stdout.splitlines()

def run(url: str, temp: Path) -> dict:
    env=checked_env(url)
    if psql_query(PREFLIGHT_SQL,env) != ['Q1E_READONLY_OK']:
        raise RuntimeError('Q1E_NOT_READONLY_ROLE')
    rows=psql_query(QUERY,env)
    if len(rows)!=1000:
        raise RuntimeError('Q1E_EXPECTED_1000_ROWS')
    source=temp/'neon-recovery-private-sample.jsonl.gz'
    digest=hashlib.sha256()
    with source.open('wb') as raw:
        with gzip.GzipFile(fileobj=raw,filename='',mode='wb',mtime=0) as zipped:
            for line in rows:
                obj=json.loads(line)
                if not isinstance(obj,dict):
                    raise RuntimeError('Q1E_INVALID_SOURCE_ROW')
                clean=json.dumps(obj,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode('utf-8')+b'\n'
                digest.update(clean)
                zipped.write(clean)
    result=run_canary(source,temp/'parsed',count=1000,review=100)
    if (result['selection']['selected']!=1000
        or result['manual_review']['queue_size']!=100
        or not result['source']['unchanged']
        or any(result['invariants'][k] for k in ('cloud_writes','production_writes','publication_allowed'))):
        raise RuntimeError('Q1E_VALIDATION_FAILED')
    return {
        'real_neon_rows_processed':1000,
        'input_content_sha256':digest.hexdigest(),
        'statuses':result['parser']['status_counts'],
        'issues':result['parser']['issues'],
        'review_dossiers_prepared':100,
        'review_dossiers_human_verified':0,
        'precision_certified':False,
        'new_detailed_observations_certified':0,
        'publication_authorized':False,
        'database_writes':0
    }

def main() -> None:
    ap=argparse.ArgumentParser()
    ap.add_argument('--scratch-root',type=Path,required=True)
    args=ap.parse_args()
    url=os.environ.get('Q1E_NEON_RECOVERY_READONLY_URL','')
    if not url or not args.scratch_root.is_dir():
        raise SystemExit('Q1E_PRIVATE_CANARY_SECRET_OR_SCRATCH_MISSING')
    try:
        with TemporaryDirectory(prefix='q1e-neon-',dir=args.scratch_root) as path:
            print(json.dumps(run(url,Path(path)),sort_keys=True,ensure_ascii=False))
    except (ValueError,RuntimeError,subprocess.TimeoutExpired,FileNotFoundError,json.JSONDecodeError):
        raise SystemExit('Q1E_CANARY_DENIED_OR_FAILED_WITHOUT_PRIVATE_LOGS') from None

if __name__=='__main__':
    main()
