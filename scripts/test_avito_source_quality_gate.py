import json
import unittest
from pathlib import Path

REPORT = Path(__file__).resolve().parents[1] / "docs/handovers/avito-shadow-staging-quality.json"

class SourceQualityGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(REPORT.read_text(encoding="utf-8"))

    def test_partition_counts(self):
        d = self.data
        self.assertEqual(d["staged_offline_count"] + d["staging_rejected_count"], d["source_records"])
        self.assertEqual(d["strict_four_fields_count"] + len(d["strict_incomplete_records"]), d["source_records"])

    def test_admitted_incomplete_are_explicit(self):
        d = self.data
        rejected = {str(x["id"]) for x in d["staging_rejected_rows"]}
        incomplete = {str(x["id"]): x["missing_fields"] for x in d["strict_incomplete_records"]}
        admitted_incomplete = {k: v for k, v in incomplete.items() if k not in rejected}
        self.assertEqual(admitted_incomplete, {
            "58590635": ["area"],
            "58602326": ["area"],
            "58791823": ["price", "area"],
        })

    def test_no_publication_or_inferred_rights(self):
        d = self.data
        for key in ("publishable_count", "active_confirmed", "commercial_reuse_confirmed", "images_rights_confirmed_count", "db_writes", "photo_downloads", "network_requests"):
            self.assertEqual(d[key], 0, key)
        self.assertFalse(d["physical_duplicates_auto_merged"])

if __name__ == "__main__":
    unittest.main()
