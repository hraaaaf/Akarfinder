"""Round 5 counter-audit follow-up: producer serialization and Markdown parity.
All observations synthetic; no network, Chromium or production DB.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

import akarfinder_scraper as s
from test_v646_round4_authenticated_snapshots import scratch, offline_main, mock_html, TEST_KEY


class SignedMarkdownMustAgreeWithSQL(unittest.TestCase):
    def test_signed_markdown_price_forgery_is_refused_even_with_valid_hmac(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            report = Path("akarfinder_report.md")
            original = report.read_text()
            self.assertIn("- Prix : 1 200 000 MAD", original)
            report.write_text(original.replace("- Prix : 1 200 000 MAD", "- Prix : 7 777 777 MAD", 1))
            marker_path = Path(s.PUBLICATION_STATUS)
            marker = json.loads(marker_path.read_text())
            marker["sha256"]["akarfinder_report.md"] = hashlib.sha256(report.read_bytes()).hexdigest()
            marker["hmac_sha256"] = hmac.new(bytes.fromhex(TEST_KEY), s._signed_payload(marker), hashlib.sha256).hexdigest()
            marker_path.write_text(json.dumps(marker))
            result = s.verify_publication()
            self.assertEqual(result, {"valid": False, "reason": "markdown_database_mismatch"})

    def test_producer_refuses_to_sign_divergent_markdown(self):
        with scratch():
            writer = s.export_reports
            def forge(*args, **kwargs):
                writer(*args, **kwargs)
                report = Path(kwargs["md_path"])
                report.write_text(report.read_text().replace("- Prix : 1 200 000 MAD", "- Prix : 7 777 777 MAD", 1))
            with patch.object(s, "export_reports", side_effect=forge):
                self.assertEqual(offline_main(), 5)
            self.assertFalse(s.verify_publication()["valid"])
            self.assertEqual(json.loads(Path(s.PUBLICATION_STATUS).read_text())["status"], "failed")

    def test_honest_complete_markdown_accepted_with_rows(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            with s.read_verified_publication() as proof:
                text = proof.read_export("akarfinder_report.md").decode()
                self.assertEqual(text.count("### "), 10)
                self.assertIn("- Prix : 1 200 000 MAD", text)
                self.assertEqual(proof.db.execute("SELECT count(*) FROM listings").fetchone()[0], 10)

    def test_signed_markdown_surface_and_title_discrepancy_are_rejected(self):
        for wrong in ("- Surface : 999 m²", "### 1. Appartement à vendre — fake"):
            with self.subTest(wrong=wrong), scratch():
                self.assertEqual(offline_main(), 0)
                report = Path("akarfinder_report.md")
                original = report.read_text()
                if wrong.startswith("###"):
                    report.write_text(original.replace("### 1. Appartement à vendre", wrong, 1))
                else:
                    report.write_text(original.replace("- Surface : 100 m²", wrong, 1))
                marker_path = Path(s.PUBLICATION_STATUS)
                marker = json.loads(marker_path.read_text())
                marker["sha256"]["akarfinder_report.md"] = hashlib.sha256(report.read_bytes()).hexdigest()
                marker["hmac_sha256"] = hmac.new(bytes.fromhex(TEST_KEY), s._signed_payload(marker), hashlib.sha256).hexdigest()
                marker_path.write_text(json.dumps(marker))
                self.assertEqual(s.verify_publication()["reason"], "markdown_database_mismatch")

    def test_signed_markdown_missing_advertised_entry_is_rejected(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            report = Path("akarfinder_report.md")
            raw = report.read_text()
            report.write_text(raw[:raw.index("### 10. ")])
            marker_path = Path(s.PUBLICATION_STATUS)
            marker = json.loads(marker_path.read_text())
            marker["sha256"]["akarfinder_report.md"] = hashlib.sha256(report.read_bytes()).hexdigest()
            marker["hmac_sha256"] = hmac.new(bytes.fromhex(TEST_KEY), s._signed_payload(marker), hashlib.sha256).hexdigest()
            marker_path.write_text(json.dumps(marker))
            self.assertEqual(s.verify_publication()["reason"], "markdown_listing_count_mismatch")


class ConcurrentProducerLock(unittest.TestCase):
    def test_overlapping_async_producers_fail_closed_second_and_do_not_regress_generation(self):
        with scratch():
            entered = asyncio.Event()
            release = asyncio.Event()
            async def gather(urls, *, engine, headed, browser_path, diagnostics):
                entered.set()
                await release.wait()
                diagnostics.append({"http_code": 200, "final_status": "ok"})
                return [s.FetchResult(s.BASE_URL, "ok", html=mock_html(), code=200)]
            async def scenario():
                with (patch.object(s, "approved_shard_baseline", return_value=10),
                      patch.object(s, "fetch_and_check_robots", return_value={"status": "checked"}),
                      patch.object(s, "gather_results", side_effect=gather)):
                    first = asyncio.create_task(s.main(engine="http"))
                    await asyncio.wait_for(entered.wait(), timeout=5)
                    old_generation = s._read_trusted_head()["generation"]
                    second_code = await asyncio.wait_for(s.main(engine="http"), timeout=3)
                    self.assertEqual(second_code, 3)
                    self.assertEqual(s._read_trusted_head()["generation"], old_generation)
                    release.set()
                    self.assertEqual(await asyncio.wait_for(first, timeout=5), 0)
                    self.assertEqual(s._read_trusted_head()["generation"], old_generation)
            asyncio.run(scenario())
            self.assertTrue(s.verify_publication()["valid"])
            # The subsequent sequential producer must increase by exactly one.
            head1 = s._read_trusted_head()["generation"]
            self.assertEqual(offline_main(), 0)
            head2 = s._read_trusted_head()["generation"]
            self.assertEqual(head2, head1 + 1)

    def test_producer_lock_is_shared_between_processes(self):
        with scratch():
            with s._exclusive_producer_lock():
                script = ("import akarfinder_scraper as s, sys\n"
                          "try:\n"
                          "    with s._exclusive_producer_lock():\n"
                          "        sys.exit(0)\n"
                          "except s.ProducerLockBusy:\n"
                          "    sys.exit(9)\n")
                env = os.environ.copy()
                env["PYTHONPATH"] = str(Path(s.__file__).parent) + os.pathsep + env.get("PYTHONPATH", "")
                result = subprocess.run([sys.executable, "-c", script], capture_output=True, timeout=10, env=env)
                self.assertEqual(result.returncode, 9, result.stderr)

    def test_unsigned_process_cannot_override_output_while_signed_producer_runs(self):
        with scratch():
            with s._exclusive_producer_lock():
                with patch.dict(os.environ, {s.PUBLICATION_HMAC_KEY_ENV: ""}):
                    # Same output lock, despite different external trust scopes.
                    async def attempted():
                        return await s.main(engine="http")
                    self.assertEqual(asyncio.run(attempted()), 3)


if __name__ == "__main__":
    unittest.main()
