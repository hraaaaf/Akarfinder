"""Single-page probe unit checks; ZERO network."""
import asyncio
import unittest
from unittest.mock import patch

import live_canary
from test_parser_evidence import SYNTHETIC_MODERN, card


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


    def test_approved_casablanca_runs_exactly_one_page(self):
        import browser_fetcher
        import akarfinder_scraper as scraper
        from pathlib import Path
        urls = scraper.resolve_source_urls(1, str(Path(live_canary.__file__).with_name("pilot-urls.txt")))
        self.assertEqual(len(urls), 3)
        source_url = urls[1]
        visited, robots_checked = [], []

        class FakeBrowser:
            def __init__(self, *args, **kwargs): pass
            def network_policy_evidence(self): return {"policy": "synthetic_mock", "blocked_requests": 0}
            async def __aenter__(self): return self
            async def __aexit__(self, *args): return False
            async def fetch(self, url):
                visited.append(url)
                # A Casablanca shard must contain Casablanca apartment cards only.
                html = "<html><body>" + "".join(
                    card(7801000 + i, district="Maârif, Casablanca") for i in range(3)
                ) + "</body></html>"
                return scraper.FetchResult(url, "ok", html=html, code=200, attempts=1)

        def fake_robots(chosen):
            robots_checked.extend(chosen)
            return {"status": "checked", "sha256": "sha", "checked_at_utc": "now", "rule_count": 1}

        # This is a three-card SYNTHETIC smoke test, not the 32-card Casablanca
        # reference. Isolate the baseline here; a separate test enforces 32 live.
        with patch.object(live_canary, "fetch_and_check_robots", fake_robots), \
                patch.object(live_canary, "approved_shard_baseline", lambda url: 3), \
                patch.object(browser_fetcher, "BrowserFetcher", FakeBrowser):
            result = asyncio.run(live_canary.probe(source_url=source_url))
        self.assertEqual(result["canary_status"], "parsed_quality_pass")
        self.assertEqual(result["source_search_url"], source_url)
        self.assertEqual(visited, [source_url])
        self.assertEqual(robots_checked, [source_url])
        self.assertEqual(result["production_db_writes"], 0)

    def test_unapproved_source_never_fetches_robots_or_listings(self):
        untrusted = "https://www.mubawab.ma/fr/st/tanger/appartements-a-vendre"
        with patch.object(live_canary, "fetch_and_check_robots") as robots:
            result = asyncio.run(live_canary.probe(source_url=untrusted))
        robots.assert_not_called()
        self.assertEqual(result["canary_status"], "robots_or_admission_blocked")
        self.assertNotIn("listing_page_navigations", result)

    def test_colon_pagination_is_denied_without_network(self):
        forbidden = "https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre:p:2"
        with patch.object(live_canary, "fetch_and_check_robots") as robots:
            result = asyncio.run(live_canary.probe(source_url=forbidden))
        robots.assert_not_called()
        self.assertEqual(result["canary_status"], "robots_or_admission_blocked")


if __name__ == "__main__":
    unittest.main()
