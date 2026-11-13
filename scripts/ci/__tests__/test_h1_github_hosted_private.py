"""Offline H1 contracts. These tests never read Neon or use real cloud credentials."""
from __future__ import annotations

from contextlib import redirect_stdout
from datetime import datetime, timezone
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tempfile
import unittest
from unittest.mock import patch

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import h1_github_hosted_private as h1


class FakeStore:
    def __init__(self):
        self.data: dict[str, bytes] = {}
        self.bytes_used = 0

    def exists(self, key):
        return key in self.data

    def put_file(self, path, key):
        value = Path(path).read_bytes()
        if key in self.data and self.data[key] != value:
            raise RuntimeError("FAKE_APPEND_ONLY_CONFLICT")
        if key not in self.data:
            self.bytes_used += len(value)
            self.data[key] = value
        return {"key": key, "sha256": hashlib.sha256(value).hexdigest(), "size": len(value)}

    def put_bytes(self, value, key, _temp_root):
        if key in self.data and self.data[key] != value:
            raise RuntimeError("FAKE_APPEND_ONLY_CONFLICT")
        if key not in self.data:
            self.bytes_used += len(value)
            self.data[key] = value
        return {"key": key, "sha256": hashlib.sha256(value).hexdigest(), "size": len(value)}

    def put_manifest(self, manifest, key, temp_root):
        return self.put_bytes(h1.canonical_json(manifest), key, temp_root)

    def get_manifest(self, key, temp_root):
        if key not in self.data:
            return None
        value = self.data[key]
        path = Path(temp_root) / ("test-manifest-" + hashlib.sha256(key.encode()).hexdigest()[:8])
        path.write_bytes(value)
        return json.loads(value), hashlib.sha256(value).hexdigest()

    def verify_object(self, item):
        value = self.data[item["key"]]
        if len(value) != item["size"] or hashlib.sha256(value).hexdigest() != item["sha256"]:
            raise RuntimeError("FAKE_OBJECT_INTEGRITY_FAILURE")

    def download(self, key, path, expected_sha=None):
        value = self.data[key]
        if expected_sha and hashlib.sha256(value).hexdigest() != expected_sha:
            raise RuntimeError("FAKE_DOWNLOAD_SHA_FAILURE")
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_bytes(value)
        return value


class FakeH1:
    PRIORITY = "p.price_mad > 0"

    def __init__(self, rows):
        self.rows = rows

    def checked_env(self, _secret):
        return {"read_only": "true"}

    def checked_snapshot(self, _query, _env):
        return {"total": 5, "priority_count": 3, "remaining_count": 2,
                "min_id": 1, "highwater": 5}

    def select_sql(self, mode, cursor, highwater, limit):
        assert mode == "priority"
        return (f"SELECT * FROM p WHERE p.id > {cursor} AND p.id <= {highwater} "
                f"AND ({self.PRIORITY}) ORDER BY p.id LIMIT {limit}")

    @staticmethod
    def normalize(row):
        if not row.get("source_url") or not row.get("title") or not row.get("city"):
            raise ValueError("missing core identity")
        return row

    def psql_lines(self, sql, _env):
        cursor = int(re.search(r"p\.id > (\d+)", sql).group(1))
        highwater = int(re.search(r"p\.id <= (\d+)", sql).group(1))
        limit = int(re.search(r"ORDER BY p\.id LIMIT (\d+)", sql).group(1))
        subset = [r for r in self.rows if cursor < r["id"] <= highwater]
        return [json.dumps(x) for x in subset[:limit]]


def synthetic_rows():
    return [{"id": i, "source_url": f"https://example.test/{i}",
             "title": f"SENTINEL_PRIVATE_TITLE_{i}", "city": "Rabat",
             "property_type": "apartment", "transaction_type": "sale",
             "price_mad": 1000000 + i, "surface_m2": 90 + i}
            for i in range(1, 6)]


