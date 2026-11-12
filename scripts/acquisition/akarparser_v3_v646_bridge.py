"""Strict V646 export-to-V3 field adapter; never admits to production.

Caller must first consume HMAC-verified immutable V646 snapshots.
The bridge never interprets first_seen/last_seen as verified freshness.
"""
from __future__ import annotations

import re
from typing import Any, Mapping
from urllib.parse import urlsplit

ID = re.compile(r"/a/([0-9]{5,})(?:/|$)")


def bridge_v646_row(raw: Mapping[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, Mapping):
        raise ValueError("V646_ROW_NOT_MAPPING")
    url = raw.get("link")
    if not isinstance(url, str):
        raise ValueError("V646_LISTING_URL_INVALID")
    p = urlsplit(url)
    if (p.scheme != "https" or p.hostname not in ("mubawab.ma", "www.mubawab.ma")
            or p.username or p.password or p.port is not None or p.query or p.fragment):
        raise ValueError("V646_LISTING_URL_INVALID")
    match = ID.search(p.path)
    if not match or match.group(1) != str(raw.get("id") or ""):
        raise ValueError("V646_SOURCE_ID_MISMATCH")
    if raw.get("transaction_type") != "sale":
        raise ValueError("V646_SALE_NOT_PROVEN")
    if raw.get("property_type_observed") != "apartment":
        raise ValueError("V646_APARTMENT_NOT_PROVEN")
    return {
        "source_url": url, "source_name": "mubawab.ma",
        "source_offer_id": match.group(1), "title": raw.get("title"),
        "city": raw.get("location"), "district": raw.get("district"),
        "property_type": "apartment", "transaction_type": "sale",
        "price_mad": raw.get("price_mad"), "surface_m2": raw.get("surface_m2"),
        "bedrooms_count": raw.get("bedrooms"),
        "bathrooms_count": raw.get("bathrooms"),
        "source_search_url": raw.get("source_search_url"),
        # Never copy first_seen/last_seen to observed_at or published_at.
    }
