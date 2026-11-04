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
                websocket = type("FakeWebsocket", (), {"close": AsyncMock()})()

                class PageWithSyntheticSocket(FakePage):
                    async def goto(self, url, **kwargs):
                        # Fire while the isolated context is open; invoking a
                        # socket handler AFTER fetch/close would be impossible
                        # on Chromium and no longer enters the final audit.
                        handler = context.route_web_socket.await_args.args[1]
                        await handler(websocket)
                        return await super().goto(url, **kwargs)

                page = PageWithSyntheticSocket(code)
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
                websocket.close.assert_awaited_once()
                self.assertEqual(browser.network_policy_evidence()["blocked_websockets"], 1)
                self.assertEqual(fake_browser.options, {"service_workers": "block"})


    def test_reloads_of_same_admitted_document_are_denied(self):
        async def check():
            audit = Counter()
            first = FakeRoute("document")
            repeat = FakeRoute("document")
            await _allow_page_without_images(first, {s.BASE_URL}, audit)
            await _allow_page_without_images(repeat, {s.BASE_URL}, audit)
            first.continue_.assert_awaited_once()
            repeat.abort.assert_awaited_once()
            self.assertEqual(audit["admitted_main_documents"], 1)
            self.assertEqual(audit["repeat_main_document_denied"], 1)
            self.assertEqual(audit["blocked_type_document"], 1)
            # The counter must be scoped to a single fetch, not a process:
            # another isolated page is allowed its own first navigation.
            new_context_audit = Counter()
            isolated = FakeRoute("document")
            await _allow_page_without_images(isolated, {s.BASE_URL}, new_context_audit)
            isolated.continue_.assert_awaited_once()
            self.assertEqual(new_context_audit["repeat_main_document_denied"], 0)
        asyncio.run(check())

    def test_repeat_navigation_during_render_is_reported_blocked_not_ok(self):
        import browser_fetcher

        async def exercise():
            page = FakePage(200)
            context = FakeContext(page)
            browser = BrowserFetcher()
            browser._browser = FakeBrowser(context)

            async def simulated_render(*args, **kwargs):
                handler = context.route.await_args.args[1]
                first, repeated = FakeRoute("document"), FakeRoute("document")
                await handler(first)
                await handler(repeated)
                first.continue_.assert_awaited_once()
                repeated.abort.assert_awaited_once()
                return 32

            with patch.object(browser_fetcher, "wait_for_listing_card_stability", simulated_render):
                result = await browser.fetch(s.BASE_URL)
            self.assertEqual(result.status, "blocked")
            self.assertIn("unexpected top-level navigation", result.error)
            page.content.assert_not_awaited()
            self.assertEqual(browser.network_policy_evidence()["admitted_main_documents"], 1)
            self.assertEqual(browser.network_policy_evidence()["repeat_main_document_denied"], 1)
            self.assertEqual(browser.network_policy_evidence()["blocked_top_level_navigations"], 1)
            context.close.assert_awaited_once()
        from unittest.mock import patch
        asyncio.run(exercise())

    def test_browser_does_not_accept_challenge_overlay_over_leftover_cards(self):
        import browser_fetcher

        async def exercise():
            class PageWithMainRoute(FakePage):
                async def goto(self, url, **kwargs):
                    route = context.route.await_args.args[1]
                    await route(FakeRoute("document"))
                    return await super().goto(url, **kwargs)

            page = PageWithMainRoute(200)
            page.content = AsyncMock(return_value=(
                "<html><head><title>Annonces</title></head><body>"
                "<div class='listingBox'></div>"
                "<h1>Checking your browser before accessing</h1>"
                "</body></html>"
            ))
            context = FakeContext(page)
            browser = BrowserFetcher()
            browser._browser = FakeBrowser(context)
            with patch.object(browser_fetcher, "wait_for_listing_card_stability", AsyncMock(return_value=1)):
                result = await browser.fetch(s.BASE_URL)
            self.assertEqual(result.status, "blocked")
            self.assertIn("challenge visible", result.error)
            self.assertEqual(browser.network_policy_evidence()["repeat_main_document_denied"], 0)
            context.close.assert_awaited_once()
        from unittest.mock import patch
        asyncio.run(exercise())



    def test_direct_browser_fetch_refuses_unapproved_urls_before_network(self):
        async def exercise():
            for url in (
                "https://untrusted.example.invalid/fr/st/rabat/appartements-a-vendre",
                "https://www.mubawab.ma/fr/st/tanger/appartements-a-vendre",
                "https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre:p:2",
                "http://www.mubawab.ma/fr/st/rabat/appartements-a-vendre",
            ):
                browser = BrowserFetcher()
                browser._browser = FakeBrowser(FakeContext(FakePage(200)))
                result = await browser.fetch(url)
                self.assertEqual(result.status, "blocked", url)
                self.assertEqual(result.attempts, 0, url)
                self.assertIn("browser preflight", result.error)
                self.assertIsNone(browser._browser.options, "no context or network request", url)
                self.assertEqual(browser.network_policy_evidence()["intercepted_requests"], 0)
        asyncio.run(exercise())

    def test_unapproved_top_level_navigation_invalidates_admitted_render(self):
        from unittest.mock import patch
        import browser_fetcher

        async def exercise():
            class PageWithMainRoute(FakePage):
                async def goto(self, url, **kwargs):
                    handler = context.route.await_args.args[1]
                    await handler(FakeRoute("document", s.BASE_URL))
                    return await super().goto(url, **kwargs)

            page = PageWithMainRoute(200)
            page.content = AsyncMock(return_value="<html><body><div class='listingBox'></div></body></html>")
            context = FakeContext(page)
            browser = BrowserFetcher()
            browser._browser = FakeBrowser(context)

            async def simulated_render(*args, **kwargs):
                handler = context.route.await_args.args[1]
                await handler(FakeRoute("document", "https://www.mubawab.ma/fr/st/other/appartements-a-vendre"))
                await handler(FakeRoute("document", "https://www.mubawab.ma/iframe", iframe=True))
                return 32

            with patch.object(browser_fetcher, "wait_for_listing_card_stability", simulated_render):
                result = await browser.fetch(s.BASE_URL)
            self.assertEqual(result.status, "blocked")
            self.assertIn("unexpected top-level", result.error)
            self.assertEqual(browser.network_policy_evidence()["admitted_main_documents"], 1)
            self.assertEqual(browser.network_policy_evidence()["blocked_top_level_navigations"], 1)
            self.assertEqual(browser.network_policy_evidence()["blocked_by_type"]["document"], 2)
            page.content.assert_not_awaited()
            context.close.assert_awaited_once()
        asyncio.run(exercise())

    def test_routing_evidence_is_required_before_accepting_page_content(self):
        from unittest.mock import patch
        import browser_fetcher

        async def exercise():
            page = FakePage(200)
            context = FakeContext(page)
            browser = BrowserFetcher()
            browser._browser = FakeBrowser(context)
            with patch.object(browser_fetcher, "wait_for_listing_card_stability", AsyncMock(return_value=32)):
                result = await browser.fetch(s.BASE_URL)
            self.assertEqual(result.status, "blocked")
            self.assertIn("routing evidence missing", result.error)
            page.content.assert_not_awaited()
        asyncio.run(exercise())



if __name__ == "__main__":
    unittest.main()
