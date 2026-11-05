#!/usr/bin/env python3
"""Offline Supabase fresh-start audit. Static evidence only; NEVER runs SQL or connects to a DB."""
from __future__ import annotations

import argparse
from collections import defaultdict
import json
import re
from pathlib import Path

MIGRATION_NAME = re.compile(r"^(\d{14})_[A-Za-z0-9_.-]+\.sql$")
CREATE_TABLE = re.compile(
    r"\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(listing_sources|property_listings)\b",
    re.IGNORECASE,
)
BASE_REFERENCE = re.compile(
    r"\b(?:ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?|REFERENCES\s+)(?:public\.)?(listing_sources|property_listings)\b",
    re.IGNORECASE,
)
BASE_TABLES = ("listing_sources", "property_listings")


def without_comments(sql: str) -> str:
    # Heuristic static scan; NOT a SQL parser and NOT a substitute for replay.
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.DOTALL)
    return re.sub(r"--[^\n]*", " ", sql)


def audit_migrations(root: Path) -> dict:
    if not root.is_dir():
        raise ValueError(f"Migration directory missing: {root}")

    files = sorted(root.glob("*.sql"))
    versions: dict[str, list[str]] = defaultdict(list)
    malformed = []
    created = {table: [] for table in BASE_TABLES}
    referenced = {table: [] for table in BASE_TABLES}

    for file in files:
        match = MIGRATION_NAME.fullmatch(file.name)
        if match is None:
            malformed.append(file.name)
        else:
            versions[match.group(1)].append(file.name)

        sql = without_comments(file.read_text(encoding="utf-8"))
        for found in CREATE_TABLE.finditer(sql):
            created[found.group(1).lower()].append(file.name)
        for found in BASE_REFERENCE.finditer(sql):
            referenced[found.group(1).lower()].append(file.name)

    collisions = [
        {"version": version, "files": sorted(names)}
        for version, names in sorted(versions.items())
        if len(names) > 1
    ]
    missing = [
        {"table": table, "first_static_reference": sorted(referenced[table])[0],
         "reference_files": len(set(referenced[table]))}
        for table in BASE_TABLES if referenced[table] and not created[table]
    ]
    result = {
        "mode": "offline_static_only",
        "sql_executed": False,
        "database_connected": False,
        "remote_project_modified": False,
        "replay_verified": False,
        "migration_file_count": len(files),
        "distinct_named_versions": len(versions),
        "invalid_filenames": sorted(malformed),
        "duplicate_versions": collisions,
        "bootstrap_tables": {
            table: {
                "static_create_file_count": len(set(created[table])),
                "static_reference_file_count": len(set(referenced[table])),
            } for table in BASE_TABLES
        },
        "missing_static_bootstrap": missing,
        "notes": [
            "Static scan is heuristic; SQL statements may be conditional or dynamic.",
            "Supabase's auth/storage schemas require a Supabase-compatible local environment.",
            "A PASS of this audit does not prove migrations replay or data correctness.",
            "Never apply or rename existing migration files in a remote project based only on this report.",
        ],
    }
    result["clean_bootstrap_status"] = (
        "STATIC_BLOCKERS_FOUND" if collisions or malformed or missing else "STATIC_CHECKS_CLEAR_REPLAY_NOT_TESTED"
    )
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("supabase/migrations"))
    parser.add_argument("--output", type=Path, help="Aggregated JSON report path")
    parser.add_argument("--strict", action="store_true", help="Exit 2 if static blockers are found")
    args = parser.parse_args()
    result = audit_migrations(args.root)
    data = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(data, encoding="utf-8")
    print(data)
    return 2 if args.strict and result["clean_bootstrap_status"] == "STATIC_BLOCKERS_FOUND" else 0


if __name__ == "__main__":
    raise SystemExit(main())
