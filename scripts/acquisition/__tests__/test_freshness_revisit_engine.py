import importlib.util
import pathlib
import sys
import unittest

ACQ_DIR = pathlib.Path(__file__).parents[1]
MODULE_PATH = ACQ_DIR / "freshness_revisit_engine.py"
SPEC = importlib.util.spec_from_file_location("freshness_revisit_engine", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def prev(status="active", source_class="portal", price=1800000, surface=120, failures=0):
    payload = {
        "classification.property_type": "apartment",
        "offer.transaction_type": "sale",
        "offer.price_amount": price,
        "surfaces.surface_total_m2": surface,
        "location.city": "Rabat",
        "location.neighborhood": "Agdal",
    }
    return {
        "source_class": source_class,
        "status": status,
        "payload": payload,
        "fingerprint": MODULE.stable_fingerprint(payload),
        "last_seen_at": "2026-09-01T08:00:00Z",
        "transient_failures": failures,
    }


class FreshnessRevisitTests(unittest.TestCase):
    def test_unchanged_200_stays_active(self):
        p = prev()
        out = MODULE.evaluate_revisit(p, {"observed_at": "2026-09-02T08:00:00Z", "status_code": 200, "payload": p["payload"]})
        self.assertEqual(out["status"], "active")
        self.assertFalse(out["changed"])
        self.assertEqual(out["next_revisit_at"], "2026-09-03T08:00:00Z")
        self.assertTrue(out["zeroDbWrites"])

    def test_price_change_is_recorded(self):
        p = prev()
        payload = dict(p["payload"])
        payload["offer.price_amount"] = 1700000
        out = MODULE.evaluate_revisit(p, {"observed_at": "2026-09-02T08:00:00Z", "status_code": 200, "payload": payload})
        self.assertTrue(out["changed"])
        self.assertEqual(out["price_change"]["delta"], -100000)
        self.assertIn("price_changed", out["change_reasons"])

    def test_404_marks_removed(self):
        out = MODULE.evaluate_revisit(prev(), {"observed_at": "2026-09-02T08:00:00Z", "status_code": 404})
        self.assertEqual(out["status"], "removed")
        self.assertIsNone(out["next_revisit_at"])
        self.assertIn("status_to_removed", out["change_reasons"])

    def test_503_does_not_mark_removed_and_backs_off(self):
        out = MODULE.evaluate_revisit(prev(failures=1), {"observed_at": "2026-09-02T08:00:00Z", "status_code": 503})
        self.assertEqual(out["status"], "active")
        self.assertEqual(out["transient_failures"], 2)
        self.assertEqual(out["next_revisit_at"], "2026-09-06T08:00:00Z")

    def test_403_does_not_mark_removed(self):
        out = MODULE.evaluate_revisit(prev(), {"observed_at": "2026-09-02T08:00:00Z", "status_code": 403})
        self.assertEqual(out["status"], "active")
        self.assertEqual(out["http_class"], "blocked_or_invalid")

    def test_source_aware_intervals(self):
        self.assertEqual(MODULE.next_revisit_at("portal", "2026-09-02T00:00:00Z"), "2026-09-03T00:00:00Z")
        self.assertEqual(MODULE.next_revisit_at("long_tail", "2026-09-02T00:00:00Z"), "2026-09-09T00:00:00Z")

    def test_freshness_buckets(self):
        now = "2026-09-02T08:00:00Z"
        self.assertEqual(MODULE.freshness_bucket("2026-09-01T12:00:00Z", now), "fresh_24h")
        self.assertEqual(MODULE.freshness_bucket("2026-08-30T00:00:00Z", now), "fresh_7d")
        self.assertEqual(MODULE.freshness_bucket("2026-08-20T00:00:00Z", now), "stale_gt7d")


if __name__ == "__main__":
    unittest.main()
