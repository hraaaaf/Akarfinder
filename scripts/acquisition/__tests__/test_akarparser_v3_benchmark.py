"""AkarParser V3 independent benchmark: synthetic-only contract tests."""
import copy
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import akarparser_v3_raw_bulk as v3
import akarparser_v3_benchmark as bench

NOW = datetime(2026, 11, 9, 12, tzinfo=timezone.utc)


def listing(i, district="Agdal"):
    result = {
        "source_url": f"https://example.test/fixture/{i}",
        "title": f"Appartement fictif {i}",
        "city": "Rabat",
        "property_type": "apartment",
        "transaction_type": "sale",
        "price_mad": 1250000 + i,
        "surface_m2": 85 + i,
        "observed_at": "2026-11-08T12:00:00Z",
    }
    if district is not None:
        result["district"] = district
    return result


def annotation(state, value=None):
    result = {"state": state, "evidence_ref": "synthetic_fixture_review"}
    if state == "present":
        result["value"] = value
    return result


def truth(raw, sha, line):
    fields = {
        "title": annotation("present", raw["title"]),
        "city": annotation("present", raw["city"]),
        "district": annotation("present", raw["district"]) if raw.get("district") else annotation("absent"),
        "price_mad": annotation("present", raw["price_mad"]),
        "surface_total_m2": annotation("present", raw["surface_m2"]),
        "property_type": annotation("present", raw["property_type"]),
        "transaction_type": annotation("present", raw["transaction_type"]),
    }
    return {
        "source_file": "synthetic.jsonl",
        "source_line": line,
        "source_file_sha256": sha,
        "source_url": raw["source_url"],
        "portal": "example.test",
        "reviewer_blind_to_parser": True,
        "reviewer_id": "fixture-annotator",
        "permission_evidence_ref": "synthetic-fixture-only",
        "fields": fields,
    }


class TestV3Benchmark(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.input = root / "synthetic.jsonl"
        self.parsed_dir = root / "parsed"
        self.records = [listing(1), listing(2, district=None)]
        self.input.write_text("".join(json.dumps(x) + "\n" for x in self.records), encoding="utf-8")
        self.manifest = v3.run(self.input, self.parsed_dir, as_of=NOW)
        self.labels = [truth(x, self.manifest["input_files"]["synthetic.jsonl"]["sha256"], i)
                       for i, x in enumerate(self.records, 1)]
        self.truth_path = root / "truth.jsonl"
        self.output = root / "score.json"
        self.raw_parsed = self.parsed_dir / "all.jsonl.gz"
        self.aggregate = self.parsed_dir / "aggregate_report.json"

    def write_truth(self):
        self.truth_path.write_text("".join(json.dumps(x) + "\n" for x in self.labels), encoding="utf-8")

    def test_exact_metrics_include_missing_truth_and_incorrect_prediction(self):
        self.labels[0]["fields"]["price_mad"]["value"] = 1_999_999
        self.write_truth()
        result = bench.run(self.raw_parsed, self.aggregate, self.truth_path, self.output)
        self.assertEqual(result["record_count"], 2)
        self.assertEqual(result["portal_counts"], {"example.test": 2})
        price = result["overall"]["price_mad"]
        self.assertEqual(price["incorrect"], 1)
        self.assertEqual(price["correct"], 1)
        self.assertEqual(price["exact_precision"], 0.5)
        self.assertEqual(result["overall"]["district"]["correct_absent"], 1)
        self.assertEqual(result["overall"]["district"]["exact_recall"], 1.0)
        self.assertFalse(result["safety"]["certified_for_production"])
        self.assertNotIn("/fixture/", self.output.read_text(encoding="utf-8"))

    def test_bad_capture_sha_refused(self):
        self.labels[0]["source_file_sha256"] = "0" * 64
        self.write_truth()
        with self.assertRaisesRegex(ValueError, "TRUTH_SOURCE_HASH_MISMATCH"):
            bench.run(self.raw_parsed, self.aggregate, self.truth_path, self.output)

    def test_no_unannotated_or_parser_informed_truth(self):
        del self.labels[0]["fields"]["city"]
        self.write_truth()
        with self.assertRaisesRegex(ValueError, "ALL_CORE_FIELDS"):
            bench.run(self.raw_parsed, self.aggregate, self.truth_path, self.output)
        self.labels[0]["fields"]["city"] = annotation("present", "Rabat")
        self.labels[0]["reviewer_blind_to_parser"] = False
        self.write_truth()
        with self.assertRaisesRegex(ValueError, "INDEPENDENT_REVIEW_REQUIRED"):
            bench.run(self.raw_parsed, self.aggregate, self.truth_path, self.output)

    def test_source_url_and_exact_sample_join(self):
        self.labels[0]["source_url"] = "https://example.test/wrong/1"
        self.write_truth()
        with self.assertRaisesRegex(ValueError, "SOURCE_URL_MISMATCH"):
            bench.run(self.raw_parsed, self.aggregate, self.truth_path, self.output)
        self.labels.pop()
        self.write_truth()
        with self.assertRaisesRegex(ValueError, "TRUTH_AND_PARSED_INPUTS_MUST_MATCH_EXACTLY"):
            bench.run(self.raw_parsed, self.aggregate, self.truth_path, self.output)

    def test_output_hash_mismatch_and_no_overwrite(self):
        self.write_truth()
        report = json.loads(self.aggregate.read_text(encoding="utf-8"))
        report["output_sha256"]["all"] = "0" * 64
        self.aggregate.write_text(json.dumps(report), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "PARSED_OUTPUT_HASH_MISMATCH"):
            bench.run(self.raw_parsed, self.aggregate, self.truth_path, self.output)
        self.aggregate.write_text(json.dumps(self.manifest), encoding="utf-8")
        bench.run(self.raw_parsed, self.aggregate, self.truth_path, self.output)
        with self.assertRaises(FileExistsError):
            bench.run(self.raw_parsed, self.aggregate, self.truth_path, self.output)

    def test_uncertain_not_inflated_and_negative_is_not_hallucination(self):
        self.labels[1]["fields"]["district"] = annotation("uncertain")
        self.write_truth()
        result = bench.run(self.raw_parsed, self.aggregate, self.truth_path, self.output)
        district = result["overall"]["district"]
        self.assertEqual(district["uncertain"], 1)
        self.assertEqual(district["truth_absent"], 0)
        self.assertEqual(district["truth_present"], 1)
        self.assertEqual(district["exact_recall"], 1.0)

    def test_v3_writes_per_record_private_provenance(self):
        import gzip
        with gzip.open(self.raw_parsed, "rt", encoding="utf-8") as handle:
            sample = json.loads(next(handle))
        self.assertEqual(sample["input_ref"]["file"], "synthetic.jsonl")
        self.assertEqual(sample["input_ref"]["line"], 1)
        self.assertEqual(sample["input_ref"]["file_sha256"],
                         self.manifest["input_files"]["synthetic.jsonl"]["sha256"])


if __name__ == "__main__":
    unittest.main()
