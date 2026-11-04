"""Synthetic tests for the 3-shard runner; ZERO site requests."""
from pathlib import Path
import json
from tempfile import TemporaryDirectory
import unittest
from types import SimpleNamespace
from unittest.mock import Mock
import run_three_canaries as runner


def res(code=0, stdout="", stderr=""):
    return SimpleNamespace(returncode=code, stdout=stdout, stderr=stderr)


class ThreeCanaryHarnessTests(unittest.TestCase):
    def prepare(self, path):
        root = Path(path) / "repo"
        root.mkdir()
        (root / "live_canary.py").write_text("pass\n")
        (root / "pilot-urls.txt").write_text("\n".join(x[1] for x in runner.SHARDS) + "\n")
        return root

    def test_check_only_never_navigates(self):
        with TemporaryDirectory() as tmp:
            root = self.prepare(tmp)
            calls = []
            def invoke(argv, **kwargs):
                calls.append(argv)
                return res(stdout="a" * 40 + "\n")
            value = runner.run(root, Path(tmp) / "artifacts", check_only=True, invoke=invoke)
            self.assertEqual(value["status"], "CHECK_ONLY_NO_SITE_REQUESTS")
            self.assertFalse(value["real_network_attempted"])
            self.assertEqual(len(calls), 1)

    def test_manifest_mismatch_fails_without_network(self):
        with TemporaryDirectory() as tmp:
            root = self.prepare(tmp)
            (root / "pilot-urls.txt").write_text("https://example.com/other\n")
            invoke = Mock()
            value = runner.run(root, Path(tmp) / "artifacts", invoke=invoke)
            self.assertEqual(value["status"], "PREFLIGHT_OR_OFFLINE_TESTS_FAILED")
            self.assertFalse(invoke.called)

    def test_offline_failure_prevents_site_access(self):
        with TemporaryDirectory() as tmp:
            root = self.prepare(tmp)
            calls = []
            def invoke(argv, **kwargs):
                calls.append(argv)
                return res(stdout="a" * 40) if len(calls) == 1 else res(1, stderr="offline red")
            value = runner.run(root, Path(tmp) / "artifacts", invoke=invoke)
            self.assertEqual(value["status"], "PREFLIGHT_OR_OFFLINE_TESTS_FAILED")
            self.assertFalse(value["real_network_attempted"])
            self.assertEqual(len(calls), 2)

    def test_first_shard_403_stops_before_next(self):
        with TemporaryDirectory() as tmp:
            root = self.prepare(tmp)
            calls = []
            def invoke(argv, **kwargs):
                calls.append(argv)
                if len(calls) == 1: return res(stdout="a" * 40)
                if len(calls) == 2: return res()
                dest = Path(argv[-1]); dest.write_text(json.dumps({
                    "canary_status": "blocked_or_no_useful_html", "response_code": 403,
                    "source_search_url": runner.SHARDS[0][1],
                }))
                return res(12)
            value = runner.run(root, Path(tmp) / "artifacts", invoke=invoke)
            self.assertEqual(value["status"], "STOPPED_FIRST_FAILURE")
            self.assertEqual(len(value["shards"]), 1)
            self.assertEqual(value["shards"][0]["response_code"], 403)
            self.assertEqual(len(calls), 3)

    def test_three_successes_sequential_and_provenance_checked(self):
        with TemporaryDirectory() as tmp:
            root = self.prepare(tmp)
            calls = []
            def invoke(argv, **kwargs):
                calls.append(argv)
                if len(calls) == 1: return res(stdout="a" * 40)
                if len(calls) == 2: return res()
                i = len(calls) - 3
                name, url = runner.SHARDS[i]
                payload = {
                    "canary_status": "parsed_quality_pass", "response_code": 200,
                    "source_search_url": url, "attempts": 1, "listing_page_navigations": 1,
                    "production_db_writes": 0, "browser_proxies_or_challenge_bypass": False,
                    "robots": {"status": "checked"}, "html_analysis": {"quality_accepted": True,
                    "eligible_cards": 32, "observed_source_ids": ["1", "2"]},
                    "provenance": {"github_sha": "a" * 40},
                }
                Path(argv[-1]).write_text(json.dumps(payload))
                return res()
            value = runner.run(root, Path(tmp) / "artifacts", invoke=invoke)
            self.assertEqual(value["status"], "THREE_SHARDS_PASSED")
            self.assertEqual([x["name"] for x in value["shards"]], [x[0] for x in runner.SHARDS])
            self.assertEqual(len(calls), 5)


if __name__ == "__main__":
    unittest.main()