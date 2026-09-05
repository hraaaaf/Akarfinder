#!/usr/bin/env python3
"""Bounded discovery-only harvest from redirected Avito listing URLs.

Input seeds are existing Avito listing_sources rows. Each seed is fetched once; redirects
are followed by urllib, but no pagination or secondary navigation is performed. If the
final URL no longer preserves the requested Avito listing ID, the landing HTML is treated
as a discovery surface only. Any Avito detail URLs/IDs visibly present in that one HTML
response are harvested and globally deduplicated.

This script performs ZERO database writes.
"""

from __future__ import annotations

import html as html_lib
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen

AVITO_ID_RE = re.compile(r"_(\d{7,9})\.htm(?:$|[?#])", re.I)
AVITO_URL_RE = re.compile(
    r"(?:(?:https?:)?//(?:www\.)?avito\.ma)?(/(?:fr|ar)/[^\"'<>\s]+?_(\d{7,9})\.htm(?:\?[^\"'<>\s]*)?)",
    re.I,
)
USER_AGENT = os.getenv(
    "AVITO_REDIRECT_HARVEST_UA",
    "AkarFinderRedirectResearch/0.1 (+https://akarfinder.vercel.app)",
)
MAX_SEEDS = int(os.getenv("AVITO_REDIRECT_HARVEST_MAX_SEEDS", "672"))
DELAY_SECONDS = float(os.getenv("AVITO_REDIRECT_HARVEST_DELAY_SECONDS", "0.35"))
TIMEOUT_SECONDS = float(os.getenv("AVITO_REDIRECT_HARVEST_TIMEOUT_SECONDS", "12"))
OUT_DIR = Path(os.getenv("AVITO_REDIRECT_HARVEST_OUT", "evidence/avito-redirect-harvest"))


@dataclass(frozen=True)
class FetchResult:
    requested_url: str
    final_url: str
    status: int
    body: str


def extract_avito_id(url: str | None) -> str | None:
    if not url:
        return None
    match = AVITO_ID_RE.search(url)
    return match.group(1) if match else None


def canonical_avito_url(url: str) -> str:
    parsed = urlparse(url)
    return urlunparse(("https", "avito.ma", parsed.path, "", "", ""))


def identity_preserved(requested_url: str, final_url: str) -> bool:
    requested_id = extract_avito_id(requested_url)
    if not requested_id:
        return True
    return extract_avito_id(final_url) == requested_id


def supabase_get(path: str, params: str = "") -> list[dict[str, Any]]:
    base = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    url = f"{base}/rest/v1/{path}"
    if params:
        url += "?" + params
    req = Request(
        url,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        },
    )
    with urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_existing_avito_seeds() -> list[str]:
    params = "select=listing_url,source_url&source_name=ilike.avito&limit=1000"
    rows = supabase_get("listing_sources", params)
    urls: list[str] = []
    seen: set[str] = set()
    for row in rows:
        raw = row.get("listing_url") or row.get("source_url")
        if not isinstance(raw, str) or "avito.ma" not in raw.lower():
            continue
        normalized = canonical_avito_url(raw)
        if normalized in seen:
            continue
        seen.add(normalized)
        urls.append(normalized)
    return urls[:MAX_SEEDS]


def known_ids_from_seeds(seeds: list[str]) -> set[str]:
    """Return IDs already represented by the canonical Avito seed cohort.

    Discovery-candidate dedup is intentionally deferred until after harvesting. The old
    implementation scanned all Avito discovery_candidates before making any Avito request,
    which made the read-only harvest depend on a large PostgREST query and repeatedly
    failed with HTTP 500. Harvest first, reconcile reservoirs second.
    """
    known: set[str] = set()
    for seed in seeds:
        avito_id = extract_avito_id(seed)
        if avito_id:
            known.add(avito_id)
    return known


def fetch_once(url: str) -> FetchResult:
    req = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "fr,en;q=0.7",
        },
    )
    with urlopen(req, timeout=TIMEOUT_SECONDS) as response:
        raw = response.read()
        charset = response.headers.get_content_charset() or "utf-8"
        body = raw.decode(charset, errors="replace")
        return FetchResult(url, response.geturl(), int(response.status), body)


