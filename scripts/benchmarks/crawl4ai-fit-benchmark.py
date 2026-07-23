#!/usr/bin/env python3
"""CRAWL4AI-AKARFINDER-FIT-AUDIT-1

Controlled, read-only benchmark comparing AkarFinder's current lightweight HTTP
acquisition shape (plain GET + HTML parsing) with Crawl4AI browser rendering on
three public Moroccan real-estate sites.

Doctrine:
- identifiable AkarFinderResearchBot user-agent
- robots.txt checked before each crawl
- no proxy, no stealth, no fake browser identity, no login, no captcha solving
- stop/record on denied or failed access
- no DB writes, no images downloaded, no contact extraction
"""

from __future__ import annotations

import asyncio
import json
import re
import time
import urllib.robotparser
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

UA = "AkarFinderResearchBot/0.1 (+https://akarfinder.ma; research; non-commercial; contact: research@akarfinder.ma)"
OUT_DIR = Path("data/audits/crawl4ai-fit")

SOURCES = [
    {
        "id": "aykana",
        "url": "https://aykana.ma/",
        "pattern": r"^/property/[^/]+$",
        "class": "approved_discovery / agency_site",
    },
    {
        "id": "promoimmomarrakech",
        "url": "https://promoimmomarrakech.com/",
        "pattern": r"^/produit/[^/]+/[^/]+\.html$",
        "class": "approved_discovery / agency_site",
    },
    {
        "id": "capalmrabat",
        "url": "https://capalmrabat.com/",
        "pattern": r"^/biens/[^/]+/rabat/[^/]+/?$",
        "class": "candidate_B / agency_site",
    },
]

PRICE_RE = re.compile(r"(?:\b\d[\d\s.,]{2,}\s*(?:dh|dhs|mad)\b|(?:dh|mad)\s*\d)", re.I)
SURFACE_RE = re.compile(r"\b\d{1,5}(?:[.,]\d+)?\s*m(?:²|2)\b", re.I)


@dataclass
class LaneMetrics:
    success: bool
    status: int | None
    duration_ms: int
    html_chars: int
    internal_links: int
    listing_pattern_links: int
    jsonld_blocks: int
    price_signals: int
    surface_signals: int
    error: str | None = None


def robots_allowed(url: str) -> tuple[bool, str | None]:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(robots_url)
    try:
        rp.read()
        return rp.can_fetch(UA, url), None
    except Exception as exc:  # network/parse error: record, do not silently claim robots proof
        return False, f"robots_unavailable:{type(exc).__name__}:{exc}"


def analyze_html(base_url: str, html: str, listing_pattern: str) -> dict[str, int]:
    soup = BeautifulSoup(html, "html.parser")
    host = urlparse(base_url).netloc.lower().removeprefix("www.")
    internal: set[str] = set()
    listing: set[str] = set()
    pattern = re.compile(listing_pattern)

    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, str(a.get("href")))
        try:
            u = urlparse(href)
        except Exception:
            continue
        link_host = u.netloc.lower().removeprefix("www.")
        if link_host != host:
            continue
        normalized = f"{u.scheme}://{u.netloc}{u.path}"
        internal.add(normalized)
        if pattern.search(u.path):
            listing.add(normalized)

    jsonld = len(soup.find_all("script", attrs={"type": "application/ld+json"}))
    text = soup.get_text(" ", strip=True)
    return {
        "internal_links": len(internal),
        "listing_pattern_links": len(listing),
        "jsonld_blocks": jsonld,
        "price_signals": len(PRICE_RE.findall(text)),
        "surface_signals": len(SURFACE_RE.findall(text)),
    }


async def run_baseline(source: dict[str, str]) -> LaneMetrics:
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(
            headers={"User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9,ar;q=0.8,en;q=0.7"},
            timeout=20.0,
            follow_redirects=True,
        ) as client:
            resp = await client.get(source["url"])
        duration = int((time.perf_counter() - start) * 1000)
        if resp.status_code >= 400:
            return LaneMetrics(False, resp.status_code, duration, 0, 0, 0, 0, 0, 0, f"HTTP {resp.status_code}")
        metrics = analyze_html(str(resp.url), resp.text, source["pattern"])
        return LaneMetrics(True, resp.status_code, duration, len(resp.text), **metrics)
    except Exception as exc:
        return LaneMetrics(False, None, int((time.perf_counter() - start) * 1000), 0, 0, 0, 0, 0, 0, f"{type(exc).__name__}: {exc}")


