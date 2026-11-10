"""Synthetic-only tests: never ship private review evidence to CI."""
from __future__ import annotations

import csv
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from q1i_private_review_gate import GateError, validate_packet

IDENTITY = ["task_id", "source_file", "source_url", "source_html_sha256", "field_to_label"]
REVIEW = ["reviewer_id", "source_claim_label", "source_claim_value", "source_quote", "human_notes"]
EVIDENCE = ["task_id", "source_file", "source_sha256", "field_to_label",
            "source_url", "primary_title", "primary_description",
            "visible_text_fallback", "jsonld_offer_source_claim"]


class Q1IGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.packet = root / "packet"
        self.sources = root / "pages"
        self.rows = {}
        self.proofs = {}
        for role in ("A", "B"):
            self.rows[role] = []
            self.proofs[role] = []
        for i in range(2):
            raw = self.sources / "example" / f"source_{i}.html"
            raw.parent.mkdir(parents=True, exist_ok=True)
            raw.write_text(f"<html><title>Example {i}</title></html>", encoding="utf8")
            sha = hashlib.sha256(raw.read_bytes()).hexdigest()
            ref = dict(zip(IDENTITY, [
                f"task_{i}", f"example/source_{i}.html",
                f"https://example.org/listing/{i}", sha,
                "price_mad" if i == 0 else "surface_total_m2",
            ]))
            proof = {
                "task_id": ref["task_id"],
                "source_file": ref["source_file"],
                "source_sha256": sha,
                "field_to_label": ref["field_to_label"],
                "source_url": ref["source_url"],
                "primary_title": "Appartement test",
                "primary_description": "Prix : 13 000 DH" if i == 0 else "Surface : 65 m²",
                "visible_text_fallback": "",
                "jsonld_offer_source_claim": "",
            }
            for role in ("A", "B"):
                annotations = dict(ref)
                annotations.update({key: "" for key in REVIEW})
                if i == 0 and role == "A":
                    annotations.update({
                        "reviewer_id": "human-a",
                        "source_claim_label": "SOURCE_EXPLICIT",
                        "source_claim_value": "13000",
                        "source_quote": "Prix : 13 000 DH",
                    })
                self.rows[role].append(annotations)
                self.proofs[role].append(dict(proof))
        self.flush()

    def flush(self) -> None:
        for role, directory in (("A", "RELECTEUR_A_UTILISATEUR"),
                                ("B", "RELECTEUR_B_AMI")):
            dst = self.packet / directory
            dst.mkdir(parents=True, exist_ok=True)
            for name, fields, rows in (
                (f"ANNOTATIONS_{role}.csv", IDENTITY + REVIEW, self.rows[role]),
                (f"PREUVES_SOURCE_{role}.csv", EVIDENCE, self.proofs[role]),
            ):
                with (dst / name).open("w", encoding="utf-8-sig", newline="") as f:
                    writer = csv.DictWriter(f, fieldnames=fields)
                    writer.writeheader()
                    writer.writerows(rows)

    def validate(self):
        return validate_packet(self.packet, self.sources, expected_tasks=2, expected_pages=2)

    def test_valid_partial_blind_packet_not_certified(self):
        report = self.validate()
        self.assertEqual(report["source_sha_verified"], 2)
        self.assertEqual(report["human_A_completed"], 1)
        self.assertEqual(report["human_B_completed"], 0)
        self.assertFalse(report["human_pair_complete"])
        self.assertFalse(report["real_world_truth_certified"])
        self.assertFalse(report["neon_admission_authorized"])
        self.assertEqual(report["writes_performed"], 0)

    def test_modified_source_rejected(self):
        (self.sources / "example" / "source_0.html").write_text("tampered", encoding="utf8")
        with self.assertRaises(GateError):
            self.validate()

    def test_fabricated_quote_rejected(self):
        self.rows["A"][0]["source_quote"] = "Prix : 9 000 000 DH"
        self.flush()
        with self.assertRaises(GateError):
            self.validate()

    def test_same_reviewer_id_when_both_label_rejected(self):
        self.rows["B"][0].update({
            "reviewer_id": "human-a",
            "source_claim_label": "SOURCE_EXPLICIT",
            "source_claim_value": "13000",
            "source_quote": "Prix : 13 000 DH",
        })
        self.flush()
        with self.assertRaises(GateError):
            self.validate()

    def test_unproven_value_rejected(self):
        self.rows["A"][0]["source_claim_label"] = "SOURCE_ABSENT"
        self.rows["A"][0]["source_claim_value"] = "13000"
        self.flush()
        with self.assertRaises(GateError):
            self.validate()


if __name__ == "__main__":
    unittest.main()
