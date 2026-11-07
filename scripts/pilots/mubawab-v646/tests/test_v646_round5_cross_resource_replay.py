"""Round 5: independent semantic cross-resource proof and replay resistance.

All offline synthetic HTML and local temporary SQLite; NO live network.
The signed head is modeled as a path outside the replaceable publication tree.
Its resistance to rollback is a deployment prerequisite, not a code guarantee.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
from pathlib import Path
from contextlib import closing
import sqlite3
import unittest
from unittest.mock import patch

import akarfinder_scraper as s
from test_v646_round4_authenticated_snapshots import TEST_KEY, scratch, offline_main


def mutate_price(price: int) -> None:
    with sqlite3.connect(s.DB_NAME) as db:
        db.execute("UPDATE listings SET price_mad=? WHERE id='9961000'", (price,))


class Round5SemanticProof(unittest.TestCase):
    def test_producer_does_not_sign_divergent_sql_json_pair(self):
        with scratch():
            original_writer = s._write_publication_status
            def make_divergence(run_id, status, **kwargs):
                if status == "complete":
                    mutate_price(777777)
                return original_writer(run_id, status, **kwargs)
            with patch.object(s, "_write_publication_status", side_effect=make_divergence):
                self.assertEqual(offline_main(), 5)
            data = json.loads(Path("akarfinder_data.json").read_text())
            self.assertEqual(next(r for r in data if r["id"] == "9961000")["price_mad"], 1200000)
            with sqlite3.connect(s.DB_NAME) as db:
                self.assertEqual(db.execute("SELECT price_mad FROM listings WHERE id='9961000'").fetchone()[0], 777777)
            self.assertFalse(s.verify_publication()["valid"])

    def test_authentic_signed_pair_with_different_sql_and_json_prices_is_rejected(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            mutate_price(777777)
            marker_path = Path(s.PUBLICATION_STATUS)
            marker = json.loads(marker_path.read_text())
            marker["sha256"][s.DB_NAME] = hashlib.sha256(Path(s.DB_NAME).read_bytes()).hexdigest()
            with closing(s._sqlite_snapshot(Path(s.DB_NAME))) as db:
                marker["db_logical_sha256"] = s._db_logical_sha256(db)
            # The test signer knows the SYNTHETIC key. The signature is valid;
            # data semantics, not cryptography, must reject this mismatch.
            marker["hmac_sha256"] = hmac.new(bytes.fromhex(TEST_KEY), s._signed_payload(marker), hashlib.sha256).hexdigest()
            marker_path.write_text(json.dumps(marker))
            proof = s.verify_publication()
            self.assertEqual(proof, {"valid": False, "reason": "database_export_mismatch"})

    def test_sql_snapshot_from_verified_publication_rejects_mutation(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            with s.read_verified_publication() as verified:
                self.assertEqual(verified.db.execute("SELECT COUNT(*) FROM listings").fetchone()[0], 10)
                with self.assertRaises(sqlite3.DatabaseError):
                    verified.db.execute("UPDATE listings SET price_mad=5")
                with self.assertRaises(sqlite3.DatabaseError):
                    verified.db.execute("PRAGMA query_only=OFF")
                self.assertEqual(verified.db.execute("SELECT COUNT(*) FROM listings").fetchone()[0], 10)

    def test_no_trusted_head_path_means_unauthenticated_even_if_hmac_is_valid(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            with patch.dict(os.environ, {s.TRUSTED_HEAD_ENV: ""}):
                proof = s.verify_publication()
                self.assertEqual(proof["reason"], "trusted_head_unconfigured")


class Round5Replay(unittest.TestCase):
    def test_restore_older_signed_complete_export_after_new_failed_run_is_rejected(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            self.assertTrue(s.verify_publication()["valid"])
            saved = {name: Path(name).read_bytes() for name in (*s.PUBLICATION_FILES, s.DB_NAME, s.PUBLICATION_STATUS)}
            original_head = s._read_trusted_head()
            async def blocked(urls, *, engine, headed, browser_path, diagnostics):
                diagnostics.append({"http_code": 429, "final_status": "blocked"})
                return [s.FetchResult(s.BASE_URL, "blocked", code=429)]
            with (patch.object(s, "approved_shard_baseline", return_value=10),
                  patch.object(s, "fetch_and_check_robots", return_value={"status": "checked"}),
                  patch.object(s, "gather_results", side_effect=blocked)):
                self.assertEqual(asyncio.run(s.main(engine="http")), 2)
            self.assertGreater(s._read_trusted_head()["generation"], original_head["generation"])
            # Restore *every* file under the replaceable output folder.
            for name, contents in saved.items():
                Path(name).write_bytes(contents)
            proof = s.verify_publication()
            self.assertEqual(proof["reason"], "publication_superseded_or_revoked")

    def test_old_signed_complete_export_rejected_after_new_completed_run(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            first = {name: Path(name).read_bytes() for name in (*s.PUBLICATION_FILES, s.DB_NAME, s.PUBLICATION_STATUS)}
            self.assertEqual(offline_main(), 0)
            self.assertTrue(s.verify_publication()["valid"])
            for name, contents in first.items():
                Path(name).write_bytes(contents)
            self.assertEqual(s.verify_publication()["reason"], "publication_superseded_or_revoked")

    def test_marker_initial_failure_with_unlink_denied_cannot_resurrect_old_generation(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            old_marker = Path(s.PUBLICATION_STATUS).read_bytes()
            orig_writer = s._write_publication_status
            orig_unlink = Path.unlink
            def failed_writer(run_id, status, **kwargs):
                if status == "running":
                    raise OSError("synthetic marker filesystem failure")
                return orig_writer(run_id, status, **kwargs)
            def failed_unlink(path, *args, **kwargs):
                if str(path) == s.PUBLICATION_STATUS:
                    raise OSError("synthetic unlink denied")
                return orig_unlink(path, *args, **kwargs)
            with (patch.object(s, "_write_publication_status", side_effect=failed_writer),
                  patch.object(Path, "unlink", failed_unlink)):
                self.assertEqual(offline_main(), 3)
            self.assertEqual(Path(s.PUBLICATION_STATUS).read_bytes(), old_marker)
            self.assertEqual(s.verify_publication()["reason"], "publication_superseded_or_revoked")

    def test_trusted_head_path_cannot_be_inside_restorable_export_folder(self):
        with scratch():
            with patch.dict(os.environ, {s.TRUSTED_HEAD_ENV: str(Path.cwd() / "trusted.json")}):
                self.assertEqual(offline_main(), 3)
                with self.assertRaisesRegex(s.PublicationVerificationError, "trusted_head_inside_publication"):
                    s._trusted_head_path()
                self.assertFalse(s.verify_publication()["valid"])

    def test_trusted_head_missing_from_config_denies_start_before_network(self):
        with scratch():
            with patch.dict(os.environ, {s.TRUSTED_HEAD_ENV: ""}):
                with patch.object(s, "gather_results") as network:
                    self.assertEqual(asyncio.run(s.main(engine="http")), 3)
                    network.assert_not_called()


if __name__ == "__main__":
    unittest.main()
