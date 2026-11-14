#!/usr/bin/env python3
"""V7 source-agnostic OFFLINE intake; no HTTP requests, DB writes or publication.

The GitHub scheduled lane is gated and never runs LIVE source capture.
Every eligible record goes through actual AkarParser V3 and Radar10 validator.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import tempfile
from typing import Mapping

ACQUISITION = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ACQUISITION))
import akarparser_v3_raw_bulk as v3
from radar10.ingest import load_v3, snapshot_sha
from v7_multisource.sources import PORTALS, bridge_multisource, canonical_identity

MAX_BATCH = 1000
MAX_INPUT_BYTES = 8_000_000


def _hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(128 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_individual_records(file: Path) -> list[dict]:
    """Read *supplied* records. The source is NOT implicitly trusted."""
    if not file.is_file() or file.is_symlink() or file.stat().st_size > MAX_INPUT_BYTES:
        raise ValueError("PRIVATE_SOURCE_INPUT_REQUIRED")
    result: list[dict] = []
    with file.open("r", encoding="utf-8") as src:
        for line in src:
            if not line.strip():
                continue
            if len(line) > 30_000 or len(result) >= MAX_BATCH:
                raise ValueError("RECORD_LIMIT")
            value = json.loads(line)
            if not isinstance(value, dict):
                raise ValueError("RECORD_NOT_OBJECT")
            result.append(value)
    return result


def prepare(
    *,
    signed_mubawab_rows: list[Mapping] | None = None,
    agenz_observations: list[Mapping] | None = None,
    private_root: Path,
    at: datetime | None = None,
) -> dict:
    """Private offline workspace, outputs remain local to caller."""
    if private_root.is_symlink() or private_root.exists():
        raise ValueError("PRIVATE_OUTPUT_MUST_BE_NEW")
    if at is None:
        at = datetime.now(timezone.utc)
    if at.tzinfo is None:
        raise ValueError("NAIVE_CLOCK_NOT_ALLOWED")
    inputs = [
        ("mubawab.ma", row) for row in (signed_mubawab_rows or [])
    ] + [
        ("agenz.ma", row) for row in (agenz_observations or [])
    ]
    if not inputs or len(inputs) > MAX_BATCH:
        raise ValueError("EMPTY_OR_TOO_LARGE_BATCH")
    by_url, ids = {}, {}
    for portal, raw in inputs:
        # Both adapters are explicitly allowlisted; every other source is NO-GO.
        if PORTALS[portal]["status"] != "offline_tested":
            raise ValueError("CONNECTOR_NOT_CERTIFIED")
        parsed = bridge_multisource(portal, raw)
        parsed_portal, offer, url = canonical_identity(parsed["source_url"])
        if parsed_portal != portal:
            raise ValueError("SOURCE_PORTAL_MISMATCH")
        identity = (portal, offer)
        if url in by_url and by_url[url] != parsed:
            raise ValueError("CONTRADICTORY_URL_IN_BATCH")
        if identity in ids and ids[identity] != url:
            raise ValueError("SOURCE_ID_COLLISION")
        ids[identity] = url
        by_url[url] = parsed
    ordered = [by_url[u] for u in sorted(by_url)]
    private_root.mkdir(mode=0o700, parents=True)
    original = private_root / "unpublished-input.jsonl"
    with original.open("x", encoding="utf-8") as sink:
        for row in ordered:
            sink.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    root = private_root / "v3"
    report = v3.run(original, root, as_of=at)
    if report["safety"]["network_requests"] or report["safety"]["db_writes"]:
        raise RuntimeError("V3_SIDE_EFFECT_CONTRACT_BROKEN")
    valid, audit = load_v3(root / "all.jsonl.gz")
    counters = Counter(row["source_domain"] for row in valid)
    return {
        "mode": "offline_only", "snapshot_sha256": snapshot_sha(valid),
        "raw_input_sha256": _hash_file(original),
        "sources": {portal: {"adapter": PORTALS[portal]["adapter"],
                             "accepted": counters.get(portal, 0)}
                    for portal in ("mubawab.ma", "agenz.ma")},
        "observations_supplied": len(inputs),
        "unique_urls_supplied": len(by_url),
        "accepted": len(valid),
        "v3_quarantined_or_excluded": audit["observed"] - audit["accepted"],
        "db_writes": 0, "production_writes": 0, "network_requests": 0,
        "published_at_verified": 0, "public_admission_authorized": False,
    }


def main() -> int:
    p = argparse.ArgumentParser(description="V7 private offline multi-site staging")
    p.add_argument("--agenz-jsonl", type=Path,
                   help="supplied individual Agenz page observations; not live collection")
    p.add_argument("--verified-v646-root", type=Path,
                   help="authenticated V646 publication root, not a network crawler")
    a = p.parse_args()
    try:
        if not a.agenz_jsonl and not a.verified_v646_root:
            raise ValueError("NO_OFFLINE_INPUT")
        agenz = read_individual_records(a.agenz_jsonl) if a.agenz_jsonl else []
        if a.verified_v646_root:
            from radar10.run_cycle import verified_v646
            mubawab = verified_v646(a.verified_v646_root, collect=False)
        else:
            mubawab = []
        with tempfile.TemporaryDirectory(prefix="v7-offline-") as tmp:
            r = prepare(agenz_observations=agenz, signed_mubawab_rows=mubawab,
                        private_root=Path(tmp) / "v7")
        # Only aggregate, non-identifying metadata is printed; no raw URLs.
        print(json.dumps(r, ensure_ascii=False, sort_keys=True))
        return 0
    except Exception as exc:
        print(json.dumps({"status": "failed", "error_code": type(exc).__name__,
                          "no_public_writes": True}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
