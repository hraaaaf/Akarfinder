"""J7 10-minute time semantics and LOCAL SQLite ledger simulator tests.

The SQLite test harness models atomic uniqueness only within a shared local
file. It is NOT a deployed distributed lease and cannot cross hosted runners.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sqlite3
import sys
from tempfile import TemporaryDirectory
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_parallel.j7_ten_minute_contract import offline_cycle_intent

AT = datetime(2026, 11, 13, 9, 3, tzinfo=timezone.utc)


def local_claim(path: Path, slot: int, worker: str) -> bool:
    """Atomic local fixture only, with no automatic retries after crash."""
    with sqlite3.connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute(
            "CREATE TABLE IF NOT EXISTS simulated_slots ("
            "slot integer PRIMARY KEY, owner text NOT NULL, state text NOT NULL)")
        changed = db.execute(
            "INSERT OR IGNORE INTO simulated_slots(slot, owner, state) "
            "VALUES (?, ?, 'claimed')", (slot, worker)).rowcount
    return changed == 1


class J7OfflineSlotTests(unittest.TestCase):
    def test_cron_like_shift_and_same_ten_minute_bucket(self):
        a = offline_cycle_intent(AT, trigger="schedule")
        b = offline_cycle_intent(AT + timedelta(minutes=6, seconds=30), trigger="schedule")
        self.assertEqual(a["idempotency_key"], b["idempotency_key"])
        self.assertTrue(a["slot_start_utc"].endswith("09:00:00Z"))
        self.assertTrue(a["slot_end_exclusive_utc"].endswith("09:10:00Z"))

    def test_next_ten_minute_slot_has_new_key(self):
        a = offline_cycle_intent(AT, trigger="schedule")
        b = offline_cycle_intent(AT + timedelta(minutes=10), trigger="schedule")
        self.assertEqual(b["slot_index"], a["slot_index"] + 1)
        self.assertNotEqual(a["idempotency_key"], b["idempotency_key"])

    def test_offset_clock_makes_identical_utc_key(self):
        offset = timezone(timedelta(hours=1))
        first = offline_cycle_intent(AT)
        shifted = offline_cycle_intent(AT.astimezone(offset))
        self.assertEqual(first["idempotency_key"], shifted["idempotency_key"])

    def test_cross_midnight_boundary_is_unambiguous(self):
        prev = offline_cycle_intent(datetime(2026, 11, 13, 23, 59, tzinfo=timezone.utc))
        nxt = offline_cycle_intent(datetime(2026, 11, 14, 0, 0, tzinfo=timezone.utc))
        self.assertNotEqual(prev["slot_index"], nxt["slot_index"])

    def test_naive_clock_and_wrong_trigger_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "UTC_AWARE_TIME_REQUIRED"):
            offline_cycle_intent(datetime(2026, 11, 13, 9, 3))
        with self.assertRaisesRegex(ValueError, "UNSUPPORTED_TRIGGER"):
            offline_cycle_intent(AT, trigger="live_network")

    def test_a_schedule_event_never_unlocks_live_collection(self):
        plan = offline_cycle_intent(AT, trigger="schedule")
        self.assertFalse(plan["execution_authorized"])
        self.assertFalse(plan["live_source_fetch_authorized"])
        self.assertFalse(plan["private_staging_authorized"])
        self.assertFalse(plan["durable_remote_ledger_connected"])
        self.assertFalse(plan["lease_token_acquired"])
        self.assertEqual((plan["network_requests"], plan["database_writes"]), (0, 0))

    def test_local_fixture_atomic_claim_rejects_second_runner(self):
        with TemporaryDirectory() as d:
            path = Path(d) / "simulation-only.sqlite3"
            slot = offline_cycle_intent(AT)["slot_index"]
            self.assertTrue(local_claim(path, slot, "runner-A"))
            self.assertFalse(local_claim(path, slot, "runner-B"))
            with sqlite3.connect(path) as db:
                self.assertEqual(db.execute("SELECT count(*) FROM simulated_slots").fetchone()[0], 1)

    def test_crashed_runner_is_not_automatically_retried(self):
        with TemporaryDirectory() as d:
            path = Path(d) / "simulation-only.sqlite3"
            slot = offline_cycle_intent(AT)["slot_index"]
            self.assertTrue(local_claim(path, slot, "crashed-runner"))
            self.assertFalse(local_claim(path, slot, "unapproved-takeover"))
            self.assertTrue(local_claim(path, slot + 1, "new-window"))

    def test_repeating_schedule_event_without_trusted_ledger_remains_disabled(self):
        intents = [offline_cycle_intent(AT, trigger="schedule") for _ in range(3)]
        self.assertEqual(len({x["idempotency_key"] for x in intents}), 1)
        self.assertTrue(all(not x["execution_authorized"] for x in intents))


if __name__ == "__main__":
    unittest.main()