def fake_parser(input_path, output_path, *, as_of):
    with gzip.open(input_path, "rt", encoding="utf-8") as stream:
        rows = [json.loads(line) for line in stream]
    report = {"input_count": len(rows),
              "status_counts": {"input": len(rows), "complete_requires_freshness": len(rows)},
              "safety": {"db_writes": 0, "network_requests": 0,
                         "neon_admission_authorized": False, "source_rights_verified": False,
                         "independent_field_precision_certified": False},
              "as_of": as_of.isoformat()}
    (Path(output_path) / "aggregate_report.json").write_text(json.dumps(report), encoding="utf-8")
    (Path(output_path) / "records.jsonl.gz").write_bytes(b"synthetic-parser-output-only")
    return report


class TestBatchMath(unittest.TestCase):
    def test_exact_151900_batch_math_and_last_partial_batch(self):
        self.assertEqual(h1.TOTAL_BATCHES, 152)
        self.assertEqual(h1.REMAINING_BATCHES_AFTER_CANARY, 151)
        self.assertEqual(h1.batch_count(0), 1000)
        self.assertEqual(h1.batch_count(150), 1000)
        self.assertEqual(h1.batch_count(151), 900)
        self.assertEqual(sum(h1.batch_count(i) for i in range(h1.TOTAL_BATCHES)), 151900)
        self.assertEqual(sum(h1.batch_count(i) for i in range(1, h1.TOTAL_BATCHES)), 150900)

    def test_run_ids_and_private_keys_reject_traversal(self):
        self.assertEqual(h1.validate_run_id("123456"), "123456")
        for value in ("../secret", "1/2", "", "x" * 21):
            with self.assertRaises(RuntimeError):
                h1.validate_run_id(value)
        with self.assertRaises(RuntimeError):
            h1.object_key("123", "../outside.json")

    def test_global_id_keyset_removes_priority_filter_and_keeps_order(self):
        query = h1.all_rows_page_sql(FakeH1([]), 100, 500, 1000)
        self.assertIn("AND TRUE", query)
        self.assertNotIn("p.price_mad > 0", query)
        self.assertIn("ORDER BY p.id LIMIT 1000", query)


