"""J1 private replay contract tests: synthetic dicts only, never original HTML."""
from __future__ import annotations

from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_parallel.j1_private_original_replay import (
    EvidenceRejected, J1_REQUIRED_REASON, _expected_j1_replay,
    replay_j1_private_original,
)


def _fields():
    return {
        "price_mad": {"v3": 980000, "l4": 980000},
        "surface_total_m2": {"v3": 104, "l4": 104},
        "city": {"v3": "Sale"},
        "district": {"v3": "Al Qods"},
        "property_type": {"v3": "apartment"},
        "transaction_type": {"v3": "sale"},
    }


def _parsed():
    return {"quality": {
        "review_reasons": [J1_REQUIRED_REASON],
        "neon_product_admission_authorized": False,
    }}


class J1OriginalPrivateReplayContractTests(unittest.TestCase):
    def test_exact_historical_l4_v3_values_and_explicit_review_required(self):
        _expected_j1_replay({"field_comparison": _fields()}, _parsed())

    def test_price_discrepancy_rejected(self):
        f = _fields()
        f["price_mad"]["l4"] = 890000
        with self.assertRaisesRegex(EvidenceRejected, "J1_ORIGINAL_L4_V3_REPLAY_INCONSISTENT"):
            _expected_j1_replay({"field_comparison": f}, _parsed())

    def test_absent_geo_review_reason_rejected(self):
        p = _parsed()
        p["quality"]["review_reasons"] = []
        with self.assertRaises(EvidenceRejected):
            _expected_j1_replay({"field_comparison": _fields()}, p)

    def test_public_admission_flag_rejected(self):
        p = _parsed()
        p["quality"]["neon_product_admission_authorized"] = True
        with self.assertRaises(EvidenceRejected):
            _expected_j1_replay({"field_comparison": _fields()}, p)

    def test_private_original_missing_is_fail_closed_not_skipped(self):
        with self.assertRaisesRegex(EvidenceRejected, "OPERATOR_BUNDLE_PIN_MISMATCH"):
            replay_j1_private_original(Path("/missing/j1.zip"), operator_j3_sha256="a"*64)

    def test_wrong_operator_pin_refused_before_importing_parsers(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/"original.zip"
            path.write_bytes(b"not a legitimate ZIP")
            with self.assertRaisesRegex(EvidenceRejected, "OPERATOR_BUNDLE_PIN_MISMATCH"):
                replay_j1_private_original(path, operator_j3_sha256="0"*64)


if __name__ == "__main__":
    unittest.main()
