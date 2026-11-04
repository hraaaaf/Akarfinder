"""Chromium request-classification regression; synthetic, zero external IO.

Playwright routes abort ALL synthetic URLs regardless of decision. This exercises
the real browser's resource_type values and the production policy function
without ever issuing a request to Mubawab or to another external host.
"""
import asyncio
import os
import unittest
from collections import defaultdict

from browser_fetcher import _request_allowed


class ChromiumNetworkGuard(unittest.TestCase):
    def test_fetch_and_xhr_image_requests_cannot_look_like_safe_subresources(self):
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            self.skipTest("Playwright not installed")
        asyncio.run(self._exercise(async_playwright))

    async def _exercise(self, async_playwright):
        async with async_playwright() as playwright:
            options = {"headless": True}
            executable = os.environ.get("AKAR_TEST_CHROMIUM_PATH")
            if executable:
                options["executable_path"] = executable
            browser = await playwright.chromium.launch(**options)
            try:
                context = await browser.new_context(service_workers="block")
                records = []
                async def synthetic_abort(route):
                    request = route.request
                    records.append((
                        request.resource_type,
                        request.url,
                        _request_allowed(request, {"https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre"}),
                    ))
                    # ABSOLUTE safety: all fixture requests end here, even if
                    # the policy decides they would be allowed in production.
                    await route.abort()
                await context.route("**/*", synthetic_abort)
                page = await context.new_page()
                await page.set_content("""
                    <html><head>
                    <link rel="stylesheet" href="https://www.mubawab.ma/fixture-style.css">
                    <script src="https://www.mubawab.ma/fixture-script.js"></script>
                    <script src="https://third-party.test/fixture-script.js"></script>
                    <style>.photo {background-image:url(https://www.mubawab.ma/bg.webp)}</style>
                    </head><body>
                    <img src="https://www.mubawab.ma/tag.png">
                    <div class="photo">Synthetic</div>
                    <iframe src="https://www.mubawab.ma/fixture-frame"></iframe>
                    <script>
                      fetch('https://www.mubawab.ma/from-fetch.png').catch(() => {});
                      fetch('https://www.mubawab.ma/opaque-data').catch(() => {});
                      var xhr = new XMLHttpRequest();
                      xhr.open('GET','https://www.mubawab.ma/from-xhr.png');
                      xhr.send();
                    </script></body></html>
                """, wait_until="load")
                await page.wait_for_timeout(300)
                by_type = defaultdict(list)
                for kind, url, decision in records:
                    by_type[kind].append((url, decision))
                self.assertIn("fetch", by_type, records)
                self.assertIn("xhr", by_type, records)
                self.assertIn("image", by_type, records)
                self.assertTrue(any(url.endswith("from-fetch.png") and not decision
                                    for url, decision in by_type["fetch"]))
                self.assertTrue(any(url.endswith("opaque-data") and not decision
                                    for url, decision in by_type["fetch"]))
                self.assertTrue(any(url.endswith("from-xhr.png") and not decision
                                    for url, decision in by_type["xhr"]))
                self.assertTrue(all(not decision for url, decision in by_type["image"]))
                self.assertTrue(any(url.endswith("fixture-script.js") and decision
                                    for url, decision in by_type["script"]))
                self.assertTrue(any(url.startswith("https://third-party.test/") and not decision
                                    for url, decision in by_type["script"]))
                self.assertTrue(any(decision for url, decision in by_type["stylesheet"]))
                self.assertTrue(all(not decision for url, decision in by_type["document"]))
                await context.close()
            finally:
                await browser.close()


if __name__ == "__main__":
    unittest.main()
