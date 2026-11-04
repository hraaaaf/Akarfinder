"""Browser-based renderer for normal JavaScript pages (no challenge defeating).

Uses an ordinary Playwright Chromium session. It does not hide automation,
rotate proxies, solve CAPTCHAs, or manipulate Cloudflare clearance cookies.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from urllib.parse import urlsplit

from akarfinder_scraper import FetchResult, looks_like_block_page, parse_listings


async def _allow_page_without_images(route) -> None:
    """Abort image subrequests before they reach the network; allow page code and styles."""
    if route.request.resource_type == "image":
        await route.abort()
    else:
        await route.continue_()


@dataclass(frozen=True)
class BrowserConfig:
    headed: bool = False
    max_concurrent_pages: int = 2
    navigation_timeout_ms: int = 30000
    rendering_timeout_ms: int = 12000
    executable_path: str | None = None


async def wait_for_listing_card_stability(page, timeout_ms: int, *,
                                          poll_ms: int = 400,
                                          min_observe_ms: int = 1600,
                                          stable_samples: int = 3) -> int:
    """Observe one navigation until DOM card count settles or the timeout expires.

    A short stable count is a rendering heuristic, NOT proof that page 1 is
    exhaustive. The independent shard baseline/quality gate still applies.
    No extra navigation, HTTP retry or challenge bypass is attempted here.
    """
    if timeout_ms <= 0 or poll_ms <= 0 or min_observe_ms < 0 or stable_samples < 2:
        raise ValueError("Invalid browser stability timing")
    waited, last, consecutive = 0, None, 0
    locator = page.locator(".listingBox")
    while waited <= timeout_ms:
        count = await locator.count()
        consecutive = consecutive + 1 if count > 0 and count == last else (1 if count > 0 else 0)
        if count > 0 and waited >= min_observe_ms and consecutive >= stable_samples:
            return count
        last = count
        if waited + poll_ms > timeout_ms:
            break
        await page.wait_for_timeout(poll_ms)
        waited += poll_ms
    return last or 0


class BrowserFetcher:
    def __init__(self, config: BrowserConfig | None = None):
        self.config = config or BrowserConfig()
        self.semaphore = asyncio.Semaphore(self.config.max_concurrent_pages)
        self._playwright = None
        self._browser = None
        self._context = None

    async def __aenter__(self):
        try:
            from playwright.async_api import async_playwright
        except ImportError as exc:
            raise RuntimeError(
                "Playwright indisponible. Installer: pip install playwright && python -m playwright install chromium"
            ) from exc
        self._playwright = await async_playwright().start()
        try:
            launch_options = {"headless": not self.config.headed}
            if self.config.executable_path:
                launch_options["executable_path"] = self.config.executable_path
            self._browser = await self._playwright.chromium.launch(**launch_options)
            self._context = await self._browser.new_context()
        except Exception as exc:
            await self._playwright.stop()
            self._playwright = None
            raise RuntimeError(
                "Navigateur Chromium indisponible. Installer les binaires: "
                "python -m playwright install chromium"
            ) from exc
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def fetch(self, url: str) -> FetchResult:
        if self._context is None:
            raise RuntimeError("BrowserFetcher non initialisé")
        async with self.semaphore:
            page = await self._context.new_page()
            try:
                # A page navigation must not implicitly download listing photos.
                await page.route("**/*", _allow_page_without_images)
                response = await page.goto(
                    url, wait_until="domcontentloaded",
                    timeout=self.config.navigation_timeout_ms,
                )
                code = response.status if response else None
                # Never accept navigation away from the strictly admitted sale shard.
                if page.url != url:
                    return FetchResult(url, "blocked", code=code, attempts=1,
                                       error="redirection or URL change from admitted shard")
                final_url = urlsplit(page.url)
                host = final_url.hostname
                if (final_url.scheme != "https" or not host or
                        (host != "mubawab.ma" and not host.endswith(".mubawab.ma"))):
                    return FetchResult(url, "blocked", code=code, attempts=1,
                                       error="redirection hors domaine attendu")
                # In a normal browser a JavaScript interstitial can navigate
                # again after an initial 403. Give the page time to render;
                # never assume the initial response alone proves success.
                # An HTTP 403/429 is a hard stop. A rendered card must never
                # turn an access denial into a synthetic HTTP 200 success.
                if code in (403, 429):
                    return FetchResult(url, "blocked", code=code, attempts=1,
                                       error="HTTP access denied; browser fallback disabled")
                if code != 200:
                    return FetchResult(url, "http_error", code=code, attempts=1)
                # Observe stable DOM card counts rather than reading the HTML
                # immediately after the first card. This does NOT certify
                # a full page; the separate per-shard baseline gate remains.
                await wait_for_listing_card_stability(page, self.config.rendering_timeout_ms)
                html = await page.content()
                if parse_listings(html):
                    return FetchResult(url, "ok", html=html, code=200, attempts=1)
                if code in (403, 429) or looks_like_block_page(html):
                    return FetchResult(url, "blocked", code=code, attempts=1,
                                       error="challenge persistant après rendu navigateur")
                return FetchResult(url, "empty", code=code, attempts=1,
                                   error="aucune carte exploitable après rendu JavaScript")
            except Exception as exc:
                return FetchResult(url, "network_error", attempts=1,
                                   error=f"{type(exc).__name__}: {exc}")
            finally:
                await page.close()