async def run_crawl4ai(source: dict[str, str]) -> LaneMetrics:
    start = time.perf_counter()
    try:
        from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

        browser_cfg = BrowserConfig(
            browser_type="chromium",
            headless=True,
            user_agent=UA,
            enable_stealth=False,
            proxy_config=None,
            text_mode=True,
            light_mode=True,
            verbose=False,
        )
        run_cfg = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            check_robots_txt=True,
            page_timeout=20_000,
            wait_until="domcontentloaded",
        )
        async with AsyncWebCrawler(config=browser_cfg) as crawler:
            result = await crawler.arun(url=source["url"], config=run_cfg)
        duration = int((time.perf_counter() - start) * 1000)
        if not result.success:
            status = getattr(result, "status_code", None)
            return LaneMetrics(False, status, duration, 0, 0, 0, 0, 0, 0, getattr(result, "error_message", "crawl_failed"))
        html = getattr(result, "html", "") or getattr(result, "cleaned_html", "") or ""
        final_url = getattr(result, "url", None) or source["url"]
        metrics = analyze_html(final_url, html, source["pattern"])
        return LaneMetrics(True, getattr(result, "status_code", 200), duration, len(html), **metrics)
    except Exception as exc:
        return LaneMetrics(False, None, int((time.perf_counter() - start) * 1000), 0, 0, 0, 0, 0, 0, f"{type(exc).__name__}: {exc}")


async def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report: dict[str, Any] = {
        "audit_id": "CRAWL4AI-AKARFINDER-FIT-AUDIT-1",
        "doctrine": {
            "user_agent": UA,
            "robots_checked": True,
            "stealth": False,
            "proxy": False,
            "fake_googlebot": False,
            "captcha_solving": False,
            "login": False,
            "db_writes": False,
        },
        "sources": [],
    }

    for source in SOURCES:
        allowed, robots_error = await asyncio.to_thread(robots_allowed, source["url"])
        row: dict[str, Any] = {
            "source_id": source["id"],
            "seed_url": source["url"],
            "registry_class": source["class"],
            "listing_pattern": source["pattern"],
            "robots_allowed": allowed,
            "robots_error": robots_error,
        }
        if not allowed:
            row["baseline"] = None
            row["crawl4ai"] = None
            row["verdict"] = "SKIPPED_ROBOTS"
            report["sources"].append(row)
            continue

        baseline = await run_baseline(source)
        crawl = await run_crawl4ai(source)
        row["baseline"] = asdict(baseline)
        row["crawl4ai"] = asdict(crawl)
        if crawl.success and baseline.success:
            delta = crawl.listing_pattern_links - baseline.listing_pattern_links
            if delta > 0:
                verdict = "CRAWL4AI_ADDS_DISCOVERY"
            elif crawl.internal_links > baseline.internal_links or crawl.jsonld_blocks > baseline.jsonld_blocks:
                verdict = "CRAWL4AI_ADDS_RENDERED_SIGNAL"
            else:
                verdict = "NO_CLEAR_INCREMENT_ON_SEED"
        elif crawl.success and not baseline.success:
            verdict = "CRAWL4AI_RECOVERS_PUBLIC_PAGE"
        elif not crawl.success and baseline.success:
            verdict = "BASELINE_BETTER_OR_CRAWL4AI_INCOMPATIBLE"
        else:
            verdict = "BOTH_FAILED"
        row["verdict"] = verdict
        report["sources"].append(row)

    usable = [r for r in report["sources"] if r.get("baseline") and r.get("crawl4ai")]
    improvements = [r for r in usable if str(r.get("verdict", "")).startswith("CRAWL4AI_ADDS") or r.get("verdict") == "CRAWL4AI_RECOVERS_PUBLIC_PAGE"]
    report["summary"] = {
        "sources_total": len(SOURCES),
        "sources_benchmarked": len(usable),
        "sources_skipped_robots": sum(1 for r in report["sources"] if r.get("verdict") == "SKIPPED_ROBOTS"),
        "sources_with_clear_increment": len(improvements),
    }

    json_path = OUT_DIR / "crawl4ai_fit_benchmark.json"
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        "# CRAWL4AI-AKARFINDER-FIT-AUDIT-1 — Runtime benchmark",
        "",
        "Strict mode: robots-aware, identifiable UA, no stealth, no proxy, no bypass.",
        "",
        "| Source | Robots | Baseline listing links | Crawl4AI listing links | Baseline ms | Crawl4AI ms | Verdict |",
        "|---|---:|---:|---:|---:|---:|---|",
    ]
    for row in report["sources"]:
        b = row.get("baseline") or {}
        c = row.get("crawl4ai") or {}
        lines.append(
            f"| {row['source_id']} | {row['robots_allowed']} | {b.get('listing_pattern_links','-')} | {c.get('listing_pattern_links','-')} | {b.get('duration_ms','-')} | {c.get('duration_ms','-')} | {row['verdict']} |"
        )
    lines += ["", "```json", json.dumps(report["summary"], indent=2), "```", ""]
    (OUT_DIR / "crawl4ai_fit_benchmark.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
