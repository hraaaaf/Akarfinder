#!/usr/bin/env python3
"""One-page, no-DB live canary for the V646 HTML parser.

Hard limits: one canonical, non-paginated public search page; robots checked
fresh before any navigation; ordinary Chromium, no proxy/retry/challenge bypass.
Only aggregates and HTML SHA-256 are kept. Not a bulk crawler or license proof.
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
                                parse_listings_audited, resolve_source_urls)
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
    }


def summarise_html(html: str) -> dict:
    parse_started = perf_counter()
    audit = parse_listings_audited(html)
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
        "total_cards": audit.total_cards,
        "eligible_cards": audit.eligible_cards,
        "ignored_cards": audit.ignored,
        "rejected_cards": audit.rejected,
        "parsed_rows_before_quality_gate": len(audit.listings),
        "quality_accepted": audit.passes_quality,
        "quality_reasons": audit.quality_reasons,
        "acceptance_rate": round(audit.acceptance_rate, 4),
        "surface_coverage": round(audit.surface_coverage, 4),
        "locality_coverage": round(audit.locality_coverage, 4),
        "price_recognition_coverage": round(audit.price_recognition_coverage, 4),
        "counts_for_accepted_page_only": counts,
    }


async def probe() -> dict:
    started = perf_counter()
    result = {
        "mode": "LIVE_SINGLE_PAGE_V646_CANARY",
        "site": "www.mubawab.ma",
        "source_search_url": BASE_URL,
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
        urls = resolve_source_urls(1, None)
        if urls != [BASE_URL]:
            raise ValueError("Canary must inspect the one canonical Rabat shard")
        robots = fetch_and_check_robots(urls)
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
            fetched = await browser.fetch(BASE_URL)
            result["timings"]["navigation_and_render_seconds"] = round(perf_counter() - navigation_started, 3)
        result["listing_page_navigations"] = 1
        result["fetch_status"] = fetched.status
        result["response_code"] = fetched.code
        result["attempts"] = fetched.attempts
        result["fetch_error"] = fetched.error
        if fetched.status == "ok" and fetched.html:
            result["html_analysis"] = summarise_html(fetched.html)
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
    args = parser.parse_args()
    report = asyncio.run(probe())
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
