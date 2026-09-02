#!/usr/bin/env python3
"""L7 bounded production ingestion into discovery_candidates.

Fail-closed by design. Planning/dry-run never touches the network. Live writes require
THIRD_PARTY_DB_INGESTION_ENABLED=true plus an explicit caller action.
"""
from __future__ import annotations

import hashlib
import json
import os
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

DEFAULT_BATCH_LIMIT = 25
MAX_BATCH_LIMIT = 100


def _truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def query_hash(provider: str, query: str) -> str:
    return hashlib.sha256(f"{provider.strip().lower()}\n{query.strip()}".encode()).hexdigest()


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
        key = (row["provider"], row["query_hash"], row["canonical_url"])
        if key in seen:
            continue
        seen.add(key)
        accepted.append(row)
    return {
        "table": "discovery_candidates", "inputCount": len(candidates),
        "boundedCount": len(normalized), "acceptedCount": len(accepted),
        "rejectedCount": len(rejected), "rows": accepted, "rejected": rejected,
        "idempotencyKey": ["provider", "query_hash", "canonical_url"], "zeroDbWrites": True,
    }


def assert_live_write_guard(env: dict[str, str] | None = None) -> None:
    env = env or dict(os.environ)
    if not _truthy(env.get("THIRD_PARTY_DB_INGESTION_ENABLED")):
        raise PermissionError("THIRD_PARTY_DB_INGESTION_ENABLED is not true")
    if env.get("DATABASE_PROVIDER", "sqlite").strip().lower() != "supabase":
        raise PermissionError("DATABASE_PROVIDER must be supabase for live ingestion")
    if not env.get("SUPABASE_URL") or not env.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise PermissionError("Supabase service credentials are required")


def apply_plan(plan: dict[str, Any], *, env: dict[str, str] | None = None) -> dict[str, Any]:
    """Insert a bounded staging batch; DB unique index makes retries idempotent."""
    env = env or dict(os.environ)
    assert_live_write_guard(env)
    rows = plan.get("rows") or []
    if len(rows) > MAX_BATCH_LIMIT:
        raise ValueError("plan exceeds hard batch limit")
    if not rows:
        return {**plan, "zeroDbWrites": True, "insertedCount": 0, "duplicateCount": 0}
    base = env["SUPABASE_URL"].rstrip("/")
    url = base + "/rest/v1/discovery_candidates"
    headers = {
        "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": "Bearer " + env["SUPABASE_SERVICE_ROLE_KEY"],
        "Content-Type": "application/json", "Prefer": "return=minimal",
    }
    inserted = duplicates = 0
    for row in rows:
        req = Request(url, data=json.dumps(row, ensure_ascii=False).encode("utf-8"), method="POST", headers=headers)
        try:
            with urlopen(req, timeout=20):
                inserted += 1
        except HTTPError as exc:
            if exc.code == 409:
                duplicates += 1
                continue
            raise
    return {**plan, "zeroDbWrites": inserted == 0, "insertedCount": inserted, "duplicateCount": duplicates}


def rollback_manifest(plan: dict[str, Any]) -> dict[str, Any]:
    return {
        "table": "discovery_candidates",
        "identities": [{k: row[k] for k in ("provider", "query_hash", "canonical_url")} for row in plan.get("rows", [])],
        "note": "L7 is insert-only. Before any rollback deletion, compare identities with the pre-run snapshot; never auto-delete.",
    }
