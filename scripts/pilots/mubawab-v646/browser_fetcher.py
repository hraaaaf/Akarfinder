"""Browser-based renderer for normal JavaScript pages (no challenge defeating).

Uses an ordinary Playwright Chromium session. It does not hide automation,
rotate proxies, solve CAPTCHAs, or manipulate Cloudflare clearance cookies.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from urllib.parse import urlsplit

from akarfinder_scraper import FetchResult, looks_like_block_page, parse_listings


@dataclass(frozen=True)
class BrowserConfig:
    headed: bool = False
    max_concurrent_pages: int = 2
    navigation_timeout_ms: int = 30000
    rendering_timeout_ms: int = 12000
    executable_path: str | None = None


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
                if code is not None and code not in (200, 403, 429):
                    return FetchResult(url, "http_error", code=code, attempts=1)
                # An ordinary browser runs the page JavaScript. Wait for a card
                # instead of assuming that a 200 response contains the listings.
                try:
                    await page.locator(".listingBox").first.wait_for(
                        state="attached", timeout=self.config.rendering_timeout_ms
                    )
                except Exception:
                    pass  # classify rendered content below, including challenges.
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
