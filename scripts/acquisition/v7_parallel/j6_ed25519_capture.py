"""J6 HIGH security proposal: issuer-authentic Ed25519 source capture verification.

ONLY offline review; does not produce a staging or public-admission capability.
No private keys are loaded, generated or used by this production module.

Protocol encoding: DOMAIN || each UTF-8 field in SIGNED_FIELDS order,
length-prefixed by its four-byte unsigned big-endian byte length. Versioned
binary framing avoids JSON-number/unicode-serialization ambiguity. No claim of
RFC8785/JCS compliance is made. This protocol needs its own issuer SDK review
before any real external issuer can sign.

The registry is public but its EXACT RAW BYTE SHA256 pin MUST be obtained from
an independently authenticated operator channel, never the candidate record.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
from pathlib import Path
import re

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

REGISTRY_SCHEMA = "akar-v7-j6-ed25519-registry-v1"
CAPTURE_SCHEMA = "akar-v7-j6-ed25519-capture-v1"
DOMAIN = b"AKARFINDER\x00V7\x00J6\x00ED25519\x00CAPTURE\x00V1\x00"
SIGNED_FIELDS = (
    "schema_version", "algorithm", "key_id", "issuer", "source_domain",
    "source_offer_id", "source_url", "html_sha256", "manifest_sha256",
    "captured_at_utc", "issued_at_utc", "expires_at_utc",
)
CAPTURE_KEYS = frozenset((*SIGNED_FIELDS, "signature_hex"))
REGISTRY_KEYS = frozenset(("schema_version", "generation", "issuers"))
ENTRY_KEYS = frozenset((
    "key_id", "issuer", "public_key_hex", "source_domains", "status",
    "valid_from_utc", "valid_until_utc", "algorithm",
))
ALLOWED_SOURCES = frozenset(("agenz.ma", "mubawab.ma", "sarouty.ma"))
KEY_ID_RE = re.compile(r"[A-Za-z0-9._:-]{1,80}\Z")
HEX64 = re.compile(r"[0-9a-f]{64}\Z")
HEX128 = re.compile(r"[0-9a-f]{128}\Z")
ID_RE = re.compile(r"[0-9]{4,12}\Z")
UTC_RE = re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ\Z")
MAX_REGISTRY_BYTES = 16_384
MAX_ISSUERS = 32


class Ed25519CaptureRejected(ValueError):
    """Fail closed without disclosing source documents or keys."""


def _utc(value: str) -> datetime:
    if not isinstance(value, str) or not UTC_RE.fullmatch(value):
        raise Ed25519CaptureRejected("TIME_FORMAT_INVALID")
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise Ed25519CaptureRejected("TIME_FORMAT_INVALID") from exc
    if dt.utcoffset() != timedelta(0):
        raise Ed25519CaptureRejected("TIME_ZONE_INVALID")
    return dt


def _unique_keys(pairs: list[tuple[str, object]]) -> dict:
    obj = {}
    for key, val in pairs:
        if key in obj:
            raise Ed25519CaptureRejected("DUPLICATE_REGISTRY_JSON_KEY")
        obj[key] = val
    return obj


def _registry(raw: bytes, operator_pin_sha256: str) -> dict:
    if type(raw) is not bytes or not 2 <= len(raw) <= MAX_REGISTRY_BYTES:
        raise Ed25519CaptureRejected("REGISTRY_BYTES_INVALID")
    if not isinstance(operator_pin_sha256, str) or not HEX64.fullmatch(operator_pin_sha256):
        raise Ed25519CaptureRejected("INDEPENDENT_REGISTRY_PIN_REQUIRED")
    if not hmac.compare_digest(hashlib.sha256(raw).hexdigest(), operator_pin_sha256):
        raise Ed25519CaptureRejected("INDEPENDENT_REGISTRY_PIN_MISMATCH")
    try:
        doc = json.loads(raw.decode("utf-8", errors="strict"),
                         object_pairs_hook=_unique_keys,
                         parse_constant=lambda _: (_ for _ in ()).throw(
                             Ed25519CaptureRejected("REGISTRY_JSON_NONFINITE")))
    except Ed25519CaptureRejected:
        raise
    except (UnicodeError, ValueError, TypeError) as exc:
        raise Ed25519CaptureRejected("REGISTRY_JSON_INVALID") from exc
    if (type(doc) is not dict or set(doc) != REGISTRY_KEYS
            or doc["schema_version"] != REGISTRY_SCHEMA
            or type(doc["generation"]) is not int
            or not 1 <= doc["generation"] <= 1_000_000
            or type(doc["issuers"]) is not list
            or not 1 <= len(doc["issuers"]) <= MAX_ISSUERS):
        raise Ed25519CaptureRejected("REGISTRY_SCHEMA_INVALID")
    seen_ids, seen_keys = set(), set()
    for entry in doc["issuers"]:
        if type(entry) is not dict or set(entry) != ENTRY_KEYS:
            raise Ed25519CaptureRejected("REGISTRY_ENTRY_SCHEMA_INVALID")
        kid, name, public = (entry[k] for k in ("key_id", "issuer", "public_key_hex"))
        if (not isinstance(kid, str) or not KEY_ID_RE.fullmatch(kid)
                or kid in seen_ids or not isinstance(name, str)
                or not 1 <= len(name) <= 120 or any(ord(c) < 32 for c in name)
                or entry["algorithm"] != "Ed25519"):
            raise Ed25519CaptureRejected("REGISTRY_ENTRY_IDENTITY_INVALID")
        if (not isinstance(public, str) or not HEX64.fullmatch(public)
                or public in seen_keys):
            raise Ed25519CaptureRejected("REGISTRY_PUBLIC_KEY_INVALID_OR_REUSED")
        seen_ids.add(kid)
        seen_keys.add(public)
        scopes = entry["source_domains"]
        if (type(scopes) is not list or not 1 <= len(scopes) <= len(ALLOWED_SOURCES)
                or any(type(s) is not str or s not in ALLOWED_SOURCES for s in scopes)
                or len(scopes) != len(set(scopes))):
            raise Ed25519CaptureRejected("REGISTRY_SCOPE_INVALID")
        if type(entry["status"]) is not str or entry["status"] not in ("active", "revoked"):
            raise Ed25519CaptureRejected("REGISTRY_STATUS_INVALID")
        first, end = _utc(entry["valid_from_utc"]), _utc(entry["valid_until_utc"])
        if not first < end or end - first > timedelta(days=90):
            raise Ed25519CaptureRejected("REGISTRY_KEY_WINDOW_INVALID")
    return doc


def _capture_fields(att: dict) -> None:
    if type(att) is not dict or set(att) != CAPTURE_KEYS:
        raise Ed25519CaptureRejected("CAPTURE_SCHEMA_INVALID")
    if (att["schema_version"] != CAPTURE_SCHEMA
            or att["algorithm"] != "Ed25519"):
        raise Ed25519CaptureRejected("ALGORITHM_OR_VERSION_DOWNGRADE")
    if any(type(att[k]) is not str or len(att[k]) > 2048 for k in CAPTURE_KEYS):
        raise Ed25519CaptureRejected("CAPTURE_FIELD_INVALID")
    if (not KEY_ID_RE.fullmatch(att["key_id"])
            or not 1 <= len(att["issuer"]) <= 120
            or any(ord(c) < 32 for c in att["issuer"])
            or att["source_domain"] not in ALLOWED_SOURCES
            or not ID_RE.fullmatch(att["source_offer_id"])
            or not HEX64.fullmatch(att["html_sha256"])
            or not HEX64.fullmatch(att["manifest_sha256"])
            or not HEX128.fullmatch(att["signature_hex"])):
        raise Ed25519CaptureRejected("CAPTURE_IDENTITY_OR_HASH_INVALID")
    for field in ("captured_at_utc", "issued_at_utc", "expires_at_utc"):
        _utc(att[field])


def _signed_payload(att: dict) -> bytes:
    """Versioned TLV over exactly 12 named, ordered, UTF-8 string fields."""
    buf = bytearray(DOMAIN)
    for field in SIGNED_FIELDS:
        try:
            value = att[field].encode("utf-8", errors="strict")
        except (UnicodeError, KeyError, AttributeError, TypeError) as exc:
            raise Ed25519CaptureRejected("CAPTURE_UTF8_INVALID") from exc
        if len(value) > 8192:
            raise Ed25519CaptureRejected("CAPTURE_SIGNED_FIELD_TOO_LARGE")
        buf.extend(len(value).to_bytes(4, "big"))
        buf.extend(value)
    return bytes(buf)


def review_ed25519_capture(record: dict, html_file: Path, manifest_file: Path,
                           attestation: dict, *, registry_json_bytes: bytes,
                           operator_pinned_registry_sha256: str,
                           now_utc: datetime) -> dict:
    """Verify pinned issuer policy, Ed25519 signature, actual source bytes/V3.

    No signing keys, SQL, network, staging, publication, or replay ledger.
    """
    doc = _registry(registry_json_bytes, operator_pinned_registry_sha256)
    _capture_fields(attestation)
    if type(now_utc) is not datetime or now_utc.tzinfo is None:
        raise Ed25519CaptureRejected("TRUSTED_REVIEW_CLOCK_REQUIRED")
    now = now_utc.astimezone(timezone.utc)
    entry = next((e for e in doc["issuers"] if e["key_id"] == attestation["key_id"]), None)
    if entry is None or entry["status"] != "active":
        raise Ed25519CaptureRejected("KEY_UNKNOWN_OR_REVOKED")
    if (attestation["issuer"] != entry["issuer"]
            or attestation["source_domain"] not in entry["source_domains"]):
        raise Ed25519CaptureRejected("ISSUER_OR_PORTAL_SCOPE_INVALID")
    captured, issued, expires = (_utc(attestation[field]) for field in
        ("captured_at_utc", "issued_at_utc", "expires_at_utc"))
    start, end = _utc(entry["valid_from_utc"]), _utc(entry["valid_until_utc"])
    if (not start <= now < end
            or not start <= captured <= issued < end
            or issued - captured > timedelta(days=7)
            or not issued <= now < expires <= end
            or expires - issued > timedelta(days=30)):
        raise Ed25519CaptureRejected("ATTESTATION_OR_ISSUER_TIME_INVALID")
    try:
        public_key = Ed25519PublicKey.from_public_bytes(bytes.fromhex(entry["public_key_hex"]))
        public_key.verify(bytes.fromhex(attestation["signature_hex"]), _signed_payload(attestation))
    except (InvalidSignature, ValueError) as exc:
        raise Ed25519CaptureRejected("ED25519_SIGNATURE_INVALID") from exc

    # Import the ACTUAL J6 validators only AFTER authentication of signer.
    from v7_multisource.snapshot_evidence import verify_evidence
    from v7_parallel.j6_source_evidence import _listing_identity
    from v7_parallel.j6_staging_readiness import review_with_verified_bytes

    html_file, manifest_file = Path(html_file), Path(manifest_file)
    original = verify_evidence(html_file, manifest_file)
    manifest = original["manifest"]
    dom, offer, _ = _listing_identity(manifest["source_url"])
    if (dom != attestation["source_domain"]
            or offer != attestation["source_offer_id"]
            or manifest["source_url"] != attestation["source_url"]
            or manifest["html_sha256"] != attestation["html_sha256"]
            or manifest["captured_at_utc"] != attestation["captured_at_utc"]
            or not hmac.compare_digest(
                hashlib.sha256(manifest_file.read_bytes()).hexdigest(),
                attestation["manifest_sha256"])):
        raise Ed25519CaptureRejected("SIGNED_CAPTURE_MANIFEST_MISMATCH")
    replay = review_with_verified_bytes(
        record, html_file, manifest_file,
        independently_pinned_html_sha256=attestation["html_sha256"])
    return {
        "status": "asymmetric_capture_verified_still_quarantined",
        "protocol": CAPTURE_SCHEMA,
        "signature_algorithm": "Ed25519",
        "signature_valid": True,
        "operator_public_registry_pin_checked": True,
        "registry_generation": doc["generation"],
        "attested_source_domain": dom,
        "attested_source_offer_id": offer,
        "source_proof": replay["source_proof"],
        "readiness": replay["readiness"],
        "issuer_legal_identity_verified_here": False,
        "registry_generation_rollback_protected_here": False,
        "durable_replay_ledger_verified": False,
        "geolocation_independently_verified": False,
        "source_truth_verified": False,
        "eligible_for_private_staging": False,
        "public_admission_authorized": False,
        "no_legacy_hmac_ledger_receipt": True,
        "source_http_requests": 0, "db_reads": 0, "db_writes": 0,
    }