#!/usr/bin/env python3
"""J2 FeenWay: reconcile pinned GitHub CI evidence. Offline, quarantine only."""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit, parse_qs, unquote
import zipfile

SHA = re.compile(r"[0-9a-f]{64}\Z")
FEENWAY = re.compile(r"https://www\.feenway\.com/listings/[1-9][0-9]{0,11}\Z")
ORIGINAL_MEMBERS = frozenset({"upstream_report_QUARANTINE.json", "upstream_cases_QUARANTINE.jsonl"})
AGENZ_MEMBERS = frozenset({"agenz_replay_QUARANTINE.json"})
STATUSES = frozenset({"PORTAL_ACCESS_STOPPED", "ROBOTS_BLOCKED_OR_UNAVAILABLE",
                     "SOURCE_CANONICAL_ID_MATCH", "SOURCE_FETCH_UNAVAILABLE"})
MAX_ZIP_BYTES = 1_000_000
MAX_MEMBER_BYTES = 500_000
MAX_CASES = 50

class ReconcileRejected(ValueError):
    """Fail-closed evidence format or provenance mismatch."""

def _zip_members(path: Path, expected_sha256: str, names: frozenset[str]) -> dict[str, bytes]:
    if (not isinstance(path, Path) or not path.is_file() or path.is_symlink()
            or path.stat().st_size > MAX_ZIP_BYTES or not isinstance(expected_sha256, str)
            or not SHA.fullmatch(expected_sha256)):
        raise ReconcileRejected("INVALID_ARCHIVE_OR_SHA_PIN")
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected_sha256:
        raise ReconcileRejected("PINNED_ARCHIVE_SHA256_MISMATCH")
    try:
        with zipfile.ZipFile(path) as z:
            info = z.infolist()
            if (len(info) != len(names) or {v.filename for v in info} != names
                    or any(v.file_size > MAX_MEMBER_BYTES or v.is_dir() for v in info)
                    or z.testzip() is not None):
                raise ReconcileRejected("UNSAFE_OR_UNEXPECTED_ARCHIVE_MEMBERS")
            return {n: z.read(n) for n in names}
    except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
        raise ReconcileRejected("ARCHIVE_INVALID_ZIP") from exc

def _object(raw: bytes) -> dict:
    try:
        value = json.loads(raw)
    except (ValueError, UnicodeDecodeError) as exc:
        raise ReconcileRejected("INVALID_JSON") from exc
    if not isinstance(value, dict):
        raise ReconcileRejected("JSON_OBJECT_REQUIRED")
    return value

def _url_pair(url: object) -> tuple[str, str] | None:
    if not isinstance(url, str) or len(url) > 2048 or '\\' in url:
        return None
    try:
        parsed = urlsplit(url)
        host = (parsed.hostname or '').lower().removeprefix('www.')
        if (parsed.scheme != 'https' or not host or parsed.username or parsed.password
                or parsed.port is not None or parsed.fragment):
            return None
    except ValueError:
        return None
    return host, parsed.path.rstrip('/')

def _url_claimed_offer_id_matches(url: str, domain: str, offered_id: str) -> bool:
    """Verify source URL syntax, not original website ownership or authenticity."""
    parsed = urlsplit(url)
    path = unquote(parsed.path).rstrip('/')
    if domain == 'avito.ma':
        match = re.search(r'_([0-9]{7,12})\.htm\Z', path)
    elif domain == 'mubawab.ma':
        match = re.match(r'/fr/a/([0-9]{5,12})(?:/|\Z)', path)
    elif domain == 'agenz.ma':
        match = re.search(r'/([0-9]{5,12})\Z', path)
    elif domain == 'sarouty.ma':
        values = parse_qs(parsed.query, strict_parsing=True)
        return path == '/property-details' and values == {'listing_id': [offered_id]}
    elif domain == 'yakeey.com':
        match = re.search(r'-([a-z]{2}[0-9]{5,8})\Z', path)
    elif domain == 'masaken.ma':
        match = re.search(r'/([0-9]{4,12})\Z', path)
    else:
        return False
    return bool(match and match.group(1) == offered_id and not parsed.query)

