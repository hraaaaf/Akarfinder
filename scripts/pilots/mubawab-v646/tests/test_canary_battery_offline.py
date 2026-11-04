"""Offline canary battery for the three pinned V646 page-1 shards.

Every HTML page, HTTP response and browser render is SYNTHETIC.
NO actual Mubawab requests, IP/proxy changes, pagination or database writes.
"""
import asyncio
from pathlib import Path
import unittest
from unittest.mock import AsyncMock, patch

import akarfinder_scraper as s
import benchmark_evidence as evidence
import browser_fetcher
import live_canary as canary
from test_browser_stability import FakePage
from test_parser_evidence import card

START_ID = 9900000


def html_cards(n, *, price="1 200 000 DH", district="Agdal, Rabat",
               title="Appartement à vendre", modern=True):
    return "<html><body>" + "".join(
        card(START_ID + i, price=price, district=district, title=title, modern=modern)
        for i in range(n)
    ) + "</body></html>"


class ThreeShardSyntheticCanaries(unittest.TestCase):
    def approved(self):
        return s.resolve_source_urls(1, str(Path(s.__file__).with_name("pilot-urls.txt")))

    def gate(self, n, baseline, **kwargs):
        return canary.summarise_html(html_cards(n, **kwargs),
                                     baseline_eligible_cards=baseline,
                                     require_locality=True)

    def test_01_pilot_manifest_is_exactly_three_pages(self):
        self.assertEqual(len(self.approved()), 3)
        self.assertEqual([s.approved_shard_baseline(u) for u in self.approved()], [32, 32, 33])

    def test_02_rabat_complete_page_passes(self):
        a = self.gate(32, 32)
        self.assertTrue(a["quality_accepted"])
        self.assertEqual(a["eligible_cards"], 32)
        self.assertEqual(a["counts_for_accepted_page_only"]["complete_core_with_district"], 32)

    def test_03_casablanca_complete_page_passes(self):
        a = self.gate(32, 32, district="Maârif, Casablanca")
        self.assertTrue(a["quality_accepted"])
        self.assertEqual(a["counts_for_accepted_page_only"]["unique_source_ids"], 32)

    def test_04_agadir_complete_page_passes(self):
        a = self.gate(33, 33, district="Hay Salam, Agadir")
        self.assertTrue(a["quality_accepted"])
        self.assertEqual(a["counts_for_accepted_page_only"]["complete_core_with_district"], 33)

    def test_05_rabat_truncated_17_of_32_fails_closed(self):
        a = self.gate(17, 32)
        self.assertFalse(a["quality_accepted"])
        self.assertIn("below_shard_baseline_provisional", a["quality_reasons"])
        self.assertEqual(a["counts_observed"]["unique_source_ids"], 17)
        self.assertIsNone(a["counts_for_accepted_page_only"])

    def test_06_casablanca_truncated_22_of_32_fails_closed(self):
        a = self.gate(22, 32, district="Maârif, Casablanca")
        self.assertFalse(a["quality_accepted"])
        self.assertIn("below_shard_baseline_provisional", a["quality_reasons"])

    def test_07_agadir_truncated_22_of_33_fails_closed(self):
        a = self.gate(22, 33, district="Hay Salam, Agadir")
        self.assertFalse(a["quality_accepted"])
        self.assertIn("below_shard_baseline_provisional", a["quality_reasons"])

    def test_08_threshold_boundary_remains_provisional_not_completeness_proof(self):
        a = self.gate(23, 32)
        self.assertTrue(a["quality_accepted"])
        self.assertLess(a["eligible_cards"], 32)
        self.assertTrue(a["quality_contract"]["baseline_is_provisional"])

    def test_09_locality_missing_fails_strict_gate(self):
        a = self.gate(32, 32, district="")
        self.assertFalse(a["quality_accepted"])
        self.assertIn("locality_coverage_below_threshold", a["quality_reasons"])

    def test_10_both_css_locality_markers_renamed_fails(self):
        html = html_cards(32).replace('class="listingTit"', 'class="listingTitle"')
        html = html.replace('class="listingH3"', 'class="differentClass"')
        a = canary.summarise_html(html, baseline_eligible_cards=32, require_locality=True)
        self.assertFalse(a["quality_accepted"])
        self.assertIn("locality_coverage_below_threshold", a["quality_reasons"])

    def test_11_all_prices_on_request_fail(self):
        a = self.gate(32, 32, price="Prix à consulter")
        self.assertFalse(a["quality_accepted"])
        self.assertIn("excessive_on_request_prices", a["quality_reasons"])

    def test_12_from_price_is_not_exact_numeric(self):
        a = self.gate(32, 32, price="À partir de 1 200 000 DH")
        self.assertFalse(a["quality_accepted"])
        self.assertIn("price_coverage_below_threshold", a["quality_reasons"])

    def test_13_missing_surface_fails(self):
        a = self.gate(32, 32)
        assert a["quality_accepted"]
        b = self.gate(32, 32, title="Appartement à vendre")  # control
        self.assertTrue(b["quality_accepted"])
        c = canary.summarise_html(
            html_cards(32).replace("100 m²", "surface inconnue"),
            baseline_eligible_cards=32, require_locality=True)
        self.assertFalse(c["quality_accepted"])
        self.assertIn("surface_coverage_below_threshold", c["quality_reasons"])

    def test_14_villa_and_land_not_counted_as_apartments(self):
        html = ("<html><body>"
                + card(9901001, title="Appartement à vendre")
                + card(9901002, title="Villa à vendre")
                + card(9901003, title="Terrain titré")
                + "</body></html>")
        c = evidence.evaluate(s.parse_listings(html))
        self.assertEqual(c["apartment_confirmed_from_title_only"], 1)
        self.assertEqual(c["explicit_other_or_mixed_type_from_title_only"], 2)

    def test_15_challenge_html_never_quality_passes(self):
        a = canary.summarise_html("<html><body>Checking your browser before accessing</body></html>",
                                  baseline_eligible_cards=32, require_locality=True)
        self.assertFalse(a["quality_accepted"])
        self.assertIsNone(a["counts_for_accepted_page_only"])

    def test_16_empty_page_fails(self):
        a = self.gate(0, 32)
        self.assertFalse(a["quality_accepted"])

    def test_17_duplicate_source_id_never_proves_physical_uniqueness(self):
        html = "<html><body>" + card(9902001) * 32 + "</body></html>"
        c = evidence.evaluate(s.parse_listings(html))
        self.assertEqual(c["observed_rows"], 32)
        self.assertEqual(c["unique_source_ids"], 1)
        self.assertEqual(c["duplicate_source_id_occurrences"], 31)

    def test_18_unknown_shard_must_not_check_robots_or_launch_browser(self):
        unknown = "https://www.mubawab.ma/fr/st/fes/appartements-a-vendre"
        with patch.object(canary, "fetch_and_check_robots") as robots:
            d = asyncio.run(canary.probe(source_url=unknown))
        robots.assert_not_called()
        self.assertEqual(d["canary_status"], "robots_or_admission_blocked")
        self.assertNotIn("listing_page_navigations", d)

    def test_19_denied_robots_never_enters_browser(self):
        with patch.object(canary, "fetch_and_check_robots", side_effect=PermissionError("robots denied")):
            d = asyncio.run(canary.probe())
        self.assertEqual(d["canary_status"], "robots_or_admission_blocked")
        self.assertNotIn("listing_page_navigations", d)


