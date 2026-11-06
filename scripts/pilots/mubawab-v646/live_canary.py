#!/usr/bin/env python3
"""One-page, no-DB live canary for the V646 HTML parser.

Hard limits: one canonical, non-paginated public search page; robots checked
fresh before any navigation; ordinary Chromium, no proxy/retry/challenge bypass.
Only summary metadata and public source IDs are kept, no raw HTML/photos. Not a bulk crawler or license proof.
"""
from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
from time import perf_counter

from akarfinder_scraper import (BASE_URL, fetch_and_check_robots,
                                parse_listings_audited, resolve_source_urls, approved_shard_baseline,
                                expected_city_for_shard)
from benchmark_evidence import evaluate


# Distinct exit codes: a green workflow must mean "parsed_quality_pass", nothing else.
EXIT_CODES = {
    "parsed_quality_pass": 0,
    "parsed_quality_fail": 11,
    "blocked_or_no_useful_html": 12,
    "robots_or_admission_blocked": 13,
    "runtime_error": 14,
}
EXIT_UNKNOWN = 15


def provenance() -> dict:
    """Tie every canary JSON to the exact code that produced it."""
    here = Path(__file__).resolve().parent
    digest = lambda name: hashlib.sha256((here / name).read_bytes()).hexdigest()
    return {
        "github_sha": os.environ.get("GITHUB_SHA"),
        "github_run_id": os.environ.get("GITHUB_RUN_ID"),
        "scraper_sha256": digest("akarfinder_scraper.py"),
        "browser_fetcher_sha256": digest("browser_fetcher.py"),
        "canary_sha256": digest("live_canary.py"),
        "quality_baselines_sha256": digest("quality_baselines_v646_20261103.json"),
        "approved_urls_sha256": digest("pilot-urls.txt"),
    }


def summarise_html(html: str, *, baseline_eligible_cards: int | None = None,
                   require_locality: bool = False, expected_city: str | None = None,
                   require_apartment: bool = False) -> dict:
    parse_started = perf_counter()
    audit = parse_listings_audited(html, baseline_eligible_cards=baseline_eligible_cards,
                                   require_locality=require_locality, expected_city=expected_city,
                                   require_apartment=require_apartment)
    parse_seconds = round(perf_counter() - parse_started, 4)
    counts = evaluate(audit.listings) if audit.passes_quality else None
    # Public source IDs only (no HTML, no photos): required to compute net-new
    # against a snapshot and to detect a page identical to the previous one.
    source_ids = sorted({row["id"] for row in audit.listings})
    return {
        "html_sha256": hashlib.sha256(html.encode("utf-8")).hexdigest(),
        "parse_seconds": parse_seconds,
        "observed_source_ids": source_ids,
        "observed_source_ids_sha256": hashlib.sha256("\n".join(source_ids).encode("utf-8")).hexdigest(),
        # Always computed, even if the page failed the quality gate.
        "counts_observed": evaluate(audit.listings) if audit.listings else None,
        "quality_contract": {
            "require_locality": require_locality,
            "expected_city": expected_city,
            "require_apartment": require_apartment,
            "baseline_eligible_cards": baseline_eligible_cards,
            "minimum_baseline_ratio": 0.70 if baseline_eligible_cards is not None else None,
            "coverage_vs_baseline": round(audit.coverage_vs_baseline, 4) if audit.coverage_vs_baseline is not None else None,
            "baseline_is_provisional": baseline_eligible_cards is not None,
        },
        "total_cards": audit.total_cards,
        "eligible_cards": audit.eligible_cards,
        "ignored_cards": audit.ignored,
        "rejected_cards": audit.rejected,
        "parsed_rows_before_quality_gate": len(audit.listings),
        "quality_accepted": audit.passes_quality,
        "quality_reasons": audit.quality_reasons,
        "shard_context_violations": audit.shard_context_violations,
        "acceptance_rate": round(audit.acceptance_rate, 4),
        "surface_coverage": round(audit.surface_coverage, 4),
        "locality_coverage": round(audit.locality_coverage, 4),
        "price_recognition_coverage": round(audit.price_recognition_coverage, 4),
        "counts_for_accepted_page_only": counts,
    }


