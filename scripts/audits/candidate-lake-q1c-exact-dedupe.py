#!/usr/bin/env python3
import hashlib, json, os
from collections import Counter
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

Q1B_ROOT = Path(os.getenv('Q1C_Q1B_ROOT', '.tmp/q1c-input/q1b'))
OUT = Path(os.getenv('Q1C_OUT', '.tmp/q1c-exact-dedupe'))
EXPECTED_ROWS = 251_046
DATA49B_AGGREGATE_ONLY = 2_326
TRACKING_KEYS = {'gclid', 'fbclid', 'msclkid'}


def load_jsonl(path: Path):
    with path.open(encoding='utf-8') as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def frozen_exact_key(row: dict) -> str:
    domain = row['normalized_source_domain'].strip().lower().removeprefix('www.')
    kind = row['identity_kind']
    identity = row['source_identity'].strip()
    return f'{domain}|{kind}:{identity}'


def normalized_url_variant(raw: str) -> str:
    p = urlsplit(raw.strip())
    scheme = (p.scheme or 'https').lower()
    host = (p.hostname or '').lower().removeprefix('www.')
    port = p.port
    if port and not ((scheme == 'http' and port == 80) or (scheme == 'https' and port == 443)):
        host = f'{host}:{port}'
    path = p.path.rstrip('/') or '/'
    return urlunsplit((scheme, host, path, p.query, ''))


def diagnostic_url_keys(row: dict):
    if row['identity_kind'] != 'url':
        return None
    normalized = normalized_url_variant(row['source_identity'])
    p = urlsplit(normalized)
    host = (p.hostname or '').lower().removeprefix('www.')
    if p.port:
        host = f'{host}:{p.port}'
    path = p.path.rstrip('/') or '/'
    pairs = parse_qsl(p.query, keep_blank_values=True)
    sorted_query = urlencode(sorted(pairs))
    stripped = [(k, v) for k, v in pairs if k.lower() not in TRACKING_KEYS and not k.lower().startswith('utm_')]
    stripped_query = urlencode(sorted(stripped))
    return (
        normalized,
        f'{host}|url:{path}?{p.query}',
        f'{host}|url:{path}?{sorted_query}',
        f'{host}|url:{path}?{stripped_query}',
    )


q1b_path = Q1B_ROOT / 'manifest-q1b.jsonl'
assert q1b_path.exists(), q1b_path
input_rows = list(load_jsonl(q1b_path))
assert len(input_rows) == EXPECTED_ROWS, len(input_rows)

exact_counts = Counter()
composition_mismatch = 0
url_variant_rows = 0
url_variant_counts = Counter()
scheme_agnostic = Counter()
sorted_query = Counter()
tracking_stripped = Counter()

for row in input_rows:
    key = frozen_exact_key(row)
    exact_counts[key] += 1
    if key != row['representation_key']:
        composition_mismatch += 1
    diagnostics = diagnostic_url_keys(row)
    if diagnostics:
        normalized, scheme_key, sorted_key, stripped_key = diagnostics
        if normalized != row['source_identity']:
            url_variant_rows += 1
        url_variant_counts[f"{row['normalized_source_domain']}|url:{normalized}"] += 1
        scheme_agnostic[scheme_key] += 1
        sorted_query[sorted_key] += 1
        tracking_stripped[stripped_key] += 1


def collision_stats(counter: Counter):
    groups = sum(1 for n in counter.values() if n > 1)
    extra = sum(n - 1 for n in counter.values() if n > 1)
    return groups, extra


exact_groups, exact_extra = collision_stats(exact_counts)
variant_groups, variant_extra = collision_stats(url_variant_counts)
scheme_groups, scheme_extra = collision_stats(scheme_agnostic)
sorted_groups, sorted_extra = collision_stats(sorted_query)
tracking_groups, tracking_extra = collision_stats(tracking_stripped)

# Q1C is exact-only. Variant normalization is diagnostic and never rewrites the
# frozen identity unless an exact equivalence contract exists. Today it does not.
assert composition_mismatch == 0, composition_mismatch
assert exact_groups == 0, exact_groups
assert exact_extra == 0, exact_extra

rows = []
for row in input_rows:
    out = dict(row)
    key = frozen_exact_key(row)
    out['canonical_identity_key'] = key
    out['canonical_identity_basis'] = 'frozen_source_id_exact' if row['identity_kind'] == 'id' else 'frozen_source_url_exact'
    out['exact_duplicate_group_size'] = exact_counts[key]
    out['exact_duplicate_status'] = 'unique_exact_identity' if exact_counts[key] == 1 else 'exact_duplicate'
    rows.append(out)

OUT.mkdir(parents=True, exist_ok=True)
text = ''.join(json.dumps(r, separators=(',', ':'), ensure_ascii=False) + '\n' for r in rows)
manifest = OUT / 'manifest-q1c.jsonl'
manifest.write_text(text, encoding='utf-8')
sha = hashlib.sha256(text.encode('utf-8')).hexdigest()
summary = {
    'schemaVersion': 'q1c-exact-identity-dedupe-v1',
    'inputRows': len(input_rows),
    'outputRows': len(rows),
    'canonicalIdentityKeys': len(exact_counts),
    'representationKeyCompositionMismatch': composition_mismatch,
    'exactDuplicateGroups': exact_groups,
    'exactDuplicateExtraRows': exact_extra,
    'exactRowsRemoved': 0,
    'dedupeAction': 'none_required_already_exact_unique',
    'urlNormalizationVariantRows': url_variant_rows,
    'urlNormalizationVariantCollisionGroups': variant_groups,
    'urlNormalizationVariantExtraRows': variant_extra,
    'schemeAgnosticDiagnosticCollisionGroups': scheme_groups,
    'schemeAgnosticDiagnosticExtraRows': scheme_extra,
    'sortedQueryDiagnosticCollisionGroups': sorted_groups,
    'sortedQueryDiagnosticExtraRows': sorted_extra,
    'trackingStrippedDiagnosticCollisionGroups': tracking_groups,
    'trackingStrippedDiagnosticExtraRows': tracking_extra,
    'diagnosticCollisionsUsedForDedupe': False,
    'data49bAggregateOnly': DATA49B_AGGREGATE_ONLY,
    'data49bIncludedInRowLevelDedupe': False,
    'data49bPlaceholderAllowed': False,
    'sha256': sha,
    'freshnessInferred': False,
    'authorizationInferred': False,
    'physicalPropertyMergePerformed': False,
    'databaseWrites': 0,
    'productionWrites': 0,
    'sourceSiteFetches': 0,
    'vercelDeployments': 0,
    'failures': []
}
(OUT / 'summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps(summary, indent=2, ensure_ascii=False))
