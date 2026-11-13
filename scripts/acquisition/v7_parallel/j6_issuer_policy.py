"""J6 operator-pinned issuer policy for already verified source-capture envelopes.

Read-only policy gate, not a trust-service or production admission flow.

Registry JSON is PUBLIC configuration and contains NO secret. Its SHA-256 must
come independently from an authorized operator; hashing an untrusted file
against its own supplied digest would be circular and is NOT authentication.
Signing keys must arrive from a different operator-controlled secret channel.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import re

from v7_parallel.j6_authenticated_capture import (
    AttestationRejected, _KEYID, _utc, review_authenticated_capture,
)

REGISTRY_SCHEMA = "akar-v7-j6-issuer-policy-v1"
MAX_REGISTRY_BYTES = 16384
MAX_ISSUERS = 32
ALLOWED_SOURCE_DOMAINS = frozenset({"agenz.ma", "mubawab.ma", "sarouty.ma"})
_REGISTRY_FIELDS = frozenset({"schema_version", "generation", "issuers"})
_ISSUER_FIELDS = frozenset({
    "key_id", "issuer", "source_domains", "status",
    "valid_from_utc", "valid_until_utc",
})
_HEX64 = re.compile(r"[0-9a-f]{64}\Z")


class IssuerPolicyRejected(ValueError):
    """Policy rejection: never reveal key material or candidate HTML."""


def _no_duplicate_json_keys(pairs: list[tuple[str, object]]) -> dict:
    out = {}
    for key, value in pairs:
        if key in out:
            raise IssuerPolicyRejected("ISSUER_REGISTRY_DUPLICATE_JSON_KEY")
        out[key] = value
    return out


def _parse_registry(raw: bytes, expected_sha256: str) -> dict:
    if (not isinstance(raw, bytes) or not 2 <= len(raw) <= MAX_REGISTRY_BYTES):
        raise IssuerPolicyRejected("ISSUER_REGISTRY_BYTES_BOUNDED_REQUIRED")
    if (not isinstance(expected_sha256, str)
            or not _HEX64.fullmatch(expected_sha256)):
        raise IssuerPolicyRejected("OPERATOR_PIN_REQUIRED")
    digest = hashlib.sha256(raw).hexdigest()
    if digest != expected_sha256:
        raise IssuerPolicyRejected("OPERATOR_PIN_MISMATCH")
    try:
        registry = json.loads(
            raw.decode("utf-8", errors="strict"),
            object_pairs_hook=_no_duplicate_json_keys,
            parse_constant=lambda _: (_ for _ in ()).throw(
                IssuerPolicyRejected("ISSUER_REGISTRY_INVALID_JSON_NUMBER")),
        )
    except (UnicodeError, ValueError, TypeError) as exc:
        raise IssuerPolicyRejected("ISSUER_REGISTRY_INVALID_JSON") from exc
    if (not isinstance(registry, dict)
            or set(registry) != _REGISTRY_FIELDS
            or registry["schema_version"] != REGISTRY_SCHEMA
            or type(registry["generation"]) is not int
            or not 1 <= registry["generation"] <= 1_000_000
            or not isinstance(registry["issuers"], list)
            or not 1 <= len(registry["issuers"]) <= MAX_ISSUERS):
        raise IssuerPolicyRejected("ISSUER_REGISTRY_SCHEMA_INVALID")
    keys = set()
    for item in registry["issuers"]:
        if not isinstance(item, dict) or set(item) != _ISSUER_FIELDS:
            raise IssuerPolicyRejected("ISSUER_ENTRY_SCHEMA_INVALID")
        kid = item["key_id"]
        issuer = item["issuer"]
        if (not isinstance(kid, str) or not _KEYID.fullmatch(kid)
                or kid in keys
                or not isinstance(issuer, str)
                or not 1 <= len(issuer) <= 120
                or any(ord(ch) < 32 for ch in issuer)):
            raise IssuerPolicyRejected("ISSUER_ENTRY_ID_INVALID")
        keys.add(kid)
        sources = item["source_domains"]
        if (not isinstance(sources, list)
                or not 1 <= len(sources) <= len(ALLOWED_SOURCE_DOMAINS)
                or any(not isinstance(source, str)
                       or source not in ALLOWED_SOURCE_DOMAINS
                       for source in sources)
                or len(set(sources)) != len(sources)):
            raise IssuerPolicyRejected("ISSUER_SOURCE_SCOPE_INVALID")
        if item["status"] not in ("active", "revoked"):
            raise IssuerPolicyRejected("ISSUER_STATUS_INVALID")
        try:
            first = _utc(item["valid_from_utc"])
            until = _utc(item["valid_until_utc"])
        except AttestationRejected as exc:
            raise IssuerPolicyRejected("ISSUER_VALIDITY_UTC_INVALID") from exc
        if first >= until:
            raise IssuerPolicyRejected("ISSUER_VALIDITY_RANGE_INVALID")
    return registry


def review_with_operator_issuer_policy(
    record: dict, html_file, manifest_file, attestation: dict,
    *, registry_json_bytes: bytes, operator_pinned_registry_sha256: str,
    operator_keyring_hex: dict[str, str], now_utc: datetime,
) -> dict:
    """Separate issuer policy + key from candidate; still refuse all staging.

    This function does not verify an operator's identity nor maintain an
    anti-replay/rollback ledger. The operator MUST authenticate the digest
    out of band and ensure registry generation monotonicity at deployment.
    """
    registry = _parse_registry(
        registry_json_bytes, operator_pinned_registry_sha256)
    if not isinstance(attestation, dict):
        raise IssuerPolicyRejected("ATTESTATION_REQUIRED")
    if not isinstance(now_utc, datetime) or now_utc.tzinfo is None:
        raise IssuerPolicyRejected("OPERATOR_CLOCK_REQUIRED")
    now = now_utc.astimezone(timezone.utc)
    key_id = attestation.get("key_id")
    if not isinstance(key_id, str):
        raise IssuerPolicyRejected("ISSUER_KEY_ID_REQUIRED")
    policy = next((item for item in registry["issuers"]
                   if item["key_id"] == key_id), None)
    if policy is None:
        raise IssuerPolicyRejected("ISSUER_KEY_NOT_TRUSTED_BY_OPERATOR")
    if policy["status"] != "active":
        raise IssuerPolicyRejected("ISSUER_KEY_REVOKED")
    if attestation.get("issuer") != policy["issuer"]:
        raise IssuerPolicyRejected("ISSUER_NAME_NOT_ALLOWED_FOR_KEY")
    if attestation.get("source_domain") not in policy["source_domains"]:
        raise IssuerPolicyRejected("ISSUER_SOURCE_SCOPE_MISMATCH")
    try:
        issue_time = _utc(attestation.get("issued_at_utc"))
        expiry_time = _utc(attestation.get("expires_at_utc"))
    except AttestationRejected as exc:
        raise IssuerPolicyRejected("ISSUER_ATTESTATION_WINDOW_INVALID") from exc
    first = _utc(policy["valid_from_utc"])
    last = _utc(policy["valid_until_utc"])
    if (not first <= now < last
            or not first <= issue_time < last
            or not first < expiry_time <= last):
        raise IssuerPolicyRejected("ISSUER_KEY_OUTSIDE_VALIDITY")
    if not isinstance(operator_keyring_hex, dict):
        raise IssuerPolicyRejected("OPERATOR_KEYRING_REQUIRED")
    # Never select a key by an arbitrary attestation issuer string.
    secret = operator_keyring_hex.get(key_id)
    if not isinstance(secret, str):
        raise IssuerPolicyRejected("OPERATOR_SIGNING_KEY_UNAVAILABLE")
    result = review_authenticated_capture(
        record, html_file, manifest_file, attestation,
        trusted_key_hex=secret, trusted_key_id=key_id, now_utc=now)
    return {
        **result,
        "operator_registry_sha256_verified": True,
        "operator_registry_generation": registry["generation"],
        "issuer_key_scope_and_window_matched": True,
        "issuer_credential_status": "active_at_review_time",
        # A pinned registry proves conformance to OPERATOR POLICY, not
        # independent legal identity, property truth, or a trustworthy source.
        "issuer_independently_vetted_here": False,
        "registry_generation_rollback_prevented_here": False,
        "durable_replay_ledger_verified": False,
        "eligible_for_private_staging": False,
        "public_admission_authorized": False,
        "source_http_requests": 0,
        "db_reads": 0,
        "db_writes": 0,
    }
