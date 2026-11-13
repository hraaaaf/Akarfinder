"""Regression tests: source claims never become certified geolocation by agreement."""
from __future__ import annotations
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_parallel.j3_geo_qualification import qualify_geo_claim
from v7_parallel.j3_source_label_audit import equivalent

LABELS = Path(__file__).resolve().parents[1] / "v7_parallel" / "j3_independent_labels.json"


class GeoQualificationTests(unittest.TestCase):
    def gate(self, district="Al Qods", description=None, verified=True):
        return qualify_geo_claim(
            city_label="Salé", district_label=district,
            conflicting_description_district=description, sha256_verified=verified)

    def test_header_description_conflict_quarantined(self):
        result = self.gate(description="Tabriquet")
        self.assertEqual(result["status"], "source_internal_conflict")
        self.assertEqual(result["source_reported_district"], "Al Qods")
        self.assertEqual(result["conflicting_description_district"], "Tabriquet")
        self.assertIsNone(result["geo_index_district"])
        self.assertIsNone(result["geo_index_coordinates"])
        self.assertFalse(result["eligible_for_geo_publication"])
        self.assertFalse(result["eligible_for_private_staging"])

    def test_agreement_inside_same_source_does_not_verify_location(self):
        for description in (None, "Salé El Jadida", "Sale El Jadida"):
            item = self.gate(district="Salé El Jadida", description=description)
            self.assertEqual(item["status"], "source_claim_unverified")
            self.assertFalse(item["independently_verified_listing_location"])
            self.assertIsNone(item["geo_index_district"])

    def test_only_verified_source_bytes_are_accepted(self):
        with self.assertRaisesRegex(ValueError, "ORIGINAL_HTML_SHA256_NOT_VERIFIED"):
            self.gate(verified=False)
        with self.assertRaisesRegex(ValueError, "ORIGINAL_HTML_SHA256_NOT_VERIFIED"):
            self.gate(verified=1)

    def test_invalid_or_missing_labels_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "SOURCE_DISTRICT_REQUIRED"):
            self.gate(district=" ")
        with self.assertRaisesRegex(ValueError, "INVALID_DESCRIPTION_CONFLICT"):
            self.gate(description=" ")

    def test_normalization_preserves_equivalence_without_geoproof(self):
        self.assertTrue(equivalent("district", "Sale  El   Jadida", "Salé El Jadida"))
        self.assertFalse(equivalent("district", "Al Qods", "Tabriquet"))
        self.assertFalse(self.gate(district="Salé El Jadida")["eligible_for_geo_index"])

    def test_real_sha_pinned_labels_quarantine_three_claims(self):
        entries = json.loads(LABELS.read_text(encoding="utf-8"))["records"]
        self.assertEqual(len(entries), 5)
        rows = []
        for entry in entries:
            r = self.gate(
                district=entry["expected"]["district"],
                description=entry["district_description_conflict"],
            )
            rows.append((entry["id"], r))
            self.assertFalse(r["eligible_for_geo_index"])
            self.assertFalse(r["eligible_for_private_staging"])
        conflicts = sorted(id_ for id_, r in rows if r["status"] == "source_internal_conflict")
        self.assertEqual(conflicts, ["387448", "444291", "500006"])
        self.assertEqual(sum(r["status"] == "source_claim_unverified" for _, r in rows), 2)


if __name__ == "__main__":
    unittest.main()
