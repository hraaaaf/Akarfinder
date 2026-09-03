#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import pathlib
import ssl
import time
import urllib.error
import urllib.request
import urllib.robotparser
from dataclasses import asdict, dataclass

import canonical_listing_extractor as extractor

USER_AGENT = "AkarFinder-L8-ArtifactValidity/1.0 (+https://akarfinder.ma)"
TIMEOUT = 20
MAX_BYTES = 2_500_000
OUT_DIR = pathlib.Path("artifacts/morocco-web-l8-artifact-validity")
HARD_BLOCK_MARKERS = ("captcha", "cf-chl-", "verify you are human", "access denied")

SOURCES = {
    "avito": {
        "robots": "https://www.avito.ma/robots.txt",
        "delay_floor_ms": 3000,
    },
    "marocannonces": {
        "robots": "https://www.marocannonces.com/robots.txt",
        "delay_floor_ms": 3000,
    },
    "sarouty": {
        "robots": "https://www.sarouty.ma/robots.txt",
        "delay_floor_ms": 10000,
    },
}


@dataclass
class FetchEvidence:
    url: str
    status: int | None
    classification: str
    bytes: int


def fetch_text(url: str, accept: str = "text/html,text/plain;q=0.9,*/*;q=0.5") -> tuple[str | None, FetchEvidence]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": accept})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ssl.create_default_context()) as response:
            status = int(getattr(response, "status", 200))
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                return None, FetchEvidence(url, status, "oversize", len(body))
            text = body.decode("utf-8", errors="replace")
            if status == 429:
                return None, FetchEvidence(url, status, "http_429", len(body))
            if status in (404, 410):
                return None, FetchEvidence(url, status, "stale_removed", len(body))
            if status == 403:
                return None, FetchEvidence(url, status, "http_403", len(body))
            if status >= 400:
                return None, FetchEvidence(url, status, f"http_{status}", len(body))
            if any(marker in text.lower() for marker in HARD_BLOCK_MARKERS):
                return None, FetchEvidence(url, status, "hard_block", len(body))
            return text, FetchEvidence(url, status, "ok", len(body))
    except urllib.error.HTTPError as exc:
        status = int(exc.code)
        if status == 429:
            cls = "http_429"
        elif status in (404, 410):
            cls = "stale_removed"
        elif status == 403:
            cls = "http_403"
        else:
            cls = f"http_{status}"
        return None, FetchEvidence(url, status, cls, 0)
    except urllib.error.URLError as exc:
        return None, FetchEvidence(url, None, f"network:{type(exc.reason).__name__}", 0)
    except TimeoutError:
        return None, FetchEvidence(url, None, "timeout", 0)


def load_urls(path: pathlib.Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def sample_evenly(urls: list[str], count: int) -> list[str]:
    if count <= 0 or not urls:
        return []
    if len(urls) <= count:
        return urls
    if count == 1:
        return [urls[len(urls) // 2]]
    indexes = [round(i * (len(urls) - 1) / (count - 1)) for i in range(count)]
    return [urls[i] for i in indexes]


def robot_policy(robots_url: str, delay_floor_ms: int):
    text, evidence = fetch_text(robots_url, accept="text/plain,*/*;q=0.5")
    if text is None or evidence.status != 200:
        return None, delay_floor_ms, evidence
    parser = urllib.robotparser.RobotFileParser()
    parser.set_url(robots_url)
    parser.parse(text.splitlines())
    delay = parser.crawl_delay(USER_AGENT)
    if delay is None:
        delay = parser.crawl_delay("*")
    delay_ms = max(delay_floor_ms, int((delay or 0) * 1000))
    return parser, delay_ms, evidence


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--avito", required=True)
    ap.add_argument("--marocannonces", required=True)
    ap.add_argument("--sarouty", required=True)
    ap.add_argument("--per-source", type=int, default=2)
    args = ap.parse_args()

    paths = {
        "avito": pathlib.Path(args.avito),
        "marocannonces": pathlib.Path(args.marocannonces),
        "sarouty": pathlib.Path(args.sarouty),
    }

    results = []
    source_summaries = {}
    stopped_early = None

    for source, cfg in SOURCES.items():
        urls = load_urls(paths[source])
        targets = sample_evenly(urls, args.per_source)
        robots, delay_ms, robots_evidence = robot_policy(cfg["robots"], cfg["delay_floor_ms"])
        summary = {
            "artifactUrlCount": len(urls),
            "sampleTargetCount": len(targets),
            "robots": asdict(robots_evidence),
            "delayMs": delay_ms,
            "active200": 0,
            "staleRemoved": 0,
            "listingDetail": 0,
            "unknownOrDiscovery": 0,
            "blocked": 0,
        }
        source_summaries[source] = summary

        if robots is None:
            stopped_early = f"{source}:robots_unavailable"
            break

        for url in targets:
            if not robots.can_fetch(USER_AGENT, url):
                results.append({"source": source, "url": url, "classification": "robots_disallowed"})
                summary["blocked"] += 1
                stopped_early = f"{source}:robots_disallowed"
                break

            time.sleep(delay_ms / 1000)
            html, evidence = fetch_text(url)
            row = {"source": source, "fetch": asdict(evidence)}
            if evidence.classification in {"http_429", "http_403", "hard_block"}:
                summary["blocked"] += 1
                results.append(row)
                stopped_early = f"{source}:{evidence.classification}"
                break
            if evidence.classification == "stale_removed":
                summary["staleRemoved"] += 1
                results.append(row)
                continue
            if html is None:
                results.append(row)
                continue

            summary["active200"] += 1
            canonical = extractor.extract_canonical(url, html)
            row["canonical"] = canonical
            if canonical.get("page_kind") == "listing_detail":
                summary["listingDetail"] += 1
            else:
                summary["unknownOrDiscovery"] += 1
            results.append(row)

        if stopped_early:
            break

    total_active = sum(s["active200"] for s in source_summaries.values())
    total_stale = sum(s["staleRemoved"] for s in source_summaries.values())
    total_listing = sum(s["listingDetail"] for s in source_summaries.values())
    all_sources_observed = all(s["active200"] + s["staleRemoved"] >= 1 for s in source_summaries.values()) and len(source_summaries) == len(SOURCES)
    report = {
        "strategy": "certified-artifact-bounded-listing-validity-canonical-sample",
        "zeroDbWrites": True,
        "perSource": args.per_source,
        "sourceSummaries": source_summaries,
        "totalActive200": total_active,
        "totalStaleRemoved": total_stale,
        "totalListingDetail": total_listing,
        "stoppedEarly": stopped_early,
        "results": results,
    }
    report["success"] = bool(
        stopped_early is None
        and all_sources_observed
        and total_active >= 3
        and total_listing >= 3
        and report["zeroDbWrites"]
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = {k: v for k, v in report.items() if k != "results"}
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if report["success"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
