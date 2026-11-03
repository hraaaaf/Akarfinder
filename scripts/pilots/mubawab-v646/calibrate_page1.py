#!/usr/bin/env python3
"""Read-only longitudinal calibration of the three *approved* Mubawab page-1 shards.

It reads JSON summaries, never HTML, never opens a database, and never fetches
sites. A single page-1 snapshot, even repeated, cannot certify exhaustiveness.
The gate baseline is never updated automatically.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
from statistics import median
from typing import Any

SHA40 = re.compile(r"[a-f0-9]{40}\Z")
SHA64 = re.compile(r"[a-f0-9]{64}\Z")
PER_SHARD_MIN_OBSERVATIONS = 5
MIN_SPAN = timedelta(days=4)
MIN_CADENCE = timedelta(hours=24)


def _parse_time(value: Any) -> datetime:
    if not isinstance(value, str):
        raise ValueError("missing UTC observation timestamp")
    try:
        time = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("invalid observation timestamp") from exc
    if time.tzinfo is None:
        raise ValueError("observation timestamp must specify timezone")
    return time.astimezone(timezone.utc)


def _sha(value: Any, length: int) -> bool:
    return isinstance(value, str) and bool((SHA40 if length == 40 else SHA64).fullmatch(value))


def _require_int(value: Any, label: str, minimum: int = 0) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise ValueError(f"{label} is not an integer >= {minimum}")
    return value


def load_manifest(manifest: Path) -> dict:
    data = json.loads(manifest.read_text(encoding="utf-8"))
    if data.get("schema_version") != 1:
        raise ValueError("unrecognized baseline schema")
    shards = data.get("eligible_cards_by_shard")
    if not isinstance(shards, dict) or len(shards) != 3:
        raise ValueError("exactly three pinned shards required")
    pilot_urls = [line.strip() for line in (manifest.parent / "pilot-urls.txt").read_text(encoding="utf-8").splitlines()
                  if line.strip() and not line.lstrip().startswith("#")]
    if set(shards) != set(pilot_urls) or len(pilot_urls) != 3:
        raise ValueError("baseline URLs disagree with approved pilot URLs")
    for name, baseline in shards.items():
        if not isinstance(name, str) or not name.startswith("https://www.mubawab.ma/fr/"):
            raise ValueError("invalid pinned shard")
        _require_int(baseline, "eligible baseline", 1)
    ratio = data.get("minimum_coverage_ratio")
    if type(ratio) is not float or not 0 < ratio <= 1:
        raise ValueError("invalid baseline alert ratio")
    return data


def interpret(path: Path, allowed: set[str]) -> dict:
    """Validate evidence before making any comparative numerical claim."""
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
        url = obj.get("source_search_url")
        if url not in allowed:
            raise ValueError("unapproved source URL")
        ts = _parse_time(obj.get("generated_at_utc"))
        if obj.get("mode") != "LIVE_SINGLE_PAGE_V646_CANARY":
            raise ValueError("not a V646 single-page canary")
        if obj.get("canary_status") != "parsed_quality_pass":
            raise ValueError(f"canary status {obj.get('canary_status')!r} is not passing")
        if obj.get("response_code") != 200 or obj.get("robots", {}).get("status") != "checked":
            raise ValueError("non-200 response or robots not checked")
        if _require_int(obj.get("listing_page_navigations"), "navigations", 1) != 1:
            raise ValueError("not exactly one navigation")
        if _require_int(obj.get("attempts"), "attempts", 1) != 1:
            raise ValueError("retried navigation")
        if not _sha(obj.get("robots", {}).get("sha256"), 64):
            raise ValueError("robots policy SHA missing")
        prov = obj.get("provenance") or {}
        if not _sha(prov.get("github_sha"), 40) or any(
            not _sha(prov.get(name), 64) for name in
            ("scraper_sha256", "browser_fetcher_sha256", "canary_sha256")
        ):
            raise ValueError("code provenance SHA missing")
        a = obj.get("html_analysis") or {}
        if a.get("quality_accepted") is not True or a.get("quality_reasons"):
            raise ValueError("page quality not accepted")
        ids = a.get("observed_source_ids")
        if not isinstance(ids, list) or not ids or any(not isinstance(v, str) or not v for v in ids):
            raise ValueError("missing explicit observed IDs")
        if ids != sorted(set(ids)):
            raise ValueError("IDs must be sorted and unique")
        digest = hashlib.sha256("\n".join(ids).encode("utf-8")).hexdigest()
        if a.get("observed_source_ids_sha256") != digest:
            raise ValueError("ID set does not match declared hash")
        n = _require_int(a.get("eligible_cards"), "eligible cards", 1)
        if _require_int(a.get("total_cards"), "total cards", 1) < n:
            raise ValueError("total cards less than eligible cards")
        counts = a.get("counts_for_accepted_page_only") or {}
        if _require_int(counts.get("unique_source_ids"), "unique source IDs", 1) != len(ids):
            raise ValueError("ID count disagreement")
        if _require_int(counts.get("complete_core_with_district"), "complete core", 0) > len(ids):
            raise ValueError("complete core count impossible")
        contract = a.get("quality_contract") or {}
        strict_p1 = (contract.get("require_locality") is True and
                     contract.get("baseline_is_provisional") is True and
                     isinstance(contract.get("baseline_eligible_cards"), int) and
                     not isinstance(contract.get("baseline_eligible_cards"), bool))
        if strict_p1 and (not _sha(prov.get("quality_baselines_sha256"), 64) or
                          not _sha(prov.get("approved_urls_sha256"), 64)):
            raise ValueError("strict P1 observation missing baseline or approved URL provenance")
        return {
            "source_file": path.name,
            "shard": url,
            "observed_at_utc": ts.isoformat(),
            "_ts": ts,
            "source_ids": len(ids),
            "eligible_cards": n,
            "complete_core_with_district": counts["complete_core_with_district"],
            "github_sha": prov["github_sha"],
            "scraper_sha256": prov["scraper_sha256"],
            "canary_sha256": prov["canary_sha256"],
            "browser_fetcher_sha256": prov["browser_fetcher_sha256"],
            "quality_baselines_sha256": prov.get("quality_baselines_sha256"),
            "approved_urls_sha256": prov.get("approved_urls_sha256"),
            "strict_p1": strict_p1,
            "robots_sha256": obj["robots"]["sha256"],
        }
    except (ValueError, TypeError, KeyError, AttributeError, json.JSONDecodeError) as exc:
        rejected = {"source_file": path.name, "rejected": f"{type(exc).__name__}: {exc}"}
        # An access-denied attempt still consumes the 24-hour safety window;
        # malformed data must never be treated as permission to retry sooner.
        try:
            if isinstance(obj, dict) and obj.get("source_search_url") in allowed:
                rejected["shard"] = obj["source_search_url"]
                rejected["observed_at_utc"] = _parse_time(obj.get("generated_at_utc")).isoformat()
                rejected["terminal_access_denial"] = (obj.get("response_code") in (403, 429) or
                    obj.get("canary_status") in ("blocked_or_no_useful_html", "robots_or_admission_blocked"))
        except (NameError, TypeError, ValueError):
            pass
        return rejected


def calibrate(paths: list[Path], manifest: Path) -> dict:
    baseline = load_manifest(manifest)
    allowed = set(baseline["eligible_cards_by_shard"])
    groups: dict[str, list[dict]] = defaultdict(list)
    rejected: list[dict] = []
    pinned_baseline_hash = hashlib.sha256(manifest.read_bytes()).hexdigest()
    pinned_urls_hash = hashlib.sha256((manifest.parent / "pilot-urls.txt").read_bytes()).hexdigest()
    for path in paths:
        item = interpret(path, allowed)
        if "rejected" in item:
            rejected.append(item)
        else:
            if item["strict_p1"] and (
                item["quality_baselines_sha256"] != pinned_baseline_hash or
                item["approved_urls_sha256"] != pinned_urls_hash
            ):
                rejected.append({"source_file": path.name, "shard": item["shard"],
                                 "observed_at_utc": item["observed_at_utc"],
                                 "rejected": "P1 baseline or approved URLs SHA differs from pinned manifest"})
            else:
                groups[item["shard"]].append(item)

    output = {}
    for url, initial in baseline["eligible_cards_by_shard"].items():
        observations = sorted(groups[url], key=lambda r: r["_ts"])
        violations = []
        for previous, current in zip(observations, observations[1:]):
            gap = current["_ts"] - previous["_ts"]
            if gap < MIN_CADENCE:
                violations.append({"first": previous["source_file"],
                                   "second": current["source_file"],
                                   "gap_hours": round(gap.total_seconds() / 3600, 3)})
        strict = [o for o in observations if o["strict_p1"]]
        code_versions = sorted({(o["scraper_sha256"], o["canary_sha256"],
                                 o["browser_fetcher_sha256"],
                                 o["quality_baselines_sha256"], o["approved_urls_sha256"])
                                for o in strict})
        timespan = strict[-1]["_ts"] - strict[0]["_ts"] if strict else timedelta(0)
        ready = (len(strict) >= PER_SHARD_MIN_OBSERVATIONS and
                 timespan >= MIN_SPAN and not violations and
                 len(code_versions) == 1 and not rejected)
        attempts = [o["_ts"] for o in observations]
        attempts += [_parse_time(o["observed_at_utc"]) for o in rejected
                     if o.get("shard") == url and o.get("observed_at_utc")]
        next_eligible = (max(attempts) + MIN_CADENCE).isoformat() if attempts else None
        eligible = [o["eligible_cards"] for o in strict]
        output[url] = {
            "reference_initial_eligible_cards": initial,
            "historical_pass_observations": len(observations),
            "strict_p1_pass_observations": len(strict),
            "min_strict_p1_required": PER_SHARD_MIN_OBSERVATIONS,
            "reference_to_current_code_comparability": "not_assumed",
            "strict_p1_eligible_counts": eligible,
            "strict_p1_median_eligible_cards": median(eligible) if eligible else None,
            "strict_p1_min_eligible_cards": min(eligible) if eligible else None,
            "strict_p1_max_eligible_cards": max(eligible) if eligible else None,
            "strict_p1_code_versions": len(code_versions),
            "cadence_violations": violations,
            "terminal_access_denial_observed": any(o.get("shard") == url and o.get("terminal_access_denial")
                                                   for o in rejected),
            "next_eligible_at_utc": next_eligible,
            "calibration_ready_for_human_review": ready,
            "candidate_baseline_for_human_review": median(eligible) if ready else None,
            "status": "READY_FOR_HUMAN_REVIEW_NOT_CERTIFIED" if ready else "INSUFFICIENT_EVIDENCE",
            "note": "Page 1 convenience sample. A median is NOT proof of completeness. Never update gate automatically.",
        }
    return {
        "schema_version": 1,
        "mode": "OFFLINE_PAGE1_CALIBRATION_READ_ONLY",
        "source_paths": [p.name for p in paths],
        "rejected_reports": rejected,
        "shards": output,
        "all_shards_ready_for_human_review": all(v["calibration_ready_for_human_review"] for v in output.values()),
        "publication_eligible_proven": 0,
        "physical_unique_properties": None,
        "note": "No site request or DB write. Observed source IDs are not unique physical properties.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="+", type=Path, help="Explicit approved canary JSON paths")
    parser.add_argument("--manifest", type=Path, default=Path(__file__).with_name("quality_baselines_v646_20261103.json"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    output = calibrate(args.files, args.manifest)
    text = json.dumps(output, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
    print(text)
    return 0 if not output["rejected_reports"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
