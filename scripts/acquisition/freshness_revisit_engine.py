#!/usr/bin/env python3
"""Deterministic source-aware freshness/revisit engine for canonical listings.

Pure logic only: no network and no DB writes. The engine classifies revisit outcomes,
tracks meaningful changes, and schedules the next revisit from explicit evidence.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import json
from typing import Any

ACTIVE_STATUSES = {200}
REMOVED_STATUSES = {404, 410}
TRANSIENT_STATUSES = {408, 425, 429, 500, 502, 503, 504}

SOURCE_INTERVAL_HOURS = {
    "portal": 24,
    "agency": 72,
    "developer": 96,
    "long_tail": 168,
}
DEFAULT_INTERVAL_HOURS = 96
MAX_TRANSIENT_BACKOFF_HOURS = 168


def _utc(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def stable_fingerprint(payload: dict[str, Any]) -> str:
    """Hash only canonical serving-relevant facts, not observation metadata."""
    keys = [
        "classification.property_type",
        "offer.transaction_type",
        "offer.price_amount",
        "surfaces.surface_total_m2",
        "location.city",
        "location.neighborhood",
        "layout.bedrooms_count",
        "layout.bathrooms_count",
        "offer.description",
    ]
    normalized = {key: payload.get(key) for key in keys if key in payload}
    raw = json.dumps(normalized, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def next_revisit_at(source_class: str, observed_at: str | datetime, transient_failures: int = 0) -> str:
    base = SOURCE_INTERVAL_HOURS.get(source_class, DEFAULT_INTERVAL_HOURS)
    if transient_failures > 0:
        base = min(base * (2 ** min(transient_failures, 4)), MAX_TRANSIENT_BACKOFF_HOURS)
    return (_utc(observed_at) + timedelta(hours=base)).isoformat().replace("+00:00", "Z")


def classify_http(status_code: int) -> str:
    if status_code in ACTIVE_STATUSES:
        return "reachable"
    if status_code in REMOVED_STATUSES:
        return "removed"
    if status_code in TRANSIENT_STATUSES:
        return "transient_failure"
    if 300 <= status_code < 400:
        return "redirect"
    if 400 <= status_code < 500:
        return "blocked_or_invalid"
    return "unexpected"


def evaluate_revisit(previous: dict[str, Any], observation: dict[str, Any]) -> dict[str, Any]:
    """Classify a revisit without mutating persistence.

    previous expected fields: source_class, status, payload, last_seen_at,
    transient_failures (optional), redirect_url (optional).
    observation expected fields: observed_at, status_code, payload (for 200),
    redirect_url (for 3xx).
    """
    observed_at = _utc(observation["observed_at"])
    status_code = int(observation["status_code"])
    http_class = classify_http(status_code)
    source_class = previous.get("source_class", "unknown")
    prior_payload = previous.get("payload") or {}
    prior_fp = previous.get("fingerprint") or stable_fingerprint(prior_payload)
    prior_price = prior_payload.get("offer.price_amount")
    transient_failures = int(previous.get("transient_failures", 0) or 0)

    result: dict[str, Any] = {
        "observed_at": observed_at.isoformat().replace("+00:00", "Z"),
        "http_status": status_code,
        "http_class": http_class,
        "previous_status": previous.get("status", "unknown"),
        "status": previous.get("status", "unknown"),
        "changed": False,
        "change_reasons": [],
        "price_change": None,
        "transient_failures": transient_failures,
        "next_revisit_at": None,
        "zeroDbWrites": True,
    }

    if http_class == "reachable":
        payload = observation.get("payload") or {}
        current_fp = stable_fingerprint(payload)
        current_price = payload.get("offer.price_amount")
        result["status"] = "active"
        result["fingerprint"] = current_fp
        result["transient_failures"] = 0
        result["last_seen_at"] = result["observed_at"]
        if previous.get("status") != "active":
            result["changed"] = True
            result["change_reasons"].append("status_to_active")
        if current_fp != prior_fp:
            result["changed"] = True
            result["change_reasons"].append("canonical_content_changed")
        if prior_price is not None and current_price is not None and prior_price != current_price:
            result["price_change"] = {
                "from": prior_price,
                "to": current_price,
                "delta": current_price - prior_price,
            }
            result["change_reasons"].append("price_changed")
        result["next_revisit_at"] = next_revisit_at(source_class, observed_at, 0)
        return result

    if http_class == "removed":
        result["status"] = "removed"
        result["changed"] = previous.get("status") != "removed"
        if result["changed"]:
            result["change_reasons"].append("status_to_removed")
        result["removed_at"] = result["observed_at"]
        result["next_revisit_at"] = None
        return result

    if http_class == "redirect":
        result["status"] = previous.get("status", "unknown")
        result["redirect_url"] = observation.get("redirect_url")
        if observation.get("redirect_url") and observation.get("redirect_url") != previous.get("redirect_url"):
            result["changed"] = True
            result["change_reasons"].append("redirect_target_changed")
        result["next_revisit_at"] = next_revisit_at(source_class, observed_at, transient_failures)
        return result

    if http_class == "transient_failure":
        failures = transient_failures + 1
        result["transient_failures"] = failures
        result["status"] = previous.get("status", "unknown")
        result["next_revisit_at"] = next_revisit_at(source_class, observed_at, failures)
        return result

    # Explicitly do not mark blocked/invalid pages removed from one observation.
    result["status"] = previous.get("status", "unknown")
    result["next_revisit_at"] = next_revisit_at(source_class, observed_at, transient_failures + 1)
    return result


def freshness_age_hours(last_seen_at: str | datetime, now: str | datetime) -> float:
    delta = _utc(now) - _utc(last_seen_at)
    return max(0.0, delta.total_seconds() / 3600.0)


def freshness_bucket(last_seen_at: str | datetime, now: str | datetime) -> str:
    hours = freshness_age_hours(last_seen_at, now)
    if hours <= 24:
        return "fresh_24h"
    if hours <= 72:
        return "fresh_72h"
    if hours <= 168:
        return "fresh_7d"
    return "stale_gt7d"
