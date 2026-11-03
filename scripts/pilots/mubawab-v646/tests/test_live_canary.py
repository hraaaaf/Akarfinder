"""Single-page probe unit checks; ZERO network."""
import asyncio
import unittest
from unittest.mock import patch

import live_canary
from test_parser_evidence import SYNTHETIC_MODERN


class LiveCanaryOfflineTests(unittest.TestCase):
    def test_canary_counts_synthetic_html_without_retaining_raw_html(self):
        result = live_canary.summarise_html(SYNTHETIC_MODERN)
        self.assertTrue(result["quality_accepted"])
        self.assertEqual(result["total_cards"], 6)
        self.assertEqual(result["counts_for_accepted_page_only"]["unique_source_ids"], 3)
        self.assertEqual(result["counts_for_accepted_page_only"]["complete_core_with_district"], 3)
        self.assertNotIn("html", result)
        self.assertEqual(len(result["html_sha256"]), 64)

    def test_empty_html_fails_closed(self):
        result = live_canary.summarise_html("<html><body></body></html>")
        self.assertFalse(result["quality_accepted"])
        self.assertIsNone(result["counts_for_accepted_page_only"])

    def test_robots_failure_never_enters_browser(self):
        with patch.object(live_canary, "fetch_and_check_robots", side_effect=OSError("policy unavailable")):
            r = asyncio.run(live_canary.probe())
        self.assertEqual(r["canary_status"], "robots_or_admission_blocked")
        self.assertNotIn("listing_page_navigations", r)
        self.assertEqual(r["production_db_writes"], 0)


if __name__ == "__main__":
    unittest.main()
