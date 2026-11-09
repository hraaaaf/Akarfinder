"""Q1E description merge offline safety tests; synthetic fixtures only."""
from __future__ import annotations
import gzip
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from akarparser_v2_description_merge import merge, sha256

class DescriptionMergeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "old.jsonl.gz"
        self.patch = self.root / "patches"
        self.patch.mkdir()
        self.output = self.root / "new.jsonl.gz"
        self.rows = [
            {"id": "10", "property_listing_id": "2", "title": "Listing A"},
            {"id": "11", "property_listing_id": "4", "title": "Listing B"},
            {"id": "12", "property_listing_id": "9", "title": "Listing C"},
        ]
        self.write_source()
        self.write_patch([{"property_listing_id": "2", "description_snippet": "One"},
                          {"property_listing_id": "9", "description_snippet": "Three"}])

    def write_source(self):
        with gzip.open(self.source, "wt", encoding="utf-8") as f:
            for row in self.rows:
                f.write(json.dumps(row) + "\n")

    def write_patch(self, rows):
        (self.patch / "description-0001.jsonl").write_text(
            "".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")

    def call(self, **overrides):
        kwargs = {"expected_source_sha256": sha256(self.source),
                  "expected_rows": 3, "expected_descriptions": 2}
        kwargs.update(overrides)
        return merge(self.source, self.patch, self.output, **kwargs)

    def test_exact_join_and_old_source_unchanged(self):
        before = sha256(self.source)
        result = self.call()
        self.assertEqual(result["descriptions_joined"], 2)
        self.assertTrue(result["original_unchanged"])
        self.assertEqual(sha256(self.source), before)
        with gzip.open(self.output, "rt", encoding="utf-8") as file:
            rows = [json.loads(line) for line in file]
        self.assertEqual([r["description_snippet"] for r in rows], ["One", None, "Three"])
        self.assertEqual([r["id"] for r in rows], ["10", "11", "12"])
        self.assertFalse(result["publication_allowed"])

    def test_mismatched_sha_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "SOURCE_HASH_MISMATCH"):
            self.call(expected_source_sha256="0" * 64)
        self.assertFalse(self.output.exists())

    def test_unmatched_patch_fails_closed(self):
        self.write_patch([{"property_listing_id": "2", "description_snippet": "One"},
                          {"property_listing_id": "999", "description_snippet": "Other"}])
        with self.assertRaisesRegex(ValueError, "UNMATCHED_PATCH"):
            self.call()
        self.assertFalse(self.output.exists())

    def test_unsorted_patch_fails_closed(self):
        self.write_patch([{"property_listing_id": "9", "description_snippet": "Nine"},
                          {"property_listing_id": "2", "description_snippet": "Two"}])
        with self.assertRaisesRegex(ValueError, "STRICTLY_NUMERIC_ASCENDING"):
            self.call()

    def test_duplicate_patch_fails_closed(self):
        self.write_patch([{"property_listing_id": "2", "description_snippet": "One"},
                          {"property_listing_id": "2", "description_snippet": "Again"}])
        with self.assertRaisesRegex(ValueError, "STRICTLY_NUMERIC_ASCENDING"):
            self.call()

    def test_existing_output_not_overwritten(self):
        self.output.write_text("existing", encoding="utf-8")
        with self.assertRaises(FileExistsError):
            self.call()
        self.assertEqual(self.output.read_text(), "existing")

    def test_missing_field_fails_closed(self):
        self.rows[0]["description_snippet"] = "already present"
        self.write_source()
        with self.assertRaisesRegex(ValueError, "ALREADY_ENRICHED|INCONSISTENT"):
            self.call()

if __name__ == "__main__":
    unittest.main()