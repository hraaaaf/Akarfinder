#!/usr/bin/env python3
"""Explicit L7 production canary runner. Dry-run is the default."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from bounded_production_ingestion import (
    PartialApplyError,
    apply_plan,
    plan_batch,
    rollback_manifest,
    snapshot_existing,
)

IDENTITY_FIELDS = ("provider", "query_hash", "canonical_url")


def _key(item):
    return tuple(item[k] for k in IDENTITY_FIELDS)


def _write_evidence(evidence: dict, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    (out / "canary-evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    (out / "rollback-manifest.json").write_text(
        json.dumps(rollback_manifest(evidence["result"] or evidence["plan"]), indent=2), encoding="utf-8"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path, help="JSON array of candidate rows")
    parser.add_argument("--limit", type=int, default=3)
    parser.add_argument("--apply", action="store_true", help="perform live staging writes")
    parser.add_argument("--evidence-dir", type=Path, default=Path("artifacts/morocco-web-l7-production-canary"))
    args = parser.parse_args()

    candidates = json.loads(args.manifest.read_text(encoding="utf-8"))
    if not isinstance(candidates, list):
        raise ValueError("manifest must contain a JSON array")
    plan = plan_batch(candidates, limit=args.limit)
    evidence = {"mode": "dry-run", "plan": plan, "before": [], "after": [], "delta": [], "result": None, "error": None}

    if not args.apply:
        _write_evidence(evidence, args.evidence_dir)
        print(json.dumps({"mode": "dry-run", "acceptedCount": plan["acceptedCount"], "insertedCount": 0,
                          "deltaCount": 0, "zeroDbWrites": True}, indent=2))
        return 0

    evidence["mode"] = "apply"
    before = snapshot_existing(plan)
    evidence["before"] = before
    try:
        result = apply_plan(plan)
        evidence["result"] = result
    except PartialApplyError as exc:
        result = {
            **plan,
            "zeroDbWrites": len(exc.inserted_identities) == 0,
            "insertedCount": len(exc.inserted_identities),
            "duplicateCount": len(exc.duplicate_identities),
            "insertedIdentities": exc.inserted_identities,
            "duplicateIdentities": exc.duplicate_identities,
            "success": False,
        }
        evidence["result"] = result
        evidence["error"] = {"type": type(exc.cause).__name__, "message": str(exc.cause)}
        try:
            evidence["after"] = snapshot_existing(plan)
            before_keys = {_key(x) for x in before}
            evidence["delta"] = [x for x in evidence["after"] if _key(x) not in before_keys]
        finally:
            _write_evidence(evidence, args.evidence_dir)
        raise

    after = snapshot_existing(plan)
    evidence["after"] = after
    before_keys = {_key(x) for x in before}
    delta = [x for x in after if _key(x) not in before_keys]
    evidence["delta"] = delta
    if {_key(x) for x in delta} != {_key(x) for x in result["insertedIdentities"]}:
        evidence["error"] = {"type": "DeltaMismatch", "message": "post-write DB delta does not match inserted identities"}
        _write_evidence(evidence, args.evidence_dir)
        raise RuntimeError(evidence["error"]["message"])

    result["success"] = True
    _write_evidence(evidence, args.evidence_dir)
    print(json.dumps({
        "mode": "apply", "acceptedCount": plan["acceptedCount"],
        "insertedCount": result["insertedCount"], "deltaCount": len(delta), "zeroDbWrites": result["zeroDbWrites"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
