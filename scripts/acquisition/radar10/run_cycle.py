#!/usr/bin/env python3
"""Akarfinder V646 verified snapshot -> actual V3 -> private staging.

Never publishes listings. Dry-run by default. No source crawling unless
separately approved, and never reuses unverified exporter files.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone, timedelta
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit

ACQUISITION = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ACQUISITION))
from akarparser_v3_v646_bridge import bridge_v646_row
import akarparser_v3_raw_bulk as v3
from radar10.ingest import load_v3, apply_batch, snapshot_sha, PROJECT_REF


def target_is_pinned(dsn: str) -> bool:
    try:
        parts = urlsplit(dsn)
        if parts.scheme not in ("postgres", "postgresql") or not parts.password:
            return False
        if parts.hostname == f"db.{PROJECT_REF}.supabase.co":
            return parts.username == "radar10_runtime"
        return bool(parts.hostname and parts.hostname.endswith(".pooler.supabase.com")
                    and parts.username == f"radar10_runtime.{PROJECT_REF}")
    except ValueError:
        return False


def current_cycle_only(rows: list[dict], started_at: datetime, ended_at: datetime) -> list[dict]:
    """V646 last_seen identifies this producer cycle, NEVER publication freshness."""
    if started_at.tzinfo is None or ended_at.tzinfo is None:
        raise ValueError("NAIVE_CLOCK")
    selected = []
    for item in rows:
        value = item.get("last_seen")
        if not isinstance(value, str):
            raise ValueError("SOURCE_OBSERVATION_TIMESTAMP_MISSING")
        try:
            observed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError("SOURCE_OBSERVATION_TIMESTAMP_INVALID") from exc
        if observed.tzinfo is None or observed > ended_at + timedelta(seconds=5):
            raise ValueError("SOURCE_OBSERVATION_TIMESTAMP_INVALID")
        if observed >= started_at - timedelta(seconds=2):
            selected.append(item)
    if not selected:
        raise ValueError("NO_SAME_CYCLE_OBSERVATIONS")
    return selected


def verified_v646(root: Path, *, collect: bool) -> list[dict]:
    root = root.resolve()
    code_root = Path(os.getenv("RADAR_V646_CODE_ROOT", str(root))).resolve()
    source, reader = code_root / "akarfinder_scraper.py", code_root / "verify_v646_publication.py"
    if not source.is_file() or not reader.is_file():
        raise ValueError("V646_PINNED_INSTALLATION_REQUIRED")
    if collect and (code_root == root or code_root.is_relative_to(root) or root.is_relative_to(code_root)):
        raise PermissionError("SEPARATE_IMMUTABLE_CODE_ROOT_REQUIRED")
    if collect:
        started_at = datetime.now(timezone.utc)
        if os.getenv("RADAR_LIVE_COLLECTION_APPROVED") != "approved":
            raise PermissionError("LIVE_SOURCE_NO_GO")
        result = subprocess.run([sys.executable, str(source), "--engine", "http"],
                                cwd=root, capture_output=True, timeout=240, check=False)
        if result.returncode:
            raise RuntimeError(f"V646_SOURCE_EXIT_{result.returncode}")
    result = subprocess.run([sys.executable, str(reader), "--root", str(root),
                             "--read-export", "akarfinder_data.json"],
                            cwd=root, capture_output=True, timeout=35, check=False)
    if result.returncode or len(result.stdout) > 16_000_000:
        raise RuntimeError("VERIFIED_SNAPSHOT_UNAVAILABLE")
    data = json.loads(result.stdout)
    if not isinstance(data, list) or len(data) > 1000:
        raise ValueError("SNAPSHOT_SHAPE_OR_SIZE")
    return current_cycle_only(data, started_at, datetime.now(timezone.utc)) if collect else data


def perform(root: Path, *, collect: bool = False, commit: bool = False) -> dict:
    if commit and not collect:
        raise PermissionError("STAGING_REQUIRES_NEW_SOURCE_CYCLE")
    if commit and os.getenv("RADAR_STAGING_WRITE_ENABLED") != "approved":
        raise PermissionError("PRIVATE_STAGING_NO_GO")
    dsn = os.getenv("RADAR_DATABASE_URL", "")
    if commit and not target_is_pinned(dsn):
        raise PermissionError("TARGET_SUPABASE_NOT_PINNED")
    signed_rows = verified_v646(root, collect=collect)
    mapped = [bridge_v646_row(row) for row in signed_rows]
    with tempfile.TemporaryDirectory(prefix="akar-radar10-") as directory:
        directory = Path(directory)
        source = directory / "v646-authenticated.jsonl"
        source.write_text("".join(json.dumps(row, ensure_ascii=False,
                   sort_keys=True) + "\n" for row in mapped), encoding="utf-8")
        output = directory / "v3-output"
        report = v3.run(source, output, as_of=datetime.now(timezone.utc))
        if (report["safety"]["network_requests"] != 0 or
            report["safety"]["db_writes"] != 0):
            raise RuntimeError("PARSER_OFFLINE_GUARD_FAILED")
        rows, audit = load_v3(output / "all.jsonl.gz")
        summary = {"status": "private_staging" if commit else "dry_run",
                   "observed": audit["observed"], "accepted": audit["accepted"],
                   "duplicates": audit["duplicates"], "rejected": audit["rejected"],
                   "snapshot_sha256": snapshot_sha(rows),
                   "production_writes": 0, "publication_writes": 0}
        if not commit:
            return {**summary, "db_writes": 0}
        import psycopg
        cert = Path(os.getenv("RADAR_DB_CA_CERT", ""))
        if not cert.is_file():
            raise PermissionError("DATABASE_CA_CERT_REQUIRED")
        with psycopg.connect(dsn, connect_timeout=6, autocommit=True,
                             sslmode="verify-full", sslrootcert=str(cert),
                             application_name="akarfinder-radar10") as conn:
            return {**summary, **apply_batch(conn, rows, audit)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Akarfinder 10-minute private staging")
    parser.add_argument("--v646-root", type=Path, required=True)
    parser.add_argument("--collect-v646", action="store_true")
    parser.add_argument("--commit-private-staging", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(perform(args.v646_root, collect=args.collect_v646,
                    commit=args.commit_private_staging), sort_keys=True))
        return 0
    except Exception as exc:
        # No password, raw page, candidate or other sensitive value in logs.
        print(json.dumps({"status": "failed", "exception": type(exc).__name__,
                          "reason": str(exc) if isinstance(exc, PermissionError) else "PRIVATE_DIAGNOSTICS_REQUIRED",
                          "publication_writes": 0}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
