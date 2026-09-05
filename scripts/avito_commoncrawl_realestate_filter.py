#!/usr/bin/env python3
"""Filter Common Crawl Avito URL evidence to AkarFinder real-estate categories.

The filter is intentionally exact. Category substrings are forbidden because values such as
"ordinateurs_de_bureau" would otherwise be misclassified as real estate.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import urllib.parse
from collections import Counter
from pathlib import Path

REAL_ESTATE_CATEGORIES = {
    "appartements",
    "maisons",
    "villas_et_riads",
    "terrains_et_fermes",
    "bureaux",
    "local",
    "chambre",
    "autre_immobilier",
    "maisons_et_villas",  # historical Avito slug observed in Common Crawl
}


def category_from_url(url: str) -> str | None:
    parts = [urllib.parse.unquote(x) for x in urllib.parse.urlparse(url).path.split("/") if x]
    # Listing URLs observed in the certified baseline follow /fr/<sector>/<category>/<slug_ID>.htm
    if len(parts) >= 4 and parts[0].lower() == "fr":
        return parts[2].lower()
    return None


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_lines(path: Path, values: set[str]) -> None:
    path.write_text("".join(f"{x}\n" for x in sorted(values, key=int)), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw-proof", required=True, type=Path)
    ap.add_argument("--baseline", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    raw_summary = json.loads((args.raw_proof / "summary.json").read_text(encoding="utf-8"))
    baseline = json.loads(args.baseline.read_text(encoding="utf-8"))
    baseline_ids = {str(r["source_id"]) for r in baseline.get("records", []) if r.get("source_id")}
    if len(baseline_ids) != 5807:
        raise ValueError(f"expected certified 5807-ID baseline, got {len(baseline_ids)}")

    kept: dict[str, dict] = {}
    by_category: Counter[str] = Counter()
    rejected_by_category: Counter[str] = Counter()

    with (args.raw_proof / "commoncrawl_records.jsonl").open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            record = json.loads(line)
            listing_id = str(record["source_id"])
            real_estate_evidence = []
            rejected_categories: set[str] = set()
            for ev in record.get("evidence", []):
                category = category_from_url(str(ev.get("indexed_url", "")))
                if category in REAL_ESTATE_CATEGORIES:
                    evidence = dict(ev)
                    evidence["avito_category"] = category
                    real_estate_evidence.append(evidence)
                elif category:
                    rejected_categories.add(category)
            for category in rejected_categories:
                rejected_by_category[category] += 1
            if not real_estate_evidence:
                continue
            canonical_category = real_estate_evidence[0]["avito_category"]
            by_category[canonical_category] += 1
            kept[listing_id] = {
                "source_id": listing_id,
                "in_kaynly_baseline": listing_id in baseline_ids,
                "avito_category": canonical_category,
                "evidence": real_estate_evidence,
            }

    discovered = set(kept)
    overlap = discovered & baseline_ids
    net_new = discovered - baseline_ids
    union = discovered | baseline_ids

    records_path = args.output / "commoncrawl_realestate_records.jsonl"
    with records_path.open("w", encoding="utf-8") as f:
        for listing_id in sorted(kept, key=int):
            f.write(json.dumps(kept[listing_id], ensure_ascii=False, sort_keys=True) + "\n")

    write_lines(args.output / "baseline_ids.txt", baseline_ids)
    write_lines(args.output / "commoncrawl_realestate_ids.txt", discovered)
    write_lines(args.output / "overlap_ids.txt", overlap)
    write_lines(args.output / "net_new_ids.txt", net_new)
    write_lines(args.output / "union_ids.txt", union)

    summary = {
        "status": "completed",
        "scope": "AkarFinder real estate only",
        "filter_strategy": "exact Avito category slug allowlist",
        "real_estate_categories": sorted(REAL_ESTATE_CATEGORIES),
        "by_category_unique_ids": dict(by_category.most_common()),
        "baseline_unique_avito_ids": len(baseline_ids),
        "commoncrawl_realestate_unique_avito_ids": len(discovered),
        "overlap_with_kaynly": len(overlap),
        "net_new_vs_kaynly": len(net_new),
        "union_unique_avito_ids": len(union),
        "gain_vs_kaynly_pct": round(len(net_new) / len(baseline_ids) * 100, 4),
        "raw_commoncrawl_unique_avito_ids_all_categories": raw_summary["discovered_unique_avito_ids"],
        "raw_non_realestate_ids_excluded": raw_summary["discovered_unique_avito_ids"] - len(discovered),
        "source_run_limits": raw_summary["limits"],
        "source_collections": raw_summary["collections"],
        "source_query_stats": raw_summary["query_stats"],
        "source_errors": raw_summary["errors"],
        "safety": raw_summary["safety"],
        "exhaustive_claim": False,
        "top_rejected_categories": dict(rejected_by_category.most_common(20)),
    }
    (args.output / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    proof_files = sorted(p for p in args.output.iterdir() if p.is_file() and p.name != "SHA256SUMS")
    (args.output / "SHA256SUMS").write_text(
        "".join(f"{sha256(p)}  {p.name}\n" for p in proof_files),
        encoding="utf-8",
    )

    print(json.dumps({
        "baseline": len(baseline_ids),
        "commoncrawl_realestate": len(discovered),
        "overlap": len(overlap),
        "net_new": len(net_new),
        "union": len(union),
        "raw_excluded": raw_summary["discovered_unique_avito_ids"] - len(discovered),
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
