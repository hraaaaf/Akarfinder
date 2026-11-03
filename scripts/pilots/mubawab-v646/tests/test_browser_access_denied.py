"""Browser 403/429 must never become a success after HTML rendering."""
import asyncio
import unittest
from unittest.mock import AsyncMock

from browser_fetcher import BrowserFetcher
import akarfinder_scraper as s


class FakePage:
    def __init__(self, status):
        self.url = s.BASE_URL
        self._status = status
        self.content = AsyncMock(return_value='<div class="listingBox"></div>')
        self.close = AsyncMock()

    async def goto(self, url, **kwargs):
        assert url == self.url
        return type("Response", (), {"status": self._status})()


class FakeContext:
    def __init__(self, page):
        self.page = page

    async def new_page(self):
        return self.page


class BrowserAccessDenialTests(unittest.TestCase):
    def test_access_denied_never_counts_as_success(self):
        for code in (403, 429):
            with self.subTest(code=code):
                page = FakePage(code)
                browser = BrowserFetcher()
                browser._context = FakeContext(page)
                result = asyncio.run(browser.fetch(s.BASE_URL))
                self.assertEqual(result.status, "blocked")
                self.assertEqual(result.code, code)
                page.content.assert_not_awaited()
                page.close.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
