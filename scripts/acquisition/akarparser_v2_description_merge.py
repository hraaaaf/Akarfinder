#!/usr/bin/env python3
"""Q1E: merge verified Neon Recovery description supplements into a NEW private JSONL.gz.

Offline only. Never mutates source, writes to Neon, or prints listing text/URLs.
Input patches have numeric property_listing_id and description_snippet fields.
"""
from __future__ import annotations
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path

def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def merge(source: Path, patch_dir: Path, output: Path, *,
          expected_source_sha256: str, expected_rows: int,
          expected_descriptions: int) -> dict:
    if not source.is_file() or not patch_dir.is_dir():
        raise ValueError("SOURCE_OR_PRIVATE_PATCH_DIRECTORY_MISSING")
    if output.exists() or output.resolve() == source.resolve():
        raise FileExistsError("OUTPUT_MUST_BE_NEW")
    if sha256(source) != expected_source_sha256:
        raise ValueError("SOURCE_HASH_MISMATCH")
    parts = sorted(patch_dir.glob("description-????.jsonl"))
    if not parts:
        raise ValueError("NO_PRIVATE_DESCRIPTION_PATCHES")
    supplement: dict[str, str] = {}
    last_id = -1
    for part in parts:
        with part.open("r", encoding="utf-8") as file:
            for line in file:
                record = json.loads(line)
                key = str(record["property_listing_id"])
                if not key.isdecimal() or int(key) <= last_id:
                    raise ValueError("PATCH_IDENTITY_NOT_STRICTLY_NUMERIC_ASCENDING")
                value = record["description_snippet"]
                if not isinstance(value, str) or not value.strip():
                    raise ValueError("PATCH_DESCRIPTION_MISSING")
                supplement[key] = value
                last_id = int(key)
    if len(supplement) != expected_descriptions:
        raise ValueError("DESCRIPTION_COUNT_MISMATCH")
    staged = output.with_name(output.name + ".pending")
    if staged.exists():
        raise FileExistsError("UNRESOLVED_PENDING_OUTPUT")
    touched: set[str] = set()
    count = 0
    original_keys: set[str] | None = None
    try:
        with staged.open("xb") as binary:
            with gzip.GzipFile(fileobj=binary, filename="", mode="wb", mtime=0) as zipped:
                with gzip.open(source, "rt", encoding="utf-8") as file:
                    for line in file:
                        row = json.loads(line)
                        if not isinstance(row, dict):
                            raise ValueError("SOURCE_ROW_NOT_JSON_OBJECT")
                        if original_keys is None:
                            original_keys = set(row)
                        if set(row) != original_keys or "description_snippet" in row:
                            raise ValueError("SOURCE_SCHEMA_INCONSISTENT_OR_ALREADY_ENRICHED")
                        key = str(row["property_listing_id"])
                        if key in supplement:
                            if key in touched:
                                raise ValueError("DUPLICATE_PROPERTY_ID")
                            row["description_snippet"] = supplement[key]
                            touched.add(key)
                        else:
                            row["description_snippet"] = None
                        zipped.write((json.dumps(row, sort_keys=True, ensure_ascii=False,
                                                  separators=(",", ":")) + "\n").encode("utf-8"))
                        count += 1
        if count != expected_rows or len(touched) != expected_descriptions:
            raise ValueError("SOURCE_COUNT_OR_UNMATCHED_PATCH_IDS")
        if sha256(source) != expected_source_sha256:
            raise RuntimeError("SOURCE_CHANGED_DURING_MERGE")
        with gzip.open(staged, "rt", encoding="utf-8") as file:
            if sum(1 for _ in file) != expected_rows:
                raise RuntimeError("OUTPUT_GZIP_INVALID")
        # Exclusive hard-link refuses to overwrite an output created concurrently.
        os.link(staged, output)
    finally:
        staged.unlink(missing_ok=True)
    return {
        "rows": count, "descriptions_joined": len(touched),
        "descriptions_missing": count - len(touched),
        "original_unchanged": sha256(source) == expected_source_sha256,
        "original_sha256": expected_source_sha256,
        "output_sha256": sha256(output),
        "patch_parts": len(parts),
        "database_writes": 0, "publication_allowed": False,
        "independent_precision_verified": False,
    }

def main() -> None:
    ap = argparse.ArgumentParser(description="Private, read-only description recovery")
    ap.add_argument("--source", type=Path, required=True)
    ap.add_argument("--patch-dir", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--source-sha256", required=True)
    ap.add_argument("--expected-rows", type=int, required=True)
    ap.add_argument("--expected-descriptions", type=int, required=True)
    a = ap.parse_args()
    print(json.dumps(merge(a.source, a.patch_dir, a.out,
                           expected_source_sha256=a.source_sha256,
                           expected_rows=a.expected_rows,
                           expected_descriptions=a.expected_descriptions), sort_keys=True))

if __name__ == "__main__":
    main()