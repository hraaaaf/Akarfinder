"""J6 trusted-key attestation gate over an immutable source HTML snapshot.

A MAC proves possession of an out-of-band key, *not* the listing's factual
truth or the trustworthiness of its origin. No capture, database, promotion,
deployment or durable anti-replay ledger is provided by this module.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
from pathlib import Path
import re

from v7_multisource.snapshot_evidence import verify_evidence
from v7_parallel.j6_source_evidence import _listing_identity
from v7_parallel.j6_staging_readiness import review_with_verified_bytes

SCHEMA = "akar-v7-j6-signed-source-capture-v1"
DOMAIN = b"akar/v7/j6/capture-attestation/v1\n"
_FIELDS = frozenset({
    "schema_version", "key_id", "issuer", "source_domain",
    "source_offer_id", "source_url", "html_sha256", "manifest_sha256",
    "captured_at_utc", "issued_at_utc", "expires_at_utc", "mac_sha256",
})
_HEX = re.compile(r"[0-9a-f]{64}\Z")
_KEYID = re.compile(r"[a-zA-Z0-9._:-]{1,80}\Z")


class AttestationRejected(ValueError):
    """Fail closed without disclosing the trusted key or raw HTML."""


def _utc(value: str) -> datetime:
    if not isinstance(value, str) or not re.fullmatch(
        r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", value
    ):
        raise AttestationRejected("ATTESTATION_UTC_INVALID")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise AttestationRejected("ATTESTATION_UTC_INVALID") from exc


def _payload(attestation: dict) -> bytes:
    return DOMAIN + json.dumps(
        {key: attestation[key] for key in sorted(_FIELDS - {"mac_sha256"})},
        ensure_ascii=True, sort_keys=True, separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def review_authenticated_capture(
    record: dict, html_file: Path, manifest_file: Path, attestation: dict,
    *, trusted_key_hex: str, trusted_key_id: str,
    now_utc: datetime | None = None,
) -> dict:
    """Authenticate a separately provided capture attestation, then replay J6.

    The key must come from operator-controlled configuration, NEVER the
    attestation, the listing, an untrusted file or a GitHub repository.
    """
    if not isinstance(attestation, dict) or set(attestation) != _FIELDS:
        raise AttestationRejected("ATTESTATION_SCHEMA_INVALID")
    if attestation["schema_version"] != SCHEMA:
        raise AttestationRejected("ATTESTATION_SCHEMA_INVALID")
    if (not isinstance(trusted_key_hex, str)
        or not _HEX.fullmatch(trusted_key_hex.lower())):
        raise AttestationRejected("TRUSTED_KEY_REQUIRED")
    try:
        trusted_key = bytes.fromhex(trusted_key_hex)
    except ValueError as exc:
        raise AttestationRejected("TRUSTED_KEY_REQUIRED") from exc
    if len(trusted_key) != 32 or not isinstance(trusted_key_id, str):
        raise AttestationRejected("TRUSTED_KEY_REQUIRED")
    if (not isinstance(attestation["key_id"], str)
        or not _KEYID.fullmatch(attestation["key_id"])
        or not _KEYID.fullmatch(trusted_key_id)
        or attestation["key_id"] != trusted_key_id):
        raise AttestationRejected("TRUSTED_KEY_ID_MISMATCH")
    if (not isinstance(attestation["issuer"], str)
        or not 1 <= len(attestation["issuer"]) <= 120
        or any(ord(ch) < 32 for ch in attestation["issuer"])):
        raise AttestationRejected("ATTESTATION_ISSUER_INVALID")
    if (not isinstance(attestation["mac_sha256"], str)
        or not _HEX.fullmatch(attestation["mac_sha256"])):
        raise AttestationRejected("ATTESTATION_MAC_INVALID")

    issued = _utc(attestation["issued_at_utc"])
    expires = _utc(attestation["expires_at_utc"])
    captured = _utc(attestation["captured_at_utc"])
    now = now_utc if now_utc is not None else datetime.now(timezone.utc)
    if not isinstance(now, datetime) or now.tzinfo is None:
        raise AttestationRejected("ATTESTATION_CLOCK_INVALID")
    now = now.astimezone(timezone.utc)
    if (issued < captured or issued - captured > timedelta(days=7)
        or expires <= issued or expires - issued > timedelta(days=30)
        or now < issued or now >= expires):
        raise AttestationRejected("ATTESTATION_TIME_WINDOW_INVALID")

    # Authenticate BEFORE treating any source/ID/sha pin as trustworthy.
    expected_mac = hmac.new(trusted_key, _payload(attestation),
                            hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_mac, attestation["mac_sha256"]):
        raise AttestationRejected("ATTESTATION_MAC_MISMATCH")

    # Existing evidence verifier checks symlinks, HTTP200, manifest equality
    # and the exact HTML byte SHA256, independent of this MAC envelope.
    evidence = verify_evidence(Path(html_file), Path(manifest_file))
    manifest = evidence["manifest"]
    try:
        domain, offer, _ = _listing_identity(manifest["source_url"])
    except ValueError as exc:
        raise AttestationRejected("ATTESTED_SOURCE_NOT_SUPPORTED") from exc
    if any((
        attestation["source_domain"] != domain,
        attestation["source_offer_id"] != offer,
        attestation["source_url"] != manifest["source_url"],
        attestation["html_sha256"] != manifest["html_sha256"],
        attestation["captured_at_utc"] != manifest["captured_at_utc"],
        not isinstance(attestation["manifest_sha256"], str),
        not _HEX.fullmatch(attestation["manifest_sha256"]),
        attestation["manifest_sha256"] !=
            hashlib.sha256(Path(manifest_file).read_bytes()).hexdigest(),
    )):
        raise AttestationRejected("ATTESTATION_MANIFEST_BINDING_MISMATCH")

    # Still strictly fail-closed: an authenticated pin alone never proves
    # location, accuracy, rights, availability, freshness or duplicate status.
    result = review_with_verified_bytes(
        record, Path(html_file), Path(manifest_file),
        independently_pinned_html_sha256=attestation["html_sha256"])
    return {
        "status": "authenticated_capture_still_quarantined",
        "capture_attestation_mac_valid": True,
        "trusted_key_id": trusted_key_id,
        "attested_source_domain": domain,
        "attested_source_offer_id": offer,
        "source_proof": result["source_proof"],
        "readiness": result["readiness"],
        "issuer_independently_vetted_here": False,
        "source_truth_independently_verified": False,
        "durable_replay_ledger_verified": False,
        "eligible_for_private_staging": False,
        "public_admission_authorized": False,
        "source_http_requests": 0, "db_reads": 0, "db_writes": 0,
    }
