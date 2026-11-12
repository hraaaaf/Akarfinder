#!/usr/bin/env python3
"""Private H1 GitHub Actions orchestrator. No records in CI logs or artifacts."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

IMMUTABLE_SHA = "3eb2b8a7b7ec78832e764e014b387eabd5e74058"
EXPECTED = {"total": 151900, "priority_count": 53083, "remaining_count": 98817}
APPROVAL = "AKARFINDER_H1_DEV_READONLY_APPROVED"


def required(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def file_sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def check_runner(source: Path) -> tuple[str, Path]:
    secret = os.environ.get("Q1E_NEON_RECOVERY_READONLY_URL", "")
    required(bool(secret), "H1_CREDENTIAL_ABSENT")
    approved_runner = os.environ.get("H1_APPROVED_RUNNER_NAME", "")
    required(bool(approved_runner) and os.environ.get("RUNNER_NAME") == approved_runner,
             "H1_APPROVED_RUNNER_ABSENT")
    parent = os.environ.get("H1_PRIVATE_OUTPUT_PARENT", "")
    required(bool(parent), "H1_PRIVATE_DISK_ABSENT")
    root = Path(parent).resolve(strict=True)
    required(root.is_dir(), "H1_PRIVATE_DISK_ABSENT")
    workspace = Path(os.environ["GITHUB_WORKSPACE"]).resolve(strict=True)
    required(root != workspace and workspace not in root.parents, "H1_PRIVATE_DISK_INSIDE_GIT")
    required(root.drive and not str(root).startswith("\\\\"), "H1_PRIVATE_DISK_NOT_LOCAL")
    marker = root / ".h1-dev-readonly-approved"
    required(marker.is_file() and marker.read_text(encoding="utf-8").strip() == APPROVAL,
             "H1_RUNNER_APPROVAL_MISSING")
    required(shutil.disk_usage(root).free >= 5 * 1024**3, "H1_PRIVATE_DISK_LOW")
    required(shutil.which("psql") is not None, "H1_PSQL_MISSING")
    required(source.is_dir(), "H1_IMMUTABLE_SOURCE_MISSING")
    result = subprocess.run(["git", "-C", str(source), "rev-parse", "HEAD"],
                            capture_output=True, text=True, check=False)
    required(result.returncode == 0 and result.stdout.strip() == IMMUTABLE_SHA,
             "H1_SOURCE_SHA_MISMATCH")
    return secret, root


def verify(directory: Path, mode: str, stage: str) -> int:
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    snap = manifest["snapshot"]
    required(all(int(snap[k]) == v for k, v in EXPECTED.items()), "H1_SNAPSHOT_DRIFT")
    required(manifest["mode"] == mode and manifest["batch_size"] == 1000,
             "H1_BATCH_PARAMETERS_CHANGED")
    required(manifest["db_writes"] == 0 and manifest["source_requests"] == 0
             and manifest["publication_authorized"] is False, "H1_UNSAFE_MANIFEST")
    batches = manifest["batches"]
    required(bool(batches) and batches[0]["count"] == 1000, "H1_CANARY_NOT_PROVEN")
    total, names = 0, set()
    for batch in batches:
        names.add(batch["input_file"])
        raw = directory / "inputs" / batch["input_file"]
        report_path = directory / "parsed" / batch["id"] / "aggregate_report.json"
        required(raw.is_file() and file_sha(raw) == batch["input_sha256"],
                 "H1_INPUT_SHA_MISMATCH")
        required(report_path.is_file() and file_sha(report_path) == batch["report_sha256"],
                 "H1_REPORT_SHA_MISMATCH")
        report = json.loads(report_path.read_text(encoding="utf-8"))
        safety = report["safety"]
        required(report["input_count"] == batch["count"]
                 and not report["status_counts"].get("errors", 0)
                 and safety["db_writes"] == 0
                 and safety["network_requests"] == 0
                 and safety["neon_admission_authorized"] is False,
                 "H1_REAL_REPORT_INVALID")
        total += batch["count"]
    required(names == {p.name for p in (directory / "inputs").glob("batch-*.jsonl")},
             "H1_UNKNOWN_OR_ORPHAN_INPUT")
    required(total == manifest["processed"], "H1_MANIFEST_COUNT_MISMATCH")
    expected = EXPECTED["priority_count" if mode == "priority" else "remaining_count"]
    if stage == "canary":
        required(total == 1000 and len(batches) == 1, "H1_CANARY_COUNT_INVALID")
    elif stage == "complete":
        required(total == expected and manifest["complete"] is True,
                 "H1_COHORT_NOT_COMPLETE")
    else:
        required(1000 <= total <= expected, "H1_RESUME_PREFIX_INVALID")
    print(f"H1_VERIFIED_{mode.upper()}_{stage.upper()}={total}", flush=True)
    return total


def execute(secret: str, source: Path, parent: Path) -> None:
    sys.path.insert(0, str(source / "scripts" / "acquisition"))
    import akarparser_v3_historical_neon_batches as h1

    priority = parent / "h1-20261112-priority"
    remaining = parent / "h1-20261112-remaining"
    if priority.exists():
        verify(priority, "priority", "checkpoint")
    else:
        h1.run(secret, priority, mode="priority", batch_size=1000, max_batches=1)
        verify(priority, "priority", "canary")

    h1.run(secret, priority, mode="priority", batch_size=1000, resume=True)
    p = verify(priority, "priority", "complete")
    if remaining.exists():
        verify(remaining, "remaining", "checkpoint")
        h1.run(secret, remaining, mode="remaining", batch_size=1000, resume=True)
    else:
        h1.run(secret, remaining, mode="remaining", batch_size=1000)
    r = verify(remaining, "remaining", "complete")
    required(p + r == EXPECTED["total"], "H1_TOTAL_MISMATCH")
    print("H1_DEV_COMPLETE=151900; DB_WRITES=0; PUBLICATION=0", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    args = parser.parse_args()
    try:
        source = args.source.resolve(strict=True)
        secret, parent = check_runner(source)
        print("H1_PRIVATE_PREFLIGHT_OK", flush=True)
        execute(secret, source, parent)
    except Exception:
        raise SystemExit("H1_FAIL_CLOSED_PRIVATE_DIAGNOSTICS_SUPPRESSED") from None


if __name__ == "__main__":
    main()
