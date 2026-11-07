"""V6.4.6 regression: a partially accepted batch cannot mutate local SQLite.
All inputs are synthetic. No HTTP, Chromium, cloud DB, or live URL navigation.
"""
from __future__ import annotations

import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import akarfinder_scraper as scraper


URL_A = "https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre"
URL_B = "https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre"


def audit(accepted: bool):
    # Only the exact fields the main() decision path reads; the parser is tested
    # separately by the existing parser and adversarial suites.
    return SimpleNamespace(
        passes_quality=accepted,
        listings=[{"id": "7800001", "title": "Synthetic apartment"}],
        eligible_cards=1,
        price_coverage=1.0 if accepted else 0.0,
        surface_coverage=1.0 if accepted else 0.0,
        quality_reasons=[] if accepted else ["price_coverage_below_threshold"],
        shard_context_violations=0,
        rejected={} if accepted else {"missing_or_unrecognized_price": 1},
    )


class PartialBatchMustNotOpenDatabase(unittest.TestCase):
    def execute_batch(self, results, audits):
        async def fake_gather(urls, *, engine, headed, browser_path, diagnostics):
            self.assertEqual(urls, [URL_A, URL_B])
            diagnostics.extend(
                {"http_code": r.code, "final_status": r.status}
                for r in results
            )
            return results

        with (
            patch.object(scraper, "resolve_source_urls", return_value=[URL_A, URL_B]),
            patch.object(scraper, "approved_shard_baseline", return_value=1),
            patch.object(scraper, "fetch_and_check_robots", return_value={"status": "PASS"}),
            patch.object(scraper, "_write_atomic"),
            patch.object(scraper, "gather_results", side_effect=fake_gather),
            patch.object(scraper, "parse_listings_audited", side_effect=lambda html, **kwargs: audits[html]),
            patch.object(scraper, "init_db") as init_db,
            patch.object(scraper, "export_diagnostics") as report,
        ):
            init_db.side_effect = AssertionError("SQLite must never open on partial batch")
            code = asyncio.run(scraper.main(engine="http", pages=1))
            self.assertEqual(code, 1)
            init_db.assert_not_called()
            report.assert_called_once()
            diagnostics = report.call_args.args[0]
            self.assertEqual(len(diagnostics), 2)

    def test_429_after_good_shard_never_opens_sqlite(self):
        self.execute_batch([
            scraper.FetchResult(URL_A, "ok", html="good", code=200),
            scraper.FetchResult(URL_B, "blocked", code=429),
        ], {"good": audit(True)})

    def test_quality_rejected_after_good_shard_never_opens_sqlite(self):
        self.execute_batch([
            scraper.FetchResult(URL_A, "ok", html="good", code=200),
            scraper.FetchResult(URL_B, "ok", html="bad", code=200),
        ], {"good": audit(True), "bad": audit(False)})

    def test_network_error_after_good_shard_never_opens_sqlite(self):
        self.execute_batch([
            scraper.FetchResult(URL_A, "ok", html="good", code=200),
            scraper.FetchResult(URL_B, "network_error", error="synthetic offline failure"),
        ], {"good": audit(True)})


if __name__ == "__main__":
    unittest.main()