class TestCanaryAndStorage(unittest.TestCase):
    def setUp(self):
        self.original_expected = h1.EXPECTED
        self.original_size = h1.BATCH_SIZE
        self.original_total = h1.TOTAL_BATCHES
        self.original_remaining = h1.REMAINING_BATCHES_AFTER_CANARY
        h1.EXPECTED = {"total": 5, "priority_count": 3, "remaining_count": 2}
        h1.BATCH_SIZE = 3
        h1.TOTAL_BATCHES = 2
        h1.REMAINING_BATCHES_AFTER_CANARY = 1

    def tearDown(self):
        h1.EXPECTED = self.original_expected
        h1.BATCH_SIZE = self.original_size
        h1.TOTAL_BATCHES = self.original_total
        h1.REMAINING_BATCHES_AFTER_CANARY = self.original_remaining

    def _run(self, store):
        fake = FakeH1(synthetic_rows())
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            workspace, runner_temp = root / "workspace", root / "runner-temp"
            workspace.mkdir(); runner_temp.mkdir()
            with patch.dict(os.environ, {"GITHUB_WORKSPACE": str(workspace),
                                         "RUNNER_TEMP": str(runner_temp),
                                         "GITHUB_OUTPUT": "",
                                         "GITHUB_SHA": "f" * 40}, clear=False), \
                 patch.object(h1, "load_source", return_value=(fake, fake_parser)), \
                 redirect_stdout(io.StringIO()) as output:
                result = h1.run_h1(root, store, "123456", "unused-test-secret")
            return result, output.getvalue()

    def test_canary_pass_automatically_processes_rest_and_resumes_idempotently(self):
        store = FakeStore()
        result, output = self._run(store)
        self.assertTrue(result["canary_passed"])
        self.assertTrue(result["complete"])
        self.assertEqual(result["processed"], 5)
        self.assertEqual([x["count"] for x in result["batches"]], [3, 2])
        self.assertIn("H1_CANARY_PASS rows=3", output)
        self.assertNotIn("SENTINEL_PRIVATE_TITLE", output)
        self.assertTrue(any(key.endswith("final-manifest.json") for key in store.data))
        second, second_output = self._run(store)
        self.assertEqual(second["processed"], 5)
        self.assertNotIn("H1_BATCH_CHECKPOINT_COMPLETE", second_output)

    def test_interrupted_upload_resumes_without_overwriting_orphan(self):
        class InterruptedOnce(FakeStore):
            fail_once = True
            def put_file(self, path, key):
                item = super().put_file(path, key)
                if self.fail_once and "/batches/001/input/" in key:
                    self.fail_once = False
                    raise RuntimeError("SIMULATED_CRASH_AFTER_PRIVATE_UPLOAD")
                return item

        store = InterruptedOnce()
        with self.assertRaisesRegex(RuntimeError, "SIMULATED_CRASH_AFTER_PRIVATE_UPLOAD"):
            self._run(store)
        self.assertTrue(any(k.endswith("checkpoints/001.json") for k in store.data))
        self.assertFalse(any(k.endswith("checkpoints/002.json") for k in store.data))
        result, _ = self._run(store)
        self.assertTrue(result["complete"])
        self.assertEqual(result["processed"], 5)
        self.assertTrue(any(k.endswith("checkpoints/003.json") for k in store.data))
        self.assertEqual(len([k for k in store.data if "/batches/001/input/" in k]), 1)

    def test_resume_rejects_mutated_checkpoint(self):
        store = FakeStore()
        self._run(store)
        key = "akarfinder/h1/run-123456/checkpoints/001.json"
        changed = json.loads(store.data[key])
        changed["snapshot"]["total"] += 1
        store.data[key] = h1.canonical_json(changed)
        with self.assertRaisesRegex(RuntimeError, "H1_CHECKPOINT_CHAIN_MISMATCH"):
            self._run(store)

    def test_parser_error_fails_canary_before_any_private_batch_upload(self):
        store = FakeStore()
        fake = FakeH1(synthetic_rows())

        def bad_parser(input_path, output_path, *, as_of):
            report = fake_parser(input_path, output_path, as_of=as_of)
            report["status_counts"]["errors"] = 1
            (Path(output_path) / "aggregate_report.json").write_text(json.dumps(report), encoding="utf-8")
            return report

        with tempfile.TemporaryDirectory() as td:
            root = Path(td); workspace=root/"workspace"; runner_temp=root/"runner-temp"
            workspace.mkdir(); runner_temp.mkdir()
            with patch.dict(os.environ, {"GITHUB_WORKSPACE":str(workspace),"RUNNER_TEMP":str(runner_temp),"GITHUB_OUTPUT":""}, clear=False), \
                 patch.object(h1, "load_source", return_value=(fake, bad_parser)):
                with self.assertRaisesRegex(RuntimeError, "H1_CANARY_PARSER_ERRORS"):
                    h1.run_h1(root, store, "123456", "unused-test-secret")
        self.assertFalse(any("/batches/" in key for key in store.data))

    def test_resume_hash_verification_rejects_tampered_object(self):
        store = FakeStore()
        item = {"key": "akarfinder/h1/run-123456/batches/000/file", "sha256": "0" * 64,
                "size": 1, "kind": "raw_input"}
        store.data[item["key"]] = b"x"
        with self.assertRaisesRegex(RuntimeError, "FAKE_OBJECT_INTEGRITY_FAILURE"):
            store.verify_object(item)

    def test_checkpoint_rejects_cross_run_files_and_mismatched_sha(self):
        digest_a, digest_b = "a" * 64, "b" * 64
        root = "akarfinder/h1/run-123456/batches/000"
        valid = {
            "id": "batch-000", "index": 0, "count": 3, "first_id": 1, "last_id": 3,
            "input_sha256": digest_a, "report_sha256": digest_b,
            "files": [
                {"key": root + "/input/rows.jsonl.gz", "kind": "raw_input",
                 "sha256": digest_a, "size": 12},
                {"key": root + "/parsed/aggregate_report.json", "kind": "aggregate_report",
                 "sha256": digest_b, "size": 55},
            ],
        }
        h1.verify_batch_record(valid, 0, "123456")
        cross_run = json.loads(json.dumps(valid))
        cross_run["files"][1]["key"] = cross_run["files"][1]["key"].replace("run-123456", "run-999999")
        with self.assertRaisesRegex(RuntimeError, "H1_CHECKPOINT_KEY_INVALID"):
            h1.verify_batch_record(cross_run, 0, "123456")
        wrong_sha = json.loads(json.dumps(valid))
        wrong_sha["report_sha256"] = "c" * 64
        with self.assertRaisesRegex(RuntimeError, "H1_CHECKPOINT_RECORDED_SHA_MISMATCH"):
            h1.verify_batch_record(wrong_sha, 0, "123456")
        duplicate_key = json.loads(json.dumps(valid))
        duplicate_key["files"].append(dict(duplicate_key["files"][1]))
        with self.assertRaisesRegex(RuntimeError, "H1_CHECKPOINT_KEY_INVALID"):
            h1.verify_batch_record(duplicate_key, 0, "123456")

    def test_supabase_is_pinned_to_private_bucket_and_auth_user(self):
        user_id = "11111111-1111-4111-8111-111111111111"
        store = h1.SupabasePrivateStore(h1.PROJECT_REF, h1.BUCKET, "sb_publishable_test",
                                        "worker@example.test", "synthetic-only", user_id)
        self.assertEqual(store.bucket, "h1-historical-evidence")
        self.assertIn("/object/authenticated/h1-historical-evidence/",
                      store._url("akarfinder/h1/run-123/checkpoints/000.json"))
        with self.assertRaisesRegex(RuntimeError, "H1_SUPABASE_TARGET_MISMATCH"):
            h1.SupabasePrivateStore("other-project", h1.BUCKET, "sb_publishable_test",
                                    "worker@example.test", "synthetic-only", user_id)
        with self.assertRaisesRegex(RuntimeError, "H1_SUPABASE_CREDENTIALS_MISSING"):
            h1.SupabasePrivateStore(h1.PROJECT_REF, h1.BUCKET, "sb_secret_disallowed",
                                    "worker@example.test", "synthetic-only", user_id)
        with self.assertRaisesRegex(RuntimeError, "H1_SUPABASE_METHOD_FORBIDDEN"):
            store._call("DELETE", store._url("akarfinder/h1/run-123/file"))