class _HTTPDeniedSession:
    def __init__(self, status_code):
        self.status_code = status_code
        self.calls = 0

    async def get(self, url, **kwargs):
        self.calls += 1
        return type("Response", (), {"status_code": self.status_code, "text": ""})()


class TransportSyntheticCanaries(unittest.TestCase):
    def test_20_http_403_is_terminal_and_no_browser_fallback(self):
        session = _HTTPDeniedSession(403)
        with patch.object(s.asyncio, "sleep", new=AsyncMock()):
            result = asyncio.run(s.fetch_page(session, s.BASE_URL, asyncio.Semaphore(1)))
        self.assertEqual(session.calls, 1)
        self.assertEqual((result.code, result.status), (403, "blocked"))
        self.assertFalse(s.needs_browser_fallback(result))

    def test_21_http_429_is_terminal_and_no_browser_fallback(self):
        session = _HTTPDeniedSession(429)
        with patch.object(s.asyncio, "sleep", new=AsyncMock()):
            result = asyncio.run(s.fetch_page(session, s.BASE_URL, asyncio.Semaphore(1)))
        self.assertEqual(session.calls, 1)
        self.assertEqual((result.code, result.status), (429, "blocked"))
        self.assertFalse(s.needs_browser_fallback(result))

    def test_22_stable_partial_dom_does_not_override_32_card_baseline(self):
        p = FakePage([17] * 12)
        observed = asyncio.run(browser_fetcher.wait_for_listing_card_stability(p, 2800))
        self.assertEqual(observed, 17)
        a = s.parse_listings_audited(html_cards(observed),
                                     baseline_eligible_cards=32, require_locality=True)
        self.assertFalse(a.passes_quality)

    def test_23_stabilization_uses_only_existing_page(self):
        p = FakePage([0, 2, 10, 32, 32, 32, 32])
        observed = asyncio.run(browser_fetcher.wait_for_listing_card_stability(p, 5000))
        self.assertEqual(observed, 32)
        self.assertTrue(p.delays)
