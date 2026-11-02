#!/usr/bin/env python3
"""Read-only V646 evidence: HTML replay or audit of an existing SQLite artifact.

HTML evidence is synthetic unless the original captured file is independently
proven. Historical SQLite measures fields previously stored by V645, NOT the
performance of V646 on today's website. Neither mode opens a network connection.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3
from time import perf_counter
from urllib.parse import urlsplit

from akarfinder_scraper import parse_listings_audited


def _valid_link(row: dict) -> bool:
    url = row.get("link") or ""
    try:
        parsed = urlsplit(url)
        return (parsed.scheme == "https" and parsed.hostname in
                ("www.mubawab.ma", "mubawab.ma") and
                "/a/" in parsed.path and bool(parsed.path.strip("/")))
    except ValueError:
        return False


def evaluate(rows: list[dict]) -> dict:
    """Count source listing IDs, not deduplicated physical properties."""
    ids = [str(r.get("id")) for r in rows if r.get("id") is not None]
    unique = {str(r["id"]): r for r in rows if r.get("id") is not None}
    # Only count explicitly present information. A listing search URL alone is
    # NOT proof of city, active status, reuse permission, or physical uniqueness.
    flags = {}
    for key, r in unique.items():
        price = r.get("price_mad")
        try:
            numeric_price = price is not None and float(price) > 0
        except (ValueError, TypeError):
            numeric_price = False
        on_request = r.get("price_source_status") == "on_request"
        try:
            surface = r.get("surface_m2") is not None and float(r["surface_m2"]) > 0
        except (ValueError, TypeError):
            surface = False
        flags[key] = {
            "title": bool(str(r.get("title") or "").strip()),
            "price_numeric": numeric_price,
            "price_explicit_on_request": on_request,
            "surface": surface,
            "city": bool(str(r.get("location") or "").strip()),
            "district": bool(str(r.get("district") or "").strip()),
            "detail_link": _valid_link(r),
        }
    field_counts = {name: sum(int(f[name]) for f in flags.values())
                    for name in ("title", "price_numeric", "price_explicit_on_request",
                                 "surface", "city", "district", "detail_link")}
    core = lambda f: (f["title"] and
                      (f["price_numeric"] or f["price_explicit_on_request"]) and
                      f["surface"] and f["city"] and f["detail_link"])
    strict = lambda f: core(f) and f["district"]
    return {
        "observed_rows": len(rows),
        "unique_source_ids": len(unique),
        "duplicate_source_id_occurrences": len(ids) - len(set(ids)),
        "fields_present_among_unique_ids": field_counts,
        "complete_core_without_district": sum(bool(core(f)) for f in flags.values()),
        "complete_core_with_district": sum(bool(strict(f)) for f in flags.values()),
        "complete_core_with_district_numeric_price":
            sum(bool(strict(f) and f["price_numeric"]) for f in flags.values()),
        "verified_active": None,
        "physical_unique_properties": None,
        "publication_eligible_proven": 0,
        "note": "Strict core = title, explicit MAD price or on_request, surface, city, district and valid detail link. Activity, rights and physical duplicates unverified."
    }


def replay_html(paths: list[Path]) -> dict:
    from akarfinder_scraper import parse_listings_audited
    started = perf_counter()
    pages, accepted_rows = [], []
    for path in paths:
        html = path.read_text(encoding="utf-8")
        audit = parse_listings_audited(html)
        pages.append({
            "fixture": path.name,
            "total_cards": audit.total_cards,
            "eligible_cards": audit.eligible_cards,
            "parsed_rows": len(audit.listings),
            "accepted_page": audit.passes_quality,
            "ignored_reasons": audit.ignored,
            "rejected_reasons": audit.rejected,
            "quality_reasons": audit.quality_reasons,
        })
        if audit.passes_quality:
            accepted_rows.extend(audit.listings)
    return {
        "mode": "SYNTHETIC_HTML_REPLAY",
        "pages": pages,
        "counts": evaluate(accepted_rows),
        "offline_processing_seconds": round(perf_counter() - started, 6),
        "live_network_requests": 0,
        "live_extraction_rate_per_hour": None,
        "is_current_live_benchmark": False,
    }


def inspect_sqlite(path: Path, expected_rows: int | None = None) -> dict:
    started = perf_counter()
    connection = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
    try:
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA query_only=ON")
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise ValueError(f"SQLite integrity check failed: {integrity}")
        rows = [dict(r) for r in connection.execute("SELECT * FROM listings")]
    finally:
        connection.close()
    if expected_rows is not None and len(rows) != expected_rows:
        raise ValueError(f"Historic artifact drift: expected {expected_rows}, got {len(rows)}")
    return {
        "mode": "HISTORICAL_REAL_SQLITE_AUDIT_V645",
        "source_run": 41327076337,
        "source_artifact": "mubawab-v645-multishard-sqlite-state",
        "source_commit": "497c9fc826a372c607c4d095e195b8dc9672852c",
        "sqlite_integrity": integrity,
        "counts": evaluate(rows),
        "offline_processing_seconds": round(perf_counter() - started, 6),
        "live_network_requests": 0,
        "live_extraction_rate_per_hour": None,
        "is_current_live_benchmark": False,
        "warning": "Archived V645 observations from 2026-11-01; NOT an extraction run of V646, freshness audit, or unique-property census."
    }


def main() -> int:
    p = argparse.ArgumentParser()
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--html", nargs="+", type=Path)
    group.add_argument("--sqlite-root", type=Path)
    p.add_argument("--expected-rows", type=int)
    p.add_argument("--output", type=Path)
    args = p.parse_args()
    if args.html:
        result = replay_html(args.html)
    else:
        candidates = sorted(set(args.sqlite_root.rglob("*.db")) |
                            set(args.sqlite_root.rglob("*.sqlite")) |
                            set(args.sqlite_root.rglob("*.sqlite3")))
        if len(candidates) != 1:
            raise ValueError(f"Expected one SQLite under archive directory, got {len(candidates)}")
        result = inspect_sqlite(candidates[0], expected_rows=args.expected_rows)
    result["generated_at_utc"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    payload = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")
    print(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
