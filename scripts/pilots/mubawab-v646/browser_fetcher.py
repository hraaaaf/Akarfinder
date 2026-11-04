"""Browser-based renderer for normal JavaScript pages (no challenge defeating).

Uses an ordinary Playwright Chromium session. It does not hide automation,
rotate proxies, solve CAPTCHAs, or manipulate Cloudflare clearance cookies.
"""
from __future__ import annotations

import asyncio
from collections import Counter
from dataclasses import dataclass
import re
from urllib.parse import unquote, urlsplit

from akarfinder_scraper import FetchResult, looks_like_block_page, parse_listings


# Explicit fail-closed allowlist. Playwright labels fetch("photo.png") as
# "fetch" (not "image"); therefore all Fetch/XHR, media, fonts and unknown
# request types are denied, regardless of filename or MIME hints.
_ALLOWED_SUBRESOURCES = frozenset({"script", "stylesheet"})
_IMAGE_EXTENSION = re.compile(
    r"\.(?:png|jpe?g|gif|webp|svg|avif|apng|bmp|ico|tiff?|heic|heif|jxl)$", re.I
)


def _request_allowed(request, admitted_urls: set[str]) -> bool:
    """Only the exact admitted main document and same-origin JS/CSS may leave."""
    try:
        kind = request.resource_type
        if kind == "document":
            return (
                request.url in admitted_urls
                and request.is_navigation_request()
                and request.frame.parent_frame is None
            )
        if kind not in _ALLOWED_SUBRESOURCES:
            return False
        parts = urlsplit(request.url)
        # Never allow a subresource from a third-party host or an image-looking
        # URL even if Chromium classifies it as script/stylesheet.
        return (
            parts.scheme == "https"
            and parts.netloc == "www.mubawab.ma"
            and not _IMAGE_EXTENSION.search(unquote(parts.path))
        )
    except (AttributeError, ValueError):
        return False


async def _allow_page_without_images(route, admitted_urls: set[str], audit: Counter) -> None:
    """Route every browser request through the allowlist before network IO."""
    kind = route.request.resource_type
    audit["intercepted"] += 1
    admitted = _request_allowed(route.request, admitted_urls)
    # A route allowlist is insufficient by itself: a script could reload the
    # exact admitted URL repeatedly. Permit only ONE document request within
    # each isolated fetch context, even if it is the same HTTPS URL.
    if admitted and kind == "document":
        if audit["admitted_main_documents"] >= 1:
            admitted = False
            audit["repeat_main_document_denied"] += 1
        else:
            audit["admitted_main_documents"] += 1
    if admitted:
        audit["continued"] += 1
        await route.continue_()
    else:
        audit["blocked"] += 1
        audit[f"blocked_type_{kind}"] += 1
        await route.abort()


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
        self._network_audit = Counter()

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
        except Exception as exc:
            await self._playwright.stop()
            self._playwright = None
            raise RuntimeError(
                "Navigateur Chromium indisponible. Installer les binaires: "
                "python -m playwright install chromium"
            ) from exc
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    def network_policy_evidence(self) -> dict:
        """Pre-network routing decisions; not a packet capture or MIME audit."""
        return {
            "policy": "exact_main_document_plus_same_origin_js_css",
            "service_workers": "block",
            "websockets": "deny",
            "intercepted_requests": self._network_audit["intercepted"],
            "continued_requests": self._network_audit["continued"],
            "blocked_requests": self._network_audit["blocked"],
            "blocked_by_type": {
                key.removeprefix("blocked_type_"): value
                for key, value in sorted(self._network_audit.items())
                if key.startswith("blocked_type_")
            },
            "blocked_websockets": self._network_audit["blocked_websockets"],
            "admitted_main_documents": self._network_audit["admitted_main_documents"],
            "repeat_main_document_denied": self._network_audit["repeat_main_document_denied"],
        }

    async def fetch(self, url: str) -> FetchResult:
        if self._browser is None:
            raise RuntimeError("BrowserFetcher non initialisé")
        async with self.semaphore:
            # Isolate each fetch: the network allowlist must never leak across
            # concurrent pages or between admitted shards.
            context = await self._browser.new_context(service_workers="block")
            fetch_audit = Counter()
            try:
                roots = {url}
                async def guard(route):
                    await _allow_page_without_images(route, roots, fetch_audit)

                async def deny_websocket(websocket_route):
                    fetch_audit["blocked_websockets"] += 1
                    await websocket_route.close()

                await context.route("**/*", guard)
                await context.route_web_socket("**/*", deny_websocket)
                page = await context.new_page()
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
                if fetch_audit["repeat_main_document_denied"]:
                    return FetchResult(url, "blocked", code=code, attempts=1,
                                       error="repeat main-document navigation denied")
                html = await page.content()
                # A challenge in the visible title/heading is terminal even
                # when stale listing cards remain in the underlying DOM.
                if looks_like_block_page(html):
                    return FetchResult(url, "blocked", code=code, attempts=1,
                                       error="challenge visible après rendu navigateur")
                if fetch_audit["repeat_main_document_denied"]:
                    return FetchResult(url, "blocked", code=code, attempts=1,
                                       error="repeat main-document navigation denied")
                if parse_listings(html):
                    return FetchResult(url, "ok", html=html, code=200, attempts=1)
                return FetchResult(url, "empty", code=code, attempts=1,
                                   error="aucune carte exploitable après rendu JavaScript")
            except Exception as exc:
                return FetchResult(url, "network_error", attempts=1,
                                   error=f"{type(exc).__name__}: {exc}")
            finally:
                try:
                    await context.close()
                finally:
                    self._network_audit.update(fetch_audit)
