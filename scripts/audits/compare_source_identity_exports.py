#!/usr/bin/env python3
"""Compare two authorized source identity CSV exports without publishing row values."""
import argparse
import csv
import json
import re
from collections import defaultdict
from urllib.parse import urlsplit


def canonical_source(source):
    value = (source or '').strip().lower().removeprefix('www.')
    return {'agenz': 'agenz.ma', 'domio': 'domio.ma', 'sarout': 'sarout.ma'}.get(value, value)


def parse_identity(source, url, explicit_key):
    source = canonical_source(source)
    parsed = urlsplit(url or '')
    # Never treat a foreign host, a relative path or a deceptive subdomain as a source ID.
    if parsed.scheme not in ('http', 'https') or parsed.hostname not in (source, 'www.' + source):
        return 'invalid_host', None
    try:
        invalid_authority = bool(parsed.username or parsed.password or parsed.port not in (None, 80, 443))
    except ValueError:
        return 'invalid_host', None
    if invalid_authority:
        return 'invalid_host', None
    path = parsed.path
    patterns = {
        'domio.ma': r'^/(?:fr|en)/[^/]+/[^/]+/[^/]+/(\d+)(?:/|$)',
        'sarout.ma': r'^/(?:fr|ar)/annonce/(\d+)(?:/|$)',
        'agenz.ma': r'/(\d+)/?$',
    }
    pattern = patterns.get(source)
    if not pattern:
        return 'unsupported', None
    match = re.search(pattern, path)
    if not match:
        return 'unparsed', None
    route_id = match.group(1)
    key = (explicit_key or '').strip()
    if key and not key.isdecimal():
        return 'opaque_key', None
    if key and key != route_id:
        return 'mismatch', None
    return 'ok', (source, route_id)


def load(path):
    ids = defaultdict(set)
    stats = defaultdict(lambda: defaultdict(int))
    with open(path, newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        if not {'source_name', 'listing_url', 'source_offer_key'}.issubset(reader.fieldnames or []):
            raise ValueError('Missing required CSV columns')
        for row in reader:
            source = canonical_source(row['source_name'])
            status, identity = parse_identity(source, row['listing_url'], row['source_offer_key'])
            stats[source][status] += 1
            if identity:
                ids[source].add(identity)
    return ids, stats


def compare(left, right):
    a, a_stats = load(left)
    b, b_stats = load(right)
    out = {}
    for source in sorted(set(a_stats) | set(b_stats)):
        x, y = a[source], b[source]
        out[source] = {
            'left_rows_by_status': dict(sorted(a_stats[source].items())),
            'right_rows_by_status': dict(sorted(b_stats[source].items())),
            'left_unique_valid_ids': len(x),
            'right_unique_valid_ids': len(y),
            'intersection': len(x & y),
            'left_only': len(x - y),
            'right_only': len(y - x),
            'union': len(x | y),
        }
    return {'identity_only_not_fresh_or_rights_verified': True, 'sources': out}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--left', required=True)
    parser.add_argument('--right', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    with open(args.output, 'w', encoding='utf-8') as handle:
        json.dump(compare(args.left, args.right), handle, indent=2, sort_keys=True)
        handle.write('\n')
    print('Aggregate report written; raw identifiers and URLs suppressed.')


if __name__ == '__main__':
    main()
