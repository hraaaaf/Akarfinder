#!/usr/bin/env python3
import json
from pathlib import Path

from bounded_production_ingestion import plan_batch, rollback_manifest

FIXTURE = [
    {"provider": "l7-fixture", "discovery_query": "appartement casablanca", "source_url": "https://example.ma/a/1", "canonical_url": "https://example.ma/a/1", "title": "Appartement 1"},
    {"provider": "l7-fixture", "discovery_query": "villa rabat", "source_url": "https://example.ma/a/2", "canonical_url": "https://example.ma/a/2", "title": "Villa 2"},
    {"provider": "l7-fixture", "discovery_query": "terrain marrakech", "source_url": "https://example.ma/a/3", "canonical_url": "https://example.ma/a/3", "title": "Terrain 3"},
]

plan = plan_batch(FIXTURE, limit=3, env={"THIRD_PARTY_DB_INGESTION_ALLOWED_HOSTS": "example.ma"})
report = {
    "strategy": "bounded-fail-closed-discovery-candidate-ingestion",
    "inputCount": plan["inputCount"],
    "acceptedCount": plan["acceptedCount"],
    "rejectedCount": plan["rejectedCount"],
    "zeroDbWrites": plan["zeroDbWrites"],
    "idempotencyKey": plan["idempotencyKey"],
    "rollbackIdentityCount": len(rollback_manifest(plan)["identities"]),
    "success": plan["zeroDbWrites"] and plan["acceptedCount"] == 3,
}
out = Path("artifacts/morocco-web-l7-bounded-ingestion")
out.mkdir(parents=True, exist_ok=True)
(out / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
(out / "rollback-manifest.json").write_text(json.dumps(rollback_manifest(plan), indent=2), encoding="utf-8")
(out / "report.md").write_text(
    "# Morocco Web L7 — bounded ingestion dry-run\n\n" +
    "\n".join(f"- **{k}**: `{v}`" for k, v in report.items()) + "\n",
    encoding="utf-8",
)
print(json.dumps(report, indent=2))
if not report["success"]:
    raise SystemExit(1)
