#!/usr/bin/env python3
from __future__ import annotations
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("freshness_revisit_engine", ROOT / "freshness_revisit_engine.py")
M = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(M)

NOW = "2026-09-02T08:00:00Z"


def base(source_class, status="active", price=1800000, surface=120, failures=0):
    payload = {
        "classification.property_type": "apartment",
        "offer.transaction_type": "sale",
        "offer.price_amount": price,
        "surfaces.surface_total_m2": surface,
        "location.city": "Rabat",
        "location.neighborhood": "Agdal",
    }
    return {
        "source_class": source_class,
        "status": status,
        "payload": payload,
        "fingerprint": M.stable_fingerprint(payload),
        "last_seen_at": "2026-09-01T08:00:00Z",
        "transient_failures": failures,
    }


cases = []

p = base("portal")
cases.append(("unchanged_active", p, {"observed_at": NOW, "status_code": 200, "payload": dict(p["payload"])}))

p = base("portal")
payload = dict(p["payload"]); payload["offer.price_amount"] = 1690000
cases.append(("price_changed", p, {"observed_at": NOW, "status_code": 200, "payload": payload}))

p = base("agency")
cases.append(("removed_404", p, {"observed_at": NOW, "status_code": 404}))

p = base("long_tail", failures=1)
cases.append(("transient_503", p, {"observed_at": NOW, "status_code": 503}))

p = base("developer")
cases.append(("blocked_403", p, {"observed_at": NOW, "status_code": 403}))

results = []
for name, previous, observation in cases:
    out = M.evaluate_revisit(previous, observation)
    results.append({"case": name, **out})

summary = {
    "strategy": "bounded-fixture-source-aware-freshness-revisit",
    "case_count": len(results),
    "active_count": sum(1 for r in results if r["status"] == "active"),
    "removed_count": sum(1 for r in results if r["status"] == "removed"),
    "changed_count": sum(1 for r in results if r["changed"]),
    "transient_count": sum(1 for r in results if r["http_class"] == "transient_failure"),
    "blocked_not_removed_count": sum(1 for r in results if r["http_class"] == "blocked_or_invalid" and r["status"] != "removed"),
    "zeroDbWrites": all(r["zeroDbWrites"] for r in results),
}
summary["success"] = (
    summary["case_count"] == 5
    and summary["removed_count"] == 1
    and summary["changed_count"] >= 2
    and summary["transient_count"] == 1
    and summary["blocked_not_removed_count"] == 1
    and summary["zeroDbWrites"]
)

out_dir = Path("artifacts/morocco-web-l6-freshness")
out_dir.mkdir(parents=True, exist_ok=True)
(out_dir / "report.json").write_text(json.dumps({"summary": summary, "results": results}, indent=2), encoding="utf-8")
md = ["# Morocco Web L6 Freshness/Revisit Evidence", "", *[f"- **{k}**: `{v}`" for k, v in summary.items()]]
(out_dir / "report.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
if not summary["success"]:
    raise SystemExit(1)
