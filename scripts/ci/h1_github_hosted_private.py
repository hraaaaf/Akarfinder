#!/usr/bin/env python3
"""GitHub-hosted H1 runner with private S3 checkpoints; never logs row data."""
from __future__ import annotations

import argparse
import base64
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

IMMUTABLE_SOURCE_SHA = "3eb2b8a7b7ec78832e764e014b387eabd5e74058"
EXPECTED = {"total": 151900, "priority_count": 53083, "remaining_count": 98817}
BATCH_SIZE = 1000
TOTAL_BATCHES = (EXPECTED["total"] + BATCH_SIZE - 1) // BATCH_SIZE
REMAINING_BATCHES_AFTER_CANARY = TOTAL_BATCHES - 1  # 151, final batch = 900 rows
APPROVAL_ACTOR = "hraaaaf"
S3_PREFIX = "akarfinder/h1"
MANIFEST_VERSION = "akarparser-v3-github-hosted-h1-v1"


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
    return f"{S3_PREFIX}/run-{run_id}/{path.as_posix()}"


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


class S3PrivateStore:
    """Small AWS CLI wrapper. All stdout/stderr is captured and suppressed."""

    def __init__(self, bucket: str, kms_key: str, region: str, account: str):
        require(bool(re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]", bucket)),
                "H1_PRIVATE_BUCKET_INVALID")
        require(kms_key.startswith(f"arn:aws:kms:eu-central-1:{account}:key/"),
                "H1_PRIVATE_KMS_KEY_INVALID")
        require(region == "eu-central-1" and bool(re.fullmatch(r"[0-9]{12}", account)),
                "H1_PRIVATE_STORAGE_REGION_OR_ACCOUNT_INVALID")
        self.bucket, self.kms_key, self.region, self.account = bucket, kms_key, region, account

    def _aws(self, args: list[str], *, expect_json: bool = False) -> Any:
        require(bool(args) and args[0] == "s3api", "H1_PRIVATE_STORAGE_ACTION_INVALID")
        # Reject any accidental cross-account bucket or KMS routing.
        args = [*args, "--expected-bucket-owner", self.account]
        result = subprocess.run(["aws", *args, "--region", self.region, "--no-cli-pager"],
                                capture_output=True, text=True, check=False)
        require(result.returncode == 0, "H1_PRIVATE_STORAGE_OPERATION_FAILED")
        if not expect_json:
            return None
        try:
            return json.loads(result.stdout)
        except (ValueError, TypeError):
            raise RuntimeError("H1_PRIVATE_STORAGE_RESPONSE_INVALID") from None

    def exists(self, key: str) -> bool:
        result = self._aws(["s3api", "list-objects-v2", "--bucket", self.bucket,
                            "--prefix", key, "--max-keys", "1"], expect_json=True)
        return any(x.get("Key") == key for x in result.get("Contents", []))

    def head(self, key: str) -> dict[str, Any]:
        return self._aws(["s3api", "head-object", "--bucket", self.bucket,
                          "--key", key, "--checksum-mode", "ENABLED"], expect_json=True)

    def verify_object(self, item: dict[str, Any]) -> None:
        head = self.head(item["key"])
        expected_checksum = base64.b64encode(bytes.fromhex(item["sha256"])).decode("ascii")
        require(int(head.get("ContentLength", -1)) == int(item["size"]), "H1_REMOTE_OBJECT_SIZE_MISMATCH")
        require(head.get("ChecksumSHA256") == expected_checksum, "H1_REMOTE_OBJECT_SHA_MISMATCH")
        require(head.get("ServerSideEncryption") == "aws:kms"
                and head.get("SSEKMSKeyId") == self.kms_key, "H1_REMOTE_OBJECT_ENCRYPTION_MISMATCH")

    def put_file(self, path: Path, key: str) -> dict[str, Any]:
        size = path.stat().st_size
        require(size <= 5 * 1024**3, "H1_OBJECT_EXCEEDS_SINGLE_PUT_LIMIT")
        digest = sha256_file(path)
        checksum = base64.b64encode(bytes.fromhex(digest)).decode("ascii")
        self._aws(["s3api", "put-object", "--bucket", self.bucket, "--key", key,
                   "--body", str(path), "--server-side-encryption", "aws:kms",
                   "--ssekms-key-id", self.kms_key, "--checksum-algorithm", "SHA256",
                   "--checksum-sha256", checksum])
        item = {"key": key, "sha256": digest, "size": size}
        self.verify_object(item)
        return item

    def put_bytes(self, data: bytes, key: str, temp_root: Path) -> dict[str, Any]:
        path = temp_root / ("object-" + sha256_bytes(key.encode("utf-8"))[:16])
        path.write_bytes(data)
        return self.put_file(path, key)

    def download(self, key: str, path: Path, expected_sha: str | None = None) -> bytes:
        head = self.head(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        self._aws(["s3api", "get-object", "--bucket", self.bucket, "--key", key,
                   "--checksum-mode", "ENABLED", str(path)], expect_json=True)
        data = path.read_bytes()
        actual = sha256_bytes(data)
        if expected_sha is not None:
            require(actual == expected_sha, "H1_PRIVATE_DOWNLOAD_SHA_MISMATCH")
        checksum = base64.b64encode(bytes.fromhex(actual)).decode("ascii")
        require(head.get("ChecksumSHA256") == checksum and int(head.get("ContentLength", -1)) == len(data),
                "H1_PRIVATE_DOWNLOAD_CHECKSUM_MISMATCH")
        require(head.get("ServerSideEncryption") == "aws:kms"
                and head.get("SSEKMSKeyId") == self.kms_key, "H1_REMOTE_OBJECT_ENCRYPTION_MISMATCH")
        return data

    def put_manifest(self, manifest: dict[str, Any], key: str, temp_root: Path) -> dict[str, Any]:
        data = canonical_json(manifest)
        return self.put_bytes(data, key, temp_root)

    def get_manifest(self, key: str, temp_root: Path) -> tuple[dict[str, Any], str] | None:
        if not self.exists(key):
            return None
        path = temp_root / ("manifest-" + sha256_bytes(key.encode("utf-8"))[:16] + ".json")
        data = self.download(key, path)
        try:
            manifest = json.loads(data)
        except ValueError:
            raise RuntimeError("H1_PRIVATE_MANIFEST_INVALID") from None
        return manifest, sha256_bytes(data)


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
                          *, complete: bool) -> dict[str, Any]:
    processed = sum(int(x["count"]) for x in batches)
    status = Counter()
    for x in batches:
        status.update(x.get("status_counts", {}))
    return {
        "version": MANIFEST_VERSION,
        "run_id": run_id,
        "source_commit": IMMUTABLE_SOURCE_SHA,
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


def verify_checkpoint(store: S3PrivateStore, manifest: dict[str, Any], run_id: str,
                      snapshot: dict[str, Any], temp_root: Path) -> list[dict[str, Any]]:
    require(manifest.get("version") == MANIFEST_VERSION and manifest.get("run_id") == run_id,
            "H1_RESUME_MANIFEST_VERSION_OR_RUN_MISMATCH")
    require(manifest.get("source_commit") == IMMUTABLE_SOURCE_SHA
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
                  index: int, temp_root: Path, store: S3PrivateStore, run_id: str) -> dict[str, Any]:
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
    report = parse_batch(raw_path, output_dir, as_of=datetime.now(timezone.utc))
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
    # The private S3 objects and checkpoint are the durable recovery state.
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


def run_h1(source: Path, store: S3PrivateStore, run_id: str, secret: str) -> dict[str, Any]:
    h1, parse_batch = load_source(source)
    env, snapshot = query_snapshot(h1, secret)
    root_key = object_key(run_id, "checkpoint.json")
    final_key = object_key(run_id, "final-manifest.json")
    workspace = Path(os.environ["GITHUB_WORKSPACE"]).resolve(strict=True)
    runner_temp = Path(os.environ["RUNNER_TEMP"]).resolve(strict=True)
    with tempfile.TemporaryDirectory(prefix="akar-h1-", dir=runner_temp) as tmp:
        temp_root = Path(tmp).resolve(strict=True)
        require(temp_root != workspace and workspace not in temp_root.parents
                and runner_temp in temp_root.parents, "H1_TEMP_DIRECTORY_BOUNDARY_FAILED")
        existing = store.get_manifest(root_key, temp_root)
        if existing is None:
            manifest = make_storage_manifest(run_id, snapshot, [], complete=False)
            store.put_manifest(manifest, root_key, temp_root)
            batches: list[dict[str, Any]] = []
        else:
            manifest, _ = existing
            batches = verify_checkpoint(store, manifest, run_id, snapshot, temp_root)
        if batches:
            print(f"H1_RESUME_CHECKPOINT batches={len(batches)} rows={manifest['processed']}", flush=True)
        if not batches:
            record = execute_batch(h1, parse_batch, env, snapshot, 0, temp_root, store, run_id)
            require(record["count"] == BATCH_SIZE, "H1_CANARY_COUNT_INVALID")
            batches.append(record)
            manifest = make_storage_manifest(run_id, snapshot, batches, complete=False)
            store.put_manifest(manifest, root_key, temp_root)
            print(f"H1_CANARY_PASS rows={record['count']} parser_errors=0 db_writes=0 publication=0", flush=True)
            emit_github_output("canary_passed", "true")
        else:
            require(batches[0].get("canary_passed") is True, "H1_CANARY_CHECKPOINT_NOT_PASSED")
            emit_github_output("canary_passed", "true")
        start_index = len(batches)
        for index in range(start_index, TOTAL_BATCHES):
            cursor = int(batches[-1]["last_id"])
            page_snapshot = dict(snapshot)
            page_snapshot["last_id_before_batch"] = cursor
            record = execute_batch(h1, parse_batch, env, page_snapshot, index, temp_root, store, run_id)
            require(record["first_id"] > cursor, "H1_COHORT_CURSOR_OVERLAP")
            batches.append(record)
            manifest = make_storage_manifest(run_id, snapshot, batches, complete=False)
            store.put_manifest(manifest, root_key, temp_root)
            print(f"H1_BATCH_CHECKPOINT_COMPLETE index={index} rows={record['count']} total={manifest['processed']}",
                  flush=True)
        manifest = make_storage_manifest(run_id, snapshot, batches, complete=True)
        validate_final(manifest)
        final_object = store.put_manifest(manifest, final_key, temp_root)
        # Mark the resumable checkpoint complete only after final manifest verification.
        store.put_manifest(manifest, root_key, temp_root)
        emit_github_output("complete", "true")
        print(f"H1_COMPLETE rows={manifest['processed']} batches={len(batches)} "
              f"final_manifest_sha256={final_object['sha256']} db_writes=0 publication=0", flush=True)
        return manifest


def check_runtime() -> tuple[str, S3PrivateStore, str]:
    require(platform.system() == "Linux" and os.environ.get("RUNNER_ENVIRONMENT") == "github-hosted",
            "H1_GITHUB_HOSTED_LINUX_REQUIRED")
    actor = os.environ.get("GITHUB_ACTOR", "")
    require(actor == APPROVAL_ACTOR, "H1_ACTOR_NOT_AUTHORIZED")
    secret = os.environ.get("Q1E_NEON_RECOVERY_READONLY_URL", "")
    require(bool(secret), "H1_READONLY_CREDENTIAL_REQUIRED")
    run_id = validate_run_id(os.environ.get("H1_STORAGE_RUN_ID", ""))
    bucket = os.environ.get("H1_PRIVATE_S3_BUCKET", "")
    kms_key = os.environ.get("H1_PRIVATE_S3_KMS_KEY_ARN", "")
    region = os.environ.get("H1_PRIVATE_AWS_REGION", "")
    prefix = os.environ.get("H1_PRIVATE_S3_PREFIX", "")
    require(prefix == S3_PREFIX, "H1_PRIVATE_STORAGE_PREFIX_INVALID")
    expected_account = os.environ.get("H1_PRIVATE_AWS_ACCOUNT_ID", "")
    expected_role = os.environ.get("H1_PRIVATE_AWS_ROLE_NAME", "")
    require(bool(re.fullmatch(r"[0-9]{12}", expected_account)) and bool(expected_role),
            "H1_PRIVATE_AWS_ROLE_CONFIGURATION_ABSENT")
    identity = subprocess.run(["aws", "sts", "get-caller-identity", "--output", "json", "--no-cli-pager"],
                             capture_output=True, text=True, check=False)
    require(identity.returncode == 0, "H1_AWS_OIDC_IDENTITY_FAILED")
    try:
        caller = json.loads(identity.stdout)
    except ValueError:
        raise RuntimeError("H1_AWS_OIDC_IDENTITY_INVALID") from None
    expected_arn_prefix = f"arn:aws:sts::{expected_account}:assumed-role/{expected_role}/"
    require(caller.get("Account") == expected_account
            and str(caller.get("Arn", "")).startswith(expected_arn_prefix),
            "H1_AWS_OIDC_ROLE_MISMATCH")
    return secret, S3PrivateStore(bucket, kms_key, region, expected_account), run_id


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    args = parser.parse_args()
    try:
        secret, store, run_id = check_runtime()
        source = args.source.resolve(strict=True)
        print("H1_PRIVATE_PREFLIGHT_OK runner=github-hosted-linux storage=s3-kms", flush=True)
        run_h1(source, store, run_id, secret)
    except Exception as exc:
        code = str(exc) if isinstance(exc, RuntimeError) and re.fullmatch(r"H1_[A-Z0-9_]+", str(exc)) else "H1_UNEXPECTED_PRIVATE_FAILURE"
        print(code, file=sys.stderr, flush=True)
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
