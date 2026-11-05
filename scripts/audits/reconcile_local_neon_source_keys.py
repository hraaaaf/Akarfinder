#!/usr/bin/env python3
"""Read-only exact local ZIP ↔ Neon source-key overlap. Aggregates only; no property or freshness proof."""
import argparse
import csv
import hashlib
import json
import os
import sqlite3
import tempfile
from collections import Counter
from pathlib import Path
from zipfile import ZipFile

SOURCE = {'avito': 'avito', 'avito.ma': 'avito',
          'mubawab': 'mubawab', 'mubawab.ma': 'mubawab'}
SQL = """SELECT source_name, source_offer_key FROM public.listing_sources
WHERE source_name IN ('avito.ma', 'mubawab.ma', 'avito', 'mubawab')"""


def is_ascii_id(key):
    return isinstance(key, str) and key.isascii() and key.isdecimal()


def load_archive(path):
    with ZipFile(path) as z:
        if z.testzip() is not None:
            raise ValueError('ZIP integrity error')
        sums = [line.split() for line in z.read('SHA256SUMS').decode().splitlines() if line.strip()]
        if not sums or any(hashlib.sha256(z.read(name)).hexdigest() != digest
                           for digest, name in sums):
            raise ValueError('SHA256 mismatch')
        meta = json.loads(z.read('inventory.json'))
        if meta['fresh_ready_for_use_proven'] != 0 or meta['production_writes'] != 0:
            raise ValueError('Unexpected inventory state')
        with tempfile.TemporaryDirectory() as temp:
            db = Path(temp) / 'candidates.sqlite'
            db.write_bytes(z.read('candidates.sqlite'))
            con = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
            try:
                if con.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise ValueError('SQLite corruption')
                result = {'avito': set(), 'mubawab': set()}
                for source, key, freshness, ready, eligible in con.execute(
                    'SELECT source, source_id, freshness_status, ready_for_use, publication_eligible FROM candidates'
                ):
                    if source not in result or not is_ascii_id(key) or freshness != 'UNVERIFIED' or ready or eligible:
                        raise ValueError('Invalid candidate state')
                    result[source].add(key)
            finally:
                con.close()
        if sum(map(len, result.values())) != meta['source_scoped_ids']:
            raise ValueError('Inventory counts disagree')
        return result


def remote_csv(path):
    with open(path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        if not {'source_name', 'source_offer_key'}.issubset(reader.fieldnames or []):
            raise ValueError('Missing CSV columns')
        for row in reader:
            yield row['source_name'], row['source_offer_key']


def remote_neon(dsn):
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError('Install psycopg[binary] for direct Neon access') from exc
    with psycopg.connect(dsn, connect_timeout=20,
                         options='-c default_transaction_read_only=on') as conn:
        with conn.cursor() as cursor:
            cursor.execute('SHOW transaction_read_only')
            if cursor.fetchone()[0] != 'on':
                raise RuntimeError('Neon transaction is NOT read-only')
        with conn.cursor(name='akar_r1_source_keys') as cursor:
            cursor.itersize = 5000
            cursor.execute(SQL)
            for source, key in cursor:
                yield source, key


def reconcile(local, rows):
    remote = {'avito': set(), 'mubawab': set()}
    skipped, totals = Counter(), Counter()
    for source, key in rows:
        name = SOURCE.get(source)
        if not name:
            skipped['unsupported_source'] += 1
            continue
        totals[name] += 1
        if key is None or key == '':
            skipped[f'{name}_missing_key'] += 1
        elif not is_ascii_id(key):
            skipped[f'{name}_nonnumeric_key'] += 1
        else:
            remote[name].add(key)
    out = {}
    for name in sorted(local):
        a, b = local[name], remote[name]
        common = len(a & b)
        out[name] = dict(local_unique_ids=len(a), neon_rows=totals[name],
                         neon_unique_numeric_explicit_keys=len(b),
                         exact_intersection=common,
                         local_not_matched_by_explicit_key=len(a) - common,
                         neon_not_matched_by_explicit_key=len(b) - common,
                         strict_explicit_key_union=len(a | b))
    return dict(method='exact_source_scoped_explicit_key_only',
                not_fresh_unique_eligible_or_rights_verified=True,
                no_production_writes=True,
                skipped_rows=dict(sorted(skipped.items())), sources=out)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--archive', required=True, type=Path)
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument('--neon-csv', type=Path)
    src.add_argument('--dsn-env', help='Env var with authorized Neon connection string')
    p.add_argument('--output', required=True, type=Path)
    args = p.parse_args()
    local = load_archive(args.archive)
    if args.neon_csv:
        rows = remote_csv(args.neon_csv)
    else:
        dsn = os.environ.get(args.dsn_env)
        if not dsn:
            p.error('Neon connection string env var missing')
        rows = remote_neon(dsn)
    report = reconcile(local, rows)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print('Aggregate-only report written. No raw IDs, URLs or credentials emitted.')


if __name__ == '__main__':
    main()
