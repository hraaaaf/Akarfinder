"""J3: immutable Agenz detail source consistency, offline and fail-closed.

A listing's own headline and characteristics can disagree. Matching labels,
including encrypted map attributes, are never independent physical-location
attestations; this audit does NOT grant staging, mapping or publication.
"""
from __future__ import annotations
import base64
import re
from bs4 import BeautifulSoup

MAX_HTML_BYTES = 4 * 1024 * 1024
_ROOM_IN_TITLE = re.compile(r"\b(\d{1,2})\s+chambres?\b", re.IGNORECASE)
_SIMPLE_ROOMS = re.compile(r"\b(\d{1,2})\s+chambres?\s+simples?\b", re.IGNORECASE)
_SUITES = re.compile(r"\b(\d{1,2})\s+suites?\s+parentales?\b", re.IGNORECASE)


def _map_attribute_kind(soup):
    nodes = soup.find_all(attrs={"data-lat": True, "data-lng": True})
    if not nodes:
        return "no_source_map_attributes"
    if len(nodes) != 1:
        return "multiple_map_attribute_sets_unverified"
    values = [nodes[0].get(x, "") for x in ("data-lat", "data-lng")]
    try:
        if all(isinstance(x, str) and 16 <= len(x) <= 512
               and base64.b64decode(x, validate=True).startswith(b"Salted__")
               for x in values):
            return "source_encrypted_coordinates_not_independent_proof"
    except (ValueError, base64.binascii.Error):
        pass
    return "source_map_attributes_unverified"


def audit_source_internal_consistency(raw_html: bytes):
    if not isinstance(raw_html, bytes) or not (1 <= len(raw_html) <= MAX_HTML_BYTES):
        raise ValueError("INVALID_BOUNDED_HTML_BYTES")
    try:
        source_text = raw_html.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("SOURCE_HTML_NOT_UTF8") from exc
    soup = BeautifulSoup(source_text, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    match = _ROOM_IN_TITLE.search(title[:500])
    title_rooms = int(match.group(1)) if match else None
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text(" ", strip=True)
    section = text.split("Caractéristiques", 1)[1][:1800] if "Caractéristiques" in text else ""
    simple = _SIMPLE_ROOMS.search(section)
    suites = _SUITES.search(section)
    source_rooms = sum(int(m.group(1)) for m in (simple, suites) if m) if simple or suites else None
    mismatch = title_rooms is not None and source_rooms is not None and title_rooms != source_rooms
    return {
        "status": ("source_bedroom_count_disagreement" if mismatch else
                   "source_room_count_unassessed" if title_rooms is None or source_rooms is None
                   else "source_room_counts_agree_unverified"),
        "title_bedrooms": title_rooms,
        "characteristics_bedrooms": source_rooms,
        "source_bedroom_count_disagreement": bool(mismatch),
        "source_map_attribute_kind": _map_attribute_kind(soup),
        "independent_physical_location_attestation": False,
        "eligible_for_geo_index": False,
        "eligible_for_private_staging": False,
        "eligible_for_public_admission": False,
        "source_network_requests": 0,
        "db_writes": 0,
    }


def audit_verified_snapshot(folder):
    """Only audit original bytes if the existing SHA+manifest gate passes."""
    from pathlib import Path
    from v7_multisource.snapshot_evidence import verify_evidence
    root = Path(folder)
    source = verify_evidence(root / "source.html", root / "source.manifest.json")
    return {"source_url": source["manifest"]["source_url"],
            "original_sha256": source["manifest"]["html_sha256"],
            **audit_source_internal_consistency(source["raw_html"].encode("utf-8"))}
