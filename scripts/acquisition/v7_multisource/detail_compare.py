"""V7 offline detail benchmark across existing L4 and AkarParser V3.

Reads supplied immutable HTML snapshots; NEVER fetches a URL, stages data,
certifies source permissions/freshness, or publishes listings.

A FeenWay listing is a *mirror*. Its own fields cannot establish original
source or unique physical property identity. An original URL must be supplied
as an explicit, independently checkable reference, not invented from a logo.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import sys
from typing import Any
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE))
import akarparser_v3_raw_bulk as v3
from canonical_listing_extractor import extract_canonical

MAX_CASES = 50
MAX_HTML_BYTES = 2_000_000
CANONICAL_FIELDS = {
    "title": "offer.title",
    "price_mad": "offer.price_amount",
    "surface_total_m2": "surfaces.surface_total_m2",
    "city": "location.city",
    "district": "location.neighborhood",
    "property_type": "classification.property_type",
    "transaction_type": "offer.transaction_type",
}
SOURCES = frozenset((
    "feenway.com", "agenz.ma", "avito.ma", "yakeey.com", "sarouty.ma",
    "mubawab.ma", "marocannonces.com",
))


class DetailBenchmarkError(ValueError):
    pass


def _domain(raw: Any) -> str:
    if not isinstance(raw, str) or len(raw) > 2048:
        raise DetailBenchmarkError("SOURCE_URL_INVALID")
    try:
        url = urlsplit(raw)
        port = url.port
    except ValueError as exc:
        raise DetailBenchmarkError("SOURCE_URL_INVALID") from exc
    host = url.hostname or ""
    host = host[4:] if host.startswith("www.") else host
    if (url.scheme != "https" or host not in SOURCES
            or url.username or url.password or port is not None
            or url.fragment or "%" in url.path or "\\" in url.path
            or not url.path.startswith("/") or "//" in url.path):
        raise DetailBenchmarkError("UNSUPPORTED_URL")
    return host


def _val(obj: dict, name: str):
    field = obj.get(name)
    return field.get("value") if isinstance(field, dict) else None


def compare_supplied_html(case: dict, *, as_of: datetime | None = None) -> dict:
    """Compare two real existing parser implementations, not page validity."""
    if not isinstance(case, dict) or not set(case) <= {
        "source_url", "raw_html", "origin_url", "observation_ref", "expected"
    }:
        raise DetailBenchmarkError("INVALID_CASE_KEYS")
    src = case.get("source_url")
    domain = _domain(src)
    html = case.get("raw_html")
    if not isinstance(html, str) or not html.startswith("<"):
        raise DetailBenchmarkError("NO_HTML_SNAPSHOT")
    if len(html.encode("utf-8")) > MAX_HTML_BYTES:
        raise DetailBenchmarkError("HTML_TOO_LARGE")
    origin = case.get("origin_url")
    origin_domain = _domain(origin) if origin is not None else None
    if domain == "feenway.com" and (origin_domain is None or origin_domain == domain):
        # An origin badge ("Source: Avito") is NOT an actual original URL.
        # Research-only comparison is still possible, but stays quarantined.
        origin_verified = False
    else:
        origin_verified = False  # URL claim != independently verified HTTP proof.
    if as_of is None:
        as_of = datetime.now(timezone.utc)
    if as_of.tzinfo is None:
        raise DetailBenchmarkError("NAIVE_CLOCK")
    expected = case.get("expected") or {}
    if not isinstance(expected, dict) or not set(expected) <= set(CANONICAL_FIELDS):
        raise DetailBenchmarkError("INVALID_EXPECTED_FIELDS")
    # A single supplied HTML byte string is shared between legacy L4 and V3.
    l4 = extract_canonical(src, html)
    row = v3.parse_raw({"source_url": src, "raw_html": html}, as_of)
    v3_fields = row["fields"]
    l4_fields = l4["fields"]
    comparison = {}
    conflicts = []
    for key, l4_key in CANONICAL_FIELDS.items():
        a = v3_fields.get(key)
        b = _val(l4_fields, l4_key)
        if isinstance(a, float) and isinstance(b, (int, float)):
            equal = abs(a - b) < 0.00001
        else:
            equal = a == b
        comparison[key] = {
            "v3": a, "l4": b,
            "agreement": equal,
            "expected_match_v3": None if key not in expected else a == expected[key],
            "expected_match_l4": None if key not in expected else b == expected[key],
        }
        if not equal and a is not None and b is not None:
            conflicts.append(key)
    return {
        "source_domain": domain,
        "source_url": src,
        "origin_url_supplied": origin is not None,
        "origin_url_verified": origin_verified,
        "html_sha256": hashlib.sha256(html.encode("utf-8")).hexdigest(),
        "byte_count": len(html.encode("utf-8")),
        "observation_ref": case.get("observation_ref"),
        "l4_page_kind": l4["page_kind"],
        "l4_classification_reasons": l4["classification_reasons"],
        "v3_quality_status": row["quality"]["status"],
        "field_comparison": comparison,
        "conflicting_nonempty_fields": sorted(conflicts),
        "v3_freshness_verified": False,
        "rights_verified": False,
        "availability_verified": False,
        "detail_staging_authorized": False,
        "public_admission_authorized": False,
    }


def benchmark_supplied_cases(cases: list[dict], *, as_of: datetime | None = None) -> dict:
    if not isinstance(cases, list) or len(cases) > MAX_CASES:
        raise DetailBenchmarkError("INVALID_BATCH_SIZE")
    rows = [compare_supplied_html(x, as_of=as_of) for x in cases]
    seen = set()
    for row in rows:
        if row["source_url"] in seen:
            raise DetailBenchmarkError("DUPLICATE_CASE_URL")
        seen.add(row["source_url"])
    return {
        "input_cases": len(rows),
        "comparison_rows": rows,
        "conflict_cases": sum(bool(row["conflicting_nonempty_fields"]) for row in rows),
        "origin_urls_independently_verified": 0,
        "source_network_requests": 0,
        "db_writes": 0,
        "detail_staging_authorized": False,
        "public_admission_authorized": False,
    }


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("jsonl", type=Path, help="Local permitted HTML snapshots JSONL")
    args = parser.parse_args()
    if not args.jsonl.is_file() or args.jsonl.is_symlink():
        raise DetailBenchmarkError("SNAPSHOTS_REQUIRED")
    if args.jsonl.stat().st_size > MAX_HTML_BYTES * MAX_CASES:
        raise DetailBenchmarkError("SNAPSHOT_INPUT_TOO_LARGE")
    cases = [json.loads(line) for line in args.jsonl.read_text(encoding="utf-8").splitlines()
             if line.strip()]
    result = benchmark_supplied_cases(cases)
    # Reports can contain private page data and URLs; intentionally local only.
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
