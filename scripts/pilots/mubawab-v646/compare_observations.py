#!/usr/bin/env python3
"""Compare two single-page canary JSONs (or one canary and a known-ID snapshot).

Pure function, no network. Separates what a page *shows* (observed IDs) from
what is *new* relative to an explicit baseline. It does not infer freshness,
activity or physical uniqueness.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def _ids_and_cards(report: dict) -> tuple[set[str], int]:
    # Never turn a rejected page, or an older count-only JSON, into "new" IDs.
    if report.get("canary_status", "parsed_quality_pass") != "parsed_quality_pass":
        raise ValueError("canary did not pass its quality gate")
    analysis = report.get("html_analysis")
    if not isinstance(analysis, dict) or analysis.get("quality_accepted", True) is not True:
        raise ValueError("missing or rejected HTML analysis")
    observed = analysis.get("observed_source_ids")
    if not isinstance(observed, list) or any(not isinstance(x, str) or not x.strip() for x in observed):
        raise ValueError("observed_source_ids is missing or invalid: cannot compute net-new")
    if len(observed) != len(set(observed)):
        raise ValueError("duplicate IDs in observation; source evidence is inconsistent")
    return set(observed), int(analysis.get("eligible_cards") or 0)


def compare(previous: dict, current: dict) -> dict:
    prev_ids, prev_cards = _ids_and_cards(previous)
    cur_ids, cur_cards = _ids_and_cards(current)
    union = prev_ids | cur_ids
    return {
        "observed_previous": len(prev_ids),
        "observed_current": len(cur_ids),
        "net_new_vs_previous": len(cur_ids - prev_ids),
        "dropped_since_previous": len(prev_ids - cur_ids),
        "overlap": len(prev_ids & cur_ids),
        "jaccard": round(len(prev_ids & cur_ids) / len(union), 4) if union else None,
        "same_page_identity": bool(cur_ids) and cur_ids == prev_ids,
        "eligible_cards_ratio": round(cur_cards / prev_cards, 4) if prev_cards else None,
        "note": "IDs are source IDs of one portal; not physical properties, not proof of activity.",
    }


def net_new_vs_snapshot(report: dict, known_ids: set[str]) -> dict:
    ids, _ = _ids_and_cards(report)
    return {"observed": len(ids), "already_known": len(ids & known_ids), "net_new": len(ids - known_ids)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--previous", type=Path, required=True)
    parser.add_argument("--current", type=Path, required=True)
    args = parser.parse_args()
    try:
        comparison = compare(json.loads(args.previous.read_text()), json.loads(args.current.read_text()))
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"comparison_status": "insufficient_evidence", "error": str(exc)},
                         ensure_ascii=False, indent=2))
        return 2
    print(json.dumps({"comparison_status": "valid", **comparison}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
