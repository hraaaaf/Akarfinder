"""V7 registry and two *offline* portal connectors.

These adapters DO NOT fetch sites or prove a publication date, rights or
availability. Only V646 can import HMAC-verified Mubawab snapshots; Agenz
consumes supplied individual-page observations, not search-result pages.
"""
from __future__ import annotations

import re
from typing import Any, Mapping
from urllib.parse import urlsplit
from akarparser_v3_v646_bridge import bridge_v646_row

# Inventory != supported collection. Unimplemented sites remain disabled.
# Priorities indicate onboarding/review order, NOT current collection coverage.
# FeenWay is an aggregator: always retain upstream original URL + portal ID
# independently, or flag for review; never treat mirrored pages as new inventory.
SOURCE_PRIORITY: tuple[str, ...] = (
    "feenway.com", "agenz.ma", "avito.ma", "yakeey.com", "sarouty.ma",
    "mubawab.ma", "marocannonces.com", "masaken.ma",
    "immoneuf.avito.ma", "immo.mitula.ma", "maportail-immobilier.ma",
)
PORTALS: dict[str, dict[str, str]] = {
    "feenway.com": {"adapter": "", "status": "not_integrated"},
    "agenz.ma": {"adapter": "individual_observation", "status": "offline_tested"},
    "avito.ma": {"adapter": "", "status": "not_integrated"},
    "yakeey.com": {"adapter": "", "status": "not_integrated"},
    "sarouty.ma": {"adapter": "", "status": "not_integrated"},
    "mubawab.ma": {"adapter": "v646_authenticated_snapshot", "status": "offline_tested"},
    "marocannonces.com": {"adapter": "", "status": "not_integrated"},
    "masaken.ma": {"adapter": "", "status": "not_integrated"},
    "immoneuf.avito.ma": {"adapter": "", "status": "not_integrated"},
    "immo.mitula.ma": {"adapter": "", "status": "not_integrated"},
    "maportail-immobilier.ma": {"adapter": "", "status": "not_integrated"},
}
assert tuple(PORTALS) == SOURCE_PRIORITY
SOURCE_IDS = {
    "mubawab.ma": re.compile(r"/fr/a/([0-9]{5,})(?:/[a-z0-9-]+)?/?\Z"),
    "agenz.ma": re.compile(
        r"/fr/annonces/immo-[a-z0-9-]+/vente-appartements/[a-z0-9-]+/([0-9]{5,12})/?\Z"
    ),
}
MAX_TEXT = {"title": 300, "city": 120, "district": 120, "description": 3000}


class SourceNotSupported(ValueError):
    pass


def canonical_identity(url: str) -> tuple[str, str, str]:
    """Return (portal, offer_id, canonical https URL), no DNS/network calls."""
    if not isinstance(url, str) or not (18 <= len(url) <= 2048):
        raise SourceNotSupported("URL_INVALID")
    try:
        p = urlsplit(url)
        host = p.hostname or ""
        port = p.port
    except ValueError as exc:
        raise SourceNotSupported("URL_INVALID") from exc
    if (p.scheme != "https" or p.username or p.password or port is not None
            or p.netloc not in ("mubawab.ma", "www.mubawab.ma", "agenz.ma", "www.agenz.ma")
            or p.query or p.fragment or p.path.startswith("//")
            or "%" in p.path or "\\" in p.path or "//" in p.path
            or p.path != p.path.lower()):
        raise SourceNotSupported("URL_UNSAFE")
    # Whitelisted canonical host aliases only: no "evil-agenz.ma" or subdomains.
    if host in ("mubawab.ma", "www.mubawab.ma"):
        portal = "mubawab.ma"
    elif host in ("agenz.ma", "www.agenz.ma"):
        portal = "agenz.ma"
    else:
        raise SourceNotSupported("SOURCE_NOT_INTEGRATED")
    match = SOURCE_IDS[portal].fullmatch(p.path)
    if portal == "agenz.ma" and not match:
        match = re.fullmatch(
            r"/(?:fr/)?annonces-achat/appartement/[a-z0-9-]+/[a-z0-9-]+/[a-z0-9-]+/appartement-a-vendre-(\d{5,12})/?",
            p.path,
        )
    if not match:
        raise SourceNotSupported("INDIVIDUAL_URL_REQUIRED")
    canonical_url = f"https://{portal}{p.path.rstrip('/')}"
    return portal, match.group(1), canonical_url


def _field(row: Mapping[str, Any], key: str) -> str | None:
    val = row.get(key)
    if val is None:
        return None
    if not isinstance(val, str) or len(val) > MAX_TEXT[key]:
        raise SourceNotSupported(f"INVALID_{key.upper()}")
    return val.strip() or None


def bridge_agenz_record(raw: Mapping[str, Any]) -> dict[str, Any]:
    """Adapt manually/externally observed individual-page data; NOT a live scraper.

    The evidence URL is asserted by the input provider. Offline tests cannot
    certify the contents against a current site page or source permissions.
    """
    if not isinstance(raw, Mapping):
        raise SourceNotSupported("NOT_MAPPING")
    portal, offer_id, url = canonical_identity(raw.get("source_url"))
    if portal != "agenz.ma":
        raise SourceNotSupported("WRONG_PORTAL")
    if (raw.get("observation_kind") != "individual_page"
            or raw.get("evidence_url") != raw.get("source_url")):
        raise SourceNotSupported("INDIVIDUAL_EVIDENCE_REQUIRED")
    if str(raw.get("source_offer_id") or "") != offer_id:
        raise SourceNotSupported("SOURCE_ID_MISMATCH")
    if raw.get("transaction_type") != "sale" or raw.get("property_type") != "apartment":
        raise SourceNotSupported("CATEGORY_NOT_PROVEN")
    # Numeric/structured types and ranges are validated by V3 and Radar10.
    for name in ("price_mad", "surface_m2"):
        val = raw.get(name)
        if val is not None and (isinstance(val, bool) or not isinstance(val, (int, float))):
            raise SourceNotSupported(f"INVALID_{name.upper()}")
    if any(k in raw for k in ("published_at", "datePublished", "first_seen", "last_seen")):
        raise SourceNotSupported("UNVERIFIED_TIME_CLAIM")
    return {
        "source_url": url,
        "source_name": "agenz.ma",
        "source_offer_id": offer_id,
        "title": _field(raw, "title"), "city": _field(raw, "city"),
        "district": _field(raw, "district"),
        "description": _field(raw, "description"),
        "price_mad": raw.get("price_mad"),
        "surface_m2": raw.get("surface_m2"),
        "property_type": "apartment",
        "transaction_type": "sale",
        # Do not set observed_at/published_at; the user-facing schedule is NOT
        # evidence of the listing's editorial publication date.
    }


def bridge_multisource(portal: str, raw: Mapping[str, Any]) -> dict[str, Any]:
    if portal == "mubawab.ma":
        adapted = bridge_v646_row(raw)
        canonical_portal, offer_id, canonical_url = canonical_identity(adapted["source_url"])
        if canonical_portal != portal or offer_id != adapted["source_offer_id"]:
            raise SourceNotSupported("V646_IDENTITY_MISMATCH")
        adapted["source_url"] = canonical_url
        return adapted
    if portal == "agenz.ma":
        return bridge_agenz_record(raw)
    raise SourceNotSupported("CONNECTOR_NOT_IMPLEMENTED")