class TestSupabaseStorageHttpContracts(unittest.TestCase):
    @staticmethod
    def store():
        return h1.SupabasePrivateStore(
            h1.PROJECT_REF, h1.BUCKET, "sb_publishable_synthetic",
            "h1-worker@example.test", "not-a-real-password",
            "11111111-1111-4111-8111-111111111111")

    def test_login_uses_signed_app_metadata_not_user_metadata(self):
        class FakeResponse:
            status = 200
            def __init__(self, data): self.data = data
            def __enter__(self): return self
            def __exit__(self, *_): return False
            def read(self): return json.dumps(self.data).encode()

        store = self.store()
        valid = {
            "access_token": "fake-JWT-not-a-credential", "expires_in": 3600,
            "user": {"id": store.user_id, "app_metadata": {"h1_storage": "enabled"}}
        }
        with patch("h1_supabase_storage.request.urlopen", return_value=FakeResponse(valid)) as call:
            self.assertEqual(store._auth(), "fake-JWT-not-a-credential")
            self.assertEqual(store._auth(), "fake-JWT-not-a-credential")
            self.assertEqual(call.call_count, 1)
        fake_user_metadata = json.loads(json.dumps(valid))
        fake_user_metadata["user"]["app_metadata"] = {}
        fake_user_metadata["user"]["user_metadata"] = {"h1_storage": "enabled"}
        other = self.store()
        with patch("h1_supabase_storage.request.urlopen", return_value=FakeResponse(fake_user_metadata)):
            with self.assertRaisesRegex(RuntimeError, "H1_SUPABASE_DEDICATED_USER_NOT_AUTHORIZED"):
                other._auth()

    def test_append_only_conflict_and_free_quota_guard(self):
        store = self.store()
        with tempfile.TemporaryDirectory() as td:
            file = Path(td) / "synthetic.json"
            file.write_bytes(b"only-synthetic-test-data")
            key = "akarfinder/h1/run-123456/checkpoints/001.json"
            with patch.object(store, "_get", return_value=b"conflicting-object"):
                with self.assertRaisesRegex(RuntimeError, "H1_SUPABASE_APPEND_ONLY_CONFLICT"):
                    store.put_file(file, key)
            with patch.object(store, "_get", return_value=None):
                store.bytes_used = h1.MAX_RUN_BYTES
                with self.assertRaisesRegex(RuntimeError, "H1_SUPABASE_FREE_QUOTA_GUARD"):
                    store.put_file(file, key)

    def test_no_cross_bucket_upload_or_path_traversal(self):
        store = self.store()
        with self.assertRaisesRegex(RuntimeError, "H1_SUPABASE_KEY_INVALID"):
            store._url("seller-property-drafts/private")
        with self.assertRaisesRegex(RuntimeError, "H1_SUPABASE_KEY_INVALID"):
            store._url("akarfinder/h1/run-12/../../private")
        with self.assertRaisesRegex(RuntimeError, "H1_SUPABASE_METHOD_FORBIDDEN"):
            store._call("PUT", store._url("akarfinder/h1/run-12/final-manifest.json"))


