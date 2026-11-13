"""J4 source-only Sarouty geo integrity review; never index coordinates.

The listing's JSON-LD is a claim BY THE PORTAL. An attested original
HTML byte hash does not make the location, price or availability factual.
"""
from __future__ import annotations

from math import asin, cos, isfinite, radians, sin, sqrt
import json
import re
import unicodedata

from bs4 import BeautifulSoup

MAX_HTML_BYTES = 2_000_000
# GeoNames city reference for Salé, MA (place 2537763), not property GPS:
# https://www.geonames.org/2537763/sale.html
SALE_CITY_REFERENCE = (34.0531, -6.79846)
MAX_CITY_DISTANCE_KM = 100.0


class SaroutyGeoSourceRejected(ValueError):
    pass


def _is_sale(s: str) -> bool:
    return (unicodedata.normalize("NFKD", s)
            .encode("ascii", "ignore").decode("ascii").casefold().strip()
            in ("sale", "sale maroc"))


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    a,b,c,d = map(radians, (lat1,lon1,lat2,lon2))
    x = sin((c-a)/2)**2 + cos(a)*cos(c)*sin((d-b)/2)**2
    return 2 * 6371.0088 * asin(min(1, sqrt(x)))


def _real_estate_jsonld(soup: BeautifulSoup) -> dict:
    found = []
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            node = json.loads(tag.string or tag.get_text())
        except (ValueError, TypeError):
            continue
        root = node if isinstance(node, list) else [node]
        for item in root:
            if not isinstance(item, dict):
                continue
            nodes = item.get("@graph", []) if isinstance(item.get("@graph"), list) else [item]
            for entry in nodes[:100]:
                if not isinstance(entry, dict):
                    continue
                types = entry.get("@type")
                kinds = [types] if isinstance(types, str) else types if isinstance(types, list) else []
                if "RealEstateListing" in kinds:
                    found.append(entry)
    if len(found) != 1:
        raise SaroutyGeoSourceRejected("ONE_REAL_ESTATE_LISTING_JSONLD_REQUIRED")
    return found[0]


def audit_sarouty_source_geo(raw_html: bytes, *, expected_url: str) -> dict:
    """Capture-linked, bounded source anomaly; every indexing permission FALSE."""
    if (not isinstance(raw_html, bytes)
        or not raw_html.startswith((b"<!DOCTYPE html", b"<!doctype html", b"<html"))
        or len(raw_html) > MAX_HTML_BYTES):
        raise SaroutyGeoSourceRejected("BOUNDED_ORIGINAL_HTML_REQUIRED")
    if (not isinstance(expected_url, str)
        or not re.fullmatch(
            r"https://www\.sarouty\.ma/acheter/[a-z0-9-]+-\d{5,9}/",
            expected_url)):
        raise SaroutyGeoSourceRejected("EXACT_SAROUTY_DETAIL_URL_REQUIRED")
    try:
        html = raw_html.decode("utf-8", "strict")
    except UnicodeError as exc:
        raise SaroutyGeoSourceRejected("HTML_UTF8_REQUIRED") from exc
    listing = _real_estate_jsonld(BeautifulSoup(html, "html.parser"))
    if listing.get("url") != expected_url:
        raise SaroutyGeoSourceRejected("SOURCE_JSONLD_URL_MISMATCH")
    address = listing.get("address")
    if not isinstance(address, dict):
        raise SaroutyGeoSourceRejected("ADDRESS_CLAIM_REQUIRED")
    locality = address.get("addressLocality")
    region = address.get("addressRegion")
    if not isinstance(locality, str) or not locality.strip():
        raise SaroutyGeoSourceRejected("LOCALITY_CLAIM_REQUIRED")
    if (region is not None
        and (not isinstance(region, str) or not 1 <= len(region.strip()) <= 120)):
        raise SaroutyGeoSourceRejected("REGION_CLAIM_INVALID")
    geo = listing.get("geo")
    distance = None
    status = "jsonld_no_valid_coordinates"
    if isinstance(geo, dict) and all(k in geo for k in ("latitude", "longitude")):
        try:
            if (any(isinstance(geo[k], bool) for k in ("latitude", "longitude"))):
                raise ValueError
            lat, lon = float(geo["latitude"]), float(geo["longitude"])
        except (TypeError, ValueError) as exc:
            raise SaroutyGeoSourceRejected("JSONLD_COORDINATES_INVALID") from exc
        if not all((isfinite(lat), isfinite(lon), abs(lat) <= 90, abs(lon) <= 180)):
            raise SaroutyGeoSourceRejected("JSONLD_COORDINATES_INVALID")
        if _is_sale(locality):
            distance = round(_haversine_km(lat,lon,*SALE_CITY_REFERENCE),1)
            status = ("jsonld_geo_far_from_reported_sale"
                      if distance > MAX_CITY_DISTANCE_KM
                      else "jsonld_geo_near_sale_not_independent_proof")
        else:
            status = "jsonld_city_outside_review_scope"
    return {
        "status": status,
        "source_reported_city": locality,
        "source_reported_neighborhood": region.strip() if region else None,
        "distance_km_from_sale_city_reference": distance,
        "reference_kind": "public_city_centroid_not_listing_coordinate",
        "neighborhood_is_source_claim_only": True,
        "independent_listing_location_verified": False,
        "eligible_for_geo_index": False,
        "eligible_for_private_detail_staging": False,
        "eligible_for_public_admission": False,
        "source_http_requests": 0,
        "db_writes": 0,
    }
