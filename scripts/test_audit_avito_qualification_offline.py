import json
import unittest
from pathlib import Path

from audit_avito_qualification_offline import audit

FIXTURE = Path(__file__).parents[1] / "docs/handovers/avito-qualification-results.json"


class OfflineAuditTests(unittest.TestCase):
    def setUp(self):
        self.payload = json.loads(FIXTURE.read_text(encoding="utf-8"))

    def test_historical_fixture_has_twenty_rows_and_eleven_strict(self):
        report = audit(self.payload)
        self.assertEqual(report["source_records"], 20)
        self.assertEqual(report["strict_four_fields_count"], 11)
        self.assertEqual(len(report["strict_four_fields_ids"]), 11)

    def test_photo_description_freshness_and_missing_fields_are_separate(self):
        report = audit(self.payload)
        self.assertEqual(report["coverage"]["description"], 20)
        self.assertEqual(report["coverage"]["photos"], 17)
        self.assertEqual(report["freshness_verified_count"], 0)
        self.assertEqual(report["freshness_reported_date_count"], 0)
        self.assertEqual(report["freshness_unknown_count"], 20)
        by_id = {r["id"]: r["missing_fields"] for r in report["strict_incomplete_records"]}
        self.assertIn("price", by_id["58600152"])
        self.assertIn("area", by_id["58600152"])
        self.assertIn("price", by_id["58791823"])
        self.assertIn("area", by_id["58791823"])

    def test_staging_rejections_have_explicit_schema_reasons(self):
        staged = json.loads((FIXTURE.parents[0] / "avito-shadow-staging.json").read_text(encoding="utf-8"))
        report = audit(self.payload, staged)
        self.assertEqual(report["staged_offline_count"] + report["staging_rejected_count"], 20)
        self.assertEqual(report["staging_rejected_count"], 6)
        self.assertTrue(all(r["reason"] and r["id"] for r in report["staging_rejected_rows"]))

    def test_suspect_pair_is_reported_not_merged(self):
        report = audit(self.payload)
        pair = next(g for g in report["possible_physical_duplicate_groups"]
                    if g["ids"] == ["58685536", "58707942"])
        self.assertFalse(pair["physical_duplicate_proven"])
        self.assertFalse(pair["auto_merged"])
        self.assertTrue(pair["photos_differ"])
        self.assertFalse(report["physical_duplicates_auto_merged"])
        self.assertNotIn("content.avito.ma/classifieds/images/", json.dumps(pair))

    def test_no_production_side_effects(self):
        report = audit(self.payload)
        self.assertEqual(report["network_requests"], 0)
        self.assertEqual(report["photo_downloads"], 0)
        self.assertEqual(report["db_writes"], 0)


if __name__ == "__main__":
    unittest.main()