class TestReadOnlyAndWorkflowContracts(unittest.TestCase):
    def test_report_gate_rejects_mutations_network_and_rights_claims(self):
        safe = {"input_count": 1000, "status_counts": {"errors": 0},
                "safety": {"db_writes": 0, "network_requests": 0,
                           "neon_admission_authorized": False, "source_rights_verified": False,
                           "independent_field_precision_certified": False}}
        safe["status_counts"] = {"input": 1000, "errors": 0, "partial": 1000}
        h1.gate_parser_report(safe, 1000)
        for key, value in (("db_writes", 1), ("network_requests", 1),
                           ("neon_admission_authorized", True), ("source_rights_verified", True)):
            unsafe = json.loads(json.dumps(safe)); unsafe["safety"][key] = value
            with self.assertRaises(RuntimeError):
                h1.gate_parser_report(unsafe, 1000)

    def test_static_workflow_is_linux_gated_and_has_no_public_data_sink(self):
        workflow = (Path(__file__).resolve().parents[3] / ".github" / "workflows" /
                    "akarparser-v3-h1-private-historical.yml").read_text(encoding="utf-8")
        self.assertIn("runs-on: ubuntu-24.04", workflow)
        self.assertNotRegex(workflow, r"self-hosted|windows-latest|upload-artifact|actions/cache")
        self.assertNotIn("id-token: write", workflow)
        self.assertNotIn("aws-actions/configure-aws-credentials", workflow)
        self.assertIn("H1_SUPABASE_AUTH_PASSWORD", workflow)
        self.assertIn("H1_SUPABASE_AUTH_USER_ID", workflow)
        self.assertIn("H1_SUPABASE_PUBLISHABLE_KEY", workflow)
        self.assertIn("Q1E_NEON_RECOVERY_READONLY_URL", workflow)
        self.assertIn("inputs.authorize_h1_readonly == true", workflow)
        self.assertIn("github.ref == 'refs/heads/main'", workflow)
        self.assertIn("environment: q1e-neon-readonly", workflow)
        self.assertIn("group: ${{ github.workflow }}-${{ github.event.pull_request.number || inputs.resume_run_id || github.run_id }}", workflow)
        self.assertIn("cancel-in-progress: ${{ github.event_name == 'pull_request' }}", workflow)
        self.assertIn("persist-credentials: false", workflow)

    @unittest.skipUnless(os.environ.get("H1_TRUSTED_SOURCE"), "immutable V3 source checkout not provided")
    def test_real_pinned_v3_parser_runs_offline_on_synthetic_rows(self):
        source = Path(os.environ["H1_TRUSTED_SOURCE"]).resolve(strict=True)
        _trusted_h1, parser = h1.load_source(source)
        rows = synthetic_rows()[:2]
        with tempfile.TemporaryDirectory() as td:
            root = Path(td); input_path = root / "synthetic.jsonl.gz"; out = root / "parsed"
            with gzip.open(input_path, "wt", encoding="utf-8", newline="") as stream:
                for row in rows:
                    stream.write(json.dumps(row, sort_keys=True) + "\n")
            report = parser(input_path, out, as_of=datetime(2026, 11, 12, tzinfo=timezone.utc), limit=2)
        self.assertEqual(report["input_count"], 2)
        self.assertEqual(report["safety"]["db_writes"], 0)
        self.assertEqual(report["safety"]["network_requests"], 0)
        self.assertIs(report["safety"]["neon_admission_authorized"], False)


if __name__ == "__main__":
    unittest.main()
