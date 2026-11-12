#!/usr/bin/env python3
"""Private, offline and fail-closed field benchmark for AkarParser V3.

Compares structured V3 outputs against independently annotated raw captures.
Never downloads pages, uploads source material, authorizes rights, or writes DB.
Output contains ONLY aggregate statistics, never source URLs or field values.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import urlparse

CORE = ("title", "city", "district", "price_mad", "surface_total_m2",
        "property_type", "transaction_type")
OPTIONAL = ("bedrooms_count",)
FIELDS = CORE + OPTIONAL
NUMERIC = {"price_mad", "surface_total_m2", "bedrooms_count"}
STATES = {"present", "absent", "uncertain"}
COUNTERS = ("truth_present", "truth_absent", "uncertain", "predicted_present",
            "correct", "incorrect", "hallucinated", "missed", "correct_absent")


def private(path: Path) -> Path:
    resolved = path.resolve()
    if path.is_symlink() or any((parent / ".git").exists() for parent in
                                (resolved.parent, *resolved.parents)):
        raise ValueError("PRIVATE_PATH_REQUIRED_OUTSIDE_GIT")
    return resolved


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def jsonl(path: Path):
    opener = gzip.open if path.name.endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            if len(line) > 3_000_000:
                raise ValueError("RECORD_TOO_LARGE")
            try:
                record = json.loads(line)
            except ValueError as exc:
                raise ValueError("INVALID_JSONL") from exc
            if not isinstance(record, dict):
                raise ValueError("RECORD_NOT_OBJECT")
            yield line_number, record


def domain(url: str) -> str:
    parsed = urlparse(url if isinstance(url, str) else "")
    if parsed.scheme not in ("https", "http") or not parsed.hostname or parsed.username:
        raise ValueError("INVALID_CAPTURE_URL")
    return parsed.hostname.lower().removeprefix("www.")


def file_ref(record: dict) -> tuple[str, int]:
    ref = record.get("input_ref")
    if not isinstance(ref, dict) or not isinstance(ref.get("file"), str):
        raise ValueError("MISSING_V3_INPUT_REF")
    line = ref.get("line")
    if not isinstance(line, int) or isinstance(line, bool) or line < 1:
        raise ValueError("INVALID_INPUT_LINE")
    return ref["file"], line


def nonempty(value) -> bool:
    return value is not None and value != "" and value != [] and value != {}


def normalized(value, field: str):
    if field in NUMERIC:
        if isinstance(value, bool):
            return None
        try:
            number = float(value)
            return number if 0 <= number < 1e12 else None
        except (ValueError, TypeError, OverflowError):
            return None
    if not isinstance(value, str):
        return None
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def equivalent(predicted, expected, field: str) -> bool:
    left, right = normalized(predicted, field), normalized(expected, field)
    if left is None or right is None:
        return False
    return abs(left - right) <= 0.01 if field in NUMERIC else left == right


def label_fields(label: dict) -> dict:
    if label.get("reviewer_blind_to_parser") is not True:
        raise ValueError("INDEPENDENT_REVIEW_REQUIRED")
    if not isinstance(label.get("reviewer_id"), str) or not label["reviewer_id"].strip():
        raise ValueError("REVIEWER_ID_REQUIRED")
    if not isinstance(label.get("permission_evidence_ref"), str) or not label["permission_evidence_ref"].strip():
        raise ValueError("PERMISSION_REFERENCE_REQUIRED")
    fields = label.get("fields")
    if not isinstance(fields, dict) or any(field not in fields for field in CORE):
        raise ValueError("ALL_CORE_FIELDS_MUST_BE_LABELLED")
    for key, annotation in fields.items():
        if key not in FIELDS or not isinstance(annotation, dict):
            raise ValueError("UNSUPPORTED_ANNOTATION")
        state = annotation.get("state")
        if state not in STATES:
            raise ValueError("INVALID_ANNOTATION_STATE")
        if not isinstance(annotation.get("evidence_ref"), str) or not annotation["evidence_ref"].strip():
            raise ValueError("ANNOTATION_EVIDENCE_REQUIRED")
        if state == "present" and normalized(annotation.get("value"), key) is None:
            raise ValueError("INVALID_TRUTH_VALUE")
        if state != "present" and nonempty(annotation.get("value")):
            raise ValueError("VALUE_WITHOUT_PRESENT_STATE")
    return fields


def metrics(values: Counter) -> dict:
    c = {key: values[key] for key in COUNTERS}
    evaluated = c["truth_present"] + c["truth_absent"]
    predicted = c["correct"] + c["incorrect"] + c["hallucinated"]
    c["exact_precision"] = round(c["correct"] / predicted, 4) if predicted else None
    c["exact_recall"] = round(c["correct"] / c["truth_present"], 4) if c["truth_present"] else None
    c["prediction_coverage"] = round(c["predicted_present"] / evaluated, 4) if evaluated else None
    return c


def run(parsed: Path, aggregate: Path, truth: Path, output: Path, *,
        allow_subset: bool = False) -> dict:
    parsed, aggregate, truth, output = map(private, (parsed, aggregate, truth, output))
    if output.exists():
        raise FileExistsError("REPORT_ALREADY_EXISTS")
    if not all(p.is_file() for p in (parsed, aggregate, truth)):
        raise ValueError("INPUT_FILES_REQUIRED")
    with aggregate.open(encoding="utf-8") as handle:
        manifest = json.load(handle)
    if not isinstance(manifest, dict) or not isinstance(manifest.get("input_files"), dict):
        raise ValueError("INVALID_V3_MANIFEST")
    if manifest.get("output_sha256", {}).get("all") != sha256(parsed):
        raise ValueError("PARSED_OUTPUT_HASH_MISMATCH")

    records = {}
    for _, record in jsonl(parsed):
        key = file_ref(record)
        if key in records:
            raise ValueError("DUPLICATE_PARSED_INPUT_REF")
        records[key] = record

    labels = {}
    for _, label in jsonl(truth):
        key = file_ref({"input_ref": {"file": label.get("source_file"),
                                     "line": label.get("source_line")}})
        if key in labels:
            raise ValueError("DUPLICATE_TRUTH_INPUT_REF")
        file_meta = manifest["input_files"].get(key[0])
        if not isinstance(file_meta, dict) or file_meta.get("sha256") != label.get("source_file_sha256"):
            raise ValueError("TRUTH_SOURCE_HASH_MISMATCH")
        if not isinstance(label.get("source_url"), str) or not label["source_url"]:
            raise ValueError("TRUTH_SOURCE_URL_REQUIRED")
        label_fields(label)
        labels[key] = label

    matching_scope = (set(labels).issubset(records) if allow_subset
                      else set(labels) == set(records))
    if not labels or not records or not matching_scope:
        raise ValueError("TRUTH_AND_PARSED_INPUTS_MUST_MATCH_EXACTLY")

    overall = defaultdict(Counter)
    by_portal = defaultdict(lambda: defaultdict(Counter))
    source_count = Counter()
    for key, label in labels.items():
        record = records[key]
        ref = record["input_ref"]
        if ref.get("file_sha256") != label["source_file_sha256"]:
            raise ValueError("PARSED_INPUT_HASH_MISMATCH")
        raw_url = record.get("source", {}).get("source_url")
        if raw_url != label["source_url"]:
            raise ValueError("SOURCE_URL_MISMATCH")
        portal = domain(raw_url)
        if portal != label.get("portal") or portal != record["source"].get("domain", "").removeprefix("www."):
            raise ValueError("SOURCE_PORTAL_MISMATCH")
        fields = label["fields"]
        extracted = record.get("fields")
        if not isinstance(extracted, dict):
            raise ValueError("INVALID_PARSED_FIELDS")
        source_count[portal] += 1
        for field, annotation in fields.items():
            state = annotation["state"]
            prediction = extracted.get(field)
            present = nonempty(prediction)
            for counter in (overall[field], by_portal[portal][field]):
                if state == "uncertain":
                    counter["uncertain"] += 1
                    continue
                counter["truth_present" if state == "present" else "truth_absent"] += 1
                if present:
                    counter["predicted_present"] += 1
                if state == "absent":
                    counter["hallucinated" if present else "correct_absent"] += 1
                elif not present:
                    counter["missed"] += 1
                elif equivalent(prediction, annotation["value"], field):
                    counter["correct"] += 1
                else:
                    counter["incorrect"] += 1

    result = {
        "schema_version": 1,
        "record_count": len(labels) if allow_subset else len(records),
        "parsed_universe_record_count": len(records),
        "comparison_scope": "explicit_labelled_subset" if allow_subset else "complete_input",
        "portal_counts": dict(sorted(source_count.items())),
        "overall": {f: metrics(c) for f, c in sorted(overall.items())},
        "by_portal": {portal: {f: metrics(c) for f, c in sorted(by_portal[portal].items())}
                      for portal in sorted(by_portal)},
        "safety": {
            "raw_source_content_in_report": False,
            "rights_independently_verified": False,
            "annotator_independence_independently_verified": False,
            "listing_freshness_verified": False,
            "neon_admission_authorized": False,
            "certified_for_production": False,
            "subset_is_not_full_validation": allow_subset,
        },
        "method": "exact normalized textual/numeric agreement on manually labelled, source-matched observations",
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as handle:
        json.dump(result, handle, indent=2, ensure_ascii=False, sort_keys=True)
    return result


def main():
    p = argparse.ArgumentParser(description="Offline AkarParser V3 ground-truth benchmark (private)")
    p.add_argument("--parsed", type=Path, required=True, help="V3 all.jsonl.gz")
    p.add_argument("--manifest", type=Path, required=True, help="V3 aggregate_report.json")
    p.add_argument("--truth", type=Path, required=True, help="independent private truth.jsonl")
    p.add_argument("--out", type=Path, required=True, help="new private aggregate-only report path")
    p.add_argument("--allow-labelled-subset", action="store_true",
                   help="compare only explicitly annotated source-matched records; never certify full corpus")
    args = p.parse_args()
    report = run(args.parsed, args.manifest, args.truth, args.out,
                 allow_subset=args.allow_labelled_subset)
    print(json.dumps({"record_count": report["record_count"], "portals": report["portal_counts"],
                      "certified_for_production": False}, sort_keys=True))


if __name__ == "__main__":
    main()
