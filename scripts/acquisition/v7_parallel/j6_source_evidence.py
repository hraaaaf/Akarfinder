"""Fail-closed J6: source HTML bytes are NOT V3 input-envelope bytes."""
from __future__ import annotations
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v3_raw_bulk import parse_raw
from v7_multisource.snapshot_evidence import verify_evidence, _utc
from v7_multisource.sources import canonical_identity, SourceNotSupported

FIELDS = ("title", "price_mad", "surface_total_m2", "city", "district",
          "property_type", "transaction_type")


class ProvenanceRejected(ValueError):
    pass


def review_original_bytes(record: dict, html_file: Path, manifest_file: Path,
                          *, independently_pinned_html_sha256: str) -> dict:
    """Byte verification + exact V3 replay; NEVER authorizes staging.

    The caller must obtain the pin from a separately reviewed capture
    registry; the registry is NOT authenticated by this function.
    """
    pin = independently_pinned_html_sha256
    if not isinstance(pin, str) or not re.fullmatch(r"[0-9a-f]{64}", pin):
        raise ProvenanceRejected("SEPARATE_HTML_SHA256_PIN_REQUIRED")
    evidence = verify_evidence(html_file, manifest_file)
    manifest = evidence["manifest"]
    if manifest["html_sha256"] != pin:
        raise ProvenanceRejected("HTML_PIN_MISMATCH")
    try:
        domain, offer, _ = canonical_identity(manifest["source_url"])
    except SourceNotSupported as exc:
        raise ProvenanceRejected("ORIGINAL_DETAIL_URL_UNSUPPORTED") from exc
    if not isinstance(record, dict):
        raise ProvenanceRejected("V3_RECORD_REQUIRED")
    source = record.get("source")
    if (not isinstance(source, dict) or
        source.get("source_url") != manifest["source_url"] or
        str(source.get("source_offer_id") or "") != offer):
        raise ProvenanceRejected("SOURCE_IDENTITY_MISMATCH")
    raw = {"source_url": manifest["source_url"], "raw_html": evidence["raw_html"]}
    replay = parse_raw(raw, _utc(manifest["captured_at_utc"]))
    # V3.raw_sha256 hashes the JSON input envelope, not the HTML file.
    if record.get("raw_sha256") != replay["raw_sha256"]:
        raise ProvenanceRejected("V3_INPUT_ENVELOPE_MISMATCH")
    original_fields = record.get("fields")
    if not isinstance(original_fields, dict):
        raise ProvenanceRejected("V3_FIELDS_REQUIRED")
    if any(original_fields.get(k) != replay["fields"].get(k) for k in FIELDS):
        raise ProvenanceRejected("V3_REPLAY_FIELDS_DIFFER")
    return {
        "status": "source_bytes_verified_not_independent_truth",
        "source_domain": domain,
        "source_offer_id": offer,
        "html_sha256": manifest["html_sha256"],
        "v3_fields_replayed": len(FIELDS),
        "v3_fields_non_null": sum(replay["fields"].get(k) is not None for k in FIELDS),
        "source_http_requests": 0, "db_reads": 0, "db_writes": 0,
        "capture_registry_authenticated_here": False,
        "independent_human_annotations_verified": False,
        "geolocation_verified": False,
        "availability_verified": False,
        "eligible_for_private_staging": False,
        "public_admission_authorized": False,
    }
