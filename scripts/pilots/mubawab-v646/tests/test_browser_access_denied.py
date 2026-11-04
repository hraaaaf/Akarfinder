"""Browser 403/429 must never become a success after HTML rendering."""
import asyncio
import unittest
from unittest.mock import AsyncMock

from browser_fetcher import BrowserFetcher, _allow_page_without_images
import akarfinder_scraper as s


class FakePage:
    def __init__(self, status):
        self.url = s.BASE_URL
        self._status = status
        self.content = AsyncMock(return_value='<div class="listingBox"></div>')
        self.close = AsyncMock()
        self.route = AsyncMock()

    async def goto(self, url, **kwargs):
        assert url == self.url
        return type("Response", (), {"status": self._status})()


class FakeContext:
    def __init__(self, page):
        self.page = page

    async def new_page(self):
        return self.page


class FakeRoute:
    def __init__(self, resource_type):
        self.request = type("Request", (), {"resource_type": resource_type})()
        self.abort = AsyncMock()
        self.continue_ = AsyncMock()


class BrowserAccessDenialTests(unittest.TestCase):
    def test_image_subrequests_are_aborted_and_other_page_resources_continue(self):
        async def check():
            image = FakeRoute("image")
            document = FakeRoute("document")
            await _allow_page_without_images(image)
            await _allow_page_without_images(document)
            image.abort.assert_awaited_once()
            image.continue_.assert_not_awaited()
            document.continue_.assert_awaited_once()
            document.abort.assert_not_awaited()
        asyncio.run(check())

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
