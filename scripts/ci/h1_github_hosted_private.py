#!/usr/bin/env python3
"""GitHub-hosted H1 runner with private Supabase checkpoints; no raw logs."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import subprocess
import sys
import tempfile
from typing import Any
from h1_supabase_storage import SupabasePrivateStore, MAX_RUN_BYTES, PROJECT_REF, BUCKET

IMMUTABLE_SOURCE_SHA = "3eb2b8a7b7ec78832e764e014b387eabd5e74058"
EXPECTED = {"total": 151900, "priority_count": 53083, "remaining_count": 98817}
BATCH_SIZE = 1000
TOTAL_BATCHES = (EXPECTED["total"] + BATCH_SIZE - 1) // BATCH_SIZE
REMAINING_BATCHES_AFTER_CANARY = TOTAL_BATCHES - 1  # 151, final batch = 900 rows
APPROVAL_ACTOR = "hraaaaf"
STORAGE_PREFIX = "akarfinder/h1"
MANIFEST_VERSION = "akarparser-v3-h1-supabase-v1"


def require(condition: bool, code: str) -> None:
    if not condition:
        raise RuntimeError(code)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def canonical_json(data: dict[str, Any]) -> bytes:
    return (json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")


def batch_count(index: int) -> int:
    require(isinstance(index, int) and 0 <= index < TOTAL_BATCHES, "H1_BATCH_INDEX_INVALID")
    return min(BATCH_SIZE, EXPECTED["total"] - index * BATCH_SIZE)


def batch_id(index: int) -> str:
    batch_count(index)
    return f"batch-{index:03d}"


def validate_run_id(value: str) -> str:
    require(bool(re.fullmatch(r"[0-9]{1,20}", value)), "H1_STORAGE_RUN_ID_INVALID")
    return value


def object_key(run_id: str, suffix: str) -> str:
    validate_run_id(run_id)
    path = PurePosixPath(suffix)
    require(not path.is_absolute() and ".." not in path.parts and "" not in path.parts,
            "H1_STORAGE_KEY_INVALID")
    return f"{STORAGE_PREFIX}/run-{run_id}/{path.as_posix()}"


def gate_parser_report(report: dict[str, Any], expected_count: int) -> None:
    require(int(report.get("input_count", -1)) == expected_count, "H1_REPORT_ROW_COUNT_INVALID")
    statuses = report.get("status_counts") or {}
    require(int(statuses.get("input", -1)) == expected_count, "H1_REPORT_ACCOUNTING_INPUT_INVALID")
    require(int(statuses.get("errors", 0)) == 0, "H1_CANARY_PARSER_ERRORS")
    accounted = int(statuses.get("errors", 0)) + sum(
        int(statuses.get(key, 0)) for key in (
            "ready_internal", "requires_manual_review", "complete_requires_freshness",
            "partial", "source_snippet_only", "quarantine",
        )
    )
    require(accounted == expected_count, "H1_REPORT_ACCOUNTING_STATUS_INVALID")
    safety = report.get("safety") or {}
    require(safety.get("db_writes") == 0 and safety.get("network_requests") == 0,
            "H1_UNSAFE_PARSER_REPORT")
    require(safety.get("neon_admission_authorized") is False
            and safety.get("source_rights_verified") is False
            and safety.get("independent_field_precision_certified") is False,
            "H1_ADMISSION_OR_RIGHTS_FLAG_INVALID")


def verify_batch_record(record: dict[str, Any], index: int, run_id: str) -> None:
    require(record.get("index") == index and record.get("id") == batch_id(index),
            "H1_CHECKPOINT_BATCH_ORDER_INVALID")
    require(int(record.get("count", -1)) == batch_count(index), "H1_CHECKPOINT_BATCH_COUNT_INVALID")
    require(isinstance(record.get("first_id"), int) and isinstance(record.get("last_id"), int)
            and record["first_id"] <= record["last_id"], "H1_CHECKPOINT_ID_RANGE_INVALID")
    files = record.get("files")
    require(isinstance(files, list) and bool(files), "H1_CHECKPOINT_FILES_MISSING")
    prefix = object_key(run_id, f"batches/{index:03d}") + "/"
    input_key = prefix + "input/rows.jsonl.gz"
    report_key = prefix + "parsed/aggregate_report.json"
    seen, kinds = set(), {}
    for item in files:
        require(isinstance(item, dict), "H1_CHECKPOINT_FILE_INVALID")
        key = str(item.get("key") or "")
        kind = item.get("kind")
        require(key.startswith(prefix) and ".." not in PurePosixPath(key).parts
                and key not in seen, "H1_CHECKPOINT_KEY_INVALID")
        seen.add(key)
        require(kind in ("raw_input", "aggregate_report", "parser_output"),
                "H1_CHECKPOINT_KIND_INVALID")
        require((kind == "raw_input" and key == input_key)
                or (kind == "aggregate_report" and key == report_key)
                or (kind == "parser_output" and key.startswith(prefix + "parsed/")
                    and key != report_key), "H1_CHECKPOINT_KEY_KIND_MISMATCH")
        require(re.fullmatch(r"[0-9a-f]{64}", str(item.get("sha256") or "")) is not None,
                "H1_CHECKPOINT_SHA_INVALID")
        require(int(item.get("size", -1)) >= 0, "H1_CHECKPOINT_SIZE_INVALID")
        if kind in ("raw_input", "aggregate_report"):
            require(kind not in kinds, "H1_CHECKPOINT_DUPLICATE_REQUIRED_FILE")
            kinds[kind] = item
    require(set(kinds) == {"raw_input", "aggregate_report"},
            "H1_CHECKPOINT_REQUIRED_FILES_MISSING")
    require(record.get("input_sha256") == kinds["raw_input"]["sha256"]
            and record.get("report_sha256") == kinds["aggregate_report"]["sha256"],
            "H1_CHECKPOINT_RECORDED_SHA_MISMATCH")


def checkpoint_key(run_id: str, index: int) -> str:
    require(0 <= index <= TOTAL_BATCHES + 1, "H1_CHECKPOINT_INDEX_INVALID")
    return object_key(run_id, f"checkpoints/{index:03d}.json")


def load_source(source: Path):
    require(source.is_dir(), "H1_IMMUTABLE_SOURCE_MISSING")
    done = subprocess.run(["git", "-C", str(source), "rev-parse", "HEAD"],
                          capture_output=True, text=True, check=False)
    require(done.returncode == 0 and done.stdout.strip() == IMMUTABLE_SOURCE_SHA,
            "H1_IMMUTABLE_SOURCE_SHA_MISMATCH")
    sys.path.insert(0, str(source / "scripts" / "acquisition"))
    try:
        import akarparser_v3_historical_neon_batches as h1
        from akarparser_v3_raw_bulk import run as parse_batch
    except Exception:
        raise RuntimeError("H1_TRUSTED_PARSER_IMPORT_FAILED") from None
    return h1, parse_batch


def all_rows_page_sql(h1: Any, cursor: int, highwater: int, limit: int) -> str:
    require(0 <= cursor <= highwater and 1 <= limit <= BATCH_SIZE, "H1_QUERY_PARAMETERS_INVALID")
    original = h1.select_sql("priority", cursor, highwater, limit)
    predicate = "AND (" + h1.PRIORITY + ")"
    require(original.count(predicate) == 1, "H1_QUERY_CONTRACT_CHANGED")
    sql = original.replace(predicate, "AND TRUE")
    return sql


def make_storage_manifest(run_id: str, snapshot: dict[str, Any], batches: list[dict[str, Any]],
                          *, complete: bool, previous_checkpoint_sha256: str | None = None) -> dict[str, Any]:
    processed = sum(int(x["count"]) for x in batches)
    status = Counter()
    for x in batches:
        status.update(x.get("status_counts", {}))
    return {
        "version": MANIFEST_VERSION,
        "run_id": run_id,
        "previous_checkpoint_sha256": previous_checkpoint_sha256,
        "source_commit": IMMUTABLE_SOURCE_SHA,
        "workflow_commit": os.environ.get("GITHUB_SHA", ""),
        "snapshot": snapshot,
        "batch_size": BATCH_SIZE,
        "total_batches": TOTAL_BATCHES,
        "remaining_batches_after_canary": REMAINING_BATCHES_AFTER_CANARY,
        "batches": batches,
        "processed": processed,
        "status_counts": dict(sorted(status.items())),
        "db_writes": 0,
        "source_requests": 0,
        "neon_admission_authorized": False,
        "publication_authorized": False,
        "canary_passed": bool(batches and batches[0].get("canary_passed")),
        "complete": complete,
    }


def verify_checkpoint(store: SupabasePrivateStore, manifest: dict[str, Any], run_id: str,
                      snapshot: dict[str, Any], temp_root: Path) -> list[dict[str, Any]]:
    require(manifest.get("version") == MANIFEST_VERSION and manifest.get("run_id") == run_id,
            "H1_RESUME_MANIFEST_VERSION_OR_RUN_MISMATCH")
    require(manifest.get("source_commit") == IMMUTABLE_SOURCE_SHA
            and manifest.get("workflow_commit") == os.environ.get("GITHUB_SHA", "")
            and manifest.get("snapshot") == snapshot, "H1_RESUME_SOURCE_SNAPSHOT_MISMATCH")
    require(manifest.get("batch_size") == BATCH_SIZE and manifest.get("total_batches") == TOTAL_BATCHES,
            "H1_RESUME_BATCH_CONTRACT_MISMATCH")
    batches = manifest.get("batches") or []
    require(len(batches) <= TOTAL_BATCHES, "H1_RESUME_BATCH_OVERFLOW")
    if manifest.get("complete") is True:
        require(len(batches) == TOTAL_BATCHES and manifest.get("processed") == EXPECTED["total"],
                "H1_RESUME_COMPLETION_FLAG_INVALID")
    previous_last = None
    for index, record in enumerate(batches):
        verify_batch_record(record, index, run_id)
        require(index > 0 or record.get("canary_passed") is True, "H1_RESUME_CANARY_NOT_PASSED")
        if previous_last is not None:
            require(record["first_id"] > previous_last, "H1_RESUME_ID_RANGE_OVERLAP")
        previous_last = record["last_id"]
        for item in record["files"]:
            store.verify_object(item)
        report_items = [x for x in record["files"] if x.get("kind") == "aggregate_report"]
        require(len(report_items) == 1, "H1_RESUME_REPORT_REFERENCE_INVALID")
        data = store.download(report_items[0]["key"], temp_root / f"resume-report-{index:03d}.json",
                              report_items[0]["sha256"])
        try:
            report = json.loads(data)
        except ValueError:
            raise RuntimeError("H1_RESUME_REPORT_INVALID") from None
        gate_parser_report(report, int(record["count"]))
    expected_processed = sum(batch_count(i) for i in range(len(batches)))
    require(int(manifest.get("processed", -1)) == expected_processed, "H1_RESUME_COUNT_INVALID")
    require(manifest.get("db_writes") == 0 and manifest.get("source_requests") == 0
            and manifest.get("neon_admission_authorized") is False
            and manifest.get("publication_authorized") is False, "H1_RESUME_SAFETY_INVALID")
    if batches:
        require(manifest.get("canary_passed") is True, "H1_RESUME_CANARY_NOT_PASSED")
    return batches


def query_snapshot(h1: Any, secret: str) -> tuple[dict[str, str], dict[str, Any]]:
    env = h1.checked_env(secret)
    snapshot = h1.checked_snapshot(h1.psql_lines, env)
    require(all(int(snapshot.get(k, -1)) == v for k, v in EXPECTED.items()), "H1_SOURCE_SNAPSHOT_DRIFT")
    return env, snapshot


def execute_batch(h1: Any, parse_batch: Any, env: dict[str, str], snapshot: dict[str, Any],
                  index: int, temp_root: Path, store: SupabasePrivateStore, run_id: str) -> dict[str, Any]:
    expected = batch_count(index)
    cursor = 0 if index == 0 else int(snapshot.get("last_id_before_batch", 0))
    # Resume cursor is provided by the previous verified batch by the caller.
    sql = all_rows_page_sql(h1, cursor, int(snapshot["highwater"]), BATCH_SIZE)
    lines = h1.psql_lines(sql, env)
    require(len(lines) == expected, "H1_BATCH_SOURCE_COUNT_INVALID")
    try:
        rows = [h1.normalize(json.loads(line)) for line in lines]
    except Exception:
        raise RuntimeError("H1_BATCH_NORMALIZATION_FAILED") from None
    ids = [int(row["id"]) for row in rows]
    require(ids == sorted(set(ids)) and ids[0] > cursor and ids[-1] <= int(snapshot["highwater"]),
            "H1_BATCH_KEYSET_ORDER_INVALID")
    directory = temp_root / batch_id(index)
    input_dir = directory / "input"
    output_dir = directory / "parsed"
    input_dir.mkdir(parents=True, exist_ok=False)
    output_dir.mkdir(parents=True, exist_ok=False)
    raw_path = input_dir / "rows.jsonl.gz"
    with raw_path.open("xb") as raw_stream:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw_stream, mtime=0) as zipped:
            for row in rows:
                zipped.write((json.dumps(row, ensure_ascii=False, sort_keys=True,
                                         separators=(",", ":")) + "\n").encode("utf-8"))
    report = parse_batch(raw_path, output_dir, as_of=datetime.fromisoformat(snapshot['as_of']))
    gate_parser_report(report, expected)
    require(report.get("input_count") == expected, "H1_BATCH_REPORT_COUNT_INVALID")
    files = []
    input_key = object_key(run_id, f"batches/{index:03d}/input/rows.jsonl.gz")
    files.append({**store.put_file(raw_path, input_key), "kind": "raw_input"})
    for path in sorted(output_dir.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(output_dir).as_posix()
        kind = "aggregate_report" if path.name == "aggregate_report.json" else "parser_output"
        key = object_key(run_id, f"batches/{index:03d}/parsed/{rel}")
        files.append({**store.put_file(path, key), "kind": kind})
    require(sum(x["kind"] == "aggregate_report" for x in files) == 1,
            "H1_BATCH_AGGREGATE_REPORT_MISSING")
    record = {
        "id": batch_id(index), "index": index, "count": expected,
        "first_id": ids[0], "last_id": ids[-1],
        "input_sha256": sha256_file(raw_path),
        "report_sha256": sha256_file(output_dir / "aggregate_report.json"),
        "status_counts": report.get("status_counts", {}),
        "safety": report["safety"],
        "files": files,
        "canary_passed": index == 0,
    }
    verify_batch_record(record, index, run_id)
    # Only one bounded batch is staged on the ephemeral runner at a time.
    # The immutable private Supabase objects and checkpoints are durable.
    shutil.rmtree(directory)
    return record


def validate_final(manifest: dict[str, Any]) -> None:
    batches = manifest.get("batches") or []
    require(len(batches) == TOTAL_BATCHES, "H1_FINAL_BATCH_COUNT_INVALID")
    require([x.get("index") for x in batches] == list(range(TOTAL_BATCHES)),
            "H1_FINAL_BATCH_ORDER_INVALID")
    require(all(int(x["count"]) == batch_count(i) for i, x in enumerate(batches)),
            "H1_FINAL_BATCH_SIZES_INVALID")
    require(manifest.get("processed") == EXPECTED["total"] and manifest.get("complete") is True,
            "H1_FINAL_TOTAL_INVALID")
    require(manifest.get("canary_passed") is True and manifest.get("db_writes") == 0
            and manifest.get("source_requests") == 0 and manifest.get("neon_admission_authorized") is False
            and manifest.get("publication_authorized") is False, "H1_FINAL_SAFETY_INVALID")
    prior_last = None
    for record in batches:
        verify_batch_record(record, int(record["index"]), str(manifest["run_id"]))
        if prior_last is not None:
            require(int(record["first_id"]) > prior_last, "H1_FINAL_ID_RANGE_OVERLAP")
        prior_last = int(record["last_id"])


def emit_github_output(name: str, value: str) -> None:
    path = os.environ.get("GITHUB_OUTPUT")
    if path:
        with Path(path).open("a", encoding="utf-8") as stream:
            stream.write(f"{name}={value}\n")


def run_h1(source: Path, store: SupabasePrivateStore, run_id: str, secret: str) -> dict[str, Any]:
    h1, parse_batch = load_source(source)
    env, snapshot = query_snapshot(h1, secret)
    final_key = object_key(run_id, "final-manifest.json")
    workspace = Path(os.environ["GITHUB_WORKSPACE"]).resolve(strict=True)
    runner_temp = Path(os.environ["RUNNER_TEMP"]).resolve(strict=True)
    with tempfile.TemporaryDirectory(prefix="akar-h1-", dir=runner_temp) as tmp:
        temp_root = Path(tmp).resolve(strict=True)
        require(temp_root != workspace and workspace not in temp_root.parents
                and runner_temp in temp_root.parents, "H1_TEMP_DIRECTORY_BOUNDARY_FAILED")
        initial = store.get_manifest(checkpoint_key(run_id, 0), temp_root)
        if initial is None:
            snapshot = dict(snapshot, as_of=datetime.now(timezone.utc).isoformat())
            manifest = make_storage_manifest(run_id, snapshot, [], complete=False)
            initial_object = store.put_manifest(manifest, checkpoint_key(run_id, 0), temp_root)
            predecessor_sha = initial_object["sha256"]
        else:
            manifest, predecessor_sha = initial
            require(manifest.get("previous_checkpoint_sha256") is None,
                    "H1_INITIAL_CHECKPOINT_CHAIN_INVALID")
            saved = manifest.get("snapshot") or {}
            as_of = saved.get("as_of")
            try:
                stamp = datetime.fromisoformat(as_of)
                require(stamp.tzinfo is not None, "H1_SNAPSHOT_TIMESTAMP_INVALID")
            except Exception:
                raise RuntimeError("H1_SNAPSHOT_TIMESTAMP_INVALID") from None
            snapshot = dict(snapshot, as_of=as_of)
            verify_checkpoint(store, manifest, run_id, snapshot, temp_root)
        # Only create immutable checkpoint/version objects, never replace existing.
        # Complete checkpoint index is TOTAL_BATCHES + 1.
        for index in range(1, TOTAL_BATCHES + 2):
            existing = store.get_manifest(checkpoint_key(run_id, index), temp_root)
            if existing is None:
                break
            candidate, candidate_sha = existing
            require(len(candidate.get("batches") or []) == min(index, TOTAL_BATCHES),
                    "H1_CHECKPOINT_PREFIX_INVALID")
            require(candidate.get("previous_checkpoint_sha256") == predecessor_sha,
                    "H1_CHECKPOINT_CHAIN_MISMATCH")
            predecessor_sha = candidate_sha
            manifest = candidate
        batches = verify_checkpoint(store, manifest, run_id, snapshot, temp_root)
        # Conservative budget on resumed runs; includes retained historical manifests.
        committed = sum(int(x["size"]) for batch in batches for x in batch["files"])
        store.bytes_used = max(store.bytes_used, committed +
                               (len(batches) + 2) * len(canonical_json(manifest)))
        require(store.bytes_used <= MAX_RUN_BYTES, "H1_SUPABASE_FREE_QUOTA_GUARD")
        if batches:
            print(f"H1_RESUME_CHECKPOINT batches={len(batches)} rows={manifest['processed']}", flush=True)
        if not batches:
            record = execute_batch(h1, parse_batch, env, snapshot, 0, temp_root, store, run_id)
            require(record["count"] == BATCH_SIZE, "H1_CANARY_COUNT_INVALID")
            # Projection is only a fail-closed capacity gate, not a final size claim.
            first_size = sum(int(x["size"]) for x in record["files"])
            require(first_size * TOTAL_BATCHES + 80 * 1024**2 <= MAX_RUN_BYTES,
                    "H1_SUPABASE_CANARY_SIZE_ESTIMATE_EXCEEDS_QUOTA")
            batches.append(record)
            manifest = make_storage_manifest(
                run_id, snapshot, batches, complete=False,
                previous_checkpoint_sha256=predecessor_sha)
            obj = store.put_manifest(manifest, checkpoint_key(run_id, 1), temp_root)
            predecessor_sha = obj["sha256"]
            print(f"H1_CANARY_PASS rows={record['count']} parser_errors=0 db_writes=0 publication=0", flush=True)
            emit_github_output("canary_passed", "true")
        else:
            require(batches[0].get("canary_passed") is True, "H1_CANARY_CHECKPOINT_NOT_PASSED")
            emit_github_output("canary_passed", "true")
        for index in range(len(batches), TOTAL_BATCHES):
            cursor = int(batches[-1]["last_id"])
            page_snapshot = dict(snapshot)
            page_snapshot["last_id_before_batch"] = cursor
            record = execute_batch(h1, parse_batch, env, page_snapshot, index, temp_root, store, run_id)
            require(record["first_id"] > cursor, "H1_COHORT_CURSOR_OVERLAP")
            batches.append(record)
            manifest = make_storage_manifest(
                run_id, snapshot, batches, complete=False,
                previous_checkpoint_sha256=predecessor_sha)
            obj = store.put_manifest(manifest, checkpoint_key(run_id, index + 1), temp_root)
            predecessor_sha = obj["sha256"]
            print(f"H1_BATCH_CHECKPOINT_COMPLETE index={index} rows={record['count']} total={manifest['processed']}",
                  flush=True)
        manifest = make_storage_manifest(
            run_id, snapshot, batches, complete=True,
            previous_checkpoint_sha256=predecessor_sha)
        validate_final(manifest)
        final_object = store.put_manifest(manifest, final_key, temp_root)
        store.put_manifest(manifest, checkpoint_key(run_id, TOTAL_BATCHES + 1), temp_root)
        emit_github_output("complete", "true")
        print(f"H1_COMPLETE rows={manifest['processed']} batches={len(batches)} "
              f"final_manifest_sha256={final_object['sha256']} db_writes=0 publication=0", flush=True)
        return manifest


def check_runtime() -> tuple[str, SupabasePrivateStore, str]:
    require(platform.system() == "Linux" and os.environ.get("RUNNER_ENVIRONMENT") == "github-hosted",
            "H1_GITHUB_HOSTED_LINUX_REQUIRED")
    require(os.environ.get("GITHUB_ACTOR", "") == APPROVAL_ACTOR, "H1_ACTOR_NOT_AUTHORIZED")
    require(os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch"
            and os.environ.get("GITHUB_REF") == "refs/heads/main"
            and re.fullmatch(r"[0-9a-f]{40}", os.environ.get("GITHUB_SHA", "")) is not None,
            "H1_WORKFLOW_CONTEXT_INVALID")
    secret = os.environ.get("Q1E_NEON_RECOVERY_READONLY_URL", "")
    require(bool(secret), "H1_READONLY_CREDENTIAL_REQUIRED")
    run_id = validate_run_id(os.environ.get("H1_STORAGE_RUN_ID", ""))
    store = SupabasePrivateStore(
        os.environ.get("H1_SUPABASE_PROJECT_REF", ""),
        os.environ.get("H1_SUPABASE_BUCKET", ""),
        os.environ.get("H1_SUPABASE_PUBLISHABLE_KEY", ""),
        os.environ.get("H1_SUPABASE_AUTH_EMAIL", ""),
        os.environ.get("H1_SUPABASE_AUTH_PASSWORD", ""),
        os.environ.get("H1_SUPABASE_AUTH_USER_ID", ""),
    )
    return secret, store, run_id


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    args = parser.parse_args()
    try:
        secret, store, run_id = check_runtime()
        source = args.source.resolve(strict=True)
        print("H1_PRIVATE_PREFLIGHT_OK runner=github-hosted-linux storage=supabase-private", flush=True)
        run_h1(source, store, run_id, secret)
    except Exception as exc:
        code = str(exc) if isinstance(exc, RuntimeError) and re.fullmatch(r"H1_[A-Z0-9_]+", str(exc)) else "H1_UNEXPECTED_PRIVATE_FAILURE"
        print(code, file=sys.stderr, flush=True)
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
