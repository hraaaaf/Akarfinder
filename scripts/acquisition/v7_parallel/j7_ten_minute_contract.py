"""J7 deterministic 10-minute cycle intents. NO SCHEDULER ACTIVATION.

This module does not acquire leases, fetch portals, connect to a database, or
authorize any source. A hosted runner's local state is NOT a trusted durable
multi-run ledger. A production idempotency gate must live outside GitHub runner.
"""
from __future__ import annotations

from datetime import datetime, timezone

SLOT_SECONDS = 600
SCHEMA = "akarfinder-v7-j7-cycle-intent-v1"
VALID_TRIGGERS = frozenset(("schedule", "manual_preview"))


def offline_cycle_intent(now: datetime, *, trigger: str = "manual_preview") -> dict:
    """Describe a time slot only. Always fail closed for live operation."""
    if (not isinstance(now, datetime) or now.tzinfo is None
            or now.utcoffset() is None):
        raise ValueError("UTC_AWARE_TIME_REQUIRED")
    if trigger not in VALID_TRIGGERS:
        raise ValueError("UNSUPPORTED_TRIGGER")
    epoch = int(now.timestamp())
    if epoch < 0:
        raise ValueError("NEGATIVE_EPOCH_UNSUPPORTED")
    slot = epoch // SLOT_SECONDS
    start = datetime.fromtimestamp(slot * SLOT_SECONDS, tz=timezone.utc)
    end = datetime.fromtimestamp((slot + 1) * SLOT_SECONDS, tz=timezone.utc)
    return {
        "schema_version": SCHEMA,
        "trigger": trigger,
        "slot_index": slot,
        "slot_start_utc": start.isoformat().replace("+00:00", "Z"),
        "slot_end_exclusive_utc": end.isoformat().replace("+00:00", "Z"),
        "idempotency_key": f"AKARFINDER_V7_10M:{slot}",
        "mode": "offline_simulation_only",
        "execution_authorized": False,
        "live_source_fetch_authorized": False,
        "private_staging_authorized": False,
        "public_admission_authorized": False,
        "durable_remote_ledger_connected": False,
        "lease_token_acquired": False,
        "manual_operator_release_verified": False,
        "network_requests": 0,
        "database_writes": 0,
        "blocking_gates": [
            "SHARED_DURABLE_ATOMIC_LEDGER_MISSING",
            "SOURCE_INDEPENDENT_PROVENANCE_NOT_CERTIFIED",
            "OPERATOR_ACTIVATION_NOT_APPROVED",
        ],
    }
