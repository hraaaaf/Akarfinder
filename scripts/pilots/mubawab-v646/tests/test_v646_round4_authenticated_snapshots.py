"""Round-4 adversarial security checks. Synthetic HTML and temporary SQLite only.

No site requests, production databases, externally stored keys or Chromium.
The fixed HMAC key is TEST-ONLY; production secret must be external.
"""
from __future__ import annotations

import asyncio
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

import akarfinder_scraper as s
from test_parser_evidence import card


TEST_KEY = "a4" * 32  # synthetic fixture, never a production credential


def mock_html():
    return "<html><body>" + "".join(
        card(9961000 + n, district="Agdal, Rabat") for n in range(10)
    ) + "</body></html>"


@contextmanager
def scratch():
    with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {s.PUBLICATION_HMAC_KEY_ENV: TEST_KEY}):
        before = os.getcwd()
        try:
            os.chdir(tmp)
            yield Path(tmp)
        finally:
            os.chdir(before)


def offline_main(html=None):
    async def gather(urls, *, engine, headed, browser_path, diagnostics):
        diagnostics.append({"http_code": 200, "final_status": "ok"})
        return [s.FetchResult(s.BASE_URL, "ok", html=html or mock_html(), code=200)]
    with (patch.object(s, "approved_shard_baseline", return_value=10),
          patch.object(s, "fetch_and_check_robots", return_value={"status": "checked"}),
          patch.object(s, "gather_results", side_effect=gather)):
        return asyncio.run(s.main(engine="http"))


class WALAuthenticatedPublication(unittest.TestCase):
    def test_wal_mutation_is_visible_in_logical_database_digest(self):
        with scratch():
            created = s.init_db()
            created.close()
            conn = sqlite3.connect(s.DB_NAME)
            try:
                # Keep a WAL connection alive across the producer and test
                # mutation so only the -wal sidecar records the next change.
                conn.execute("PRAGMA journal_mode=WAL")
                conn.execute("PRAGMA wal_autocheckpoint=0")
                self.assertEqual(offline_main(), 0)
                self.assertTrue(s.verify_publication()["valid"])
                pristine_file_sha = hashlib.sha256(Path(s.DB_NAME).read_bytes()).hexdigest()
                conn.execute("UPDATE listings SET price_mad=999999 WHERE id='9961000'")
                conn.commit()  # leave WAL uncheckpointed while connection remains open
                self.assertEqual(hashlib.sha256(Path(s.DB_NAME).read_bytes()).hexdigest(), pristine_file_sha)
                result = s.verify_publication()
                self.assertFalse(result["valid"], result)
                self.assertEqual(result["reason"], "db_logical_digest_mismatch")
            finally:
                conn.close()

    def test_multi_heading_promoted_villa_cannot_hide_behind_neutral_h2(self):
        promo = ('<article class="listingBox adBoostBox">'
                 '<h2>Annonce sponsorisée sans détail</h2>'
                 '<h3>Villa Casablanca</h3></article>')
        html = mock_html().replace("</body></html>", promo + "</body></html>")
        audit = s.parse_listings_audited(html, require_locality=True,
                                        expected_city="Rabat", require_apartment=True,
                                        baseline_eligible_cards=10)
        self.assertFalse(audit.passes_quality)
        self.assertEqual(audit.shard_context_violations, 1)
        self.assertEqual(audit.rejected.get("shard_non_apartment_or_unconfirmed_type"), 1)
        with scratch():
            self.assertEqual(offline_main(html), 2)
            self.assertFalse(Path(s.DB_NAME).exists())

    def test_rewriting_file_and_manifest_hash_without_secret_is_rejected(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            Path("akarfinder_data.json").write_bytes(b'{"forged":true}\n')
            marker = json.loads(Path(s.PUBLICATION_STATUS).read_text())
            marker["sha256"]["akarfinder_data.json"] = hashlib.sha256(b'{"forged":true}\n').hexdigest()
            Path(s.PUBLICATION_STATUS).write_text(json.dumps(marker))
            verification = s.verify_publication()
            self.assertFalse(verification["valid"])
            self.assertEqual(verification["reason"], "authentication_mismatch")

    def test_verified_snapshot_is_not_changed_by_post_verification_mutation(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            original = Path("akarfinder_data.json").read_bytes()
            with s.read_verified_publication() as snapshot:
                self.assertEqual(snapshot.read_export("akarfinder_data.json"), original)
                self.assertEqual(snapshot.db.execute("SELECT price_mad FROM listings WHERE id='9961000'").fetchone()[0], 1200000)
                Path("akarfinder_data.json").write_bytes(b'["tampered after verification"]')
                with sqlite3.connect(s.DB_NAME) as db:
                    db.execute("UPDATE listings SET price_mad=42 WHERE id='9961000'")
                # Read ONLY the already verified bytes and copied SQL state.
                self.assertEqual(snapshot.read_export("akarfinder_data.json"), original)
                self.assertEqual(snapshot.db.execute("SELECT price_mad FROM listings WHERE id='9961000'").fetchone()[0], 1200000)
            self.assertFalse(s.verify_publication()["valid"])

    def test_initial_marker_failure_revokes_old_marker_if_unlink_is_possible(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            self.assertTrue(s.verify_publication()["valid"])
            old_export = Path("akarfinder_data.json").read_bytes()
            real_replace = os.replace

            def fail_marker(src, dest):
                if str(dest) == s.PUBLICATION_STATUS:
                    raise OSError("simulated marker drive failure")
                return real_replace(src, dest)

            with patch.object(s.os, "replace", side_effect=fail_marker):
                self.assertEqual(offline_main(), 3)
            self.assertFalse(Path(s.PUBLICATION_STATUS).exists())
            self.assertEqual(Path("akarfinder_data.json").read_bytes(), old_export)
            self.assertFalse(s.verify_publication()["valid"])

    def test_without_protected_key_publication_cannot_be_authenticated(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            with patch.dict(os.environ, {s.PUBLICATION_HMAC_KEY_ENV: ""}):
                result = s.verify_publication()
                self.assertFalse(result["valid"])
                self.assertEqual(result["reason"], "authentication_key_unavailable")

    def test_unsigned_complete_marker_still_fails_closed(self):
        with scratch():
            with patch.dict(os.environ, {s.PUBLICATION_HMAC_KEY_ENV: ""}):
                self.assertEqual(offline_main(), 0)
                self.assertEqual(json.loads(Path(s.PUBLICATION_STATUS).read_text())["authentication"], "unsigned_untrusted")
                self.assertFalse(s.verify_publication()["valid"])

    def test_valid_hmac_verified_snapshot_contains_all_required_files(self):
        with scratch():
            self.assertEqual(offline_main(), 0)
            status = s.verify_publication()
            self.assertTrue(status["valid"], status)
            self.assertTrue(status["authenticated"])
            self.assertEqual(status["files_checked"], 7)
            with s.read_verified_publication() as pub:
                self.assertEqual(set(pub.exports), set(s.PUBLICATION_FILES))
                self.assertEqual(len(pub.db.execute("SELECT id FROM listings").fetchall()), 10)


if __name__ == '__main__':
    unittest.main()