def harvest_visible_listing_urls(body: str, base_url: str) -> dict[str, str]:
    # Avito embeds some URLs in JSON with escaped slashes / unicode entities.
    normalized = html_lib.unescape(body).replace("\\/", "/")
    found: dict[str, str] = {}
    for match in AVITO_URL_RE.finditer(normalized):
        path = match.group(1)
        avito_id = match.group(2)
        absolute = canonical_avito_url(urljoin(base_url, path))
        found.setdefault(avito_id, absolute)
    return found


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    seeds = fetch_existing_avito_seeds()
    known_ids = known_ids_from_seeds(seeds)

    discovered: dict[str, dict[str, Any]] = {}
    seed_results: list[dict[str, Any]] = []
    requested_detail_seeds = 0
    identity_rejected = 0
    fetch_ok = 0
    fetch_failed = 0

    for index, seed in enumerate(seeds, start=1):
        requested_id = extract_avito_id(seed)
        if requested_id:
            requested_detail_seeds += 1
        record: dict[str, Any] = {
            "seed_index": index,
            "requested_url": seed,
            "requested_id": requested_id,
        }
        try:
            result = fetch_once(seed)
            fetch_ok += 1
            final_id = extract_avito_id(result.final_url)
            preserved = identity_preserved(seed, result.final_url)
            record.update(
                {
                    "http_status": result.status,
                    "final_url": result.final_url,
                    "final_id": final_id,
                    "identity_preserved": preserved,
                }
            )

            # Harvest only from redirected/mismatched detail seeds. A valid detail page
            # remains a listing, not a catalog discovery surface.
            if requested_id and not preserved:
                identity_rejected += 1
                visible = harvest_visible_listing_urls(result.body, result.final_url)
                record["visible_listing_count"] = len(visible)
                for avito_id, listing_url in visible.items():
                    entry = discovered.setdefault(
                        avito_id,
                        {
                            "avito_id": avito_id,
                            "canonical_url": listing_url,
                            "discovered_via": "avito_redirect_catalog",
                            "control_pages": [],
                        },
                    )
                    control = {
                        "requested_url": seed,
                        "final_url": result.final_url,
                        "requested_id": requested_id,
                    }
                    if control not in entry["control_pages"]:
                        entry["control_pages"].append(control)
            else:
                record["visible_listing_count"] = 0
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            fetch_failed += 1
            record["error"] = f"{type(exc).__name__}: {exc}"
        seed_results.append(record)
        if DELAY_SECONDS > 0 and index < len(seeds):
            time.sleep(DELAY_SECONDS)

    records = sorted(discovered.values(), key=lambda item: int(item["avito_id"]))
    new_vs_existing = [item for item in records if item["avito_id"] not in known_ids]
    existing = [item for item in records if item["avito_id"] in known_ids]

    report = {
        "status": "completed_bounded_dry_run",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "database_writes": 0,
        "pagination_requests": 0,
        "max_seeds": MAX_SEEDS,
        "seed_count": len(seeds),
        "known_id_scope": "existing_avito_listing_sources_only",
        "discovery_candidate_reconciliation": "deferred_post_harvest",
        "requested_detail_seeds": requested_detail_seeds,
        "fetch_ok": fetch_ok,
        "fetch_failed": fetch_failed,
        "identity_rejected_redirects": identity_rejected,
        "unique_visible_avito_ids": len(records),
        "already_existing_listing_ids": len(existing),
        "new_vs_existing_listing_ids": len(new_vs_existing),
        "user_agent": USER_AGENT,
        "delay_seconds": DELAY_SECONDS,
    }

    (OUT_DIR / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT_DIR / "records.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT_DIR / "new-vs-existing-records.json").write_text(json.dumps(new_vs_existing, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT_DIR / "seeds.json").write_text(json.dumps(seed_results, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyError as exc:
        print(f"Missing required environment variable: {exc}", file=sys.stderr)
        raise SystemExit(2)
