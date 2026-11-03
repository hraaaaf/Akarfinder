"""Synthetic DOM-card-count timing tests. No Chromium, network or page navigation."""
import asyncio
import unittest
from unittest.mock import AsyncMock

from browser_fetcher import wait_for_listing_card_stability


class FakePage:
    def __init__(self, counts):
        self.counts = list(counts)
        self.index = 0
        self.delays = []

    def locator(self, value):
        assert value == '.listingBox'
        return self

    async def count(self):
        value = self.counts[min(self.index, len(self.counts)-1)]
        self.index += 1
        return value

    async def wait_for_timeout(self, ms):
        self.delays.append(ms)


class StabilityTests(unittest.TestCase):
    def test_normal_render_settles_without_requesting_another_page(self):
        p=FakePage([0,1,3,10,32,32,32,32])
        result=asyncio.run(wait_for_listing_card_stability(p, 6000))
        self.assertEqual(result, 32)
        self.assertGreaterEqual(len(p.delays), 6)

    def test_no_cards_times_out_instead_of_claiming_success(self):
        p=FakePage([0])
        result=asyncio.run(wait_for_listing_card_stability(p, 1600))
        self.assertEqual(result, 0)
        self.assertEqual(len(p.delays), 4)

    def test_17_cards_stable_is_not_page_completeness(self):
        p=FakePage([17]*10)
        result=asyncio.run(wait_for_listing_card_stability(p, 2000))
        self.assertEqual(result, 17)
        # The 17/32 rejection is separately enforced in P1Truncation tests.

    def test_during_render_count_change_resets_stability_counter(self):
        p=FakePage([1,1,1,10,10,20,32,32,32,32])
        result=asyncio.run(wait_for_listing_card_stability(p, 7000))
        self.assertEqual(result, 32)

    def test_invalid_timings_fail_explicitly(self):
        for args in ({'timeout_ms':0}, {'timeout_ms':1000,'poll_ms':0},
                     {'timeout_ms':1000,'stable_samples':1},
                     {'timeout_ms':1000,'min_observe_ms':-1}):
            with self.subTest(args=args),self.assertRaises(ValueError):
                asyncio.run(wait_for_listing_card_stability(FakePage([1]),**args))


if __name__=='__main__': unittest.main()
