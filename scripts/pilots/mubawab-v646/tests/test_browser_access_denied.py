"""Browser access denial and pre-network fail-closed policy: SYNTHETIC ONLY."""
import asyncio
from collections import Counter
import unittest
from unittest.mock import AsyncMock, Mock

from browser_fetcher import BrowserFetcher, _allow_page_without_images, _request_allowed
import akarfinder_scraper as s


class FakeRequest:
    def __init__(self, resource_type, url=s.BASE_URL, *, iframe=False):
        self.resource_type = resource_type
        self.url = url
        self.frame = type("Frame", (), {"parent_frame": object() if iframe else None})()

    def is_navigation_request(self):
        return self.resource_type == "document"


class FakeRoute:
    def __init__(self, resource_type, url=s.BASE_URL, *, iframe=False):
        self.request = FakeRequest(resource_type, url, iframe=iframe)
        self.abort = AsyncMock()
        self.continue_ = AsyncMock()


class FakePage:
    def __init__(self, status):
        self.url = s.BASE_URL
        self._status = status
        self.content = AsyncMock(return_value='<div class="listingBox"></div>')

    async def goto(self, url, **kwargs):
        assert url == self.url
        return type("Response", (), {"status": self._status})()


class FakeContext:
    def __init__(self, page):
        self.page = page
        self.route = AsyncMock()
        self.route_web_socket = AsyncMock()
        self.close = AsyncMock()

    async def new_page(self):
        return self.page


class FakeBrowser:
    def __init__(self, context):
        self.context = context
        self.options = None

    async def new_context(self, **options):
        self.options = options
        return self.context


class BrowserAccessDenialTests(unittest.TestCase):
    def test_fail_closed_resource_types_including_fetch_xhr_and_masqueraded_png(self):
        async def check():
            blocked = [
                ("image", s.BASE_URL + "/photo.png"),
                ("fetch", s.BASE_URL + "/photo.png"),
                ("fetch", s.BASE_URL + "/image-without-extension"),
                ("xhr", s.BASE_URL + "/api/photo"),
                ("font", s.BASE_URL + "/font.woff"),
                ("media", s.BASE_URL + "/clip.mp4"),
                ("eventsource", s.BASE_URL + "/events"),
                ("other", s.BASE_URL + "/unknown"),
                ("script", "https://third-party.test/loader.js"),
                ("stylesheet", "https://www.mubawab.ma/photo.webp"),
                ("script", "https://www.mubawab.ma/image.svg"),
            ]
            audit = Counter()
            for kind, url in blocked:
                route = FakeRoute(kind, url)
                await _allow_page_without_images(route, {s.BASE_URL}, audit)
                route.abort.assert_awaited_once()
                route.continue_.assert_not_awaited()
            self.assertEqual(audit["blocked"], len(blocked))
            self.assertEqual(audit["continued"], 0)
            for kind, url in (
                ("document", s.BASE_URL),
                ("script", "https://www.mubawab.ma/assets/site.js"),
                ("stylesheet", "https://www.mubawab.ma/assets/site.css"),
            ):
                route = FakeRoute(kind, url)
                await _allow_page_without_images(route, {s.BASE_URL}, audit)
                route.continue_.assert_awaited_once()
                route.abort.assert_not_awaited()
            self.assertEqual(audit["continued"], 3)
        asyncio.run(check())

    def test_nested_or_unapproved_document_is_denied(self):
        self.assertFalse(_request_allowed(FakeRequest("document", s.BASE_URL, iframe=True), {s.BASE_URL}))
        self.assertFalse(_request_allowed(FakeRequest("document", "https://www.mubawab.ma/fr/st/other"), {s.BASE_URL}))
        self.assertFalse(_request_allowed(FakeRequest("script", "http://www.mubawab.ma/main.js"), {s.BASE_URL}))
        self.assertFalse(_request_allowed(FakeRequest("stylesheet", "https://www.mubawab.ma:444/site.css"), {s.BASE_URL}))

    def test_access_denied_never_counts_as_success(self):
        for code in (403, 429):
            with self.subTest(code=code):
                page = FakePage(code)
                context = FakeContext(page)
                fake_browser = FakeBrowser(context)
                browser = BrowserFetcher()
                browser._browser = fake_browser
                result = asyncio.run(browser.fetch(s.BASE_URL))
                self.assertEqual(result.status, "blocked")
                self.assertEqual(result.code, code)
                page.content.assert_not_awaited()
                context.close.assert_awaited_once()
                context.route.assert_awaited_once()
                context.route_web_socket.assert_awaited_once()
                self.assertEqual(fake_browser.options, {"service_workers": "block"})


if __name__ == "__main__":
    unittest.main()