def reconcile(candidates: list[dict], upstream_zip: Path, upstream_sha256: str,
              agenz_zip: Path | None = None, agenz_sha256: str | None = None) -> dict:
    if not isinstance(candidates, list) or not 1 <= len(candidates) <= MAX_CASES:
        raise ReconcileRejected("INVALID_CANDIDATE_COUNT")
    known: dict[str, dict] = {}
    for row in candidates:
        if not isinstance(row, dict):
            raise ReconcileRejected("CANDIDATE_NOT_OBJECT")
        f, origin = row.get('feenway_url'), row.get('original_url')
        if (not isinstance(f, str) or not FEENWAY.fullmatch(f) or f in known
                or _url_pair(origin) is None
                or not isinstance(row.get('source_offer_id_hint'), str)
                or not isinstance(row.get('source_domain_hint'), str)
                or _url_pair(origin)[0] != row['source_domain_hint']
                or not _url_claimed_offer_id_matches(origin, row['source_domain_hint'],
                                                     row['source_offer_id_hint'])):
            raise ReconcileRejected("INVALID_OR_DUPLICATE_CANDIDATE")
        known[f] = row
    files = _zip_members(upstream_zip, upstream_sha256, ORIGINAL_MEMBERS)
    source_summary = _object(files['upstream_report_QUARANTINE.json'])
    if source_summary.get('planned_source_pages') != len(known):
        raise ReconcileRejected("SOURCE_REPORT_COUNT_MISMATCH")
    lines = files['upstream_cases_QUARANTINE.jsonl'].splitlines()
    if len(lines) != len(known):
        raise ReconcileRejected("SOURCE_ROW_COUNT_MISMATCH")
    observed = {}
    for line in lines:
        item = _object(line)
        f = item.get('feenway_url')
        if (f not in known or f in observed or item.get('status') not in STATUSES
                or item.get('original_url') != known[f]['original_url']
                or item.get('source_domain') != known[f]['source_domain_hint']
                or item.get('source_offer_id_hint') != known[f]['source_offer_id_hint']
                or item.get('public_admission_authorized') is not False):
            raise ReconcileRejected("SOURCE_IDENTITY_OR_RESULT_MISMATCH")
        observed[f] = item
    calculated = dict(Counter(item['status'] for item in observed.values()))
    if calculated != source_summary.get('status_counts'):
        raise ReconcileRejected("SOURCE_REPORT_STATUSES_MISMATCH")
    agenz = None
    if agenz_zip is not None or agenz_sha256 is not None:
        if agenz_zip is None or agenz_sha256 is None:
            raise ReconcileRejected("AGENZ_ARCHIVE_AND_SHA_REQUIRED_TOGETHER")
        agenz = _object(_zip_members(agenz_zip, agenz_sha256, AGENZ_MEMBERS)['agenz_replay_QUARANTINE.json'])
        f = agenz.get('feenway_url')
        if (f not in known or agenz.get('source_url') != known[f]['original_url']
                or agenz.get('expected_source_id_hint') != known[f]['source_offer_id_hint']
                or agenz.get('public_admission_authorized') is not False
                or observed[f]['status'] != 'SOURCE_CANONICAL_ID_MATCH'
                or agenz.get('original_http_status') != 200
                or agenz.get('source_canonical_id_claim_matches') is not True
                or not isinstance(agenz.get('source_raw_html_sha256'), str)
                or not SHA.fullmatch(agenz['source_raw_html_sha256'])):
            raise ReconcileRejected("AGENZ_EVIDENCE_NOT_BOUND_TO_ORIGINAL")
        scope = agenz.get('primary_source_scope')
        if (not isinstance(scope, dict)
                or scope.get('public_admission_authorized') is not False
                or scope.get('availability_verified') is not False):
            raise ReconcileRejected("AGENZ_SCOPE_GUARD_INVALID")
    by_original_id = defaultdict(list)
    reports = []
    for f in sorted(known):
        candidate = known[f]
        source = observed[f]
        key = (candidate['source_domain_hint'], candidate['source_offer_id_hint'])
        by_original_id[key].append(f)
        deep = agenz if agenz and f == agenz['feenway_url'] else None
        conflict = bool(deep and deep['primary_source_scope'].get('primary_price_description_conflict'))
        decision = ('REQUIRES_MANUAL_PRICE_REVIEW' if conflict
                    else 'IDENTITY_CLAIM_ONLY_NO_ADMISSION' if source['status'] == 'SOURCE_CANONICAL_ID_MATCH'
                    else 'ORIGINAL_SOURCE_UNAVAILABLE_NO_ADMISSION')
        reports.append({
            'feenway_url': f, 'source_domain': key[0],
            'upstream_source_offer_id_hint': key[1],
            'original_observation_status': source['status'],
            'manual_price_conflict': conflict,
            'historical_v3_report_missing_review_signal': bool(
                conflict and deep and deep.get('v3', {}).get('human_review_required') is False),
            'decision': decision,
            'authenticated_source_bytes_available': False,
            'availability_independently_verified': False,
            'physical_uniqueness_verified': False,
            'eligible_for_private_staging': False,
            'eligible_for_public_admission': False,
        })
    collisions = [{
        'source_domain': domain, 'source_offer_id_hint': hint,
        'feenway_urls': sorted(urls), 'status': 'SAME_CLAIMED_UPSTREAM_ID_NOT_PHYSICAL_DUPLICATE',
    } for (domain, hint), urls in sorted(by_original_id.items()) if len(urls) > 1]
    return {
        'schema_version': 'feenway_v7_j2_evidence_reconciliation_v1',
        'mode': 'OFFLINE_PRIVATE_RECONCILIATION_QUARANTINE_ONLY',
        'upstream_artifact_sha256': upstream_sha256,
        'agenz_artifact_sha256': agenz_sha256,
        'source_observed_at_utc_claim': source_summary.get('observed_at_utc'),
        'candidate_count': len(candidates),
        'observed_status_counts': calculated,
        'source_price_conflict_cases': sum(x['manual_price_conflict'] for x in reports),
        'candidate_shared_upstream_id_groups': len(collisions),
        'candidate_shared_upstream_ids': collisions,
        'confirmed_physical_duplicate_groups': 0,
        'source_original_html_bytes_in_artifacts': 0,
        'independently_verified_active_listings': 0,
        'admitted_listings': 0,
        'database_writes': 0,
        'source_network_requests': 0,
        'public_admission_authorized': False,
        'cases': reports,
    }

def main() -> None:
    p = argparse.ArgumentParser(description='J2 FeenWay: audit pinned CI evidence, no HTTP/DB')
    p.add_argument('--candidates', type=Path, required=True)
    p.add_argument('--upstream-zip', type=Path, required=True)
    p.add_argument('--upstream-sha256', required=True)
    p.add_argument('--agenz-zip', type=Path)
    p.add_argument('--agenz-sha256')
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    if not args.candidates.is_file() or args.candidates.is_symlink() or args.candidates.stat().st_size > 100_000:
        raise ReconcileRejected('INVALID_CANDIDATES_FILE')
    data = json.loads(args.candidates.read_text(encoding='utf-8'))
    result = reconcile(data, args.upstream_zip, args.upstream_sha256, args.agenz_zip, args.agenz_sha256)
    if args.output.exists() or args.output.is_symlink() or args.output.parent.is_symlink():
        raise ReconcileRejected('OUTPUT_MUST_BE_NEW')
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k not in ('cases', 'candidate_shared_upstream_ids')}, sort_keys=True))

if __name__ == '__main__':
    main()
