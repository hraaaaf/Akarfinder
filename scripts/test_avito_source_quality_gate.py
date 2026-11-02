"""Offline source-quality invariants: independently recompute from per-listing evidence."""
import copy
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "docs/handovers"
ROWS = ROOT / "avito-shadow-staging.json"
SUMMARY = ROOT / "avito-shadow-staging-quality.json"


def validate(rows, summary):
    records = rows["rows"]
    ids = [str(r["source"]["external_id"]) for r in records]
    assert len(records) == summary["source_records"] == 20
    assert len(set(ids)) == summary["unique_source_ids"]
    assert len(ids) - len(set(ids)) == summary["duplicate_source_id_count"]
    staged = [r for r in records if r["staging"]["status"] == "staged_offline"]
    rejected = [r for r in records if r["staging"]["status"] == "rejected"]
    assert len(staged) == summary["staged_offline_count"]
    assert len(rejected) == summary["staging_rejected_count"]
    assert len(staged) + len(rejected) == len(records)
    assert {r["source"]["external_id"] for r in rejected} == {str(x["id"]) for x in summary["staging_rejected_rows"]}
    strict = [r for r in records if r["qualification"]["strict_complete"]]
    incomplete = [r for r in records if not r["qualification"]["strict_complete"]]
    assert len(strict) == summary["strict_four_fields_count"]
    assert {r["source"]["external_id"] for r in strict} == set(summary["strict_four_fields_ids"])
    assert {r["source"]["external_id"]: r["qualification"]["strict_missing_fields"] for r in incomplete} == {str(x["id"]): x["missing_fields"] for x in summary["strict_incomplete_records"]}
    for r in records:
        missing = [key for key, value in (("title", r["facts"]["title"]), ("price", r["facts"]["price_observed"]), ("location", r["facts"]["location_observed"]), ("area", r["facts"]["surface_observed"])) if not value]
        assert missing == r["qualification"]["strict_missing_fields"]
        assert r["qualification"]["strict_complete"] == (not missing)
        assert r["qualification"]["freshness_status"] == "unknown"
        assert r["qualification"]["availability_status"] == "unconfirmed"
        assert r["guardrails"]["availability_status"] == "unconfirmed"
        assert r["guardrails"]["commercial_reuse"] == "not_verified"
        assert r["guardrails"]["publishable"] is False
        assert r["guardrails"]["images_rights_confirmed"] is False
        assert r["duplicate_review"]["auto_merged"] is False
        assert r["facts"]["photo_urls_retained"] is False
        assert r["staging"]["authorization_status"] is None
        if r["staging"]["status"] == "staged_offline":
            assert r["staging"]["validated_image_urls"] == []
    assert summary["publishable_count"] == sum(r["guardrails"]["publishable"] for r in records) == 0
    assert summary["images_rights_confirmed_count"] == sum(r["guardrails"]["images_rights_confirmed"] for r in records) == 0
    assert summary["freshness_unknown_count"] == len(records)
    assert summary["freshness_verified_count"] == 0
    for key in ("active_confirmed", "commercial_reuse_confirmed", "network_requests", "photo_downloads", "db_writes"):
        assert summary[key] == 0, key
    assert summary["physical_duplicates_auto_merged"] is False
    admitted_incomplete = {r["source"]["external_id"]: r["qualification"]["strict_missing_fields"] for r in staged if not r["qualification"]["strict_complete"]}
    assert admitted_incomplete == {"58590635": ["area"], "58602326": ["area"], "58791823": ["price", "area"]}


class SourceQualityGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = json.loads(ROWS.read_text(encoding="utf-8"))
        cls.summary = json.loads(SUMMARY.read_text(encoding="utf-8"))

    def test_recompute_from_per_listing_rows(self):
        validate(self.rows, self.summary)

    def test_mutation_rejects_fabricated_publication_rights(self):
        mutated = copy.deepcopy(self.rows)
        mutated["rows"][0]["guardrails"]["publishable"] = True
        with self.assertRaises(AssertionError):
            validate(mutated, self.summary)

    def test_mutation_rejects_hidden_missing_surface(self):
        mutated = copy.deepcopy(self.rows)
        target = next(r for r in mutated["rows"] if r["source"]["external_id"] == "58791823")
        target["qualification"]["strict_missing_fields"] = []
        with self.assertRaises(AssertionError):
            validate(mutated, self.summary)

    def test_mutation_rejects_fabricated_staging_count(self):
        mutated = copy.deepcopy(self.summary)
        mutated["staged_offline_count"] += 1
        with self.assertRaises(AssertionError):
            validate(self.rows, mutated)


if __name__ == "__main__":
    unittest.main()
