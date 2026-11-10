#!/usr/bin/env python3
"""Q1I: local read-only A/B packet integrity gate. NEVER uploads evidence or labels.

This checks consistency of *human-supplied* source claims, not real-world listing truth.
Use only with trusted Windows runner and private local paths.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from pathlib import Path

ALLOWED_LABELS = {
    "SOURCE_EXPLICIT", "SOURCE_CONFLICT", "SOURCE_ABSENT", "SOURCE_AMBIGUOUS"
}
IDENTITY = ("task_id", "source_file", "source_url", "source_html_sha256", "field_to_label")
REVIEW = ("reviewer_id", "source_claim_label", "source_claim_value", "source_quote", "human_notes")
EVIDENCE = ("task_id", "source_file", "source_sha256", "field_to_label", "source_url")
PROOF_TEXT = ("primary_title", "primary_description", "visible_text_fallback",
              "jsonld_offer_source_claim")


class GateError(ValueError):
    """Fail closed without leaking paths or listing text."""


def _read_csv(path: Path, required: tuple[str, ...]) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames is None or not set(required).issubset(reader.fieldnames):
            raise GateError("MISSING_COLUMNS")
        rows = list(reader)
    if not rows:
        raise GateError("EMPTY_PACKET")
    return rows


def _normal(text: str) -> str:
    return " ".join(text.split())


def _source_path(root: Path, source_file: str) -> Path:
    normalized = source_file.replace("\\", "/")
    if not normalized or normalized.startswith("/") or ":" in normalized:
        raise GateError("UNSAFE_SOURCE")
    rel = Path(normalized)
    if ".." in rel.parts:
        raise GateError("UNSAFE_SOURCE")
    result = (root / rel).resolve()
    if not result.is_relative_to(root.resolve()):
        raise GateError("UNSAFE_SOURCE")
    return result


def validate_packet(
    packet_root: Path,
    source_root: Path,
    *,
    expected_tasks: int = 76,
    expected_pages: int = 75,
) -> dict[str, int | bool]:
    paths = {
        "A": packet_root / "RELECTEUR_A_UTILISATEUR",
        "B": packet_root / "RELECTEUR_B_AMI",
    }
    rows = {
        role: _read_csv(path / f"ANNOTATIONS_{role}.csv", IDENTITY + REVIEW)
        for role, path in paths.items()
    }
    proof = {
        role: _read_csv(path / f"PREUVES_SOURCE_{role}.csv", EVIDENCE + PROOF_TEXT)
        for role, path in paths.items()
    }
    if any(len(items) != expected_tasks for items in (*rows.values(), *proof.values())):
        raise GateError("TASK_COUNT_MISMATCH")

    all_ids = [item["task_id"] for item in rows["A"]]
    if len(set(all_ids)) != expected_tasks:
        raise GateError("DUPLICATE_TASKS")

    source_hashes: dict[str, str] = {}
    done: dict[str, int] = {"A": 0, "B": 0}
    agree = 0
    for i in range(expected_tasks):
        a, b = rows["A"][i], rows["B"][i]
        pa, pb = proof["A"][i], proof["B"][i]
        if any(a[key] != b[key] for key in IDENTITY):
            raise GateError("BLIND_IDENTITIES_MISMATCH")
        if any(pa[key] != pb[key] for key in EVIDENCE + PROOF_TEXT):
            raise GateError("BLIND_PROOF_MISMATCH")
        if any(
            a[left] != pa[right] for left, right in (
                ("task_id", "task_id"), ("source_file", "source_file"),
                ("source_html_sha256", "source_sha256"),
                ("field_to_label", "field_to_label"),
                ("source_url", "source_url"),
            )
        ):
            raise GateError("SOURCE_IDENTITY_MISMATCH")
        source_file = a["source_file"]
        declared_hash = a["source_html_sha256"]
        if not re.fullmatch(r"[0-9a-f]{64}", declared_hash):
            raise GateError("INVALID_SOURCE_SHA")
        if source_file in source_hashes:
            if source_hashes[source_file] != declared_hash:
                raise GateError("COLLIDING_SOURCE_SHA")
        else:
            original = _source_path(source_root, source_file)
            actual = hashlib.sha256(original.read_bytes()).hexdigest()
            if actual != declared_hash:
                raise GateError("SOURCE_SHA_MISMATCH")
            source_hashes[source_file] = actual
        evidence = _normal(" ".join(pa[k] for k in PROOF_TEXT))
        for role, item in (("A", a), ("B", b)):
            label = item["source_claim_label"]
            if not label:
                if any(item[key] for key in REVIEW):
                    raise GateError("INCOMPLETE_REVIEW_ROW")
                continue
            if label not in ALLOWED_LABELS or not item["reviewer_id"].strip():
                raise GateError("INVALID_REVIEW_LABEL")
            if label == "SOURCE_EXPLICIT":
                if not item["source_claim_value"].strip() or not item["source_quote"].strip():
                    raise GateError("MISSING_EXPLICIT_EVIDENCE")
            elif item["source_claim_value"].strip():
                raise GateError("UNPROVEN_VALUE")
            if label == "SOURCE_CONFLICT" and not item["human_notes"].strip():
                raise GateError("MISSING_CONFLICT_NOTES")
            quote = _normal(item["source_quote"])
            if quote and quote not in evidence:
                raise GateError("QUOTE_NOT_IN_PRIMARY_EVIDENCE")
            done[role] += 1
        if a["source_claim_label"] and b["source_claim_label"]:
            if a["reviewer_id"] == b["reviewer_id"]:
                raise GateError("REVIEWERS_NOT_DISTINCT")
            if (a["source_claim_label"], a["source_claim_value"]) == (
                b["source_claim_label"], b["source_claim_value"]
            ):
                agree += 1
    if len(source_hashes) != expected_pages:
        raise GateError("SOURCE_PAGE_COUNT_MISMATCH")

    return {
        "task_count": expected_tasks,
        "source_sha_verified": len(source_hashes),
        "human_A_completed": done["A"],
        "human_B_completed": done["B"],
        "paired_decisions": sum(
            bool(a["source_claim_label"] and b["source_claim_label"])
            for a, b in zip(rows["A"], rows["B"])
        ),
        "paired_agreements": agree,
        "human_pair_complete": done["A"] == done["B"] == expected_tasks,
        "real_world_truth_certified": False,
        "neon_admission_authorized": False,
        "writes_performed": 0,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--packet-root", type=Path, required=True)
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--expected-tasks", type=int, default=76)
    parser.add_argument("--expected-pages", type=int, default=75)
    args = parser.parse_args()
    if args.expected_tasks < 1 or args.expected_pages < 1:
        print("Q1I_REVIEW_GATE_FAIL_CLOSED=INVALID_COUNTS", file=sys.stderr)
        return 2
    try:
        report = validate_packet(
            args.packet_root, args.source_root,
            expected_tasks=args.expected_tasks, expected_pages=args.expected_pages
        )
    except (OSError, ValueError, UnicodeError) as exc:
        # No filenames, source URLs, citation snippets or reviewer decisions in logs.
        print("Q1I_REVIEW_GATE_FAIL_CLOSED=" + type(exc).__name__, file=sys.stderr)
        return 2
    print(json.dumps(report, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
