"""V7 J6: NO-WRITE admission-readiness inventory over actual AkarParser V3 rows.

NO database connector, network client, source permits or trusted geo authority in
this module. Passing a V3/Radar10 schema check NEVER grants staging permission.
"""
from __future__ import annotations
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from radar10.ingest import InvalidCandidate, normalize

SCHEMA = "akarfinder-v7-j6-stage-readiness-v1"
MAX_BATCH = 1000
KNOWN_J3_GEO_CONFLICT_IDS = frozenset({"444291", "387448", "500006"})


def _source_id(candidate: dict) -> tuple[str, str]:
    return candidate["source_domain"], candidate["source_offer_id"]


def review_batch(records: list[dict]) -> dict:
    """Read-only proof inventory. Never returns stageable rows or SQL."""
    if not isinstance(records, list) or len(records) > MAX_BATCH:
        raise ValueError("J6_BATCH_BOUNDED_LIST_REQUIRED")
    by_identity: dict[tuple[str, str], str] = {}
    by_url: dict[str, str] = {}
    seen_payloads: set[str] = set()
    reasons: Counter[str] = Counter()
    sources: Counter[str] = Counter()
    for record in records:
        # Reuse actual V3 -> Radar10 normalization contract rather than a
        # substitute that could silently accept portal URL-only snippets.
        try:
            row = normalize(record)
        except (InvalidCandidate, ValueError, TypeError, AttributeError) as exc:
            reason = str(exc) if isinstance(exc, InvalidCandidate) else "V3_INVALID"
            reasons["quarantine:" + reason] += 1
            continue
        identity = _source_id(row)
        url = row["source_url"]
        existing_url = by_identity.get(identity)
        if existing_url is not None and existing_url != url:
            raise ValueError("J6_SOURCE_ID_COLLISION")
        existing_id = by_url.get(url)
        if existing_id is not None and existing_id != row["source_offer_id"]:
            raise ValueError("J6_SOURCE_URL_ID_COLLISION")
        by_identity[identity] = url
        by_url[url] = row["source_offer_id"]
        payload = row["content_sha256"]
        key = json.dumps([url, payload], separators=(",", ":"))
        if key in seen_payloads:
            reasons["duplicate_same_content"] += 1
            continue
        seen_payloads.add(key)
        if row["source_domain"] == "agenz.ma" and row["source_offer_id"] in KNOWN_J3_GEO_CONFLICT_IDS:
            reason = "J3_SOURCE_GEO_CONFLICT"
        else:
            # Even a matching sha256 format says nothing about the source
            # HTML's byte-verification, freshness, provenance or real address.
            reason = "INDEPENDENT_SOURCE_ADMISSION_GATE_MISSING"
        reasons["quarantine:" + reason] += 1
        sources[row["source_domain"]] += 1

    # Digest uses only source identity and normalized content hashes. It does
    # not disclose original source URLs or raw advertisement text.
    inventory = sorted(
        (domain, offer, hashlib.sha256(url.encode()).hexdigest())
        for (domain, offer), url in by_identity.items()
    )
    return {
        "schema_version": SCHEMA, "mode": "read_only_no_database",
        "observed": len(records), "normalized_unique_identity": len(by_identity),
        "unique_payloads": len(seen_payloads),
        "per_source_normalized": dict(sorted(sources.items())),
        "decision_counts": dict(sorted(reasons.items())),
        "inventory_sha256": hashlib.sha256(
            json.dumps(inventory, separators=(",", ":")).encode()
        ).hexdigest(),
        "eligible_for_private_staging": 0,
        "geo_verified": 0, "publication_authorized": False,
        "source_http_requests": 0, "db_reads": 0, "db_writes": 0,
        "migration_applied": False, "cron_live_enabled": False,
        "human_gate_required": True,
    }


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Offline V7 J6 gate only, NO DB")
    parser.add_argument("--v3-jsonl", type=Path, required=True)
    args = parser.parse_args()
    path = args.v3_jsonl
    if (not path.is_file() or path.is_symlink() or path.stat().st_size > 8_000_000):
        raise ValueError("PRIVATE_V3_JSONL_REQUIRED")
    records = []
    with path.open("rt", encoding="utf-8") as stream:
        for line in stream:
            if not line.strip():
                continue
            if len(line) > 350_000 or len(records) >= MAX_BATCH:
                raise ValueError("J6_INPUT_LIMIT")
            records.append(json.loads(line))
    print(json.dumps(review_batch(records), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
