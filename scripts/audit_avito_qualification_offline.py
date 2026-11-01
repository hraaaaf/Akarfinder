#!/usr/bin/env python3
"""Offline QA of Avito qualification evidence. No network and no production writes."""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

CORE = ("title", "price", "location", "area")

def norm(value):
    return re.sub(r"\s+", " ", str(value or "").casefold()).strip()

def audit(payload):
    records = payload["results"]
    coverage = {k: sum(bool(r.get("fields", {}).get(k)) for r in records)
                for k in (*CORE, "description", "photos", "published_or_updated")}
    strict = [r["id"] for r in records if all(r.get("fields", {}).get(k) for k in CORE)]
    groups = defaultdict(list)
    for r in records:
        f = r.get("fields", {})
        # Conservative candidate key: city, area, price and initial description.
        if all(f.get(k) for k in ("location", "area", "price", "description")):
            key = tuple(norm(f[k]) for k in ("location", "area", "price")) + (norm(f["description"])[:100],)
            groups[key].append(r["id"])
    possible = [ids for ids in groups.values() if len(ids) > 1]
    return {
        "source_records": len(records), "coverage": coverage,
        "strict_four_fields_count": len(strict), "strict_four_fields_ids": strict,
        "legacy_threshold_count": sum(r.get("completeness_sufficient") is True for r in records),
        "possible_physical_duplicate_groups": possible,
        "active_confirmed": sum(r.get("availability") == "active_confirmed" for r in records),
        "commercial_reuse_confirmed": sum(r.get("commercial_reuse") == "authorized" for r in records),
        "physical_duplicates_proven": False, "network_requests": 0, "db_writes": 0,
    }

if __name__ == "__main__":
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/handovers/avito-qualification-results.json")
    result = audit(json.loads(src.read_text(encoding="utf-8")))
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if result["source_records"] != 20 or result["strict_four_fields_count"] != 11:
        sys.exit("unexpected fixture drift")
