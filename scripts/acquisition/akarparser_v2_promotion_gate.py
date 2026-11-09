#!/usr/bin/env python3
"""Q1E private promotion gate: parsed candidates -> reviewed, eligible JSONL.

This script does NOT connect to Neon, write to databases, fetch websites, or
change source files. The output is an untrusted *import candidate* until a
separate trusted importer verifies the evidence and database constraints.

Attestations are NOT authenticated by this script. Supply them only from a
separately access-controlled human/partner review process. Never commit raw
rows, attestations, or eligible output to GitHub.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone, timedelta
import gzip
import hashlib
import io
import json
from pathlib import Path
from typing import Any, Iterable

VERSION = 'akarparser-v2-promotion-gate-1.0'
MAX_FRESHNESS_DAYS = 30  # provisional publication admission policy, not proof of validity
RIGHTS_BASIS = frozenset(('partner_contract', 'direct_permission', 'first_party'))
ALLOWED_TX = frozenset(('sale', 'rent'))


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def stable_hash(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                    separators=(',', ':'), allow_nan=False).encode('utf-8')).hexdigest()


def rows(path: Path) -> Iterable[dict]:
    opener = gzip.open if path.name.endswith('.gz') else open
    with opener(path, 'rt', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                obj = json.loads(line)
                if not isinstance(obj, dict):
                    raise ValueError('INVALID_JSONL_OBJECT')
                yield obj


def instant(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        t = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if t.tzinfo is None:
            return None
        return t.astimezone(timezone.utc)
    except ValueError:
        return None


def attestation_index(path: Path | None) -> dict[str, dict]:
    index: dict[str, dict] = {}
    if path is None:
        return index
    for item in rows(path):
        identity = item.get('record_id')
        if not isinstance(identity, str) or not identity or identity in index:
            raise ValueError('INVALID_OR_DUPLICATE_ATTESTATION_ID')
        index[identity] = item
    return index


def evaluate(record: dict, proof: dict | None, now: datetime) -> list[str]:
    """Return deterministic fail-closed reasons, never a publication action."""
    why: list[str] = []
    source = record.get('source') or {}
    fields = record.get('extracted') or {}
    quality = record.get('quality') or {}
    prop = record.get('canonical_property_v1') or {}
    offers = prop.get('offers') or []
    if record.get('status') != 'ready_internal' or not prop or not offers:
        why.append('NOT_PARSER_READY_INTERNAL')
    if quality.get('publication_allowed') is not False:
        why.append('UNEXPECTED_PARSER_PUBLICATION_FLAG')
    if source.get('identity_state') != 'explicit' or not source.get('source_offer_id') or not source.get('domain'):
        why.append('SOURCE_IDENTITY_NOT_EXPLICIT')
    if fields.get('country') != 'Morocco':
        why.append('COUNTRY_NOT_EVIDENCED_MOROCCO')
    facts = prop.get('facts') or {}
    cls = facts.get('classification') or {}
    loc = facts.get('location') or {}
    surfaces = facts.get('surfaces') or {}
    def val(group: dict, key: str):
        value = group.get(key) or {}
        return value.get('value') if isinstance(value, dict) else None
    first = offers[0] if offers else {}
    if (val(loc, 'country') != fields.get('country') or
        val(loc, 'city') != fields.get('city') or
        val(cls, 'property_type') != fields.get('property_type') or
        val(surfaces, 'surface_total_m2') != fields.get('surface_total_m2') or
        first.get('transaction_type') != fields.get('transaction_type') or
        val(first, 'price_amount') != fields.get('price_mad')):
        why.append('CANONICAL_FIELD_MISMATCH')
    if (not fields.get('title') or not fields.get('city') or
        fields.get('property_type') in (None, '', 'unknown') or
        fields.get('transaction_type') not in ALLOWED_TX or
        not isinstance(fields.get('price_mad'), (int, float)) or
        isinstance(fields.get('price_mad'), bool) or fields.get('price_mad', 0) <= 0 or
        not isinstance(fields.get('surface_total_m2'), (int, float)) or
        isinstance(fields.get('surface_total_m2'), bool) or fields.get('surface_total_m2', 0) <= 0):
        why.append('CORE_FIELDS_NOT_VALID')
    source_time = instant(fields.get('observed_at'))
    if source_time is None:
        why.append('SOURCE_OBSERVATION_TIME_MISSING')
    elif source_time > now + timedelta(days=1):
        why.append('SOURCE_TIMESTAMP_IN_FUTURE')
    if (quality.get('issues') or []) and any(x in quality.get('issues', []) for x in (
        'source_id_conflicts_with_url', 'price_currency_conflicts_with_mad_field',
        'serp_snippet_not_detail_observation', 'required_core_fields_missing')):
        why.append('PARSER_CONFLICT_OR_SERP')
    if any(x.get('offer_status') not in ('unknown', None) or x.get('compliance_status') != 'review_required' for x in offers):
        why.append('UNEXPECTED_PARSER_ACTIVE_OR_RIGHTS')

    if proof is None:
        why.append('MISSING_EXTERNAL_ATTESTATION')
        return why
    if proof.get('record_id') != record.get('record_id') or proof.get('canonical_sha256') != stable_hash(prop):
        why.append('ATTESTATION_CONTENT_MISMATCH')
    if proof.get('reviewer_id') in (None, '') or proof.get('approved_for_neon') is not True:
        why.append('NOT_EXPLICITLY_APPROVED')
    if proof.get('rights_basis') not in RIGHTS_BASIS or not proof.get('rights_evidence_ref'):
        why.append('RIGHTS_NOT_EVIDENCED')
    if proof.get('verified_country') != 'Morocco' or not proof.get('country_evidence_ref'):
        why.append('COUNTRY_REVIEW_NOT_EVIDENCED')
    if proof.get('availability') != 'available' or not proof.get('availability_evidence_ref'):
        why.append('AVAILABILITY_NOT_VERIFIED')
    if proof.get('privacy_reviewed') is not True or not proof.get('privacy_evidence_ref'):
        why.append('PRIVACY_REVIEW_NOT_EVIDENCED')
    if proof.get('dedup_disposition') != 'unique_or_resolved' or not proof.get('dedup_evidence_ref'):
        why.append('DEDUP_NOT_RESOLVED')
    verified = instant(proof.get('verified_at'))
    if verified is None or verified > now or now - verified > timedelta(days=MAX_FRESHNESS_DAYS):
        why.append('FRESHNESS_NOT_CURRENT')
    return why


def write_gzip(path: Path, values: Iterable[dict]) -> None:
    with path.open('wb') as f:
        with gzip.GzipFile(fileobj=f, mode='wb', filename='', mtime=0) as gz:
            for value in values:
                gz.write((json.dumps(value, ensure_ascii=False, sort_keys=True,
                                     separators=(',', ':'), allow_nan=False) + '\n').encode('utf-8'))


def gate(input_path: Path, output_dir: Path, *, attestations: Path | None = None,
         as_of: datetime | None = None) -> dict:
    if not input_path.is_file():
        raise FileNotFoundError('MISSING_PARSER_OUTPUT')
    if attestations is not None and not attestations.is_file():
        raise FileNotFoundError('MISSING_ATTESTATIONS')
    if output_dir.resolve() == input_path.resolve() or input_path.resolve().is_relative_to(output_dir.resolve()):
        raise ValueError('SOURCE_INSIDE_OUTPUT_DIRECTORY')
    if attestations and (output_dir.resolve() == attestations.resolve() or attestations.resolve().is_relative_to(output_dir.resolve())):
        raise ValueError('ATTESTATIONS_INSIDE_OUTPUT_DIRECTORY')
    if output_dir.exists() and (not output_dir.is_dir() or any(output_dir.iterdir())):
        raise FileExistsError('OUTPUT_MUST_BE_NEW_OR_EMPTY')
    time_now = (as_of or datetime.now(timezone.utc)).astimezone(timezone.utc)
    input_sha = sha(input_path)
    proof_sha = sha(attestations) if attestations else None
    approvals = attestation_index(attestations)
    output_dir.mkdir(parents=True, exist_ok=True)
    reasons: Counter = Counter()
    counts = Counter()
    seen = set()
    export_file = output_dir / 'private_eligible_for_import_review.jsonl.gz'
    with export_file.open('wb') as target:
        with gzip.GzipFile(fileobj=target, mode='wb', filename='', mtime=0) as compressed:
            for record in rows(input_path):
                counts['input'] += 1
                record_id = record.get('record_id')
                if not isinstance(record_id, str):
                    raise ValueError('PARSER_RECORD_ID_INVALID')
                why = evaluate(record, approvals.get(record_id), time_now)
                source = record.get('source') or {}
                identity = (source.get('domain'), source.get('source_offer_id'))
                if not why:
                    if identity in seen:
                        why.append('DUPLICATE_APPROVED_SOURCE_ID')
                    else:
                        seen.add(identity)
                if why:
                    counts['withheld'] += 1
                    for reason in sorted(set(why)):
                        reasons[reason] += 1
                    continue
                counts['eligible_for_separate_import_review'] += 1
                value = {'record_id': record_id,
                         'canonical_property_v1': record['canonical_property_v1'],
                         'evidence': {'canonical_sha256': stable_hash(record['canonical_property_v1']),
                                      'attestation_verified_at': approvals[record_id]['verified_at'],
                                      'rights_basis': approvals[record_id]['rights_basis'],
                                      'rights_evidence_ref': approvals[record_id]['rights_evidence_ref'],
                                      'country_evidence_ref': approvals[record_id]['country_evidence_ref'],
                                      'availability_evidence_ref': approvals[record_id]['availability_evidence_ref'],
                                      'dedup_evidence_ref': approvals[record_id]['dedup_evidence_ref'],
                                      'privacy_evidence_ref': approvals[record_id]['privacy_evidence_ref']}}
                compressed.write((json.dumps(value, ensure_ascii=False, sort_keys=True,
                                             separators=(',', ':'), allow_nan=False) + '\n').encode('utf-8'))
    if sha(input_path) != input_sha or (attestations and sha(attestations) != proof_sha):
        raise RuntimeError('INPUT_MUTATED_DURING_GATE')
    manifest = {
        'version': VERSION,
        'as_of': time_now.isoformat(),
        'input_sha256': input_sha,
        'attestations_sha256': proof_sha,
        'counts': {k: counts[k] for k in ('input', 'withheld', 'eligible_for_separate_import_review')},
        'withheld_reason_counts': dict(sorted(reasons.items())),
        'export_sha256': sha(export_file),
        'invariants': {'neon_writes': 0, 'github_artifact_uploads': 0,
                       'auto_published': 0, 'attestations_are_not_authenticated_by_this_script': True,
                       'downstream_import_requires_independent_privileged_validation': True},
    }
    (output_dir / 'aggregate_promotion_manifest.json').write_text(json.dumps(manifest, indent=2,
                        sort_keys=True, ensure_ascii=False) + '\n', encoding='utf-8')
    return manifest


def main() -> None:
    ap = argparse.ArgumentParser(description='Private fail-closed admission, no database writes')
    ap.add_argument('--input', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--attestations', type=Path)
    ap.add_argument('--as-of', help='Explicit timezone-aware ISO timestamp for reproducible policy checks')
    args = ap.parse_args()
    at = instant(args.as_of) if args.as_of else datetime.now(timezone.utc)
    if at is None:
        ap.error('--as-of must be a timezone-aware ISO timestamp')
    result = gate(args.input, args.out, attestations=args.attestations, as_of=at)
    print(json.dumps({'counts': result['counts'], 'withheld_reason_counts': result['withheld_reason_counts'],
                      'ready_for_neon_written': False, 'neon_writes': 0}, sort_keys=True))


if __name__ == '__main__':
    main()
