"""Read-only handoff from the MERGED L8 URL enumerators to actual AkarParser V3.

These are only source URL + ID candidates. The legacy enumerators do NOT
supply a trustworthy listing-detail snapshot, sale amount, area or publication
date. We deliberately keep them OUT of Radar10 private detail staging.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

ACQUISITION = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ACQUISITION))
import akarparser_v3_raw_bulk as v3

SCHEMA = "akarfinder-v7-legacy-url-candidate-v1"
MAX_ROWS = 1000
ALLOWED = {"agenz.ma", "avito.ma", "sarouty.ma", "mubawab.ma", "marocannonces.com"}
EXPECTED_FIELDS = {
    "schema_version", "source_domain", "source_offer_id", "source_url",
    "discovery_method", "record_kind", "detail_observed",
    "editorial_published_at", "rights_verified", "source_currently_active",
    "eligible_for_private_detail_staging", "eligible_for_public_admission",
}


class UrlOnlyContractError(ValueError):
    pass


def _validate(row: dict) -> tuple[str, str, str]:
    if not isinstance(row, dict) or set(row) != EXPECTED_FIELDS:
        raise UrlOnlyContractError("UNEXPECTED_RECORD_FIELDS")
    source = row["source_domain"]
    url = row["source_url"]
    offer = row["source_offer_id"]
    if (source not in ALLOWED or row["schema_version"] != SCHEMA
            or row["record_kind"] != "url_candidate_only"
            or row["discovery_method"] != "existing_l8_collector_result_offline"
            or not isinstance(url, str) or not (20 <= len(url) <= 2048)
            or not isinstance(offer, str) or re.fullmatch(r"\d{5,12}", offer) is None):
        raise UrlOnlyContractError("INVALID_URL_CANDIDATE")
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError as exc:
        raise UrlOnlyContractError("INVALID_URL") from exc
    host = parsed.hostname or ""
    if (parsed.scheme != "https" or host not in {source, "www." + source}
            or parsed.username or parsed.password or port is not None
            or parsed.fragment or re.search(r"%(?:2f|5c|00|25)", parsed.path, re.I) or "\\" in parsed.path
            or not parsed.path.startswith("/") or "//" in parsed.path):
        raise UrlOnlyContractError("URL_AUTHORITY_INVALID")
    if parsed.query and (source != "sarouty.ma"
                         or parsed.path != "/property-details"
                         or not re.fullmatch(r"listing_id=\d{5,9}", parsed.query)):
        raise UrlOnlyContractError("QUERY_INVALID")
    for key in ("detail_observed", "rights_verified",
                "eligible_for_private_detail_staging", "eligible_for_public_admission"):
        if row[key] is not False:
            raise UrlOnlyContractError("UNSUPPORTED_TRUST_CLAIM")
    if row["editorial_published_at"] is not None or row["source_currently_active"] is not None:
        raise UrlOnlyContractError("UNSUPPORTED_SOURCE_STATUS")
    return source, offer, url


def inspect_url_only_candidates(records: list[dict], *, as_of: datetime | None = None) -> dict:
    """Actual V3 preview WITHOUT generating a detail/DB artifact.

    Input bridge is unsigned and non-admissible even when V3 detects tokens
    in a URL. Never use this report as evidence of fresh published listings.
    """
    if not isinstance(records, list) or len(records) > MAX_ROWS:
        raise UrlOnlyContractError("UNSUPPORTED_BATCH")
    if as_of is None:
        as_of = datetime.now(timezone.utc)
    if as_of.tzinfo is None:
        raise UrlOnlyContractError("INVALID_CLOCK")
    seen, sources = set(), Counter()
    for row in records:
        source, offer, url = _validate(row)
        identity = (source, offer)
        if identity in seen:
            raise UrlOnlyContractError("DUPLICATE_SOURCE_ID")
        seen.add(identity)
        # Force V3's SERP/URL-only quality contract: no page was retrieved.
        parsed = v3.parse_raw({
            "source_url": url,
            "source_offer_id": offer,
            "source_domain": source,
            "query_id": "offline_url_only_candidate",
        }, as_of)
        status = parsed["quality"]["status"]
        if status != "source_snippet_only":
            raise UrlOnlyContractError("V3_WRONGLY_ADMITTED_URL_ONLY")
        if any(parsed["quality"].get(k) is not False for k in (
                "freshness_independently_verified",
                "availability_verified", "neon_product_admission_authorized")):
            raise UrlOnlyContractError("V3_SAFETY_CONTRACT")
        sources[source] += 1
    return {
        "mode": "offline_url_only_preview",
        "input_url_candidates": len(records),
        "v3_source_snippet_only": sum(sources.values()),
        "source_counts": dict(sorted(sources.items())),
        "detail_records_admitted": 0,
        "private_radar_candidates_inserted": 0,
        "production_writes": 0,
        "network_requests": 0,
        "public_admission_authorized": False,
    }
