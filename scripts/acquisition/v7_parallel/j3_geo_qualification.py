"""J3 Agenz geo claim safety gate: source labels are not verified map locations.

This is an *offline*, deliberately fail-closed decision function. It cannot
grant geo-index, marker, private staging, or production permission. An independent
listing-specific geolocation attestation needs a separate reviewed implementation.
"""
from __future__ import annotations
import re
import unicodedata


def _canonical_place(value: str) -> str:
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", text.casefold()).strip()


def qualify_geo_claim(*, city_label: str, district_label: str,
                      conflicting_description_district: str | None,
                      sha256_verified: bool) -> dict:
    """Give only source-text provenance; never promote a district to geofact."""
    if sha256_verified is not True:
        raise ValueError("ORIGINAL_HTML_SHA256_NOT_VERIFIED")
    if not isinstance(city_label, str) or not city_label.strip():
        raise ValueError("SOURCE_CITY_REQUIRED")
    if not isinstance(district_label, str) or not district_label.strip():
        raise ValueError("SOURCE_DISTRICT_REQUIRED")
    if conflicting_description_district is not None and (
        not isinstance(conflicting_description_district, str)
        or not conflicting_description_district.strip()
    ):
        raise ValueError("INVALID_DESCRIPTION_CONFLICT")

    conflict = bool(
        conflicting_description_district
        and _canonical_place(conflicting_description_district)
        != _canonical_place(district_label)
    )
    return {
        "status": "source_internal_conflict" if conflict else "source_claim_unverified",
        "source_reported_city": city_label,
        "source_reported_district": district_label,
        "conflicting_description_district": conflicting_description_district if conflict else None,
        "independently_verified_listing_location": False,
        "geo_index_district": None,
        "geo_index_coordinates": None,
        "eligible_for_geo_index": False,
        "eligible_for_geo_publication": False,
        "eligible_for_private_staging": False,
        "reason": (
            "listing_header_conflicts_with_description"
            if conflict else "no_independent_property_specific_geographic_proof"
        ),
    }
