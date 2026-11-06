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
    # Mirror the importer's conservative duplicate merge: a later partial card
    # must not erase already observed non-empty fields for the same source ID.
    unique: dict[str, dict] = {}
    for row in rows:
        if row.get("id") is None:
            continue
        entry = unique.setdefault(str(row["id"]), {})
        for field, value in row.items():
            if (field not in entry or entry[field] is None or entry[field] == "") and value is not None and value != "":
                entry[field] = value
    # A source-core must exist in ONE actual observation. The historical union
    # below remains useful for field availability, but must never certify an
    # artificially completed listing.
    def flags_for_row(r: dict) -> dict:
        price = r.get("price_mad")
        try:
            numeric_price = price is not None and float(price) > 0
        except (ValueError, TypeError):
            numeric_price = False
        on_request = r.get("price_source_status") == "on_request"
        stale_price = numeric_price and on_request
        # Current source state wins over the last known price: a row cannot be
        # counted as both numeric and on_request.
        numeric_price = numeric_price and not on_request
        try:
            surface = r.get("surface_m2") is not None and float(r["surface_m2"]) > 0
        except (ValueError, TypeError):
            surface = False
        return {
            "title": bool(str(r.get("title") or "").strip()),
            "price_numeric": numeric_price,
            "price_explicit_on_request": on_request,
            "surface": surface,
            "city": bool(str(r.get("location") or "").strip()),
            "district": bool(str(r.get("district") or "").strip()),
            "detail_link": _valid_link(r),
            "stale_price": stale_price,
        }
    flags = {key: flags_for_row(r) for key, r in unique.items()}
    observed_flags: dict[str, list[dict]] = {}
    for row in rows:
        if row.get("id") is None:
            continue
        if "last_source_observation_json" in row:
            # SQL state may be an enrichment of many cycles. Use ONLY the last
            # stored raw source observation, never the enriched SQL fields.
            raw = row.get("last_source_observation_json")
            try:
                current = json.loads(raw) if raw else None
            except (ValueError, TypeError):
                current = None
            if not isinstance(current, dict) or str(current.get("id")) != str(row["id"]):
                continue  # legacy/invalid provenance: UNKNOWN, never certified
            observation = current
        else:
            observation = row  # parser source rows, rather than SQL snapshots
        observed_flags.setdefault(str(row["id"]), []).append(flags_for_row(observation))
    property_types = {key: str(row.get("property_type_observed") or "unknown")
                      for key, row in unique.items()}
    recognized_apartments = sum(t == "apartment" for t in property_types.values())
    explicit_other = sum(t in ("villa", "land", "office", "shop", "mixed_ambiguous")
                         for t in property_types.values())
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
        "stale_price_rows_with_on_request_source": sum(int(f["stale_price"]) for f in flags.values()),
        "apartment_confirmed_from_title_only": recognized_apartments,
        "explicit_other_or_mixed_type_from_title_only": explicit_other,
        "property_type_observed_counts": dict(sorted(Counter(property_types.values()).items())),
        "complete_core_without_district":
            sum(any(core(f) for f in observations) for observations in observed_flags.values()),
        "complete_core_with_district":
            sum(any(strict(f) for f in observations) for observations in observed_flags.values()),
        "complete_core_with_district_numeric_price":
            sum(any(strict(f) and f["price_numeric"] for f in observations)
                for observations in observed_flags.values()),
        "historically_enriched_core_with_district_not_a_source_observation":
            sum(bool(strict(f)) and not any(strict(v) for v in observed_flags.get(key, []))
                for key, f in flags.items()),
        "source_core_ids_without_observation_proof":
            len(set(unique) - set(observed_flags)),
        "verified_active": None,
        "physical_unique_properties": None,
        "publication_eligible_proven": 0,
        "note": "Source-core completeness requires one single observation with title, explicit MAD price or on_request, surface, city, district and link. Historical union fields are descriptive ONLY. Activity, rights and physical duplicates unverified."
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