async def probe(source_url: str = BASE_URL) -> dict:
    started = perf_counter()
    result = {
        "mode": "LIVE_SINGLE_PAGE_V646_CANARY",
        "site": "www.mubawab.ma",
        "source_search_url": source_url,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "navigation_limit": 1,
        "browser_engine": "ordinary_playwright_chromium",
        "browser_proxies_or_challenge_bypass": False,
        "production_db_writes": 0,
        "publication_eligible_proven": 0,
        "physical_unique_properties": None,
        "live_scale_200k_proven": False,
        "canary_status": "not_started",
        "provenance": provenance(),
        "timings": {},
    }
    try:
        approved_urls = resolve_source_urls(1, str(Path(__file__).with_name("pilot-urls.txt")))
        if source_url not in approved_urls:
            raise ValueError("Canary URL is not in the fixed approved pilot manifest")
        baseline = approved_shard_baseline(source_url)
        robots = fetch_and_check_robots([source_url])
        result["robots"] = {
            "status": robots.get("status"),
            "sha256": robots.get("sha256"),
            "checked_at_utc": robots.get("checked_at_utc"),
            "rule_count": robots.get("rule_count"),
        }
    except Exception as exc:
        result["canary_status"] = "robots_or_admission_blocked"
        result["error"] = f"{type(exc).__name__}: {exc}"
        result["elapsed_wall_seconds"] = round(perf_counter() - started, 3)
        return result

    # Importing or initializing the scraper does not open its SQLite database.
    from browser_fetcher import BrowserConfig, BrowserFetcher
    try:
        launch_started = perf_counter()
        async with BrowserFetcher(BrowserConfig(max_concurrent_pages=1)) as browser:
            result["timings"]["browser_launch_seconds"] = round(perf_counter() - launch_started, 3)
            navigation_started = perf_counter()
            fetched = await browser.fetch(source_url)
            result["network_policy"] = browser.network_policy_evidence()
            result["timings"]["navigation_and_render_seconds"] = round(perf_counter() - navigation_started, 3)
        result["listing_page_navigations"] = 1
        result["fetch_status"] = fetched.status
        result["response_code"] = fetched.code
        result["attempts"] = fetched.attempts
        result["fetch_error"] = fetched.error
        if fetched.status == "ok" and fetched.html:
            result["html_analysis"] = summarise_html(
                fetched.html, baseline_eligible_cards=baseline, require_locality=True,
                expected_city=expected_city_for_shard(source_url), require_apartment=True
            )
            result["canary_status"] = (
                "parsed_quality_pass" if result["html_analysis"]["quality_accepted"]
                else "parsed_quality_fail"
            )
        else:
            result["canary_status"] = "blocked_or_no_useful_html"
    except Exception as exc:
        result["canary_status"] = "runtime_error"
        result["error"] = f"{type(exc).__name__}: {exc}"
    result["elapsed_wall_seconds"] = round(perf_counter() - started, 3)
    result["verified_active"] = None
    result["live_extraction_rate_per_hour"] = None
    # A single canary navigation cannot reliably establish sustained hourly yield.
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("artifacts/mubawab-v646-live-canary.json"))
    parser.add_argument("--url", default=BASE_URL, help="Exactly one URL from pilot-urls.txt")
    args = parser.parse_args()
    report = asyncio.run(probe(source_url=args.url))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    args.output.write_text(payload, encoding="utf-8")
    print(payload)
    # A blocked canary is still a measured finding (the JSON is uploaded with
    # `if: always()`), but the process must NOT exit 0: no re-run, no bypass,
    # simply a red job that cannot be mistaken for a quality pass.
    return EXIT_CODES.get(report.get("canary_status"), EXIT_UNKNOWN)


if __name__ == "__main__":
    raise SystemExit(main())
