#!/usr/bin/env python3
import hashlib, json, os
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

Q1A_ROOT = Path(os.getenv('Q1B_Q1A_MANIFEST_ROOT', '.tmp/q1b-input/q1a'))
DB_ROOT = Path(os.getenv('Q1B_DB_BACKED_ROOT', '.tmp/q1b-input/db-backed'))
OUT = Path(os.getenv('Q1B_OUT', '.tmp/q1b-normalized'))
META_PATH = Path(os.getenv('Q1B_LANE_METADATA', Path(__file__).with_name('candidate-lake-q1b-lane-metadata.json')))
EXPECTED_ROWS = 251_046
EXPECTED_DB_ROWS = 14_987
DATA49B_AGGREGATE_ONLY = 2_326


def canon(s: str) -> str:
    s = s.strip().rstrip('),.;')
    p = urlsplit(s)
    host = (p.hostname or '').lower().removeprefix('www.')
    netloc = host + (f':{p.port}' if p.port else '')
    path = p.path.rstrip('/') or '/'
    return urlunsplit((p.scheme.lower() or 'https', netloc, path, p.query, ''))


def host_from_identity(identity: str) -> str | None:
    try:
        h = (urlsplit(identity).hostname or '').lower().removeprefix('www.')
        return h or None
    except ValueError:
        return None


def load_jsonl(path: Path):
    with path.open(encoding='utf-8') as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


meta_doc = json.loads(META_PATH.read_text())
meta = meta_doc['lanes']
q1a_path = Q1A_ROOT / 'manifest.jsonl'
db_path = DB_ROOT / 'db-backed-candidates.jsonl'
assert q1a_path.exists(), q1a_path
assert db_path.exists(), db_path

# Build an exact row-level lookup only for the DB-backed union, because this lane
# contains three distinct temporal/provenance sub-cohorts.
db_lookup = {}
db_origin_counts = Counter()
for r in load_jsonl(db_path):
    key = f"{r['source']}|url:{canon(r['source_identity'])}"
    assert key not in db_lookup, f'duplicate db-backed key: {key}'
    db_lookup[key] = r
    db_origin_counts[r['lane']] += 1
assert len(db_lookup) == EXPECTED_DB_ROWS, len(db_lookup)

rows = []
q1a_keys = []
normalized_domains = Counter()
provenance_counts = Counter()
temporal_counts = Counter()
temporal_precision_counts = Counter()
changed_domain_count = 0
db_match_count = 0
unknown_lane_count = 0

for r in load_jsonl(q1a_path):
    lane = r['lane']
    lane_meta = meta.get(lane)
    if lane_meta is None:
        unknown_lane_count += 1
        raise AssertionError(f'no Q1B metadata for lane: {lane}')

    q1a_keys.append(r['representation_key'])
    normalized_domain = r['source_domain']
    if r['identity_kind'] == 'url':
        parsed_host = host_from_identity(r['source_identity'])
        if parsed_host:
            normalized_domain = parsed_host
    if normalized_domain != r['source_domain']:
        changed_domain_count += 1
    normalized_domains[normalized_domain] += 1

    out = dict(r)
    out['normalized_source_domain'] = normalized_domain
    out['origin_lane'] = lane
    out['provenance_class'] = lane_meta['provenance_class']
    out['evidence_artifact_ids'] = lane_meta['artifact_ids']
    out['evidence_run_ids'] = lane_meta['run_ids']
    out['temporal_cohort'] = lane_meta['temporal_cohort']
    out['temporal_precision'] = lane_meta['temporal_precision']
    out['observed_at'] = None
    out['evidence_observed_at'] = lane_meta.get('evidence_observed_at')
    out['provenance_detail'] = None

    if lane == 'db_backed_union':
        src = db_lookup.get(r['representation_key'])
        assert src is not None, f'missing db-backed source row: {r["representation_key"]}'
        db_match_count += 1
        out['origin_lane'] = src['lane']
        out['temporal_cohort'] = src.get('temporal_cohort') or 'unknown'
        out['temporal_precision'] = 'exact_observed_at' if src.get('observed_at') else 'date_only'
        out['observed_at'] = src.get('observed_at')
        out['evidence_observed_at'] = src.get('observed_at')
        out['provenance_detail'] = src.get('evidence')

    provenance_counts[out['provenance_class']] += 1
    temporal_counts[out['temporal_cohort']] += 1
    temporal_precision_counts[out['temporal_precision']] += 1
    rows.append(out)

assert len(rows) == EXPECTED_ROWS, len(rows)
assert len(set(q1a_keys)) == EXPECTED_ROWS, 'Q1A keys unexpectedly duplicate'
assert db_match_count == EXPECTED_DB_ROWS, db_match_count
assert unknown_lane_count == 0
assert set(r['lane'] for r in rows) == set(meta), (set(r['lane'] for r in rows) ^ set(meta))

# Non-destructive contract: Q1A key and source identity are not rewritten.
for original, enriched in zip(load_jsonl(q1a_path), rows):
    assert original['representation_key'] == enriched['representation_key']
    assert original['source_identity'] == enriched['source_identity']
    assert original['layer'] == enriched['layer']
    assert original['candidate_status'] == enriched['candidate_status']

OUT.mkdir(parents=True, exist_ok=True)
manifest_path = OUT / 'manifest-q1b.jsonl'
text = ''.join(json.dumps(r, separators=(',', ':'), ensure_ascii=False) + '\n' for r in rows)
manifest_path.write_text(text, encoding='utf-8')
sha = hashlib.sha256(text.encode('utf-8')).hexdigest()

summary = {
    'schemaVersion': 'q1b-provenance-temporal-cohort-v1',
    'inputRows': EXPECTED_ROWS,
    'outputRows': len(rows),
    'uniqueRepresentationKeys': len(set(q1a_keys)),
    'representationKeysPreserved': True,
    'sourceIdentitiesPreserved': True,
    'dbBackedRowsMatched': db_match_count,
    'dbBackedOriginCounts': dict(sorted(db_origin_counts.items())),
    'normalizedSourceDomains': len(normalized_domains),
    'normalizedSourceDomainCorrections': changed_domain_count,
    'provenanceCounts': dict(sorted(provenance_counts.items())),
    'temporalPrecisionCounts': dict(sorted(temporal_precision_counts.items())),
    'unknownTemporalPrecisionRows': temporal_precision_counts.get('unknown', 0),
    'temporalCohortCount': len(temporal_counts),
    'unknownLaneCount': unknown_lane_count,
    'data49bAggregateOnly': DATA49B_AGGREGATE_ONLY,
    'data49bPublicationEligible': False,
    'data49bPlaceholderAllowed': False,
    'sha256': sha,
    'freshnessInferred': False,
    'authorizationInferred': False,
    'databaseWrites': 0,
    'productionWrites': 0,
    'sourceSiteFetches': 0,
    'vercelDeployments': 0,
    'failures': []
}
(OUT / 'summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps(summary, indent=2, ensure_ascii=False))
