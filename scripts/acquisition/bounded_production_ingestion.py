#!/usr/bin/env python3
"""Bounded staging ingestion into discovery_candidates.

Planning is network-free. Live writes are fail-closed and require explicit enablement,
Supabase service credentials, and a non-empty host allowlist.
"""
from __future__ import annotations

import hashlib
import json
import os
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

DEFAULT_BATCH_LIMIT = 25
MAX_BATCH_LIMIT = 100
IDENTITY_FIELDS = ("provider", "query_hash", "canonical_url")


def _truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def query_hash(provider: str, query: str) -> str:
    return hashlib.sha256(f"{provider.strip().lower()}\n{query.strip()}".encode()).hexdigest()


def identity(row: dict[str, Any]) -> dict[str, str]:
    return {k: str(row[k]) for k in IDENTITY_FIELDS}


def canonical_candidate(raw: dict[str, Any]) -> dict[str, Any]:
    provider = str(raw.get("provider") or "").strip()
    query = str(raw.get("discovery_query") or "").strip()
    source_url = str(raw.get("source_url") or "").strip()
    canonical_url = str(raw.get("canonical_url") or source_url).strip()
    if not provider or not source_url or not canonical_url:
        raise ValueError("provider, source_url and canonical_url are required")
    parsed = urlparse(canonical_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("canonical_url must be http(s)")
    return {
        "provider": provider,
        "discovery_query": query or None,
        "query_hash": str(raw.get("query_hash") or query_hash(provider, query)),
        "result_rank": raw.get("result_rank"),
        "source_domain": parsed.hostname.lower(),
        "source_url": source_url,
        "canonical_url": canonical_url,
        "title": raw.get("title"),
        "snippet": raw.get("snippet"),
        "discovery_status": "discovered",
        "compliance_status": raw.get("compliance_status"),
        "content_fingerprint": raw.get("content_fingerprint"),
        "metadata": raw.get("metadata") or {},
    }


def allowed_hosts(env: dict[str, str]) -> set[str]:
    raw = env.get("THIRD_PARTY_DB_INGESTION_ALLOWED_HOSTS", "")
    return {x.strip().lower() for x in raw.split(",") if x.strip()}


def plan_batch(candidates: list[dict[str, Any]], *, limit: int = DEFAULT_BATCH_LIMIT,
               env: dict[str, str] | None = None) -> dict[str, Any]:
    env = env or dict(os.environ)
    if limit < 1 or limit > MAX_BATCH_LIMIT:
        raise ValueError(f"limit must be between 1 and {MAX_BATCH_LIMIT}")
    normalized = [canonical_candidate(item) for item in candidates[:limit]]
    hosts = allowed_hosts(env)
    rejected, accepted = [], []
    seen: set[tuple[str, str, str]] = set()
    for row in normalized:
        if hosts and row["source_domain"] not in hosts:
            rejected.append({"canonical_url": row["canonical_url"], "reason": "host_not_allowed"})
            continue
        key = tuple(str(row[k]) for k in IDENTITY_FIELDS)
        if key in seen:
            continue
        seen.add(key)
        accepted.append(row)
    return {
        "table": "discovery_candidates", "inputCount": len(candidates),
        "boundedCount": len(normalized), "acceptedCount": len(accepted),
        "rejectedCount": len(rejected), "rows": accepted, "rejected": rejected,
        "idempotencyKey": list(IDENTITY_FIELDS), "zeroDbWrites": True,
    }


def assert_live_write_guard(env: dict[str, str] | None = None) -> None:
    env = env or dict(os.environ)
    if not _truthy(env.get("THIRD_PARTY_DB_INGESTION_ENABLED")):
        raise PermissionError("THIRD_PARTY_DB_INGESTION_ENABLED is not true")
    if env.get("DATABASE_PROVIDER", "sqlite").strip().lower() != "supabase":
        raise PermissionError("DATABASE_PROVIDER must be supabase for live ingestion")
    if not env.get("SUPABASE_URL") or not env.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise PermissionError("Supabase service credentials are required")
    if not allowed_hosts(env):
        raise PermissionError("THIRD_PARTY_DB_INGESTION_ALLOWED_HOSTS must be non-empty for live ingestion")


def _headers(env: dict[str, str]) -> dict[str, str]:
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    return {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}


def snapshot_existing(plan: dict[str, Any], *, env: dict[str, str] | None = None) -> list[dict[str, str]]:
    """Read exact idempotency identities already present before/after a live canary."""
    env = env or dict(os.environ)
    assert_live_write_guard(env)
    found: list[dict[str, str]] = []
    base = env["SUPABASE_URL"].rstrip("/") + "/rest/v1/discovery_candidates"
    for row in plan.get("rows") or []:
        ident = identity(row)
        params = {
            "select": ",".join(IDENTITY_FIELDS),
            "provider": "eq." + ident["provider"],
            "query_hash": "eq." + ident["query_hash"],
            "canonical_url": "eq." + ident["canonical_url"],
            "limit": "1",
        }
        req = Request(base + "?" + urlencode(params), headers=_headers(env), method="GET")
        with urlopen(req, timeout=20) as response:
            rows = json.loads(response.read().decode("utf-8"))
        if rows:
            found.append(ident)
    return found


def apply_plan(plan: dict[str, Any], *, env: dict[str, str] | None = None) -> dict[str, Any]:
    """Insert a bounded staging batch and report exact inserted/duplicate identities."""
    env = env or dict(os.environ)
    assert_live_write_guard(env)
    rows = plan.get("rows") or []
    if len(rows) > MAX_BATCH_LIMIT:
        raise ValueError("plan exceeds hard batch limit")
    hosts = allowed_hosts(env)
    for row in rows:
        if row.get("source_domain") not in hosts:
            raise PermissionError(f"live plan contains non-allowlisted host: {row.get('source_domain')}")
    if not rows:
        return {**plan, "zeroDbWrites": True, "insertedCount": 0, "duplicateCount": 0,
                "insertedIdentities": [], "duplicateIdentities": []}
    url = env["SUPABASE_URL"].rstrip("/") + "/rest/v1/discovery_candidates"
    headers = {**_headers(env), "Prefer": "return=minimal"}
    inserted_ids: list[dict[str, str]] = []
    duplicate_ids: list[dict[str, str]] = []
    for row in rows:
        req = Request(url, data=json.dumps(row, ensure_ascii=False).encode("utf-8"), method="POST", headers=headers)
        try:
            with urlopen(req, timeout=20):
                inserted_ids.append(identity(row))
        except HTTPError as exc:
            if exc.code == 409:
                duplicate_ids.append(identity(row))
                continue
            raise
    return {
        **plan,
        "zeroDbWrites": len(inserted_ids) == 0,
        "insertedCount": len(inserted_ids),
        "duplicateCount": len(duplicate_ids),
        "insertedIdentities": inserted_ids,
        "duplicateIdentities": duplicate_ids,
    }


def rollback_manifest(result: dict[str, Any]) -> dict[str, Any]:
    identities = result.get("insertedIdentities")
    if identities is None:
        identities = [identity(row) for row in result.get("rows", [])]
        note = "Dry-run plan only: identities are planned, not safe for deletion."
    else:
        note = "Live result: only newly inserted identities are rollback candidates. Verify before deleting."
    return {"table": "discovery_candidates", "identities": identities, "note": note}
