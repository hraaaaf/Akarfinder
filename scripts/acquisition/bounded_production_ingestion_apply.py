#!/usr/bin/env python3
"""Explicit L7 production canary runner. Dry-run is the default."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from bounded_production_ingestion import apply_plan, plan_batch, rollback_manifest, snapshot_existing


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
    evidence = {"mode": "dry-run", "plan": plan, "before": [], "after": [], "delta": [], "result": None}

    if args.apply:
        before = snapshot_existing(plan)
        result = apply_plan(plan)
        after = snapshot_existing(plan)
        before_keys = {tuple(x[k] for k in ("provider", "query_hash", "canonical_url")) for x in before}
        delta = [x for x in after if tuple(x[k] for k in ("provider", "query_hash", "canonical_url")) not in before_keys]
        if delta != result["insertedIdentities"]:
            raise RuntimeError("post-write DB delta does not match inserted identities")
        evidence.update({"mode": "apply", "before": before, "after": after, "delta": delta, "result": result})

    args.evidence_dir.mkdir(parents=True, exist_ok=True)
    (args.evidence_dir / "canary-evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    (args.evidence_dir / "rollback-manifest.json").write_text(
        json.dumps(rollback_manifest(evidence["result"] or plan), indent=2), encoding="utf-8"
    )
    print(json.dumps({
        "mode": evidence["mode"],
        "acceptedCount": plan["acceptedCount"],
        "insertedCount": (evidence["result"] or {}).get("insertedCount", 0),
        "deltaCount": len(evidence["delta"]),
        "zeroDbWrites": not args.apply,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
