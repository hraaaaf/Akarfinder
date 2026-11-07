#!/usr/bin/env python3
"""Akarfinder scraper V6.4.5: durable price reviews, source-aware coverage and anomaly signals.

Dependencies: pip install curl_cffi beautifulsoup4 playwright
Offline tests: python -m unittest discover -s tests -v

This program does not claim that its CSS selectors match the current source HTML:
validate them using permitted, representative HTML fixtures before live use.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import urllib.request
import urllib.error
import asyncio
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import hashlib
import json
import os
from pathlib import Path
import random
import re
import sqlite3
from contextlib import closing
from types import MappingProxyType
import tempfile
import uuid
from statistics import median
from typing import Any
from urllib.parse import urljoin, urlsplit, urlunsplit, unquote

from bs4 import BeautifulSoup

BASE_URL = "https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre"
BASE_DOMAIN = "https://www.mubawab.ma"
MAX_PAGES = 1  # Legacy pagination disabled; use explicit verified shard URL list.
MAX_APPROVED_SHARDS = 3  # Supervised technical pilot, not a bulk crawler.
ROBOTS_URL = "https://www.mubawab.ma/robots.txt"
ROBOTS_UA = "AkarFinder-public-index"
MAX_ROBOTS_BYTES = 128 * 1024
DB_NAME = "akarfinder.db"
PUBLICATION_STATUS = "akarfinder_publication.json"
PUBLICATION_HMAC_KEY_ENV = "AKAR_V646_PUBLICATION_HMAC_KEY_HEX"
TRUSTED_HEAD_ENV = "AKAR_V646_TRUSTED_HEAD_PATH"  # absolute, outside publication root
PUBLICATION_FILES = (
    "akarfinder_data.json", "akarfinder_report.md",
    "akarfinder_price_anomalies.json", "akarfinder_price_m2_flags.json",
    "akarfinder_quality_signals.json", "akarfinder_diagnostics.json",
)
CONCURRENCY_LIMIT = 2
MAX_RETRIES = 3
MIN_ACCEPTANCE_RATE = 0.90  # Reject weak cards, ignoring proven promo/empty slots.
MIN_PRICE_COVERAGE = 0.85  # Conservative policy, not an externally verified threshold.
MAX_PRICE_ON_REQUEST_RATIO = 0.40  # Fail closed on an unusually large masked-price share.
MIN_SURFACE_COVERAGE = 0.85
MIN_LOCALITY_COVERAGE = 0.85  # Source locality drift gate, not a claim all districts are known.
MIN_BASELINE_COVERAGE = 0.70  # PROVISIONAL one-snapshot alert threshold; not statistical completeness.
PRICE_CONFIRMATION_CYCLES = 3  # Qualified observations, NOT arbitrary program runs.
MIN_PRICE_CONFIRMATION_INTERVAL = timedelta(hours=24)  # UTC elapsed time between credits.
PRICE_M2_MIN_SAMPLE = 8  # Median reference is not reliable with very few comparables.
PRICE_M2_LOW_RATIO = 0.20  # Heuristic REVIEW flag, never automatic price correction.
PRICE_M2_HIGH_RATIO = 5.0

# Conservative numeric grammar: unrecognised or ambiguous formats return None.
_NUMBER_CHARS = r"[0-9][0-9., \u00a0\u202f\u2009]*"
_PRICE_RE = re.compile(
    rf"^\s*(?P<number>{_NUMBER_CHARS})\s*(?P<unit>m\s*dh|mdh|dhs?|mad)?\s*$",
    re.IGNORECASE,
)
_SURFACE_RE = re.compile(
    rf"(?<![A-Za-z0-9])(?P<number>{_NUMBER_CHARS})\s*(?:m²|m2|sqm)(?![A-Za-z0-9])",
    re.IGNORECASE,
)
_BEDROOMS_RE = re.compile(r"(?<!\d)(\d+)\s*(?:chambres?|ch\.?|br\.?)\b", re.IGNORECASE)
_ROOMS_RE = re.compile(r"(?<!\d)(\d+)\s*(?:pi[eè]ces?)\b", re.IGNORECASE)
_ID_RE = re.compile(r"/a/([0-9]{5,})(?=/|$)")
_APARTMENT_TITLE_RE = re.compile(r"\b(?:appartements?|appart|studios?|duplex|triplex|penthouses?)\b", re.I)
_APARTMENT_WEAK_RE = re.compile(r"\b(?:pi[eè]ces?|chambres?|[ft][1-6]|rez\s+de\s+jardin)\b", re.I)
_NON_APARTMENT_TITLE_PATTERNS = (
    ("villa", re.compile(r"\bvillas?\b", re.I)),
    ("land", re.compile(r"\bterrains?\b", re.I)),
    ("office", re.compile(r"\b(?:bureaux?|cabinets?|plateaux?\s+de\s+bureaux?)\b", re.I)),
    ("shop", re.compile(r"\b(?:magasins?|boutiques?|local\s+commercial)\b", re.I)),
)


def classify_property_type(title: str) -> str:
    """Title-only indicator; NEVER a verified physical property type."""
    title = title or ""
    apartment = bool(_APARTMENT_TITLE_RE.search(title))
    kinds = [kind for kind, regex in _NON_APARTMENT_TITLE_PATTERNS if regex.search(title)]
    if apartment:
        if any(kind in ("villa", "land") for kind in kinds):
            return "mixed_ambiguous"
        if any(kind in ("office", "shop") for kind in kinds) and re.match(
            r"^(?:bureaux?|cabinets?|magasins?|boutiques?|local\s+commercial)\b", title.strip(), re.I
        ):
            return "mixed_ambiguous"
        return "apartment"
    if len(set(kinds)) > 1:
        return "mixed_ambiguous"
    if kinds:
        return kinds[0]
    return "apartment_probable" if _APARTMENT_WEAK_RE.search(title) else "unknown"


@dataclass(frozen=True)
class FetchResult:
    url: str
    status: str  # ok | blocked | http_error | network_error
    html: str | None = None
    code: int | None = None
    attempts: int = 0
    error: str | None = None


@dataclass
class ImportStats:
    field_changes: dict[str, int] = field(default_factory=dict)
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0
    duplicates: int = 0
    anomalous_prices: int = 0
    pending_prices: int = 0
    unstable_prices: int = 0
    anomalies: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class ParseAudit:
    listings: list[dict[str, Any]] = field(default_factory=list)
    total_cards: int = 0
    modern_locality_expected: int = 0
    modern_locality_valid: int = 0
    baseline_eligible_cards: int | None = None
    shard_context_violations: int = 0
    ignored: dict[str, int] = field(default_factory=dict)
    rejected: dict[str, int] = field(default_factory=dict)

    def mark(self, reason: str, *, ignored: bool = False) -> None:
        counts = self.ignored if ignored else self.rejected
        counts[reason] = counts.get(reason, 0) + 1

    @property
    def eligible_cards(self) -> int:
        return self.total_cards - sum(self.ignored.values())

    @property
    def acceptance_rate(self) -> float:
        return len(self.listings) / self.eligible_cards if self.eligible_cards else 0.0

    @property
    def price_coverage(self) -> float:
        return sum(item["price_mad"] is not None for item in self.listings) / self.eligible_cards if self.eligible_cards else 0.0

    @property
    def price_recognition_coverage(self) -> float:
        """Numeric or explicitly undisclosed is recognized; missing CSS is not."""
        return sum(item.get("price_source_status") in ("numeric", "on_request")
                   for item in self.listings) / self.eligible_cards if self.eligible_cards else 0.0

    @property
    def price_on_request_ratio(self) -> float:
        return (sum(item.get("price_source_status") == "on_request" for item in self.listings) /
                self.eligible_cards if self.eligible_cards else 0.0)

    @property
    def locality_coverage(self) -> float:
        """Both district and city must be explicitly present to certify source locality."""
        # Only enforce for the source template that exposes .listingTit/.listingH3.
        # Legacy .listingTitle fixtures never promised locality.
        return (self.modern_locality_valid / self.modern_locality_expected
                if self.modern_locality_expected else 1.0)

    @property
    def coverage_vs_baseline(self) -> float | None:
        base = self.baseline_eligible_cards
        return self.eligible_cards / base if base else None

    @property
    def surface_coverage(self) -> float:
        return sum(item["surface_m2"] is not None for item in self.listings) / self.eligible_cards if self.eligible_cards else 0.0

    @property
    def passes_quality(self) -> bool:
        return bool(self.listings) and (
            self.acceptance_rate >= MIN_ACCEPTANCE_RATE and
            self.price_recognition_coverage >= MIN_PRICE_COVERAGE and
            self.price_on_request_ratio <= MAX_PRICE_ON_REQUEST_RATIO and
            self.surface_coverage >= MIN_SURFACE_COVERAGE and
            self.locality_coverage >= MIN_LOCALITY_COVERAGE and
            (self.coverage_vs_baseline is None or self.coverage_vs_baseline >= MIN_BASELINE_COVERAGE) and
            self.shard_context_violations == 0
        )

    @property
    def quality_reasons(self) -> list[str]:
        reasons = []
        if self.eligible_cards == 0 or not self.listings:
            reasons.append("no_usable_listings")
        if self.eligible_cards and self.acceptance_rate < MIN_ACCEPTANCE_RATE:
            reasons.append("acceptance_below_threshold")
        if self.eligible_cards and self.price_recognition_coverage < MIN_PRICE_COVERAGE:
            reasons.append("price_coverage_below_threshold")
        if self.eligible_cards and self.price_on_request_ratio > MAX_PRICE_ON_REQUEST_RATIO:
            reasons.append("excessive_on_request_prices")
        if self.eligible_cards and self.surface_coverage < MIN_SURFACE_COVERAGE:
            reasons.append("surface_coverage_below_threshold")
        if self.eligible_cards and self.locality_coverage < MIN_LOCALITY_COVERAGE:
            reasons.append("locality_coverage_below_threshold")
        if self.coverage_vs_baseline is not None and self.coverage_vs_baseline < MIN_BASELINE_COVERAGE:
            reasons.append("below_shard_baseline_provisional")
        if self.shard_context_violations:
            reasons.append("shard_context_violation")
        return reasons


def price_source_status(text: str | None, numeric_price: int | None) -> str:
    if numeric_price is not None:
        return "numeric"
    if text and re.fullmatch(r"\s*(?:prix\s+(?:à\s+consulter|sur\s+demande|nous\s+consulter|à\s+discuter)|nous\s+contacter)\s*", text, re.I):
        return "on_request"
    return "missing_or_unrecognized"


def _normalise_number(raw: str) -> Decimal | None:
    """Parse French/English grouping, with 3-digit suffix treated as thousands.

    Examples: 125.000 => 125000; 82,5 => 82.5; 1,250,000.50 => 1250000.50.
    Reject mixed/bad grouping rather than guessing or concatenating digits.
    """
    raw = re.sub(r"[\u00a0\u202f\u2009]", " ", raw.strip())
    if not raw or not re.fullmatch(r"[0-9][0-9., ]*", raw):
        return None
    if " " in raw:
        if not re.fullmatch(r"\d{1,3}(?: \d{3})+(?:[.,]\d{1,2})?", raw):
            return None
        raw = raw.replace(" ", "")

    dots, commas = raw.count("."), raw.count(",")
    if dots and commas:
        decimal_mark = "." if raw.rfind(".") > raw.rfind(",") else ","
        grouping_mark = "," if decimal_mark == "." else "."
        integer, fraction = raw.rsplit(decimal_mark, 1)
        if not re.fullmatch(r"\d{1,2}", fraction):
            return None
        if not (integer.isdigit() or re.fullmatch(rf"\d{{1,3}}(?:\{grouping_mark}\d{{3}})+", integer)):
            return None
        normal = integer.replace(grouping_mark, "") + "." + fraction
    elif dots or commas:
        mark = "." if dots else ","
        parts = raw.split(mark)
        if len(parts) > 2:
            if not (re.fullmatch(r"\d{1,3}", parts[0]) and
                    all(re.fullmatch(r"\d{3}", p) for p in parts[1:])):
                return None
            normal = "".join(parts)
        elif len(parts) == 2:
            a, b = parts
            if not a.isdigit() or not b.isdigit():
                return None
            if len(b) == 3 and 1 <= len(a) <= 3:
                normal = a + b  # 125.000 = 125000 in this convention.
            elif 1 <= len(b) <= 2:
                normal = a + "." + b
            else:
                return None
        else:
            return None
    else:
        normal = raw
    try:
        value = Decimal(normal)
        return value if value.is_finite() and value > 0 else None
    except InvalidOperation:
        return None


def parse_price(text: str | None) -> int | None:
    """Return positive integer MAD or None; never invent a number from a range."""
    if not text:
        return None
    match = _PRICE_RE.fullmatch(text.strip())
    if not match:
        return None
    value = _normalise_number(match.group("number"))
    if value is None:
        return None
    unit = re.sub(r"\s", "", (match.group("unit") or "").lower())
    if unit == "mdh":
        # '1.500 MDH' is ambiguous (1.5 vs 1500 million); reject.
        num = match.group("number").strip()
        if re.fullmatch(r"\d{1,3}[.,]\d{3}", num):
            return None
        value *= 1_000_000
    result = int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return result if result > 0 else None


def parse_surface(text: str | None) -> float | None:
    """Read a number explicitly adjacent to a surface unit, never room counts."""
    if not text:
        return None
    # A concatenated text such as "Étage 2 110 m²" must not become 2 110 m².
    text = re.sub(r"\b(?:étage|etage|floor|niveau)\s*(?:n[°o.]?\s*)?\d{1,2}\b", " ", text, flags=re.I)
    for match in _SURFACE_RE.finditer(text):
        value = _normalise_number(match.group("number"))
        if value is not None and value <= 1_000_000:
            return float(value)
    return None


def parse_counts(text: str | None) -> tuple[int | None, int | None]:
    """Return (rooms / pièces, bedrooms / chambres), keeping them distinct."""
    if not text:
        return None, None
    room_match = _ROOMS_RE.search(text)
    bedroom_match = _BEDROOMS_RE.search(text)
    rooms = int(room_match.group(1)) if room_match else None
    bedrooms = int(bedroom_match.group(1)) if bedroom_match else None
    return rooms, bedrooms


def canonical_url(raw_link: str | None) -> str | None:
    if not raw_link or not isinstance(raw_link, str):
        return None
    raw_link = raw_link.strip()
    if not raw_link or any(ord(ch) < 32 for ch in raw_link):
        return None
    absolute = urljoin(BASE_DOMAIN + "/", raw_link)
    try:
        parsed = urlsplit(absolute)
        host = parsed.hostname
        port = parsed.port
    except ValueError:
        return None
    if (parsed.scheme != "https" or not host or
            (host != "mubawab.ma" and not host.endswith(".mubawab.ma")) or
            parsed.username is not None or parsed.password is not None or
            port not in (None, 443)):
        return None
    if not parsed.path or parsed.path == "/":
        return None
    # Listing identity is path-based: strip query, fragment and trailing slash.
    return urlunsplit(("https", host + (":443" if port == 443 else ""),
                       parsed.path.rstrip("/"), "", ""))


def listing_id_from_url(link: str) -> str:
    path = urlsplit(link).path
    match = _ID_RE.search(path)
    if match:
        return match.group(1)
    return "url:" + hashlib.sha256(link.encode("utf-8")).hexdigest()[:24]


def looks_like_block_page(html: str) -> bool:
    """Only strong challenge titles/text count; script filenames are not proof.

    HTTP 403/429 are classified separately by fetch_page. Ordinary result pages
    often include a challenge-platform JS resource or a captcha widget.
    """
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.get_text(" ", strip=True).lower() if soup.title else ""
    strong = ("attention required", "checking your browser", "verify you are human",
              "just a moment")
    if any(phrase in title for phrase in strong):
        return True
    for element in soup.select("script,style,template,noscript"):
        element.decompose()
    body = (soup.body or soup).get_text(" ", strip=True).lower()
    if soup.select_one(".listingBox"):
        return False
    return any(phrase in body for phrase in strong)


def _normalise_city(value: str | None) -> str:
    """Conservative city normalization (case, spaces, accents); never infer city."""
    folded = unicodedata.normalize("NFKD", value or "").casefold()
    return "".join(ch for ch in folded if ch.isalnum() and not unicodedata.combining(ch))


def expected_city_for_shard(source_url: str) -> str:
    """Only the three explicitly piloted apartment-sale cities."""
    parts = urlsplit(source_url).path.strip("/").split("/")
    cities = {"rabat": "Rabat", "casablanca": "Casablanca", "agadir": "Agadir"}
    if len(parts) not in (4, 5) or len(parts) < 3 or parts[2] not in cities:
        raise ValueError("City not supported by the bounded V646 shard pilot")
    return cities[parts[2]]


def parse_listings_audited(html: str | None, *, baseline_eligible_cards: int | None = None,
                          require_locality: bool = False, expected_city: str | None = None,
                          require_apartment: bool = False) -> ParseAudit:
    """Classify cards. Source-specific quality gates are opt-in for verified shards."""
    if baseline_eligible_cards is not None and (isinstance(baseline_eligible_cards, bool)
                                               or not isinstance(baseline_eligible_cards, int)
                                               or baseline_eligible_cards <= 0):
        raise ValueError("baseline_eligible_cards must be a positive integer")
    audit = ParseAudit(baseline_eligible_cards=baseline_eligible_cards)
    if not html:
        return audit
    if looks_like_block_page(html):
        audit.mark("challenge_page")
        return audit
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(".listingBox")
    audit.total_cards = len(cards)
    for card in cards:
        classes = set(card.get("class", []))
        if "emptyBox" in classes:
            audit.mark("empty_placeholder", ignored=True)
            continue
        link_el = card.select_one("a[href*='/a/']") or card.select_one("a[href]")
        raw_link = card.get("linkref") or (link_el.get("href") if link_el else None)
        link = canonical_url(raw_link)
        title_el = card.select_one(".listingTit, .listingTitle")
        title = title_el.get_text(" ", strip=True) if title_el else ""
        if "adBoostBox" in classes:
            # Every headline is evidence. A neutral h2 MUST NOT hide a
            # contradictory villa/office in a later h3 (or vice versa).
            headings = [node.get_text(" ", strip=True) for node in card.select("h2, h3")]
            conflicts = [candidate for candidate in headings if candidate and
                         classify_property_type(candidate) in
                         ("villa", "land", "office", "shop", "mixed_ambiguous")]
            # Use the strongest contradictory title when there are several
            # headings. The normal city-first gate below determines the reason.
            if conflicts:
                title = conflicts[0]
            elif not title:
                typed = next((candidate for candidate in headings
                              if classify_property_type(candidate) == "apartment"), "")
                title = typed
        district_el = card.select_one(".listingH3")
        location_text = district_el.get_text(" ", strip=True) if district_el else ""
        locality = [part.strip() for part in location_text.split(",") if part.strip()]
        district = locality[0] if len(locality) >= 2 else None
        city = locality[-1] if len(locality) >= 2 else None
        if district and district.casefold() == city.casefold():
            district = None
        observed_type = classify_property_type(title) if title else "unknown"
        # Check observed contradictory context BEFORE missing link/features.
        # Otherwise a villa from another city can disappear from the denominator
        # and let a wrong shard pass the coverage ratio.
        context_error = None
        if expected_city is not None and city is not None and _normalise_city(city) != _normalise_city(expected_city):
            context_error = "shard_city_mismatch"
        elif require_apartment and title and observed_type != "apartment":
            context_error = "shard_non_apartment_or_unconfirmed_type"
        if context_error:
            audit.mark(context_error)
            audit.shard_context_violations += 1
            continue
        # A promotion is ignorable only AFTER explicit type/city conflicts
        # have been examined. In strict shards, contradictory promotional cards
        # must fail the entire page, even without an ID, link or numeric data.
        if "adBoostBox" in classes and (not link or not _ID_RE.search(urlsplit(link).path)):
            audit.mark("promotion_without_detail_link", ignored=True)
            continue
        if not link or not _ID_RE.search(urlsplit(link).path):
            audit.mark("missing_detail_link")
            continue
        if not title:
            audit.mark("missing_title")
            continue
        price_el = card.select_one(".priceTag, .hardPrice")
        details_nodes = card.select(".adDetails .adDetailFeature") or card.select(".listingDetails span")
        detail_features = [node.get_text(" ", strip=True) for node in details_nodes]
        details_text = " ".join(detail_features)
        rooms, bedrooms = parse_counts(details_text)
        price_raw = price_el.get_text(" ", strip=True) if price_el else None
        price = parse_price(price_raw)
        source_status = price_source_status(price_raw, price)
        # Parse each feature independently: joining can fuse floor number and area.
        surface = next((value for feature in detail_features
                        if (value := parse_surface(feature)) is not None), None)
        if all(v is None for v in (price, surface, rooms, bedrooms)):
            audit.mark("missing_numeric_features")
            continue
        if require_locality or card.select_one(".listingTit"):
            audit.modern_locality_expected += 1
            if district and city:
                audit.modern_locality_valid += 1
        if expected_city is not None and city is None:
            audit.mark("shard_city_missing")
            audit.shard_context_violations += 1
            continue
        if require_apartment and observed_type != "apartment":
            audit.mark("shard_non_apartment_or_unconfirmed_type")
            audit.shard_context_violations += 1
            continue
        bath_match = re.search(r"(?<!\d)(\d+)\s*salles?\s+de\s+bains?\b", details_text, re.I)
        bathrooms = int(bath_match.group(1)) if bath_match else None
        audit.listings.append({
            "id": listing_id_from_url(link),
            "title": title,
            "property_type_observed": observed_type,
            "price_mad": price,
            "price_source_status": source_status,
            "surface_m2": surface,
            "rooms": rooms,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "district": district,
            "location": city,
            "link": link,
            # Search-page origin gets attached by main(), after URL/robots admission.
            "source_search_url": None,
            "transaction_type": None,
            "quality_signals": _quality_signals(title, price, surface, rooms, bedrooms),
        })
    return audit



def _quality_signals(title: str, price: int | None, surface: float | None,
                     rooms: int | None, bedrooms: int | None) -> list[str]:
    signals = []
    if rooms is not None and bedrooms is not None and bedrooms > rooms:
        signals.append("bedrooms_exceed_rooms")
    title_rooms = _ROOMS_RE.search(title)
    if title_rooms is not None and rooms is not None and int(title_rooms.group(1)) != rooms:
        signals.append("title_rooms_mismatch")
    # "Appartement avec bureau" is a normal residential feature, not an office listing.
    if classify_property_type(title) in ("villa", "land", "office", "shop", "mixed_ambiguous") or re.search(r"\b(?:cabinet\s+m[eé]dical|bureau\s+(?:professionnel|commercial)|"
                 r"bureaux\s+(?:professionnels|commerciaux)|local\s+commercial|"
                 r"usage\s+professionnel)\b", title, re.I):
        signals.append("possible_non_residential")
    if price is not None and surface is not None and surface > 0 and price / surface < 500:
        signals.append("price_m2_low_absolute_heuristic")
    return signals


def flag_possible_duplicates(items: list[dict[str, Any]]) -> dict[str, list[str]]:
    """Only candidate correlations; never merge two IDs based on these fields."""
    grouped: dict[tuple, list[str]] = {}
    for item in items:
        if item.get("price_mad") is None or item.get("surface_m2") is None or not item.get("district"):
            continue
        k = (item.get("location"), item["district"].casefold(), item["price_mad"], item["surface_m2"], item.get("transaction_type"))
        grouped.setdefault(k, []).append(item["id"])
    flags = {}
    for ids in grouped.values():
        if len(set(ids)) > 1:
            for ident in ids:
                flags[ident] = sorted(set(ids) - {ident})
    return flags


def parse_listings(html: str | None) -> list[dict[str, Any]]:
    """Stable compatibility API used by previous tests and consumers."""
    return parse_listings_audited(html).listings


async def fetch_page(session: Any, url: str, semaphore: asyncio.Semaphore,
                     max_retries: int = MAX_RETRIES) -> FetchResult:
    """Retry transient network/5xx errors. 403/429/challenges are TERMINAL: no retry."""
    last_code = None
    for attempt in range(1, max_retries + 1):
        await asyncio.sleep(random.uniform(0.5, 1.5))
        try:
            async with semaphore:
                response = await session.get(url, impersonate="chrome120", timeout=25, allow_redirects=False)
            code = response.status_code
            last_code = code
            if code == 200:
                html = response.text
                if looks_like_block_page(html):
                    return FetchResult(url, "blocked", code=code, attempts=attempt,
                                       error="challenge/block HTML")
                return FetchResult(url, "ok", html=html, code=code, attempts=attempt)
            if code in (403, 429):
                return FetchResult(url, "blocked", code=code, attempts=attempt,
                                   error="HTTP access denied; no retry, no escalation")
            if code not in (500, 502, 503, 504):
                return FetchResult(url, "http_error", code=code, attempts=attempt)
            error = f"HTTP {code}"
        except Exception as exc:
            error = f"{type(exc).__name__}: {exc}"
        if attempt < max_retries:
            await asyncio.sleep(min(20, 2 ** attempt + random.uniform(0, 1)))
    return FetchResult(url, "http_error" if last_code is not None else "network_error",
                       code=last_code, attempts=max_retries, error=error)


def init_db(path: str = DB_NAME) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS field_change_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, listing_id TEXT NOT NULL,
            field TEXT NOT NULL, old_value TEXT, new_value TEXT, observed_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS listings (
            id TEXT PRIMARY KEY, title TEXT, property_type_observed TEXT, price_mad INTEGER,
            surface_m2 REAL, rooms INTEGER, bedrooms INTEGER,
            bathrooms INTEGER, district TEXT, location TEXT, link TEXT,
            first_seen TEXT DEFAULT CURRENT_TIMESTAMP,
            last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
            price_status TEXT DEFAULT 'first_observation',
            pending_price_mad INTEGER,
            pending_price_count INTEGER DEFAULT 0,
            pending_price_qualified_at TEXT,
            pending_price_fluctuations INTEGER DEFAULT 0,
            price_source_status TEXT,
            price_review_status TEXT,
            price_reviewed_at TEXT,
            price_review_payload TEXT,
            quality_signals_json TEXT,
            quality_signals_reviewed_at TEXT,
            source_search_url TEXT,
            transaction_type TEXT,
            last_source_observation_json TEXT
        )
    """)
    existing = {r[1] for r in conn.execute("PRAGMA table_info(listings)")}
    # Some legacy tables lack essential INSERT columns, not just recently added fields.
    for column, kind in (("title", "TEXT"), ("price_mad", "INTEGER"),
                         ("surface_m2", "REAL"), ("rooms", "INTEGER"),
                         ("location", "TEXT"), ("link", "TEXT"),
                         ("first_seen", "TEXT"), ("last_seen", "TEXT"),
                         ("property_type_observed", "TEXT"),
                         ("bedrooms", "INTEGER"), ("bathrooms", "INTEGER"), ("district", "TEXT"),
                         ("price_status", "TEXT DEFAULT 'first_observation'"),
                         ("pending_price_mad", "INTEGER"), ("pending_price_count", "INTEGER DEFAULT 0"),
                         ("pending_price_qualified_at", "TEXT"),
                         ("pending_price_fluctuations", "INTEGER DEFAULT 0"),
                         ("price_source_status", "TEXT"),
                         ("price_review_status", "TEXT"), ("price_reviewed_at", "TEXT"),
                         ("price_review_payload", "TEXT"),
                         ("quality_signals_json", "TEXT"),
                         ("quality_signals_reviewed_at", "TEXT"),
                         ("source_search_url", "TEXT"),
                         ("transaction_type", "TEXT"),
                         ("last_source_observation_json", "TEXT")):
        if column not in existing:
            conn.execute(f"ALTER TABLE listings ADD COLUMN {column} {kind}")
    conn.commit()
    return conn


def _log_field_change(conn: sqlite3.Connection, stats: "ImportStats", listing_id: str,
                      column: str, old_value: Any, new_value: Any, observed_at: str) -> None:
    """Append-only audit of overwritten values (same transaction as the import)."""
    conn.execute("INSERT INTO field_change_log(listing_id, field, old_value, new_value, observed_at) "
                 "VALUES (?,?,?,?,?)", (listing_id, column, str(old_value), str(new_value), observed_at))
    stats.field_changes[column] = stats.field_changes.get(column, 0) + 1


def import_listings(conn: sqlite3.Connection, listings: list[dict[str, Any]], *,
                    observed_at: datetime | None = None, commit: bool = True) -> tuple[ImportStats, list[str]]:
    stats = ImportStats()
    ordered_ids: list[str] = []
    utc_now = observed_at if observed_at is not None else datetime.now(timezone.utc)
    if utc_now.tzinfo is None or utc_now.utcoffset() is None:
        raise ValueError("observed_at must be timezone-aware")
    utc_now = utc_now.astimezone(timezone.utc)
    now = utc_now.isoformat(timespec="seconds")
    # A source ID may appear in several cards. Choose the best single observed
    # card; never synthesize a "complete" record from mutually incomplete cards.
    # This is separate from field-change history across distinct import cycles.
    def _observation_score(item: dict[str, Any]) -> tuple[int, int, int]:
        has_price = (item.get("price_mad") is not None or
                     item.get("price_source_status") == "on_request")
        core_fields = (bool(item.get("title")), has_price,
                       item.get("surface_m2") is not None,
                       bool(item.get("location")), bool(item.get("link")))
        strict_fields = (*core_fields, bool(item.get("district")))
        extra_count = sum(item.get(k) is not None for k in
                          ("rooms", "bedrooms", "bathrooms", "property_type_observed"))
        return int(all(strict_fields)), sum(strict_fields), extra_count

    merged: dict[str, dict[str, Any]] = {}
    for item in listings:
        listing_id = item["id"]
        if item.get("transaction_type") not in (None, "sale"):
            raise ValueError("non-sale listing rejected; do not mix rents and sales")
        if listing_id in merged:
            stats.duplicates += 1
            if _observation_score(item) > _observation_score(merged[listing_id]):
                merged[listing_id] = item.copy()
        else:
            merged[listing_id] = item.copy()
    for item in merged.values():
        # Preserve the exact source observation independently of the enriched
        # historical row. Never certify a core assembled across cycles.
        snapshot = json.dumps({k: item.get(k) for k in (
            "id", "title", "price_mad", "price_source_status", "surface_m2",
            "location", "district", "link", "property_type_observed")},
            ensure_ascii=False, sort_keys=True)
        listing_id = item["id"]
        ordered_ids.append(listing_id)
        old = conn.execute("SELECT * FROM listings WHERE id = ?", (listing_id,)).fetchone()
        if old is not None and old["transaction_type"] not in (None, "sale"):
            raise ValueError("conflicting transaction for same listing ID")
        if old is None:
            conn.execute("""INSERT INTO listings
                (id,title,property_type_observed,price_mad,surface_m2,rooms,bedrooms,bathrooms,district,location,link,first_seen,last_seen,price_source_status,source_search_url,transaction_type,last_source_observation_json)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (listing_id, item["title"], item.get("property_type_observed"), item["price_mad"], item["surface_m2"],
                 item["rooms"], item["bedrooms"], item.get("bathrooms"), item.get("district"), item["location"], item["link"],now,now,item.get("price_source_status"),
                 item.get("source_search_url"),item.get("transaction_type"),snapshot))
            stats.inserted += 1
            continue
        changes: dict[str, Any] = {"last_source_observation_json": snapshot}
        incoming_price = item.get("price_mad")
        # Suspicious prices remain quarantined until THREE qualified observations,
        # spaced by >= 24 elapsed hours each. Immediate reruns earn no credit.
        if incoming_price is not None:
            if old["price_mad"] is not None and old["price_mad"] > 0:
                ratio = incoming_price / old["price_mad"]
                suspect = ratio >= 10 or ratio <= 0.1
            else:
                ratio, suspect = None, False
            if suspect:
                previous_candidate = old["pending_price_mad"]
                same_candidate = previous_candidate == incoming_price
                previous_timestamp = None
                try:
                    raw_timestamp = old["pending_price_qualified_at"]
                    if raw_timestamp:
                        previous_timestamp = datetime.fromisoformat(raw_timestamp)
                        if previous_timestamp.tzinfo is not None:
                            previous_timestamp = previous_timestamp.astimezone(timezone.utc)
                        else:
                            previous_timestamp = None  # Legacy data cannot give a trustworthy credit.
                except (TypeError, ValueError):
                    pass
                if same_candidate and previous_timestamp is not None:
                    count = max(1, old["pending_price_count"] or 0)
                    qualified = utc_now - previous_timestamp >= MIN_PRICE_CONFIRMATION_INTERVAL
                    if qualified:
                        count += 1
                        changes["pending_price_qualified_at"] = now
                else:
                    # Legacy V6.4.1 pending counts lacked a clock: reset to 1.
                    count = 1
                    changes["pending_price_qualified_at"] = now
                changes["pending_price_mad"] = incoming_price
                changes["pending_price_count"] = count
                fluctuations = old["pending_price_fluctuations"] or 0
                if previous_candidate is not None and not same_candidate:
                    fluctuations += 1
                if fluctuations != (old["pending_price_fluctuations"] or 0):
                    changes["pending_price_fluctuations"] = fluctuations
                confirmed = count >= PRICE_CONFIRMATION_CYCLES
                status = "confirmed_time_spaced" if confirmed else (
                    "unstable" if fluctuations else "pending_confirmation")
                changes["price_status"] = status
                if confirmed:
                    changes.update(price_mad=incoming_price, pending_price_mad=None,
                                   pending_price_count=0, pending_price_qualified_at=None,
                                   pending_price_fluctuations=0)
                stats.anomalous_prices += 1
                stats.anomalies.append({"id": listing_id, "previous_price_mad": old["price_mad"],
                                        "candidate_price_mad": incoming_price,
                                        "ratio": round(ratio, 4), "observed_at_utc": now,
                                        "confirmation_count": count, "minimum_hours_between_credits": 24,
                                        "fluctuations": fluctuations, "resolution": status})
                if not confirmed:
                    stats.pending_prices += 1
                    if fluctuations:
                        stats.unstable_prices += 1
            else:
                if incoming_price != old["price_mad"]:
                    changes["price_mad"] = incoming_price
                    _log_field_change(conn, stats, listing_id, "price_mad", old["price_mad"], incoming_price, now)
                if old["pending_price_mad"] is not None:
                    changes.update(pending_price_mad=None, pending_price_count=0,
                                   pending_price_qualified_at=None, pending_price_fluctuations=0)
                if old["price_status"] != "observed":
                    changes["price_status"] = "observed"
        for col in ("title", "property_type_observed", "surface_m2", "rooms", "bedrooms", "bathrooms", "district", "location", "link", "price_source_status", "source_search_url", "transaction_type"):
            new = item.get(col)
            if new is not None and new != old[col]:
                changes[col] = new
                if old[col] is not None and col not in ("source_search_url", "price_source_status"):
                    _log_field_change(conn, stats, listing_id, col, old[col], new, now)
        if changes:
            metadata_only = set(changes) <= {"price_status", "pending_price_mad", "pending_price_count",
                                            "pending_price_qualified_at", "pending_price_fluctuations",
                                            "last_source_observation_json"}
            assignments = ", ".join(f"{col} = ?" for col in changes)
            conn.execute(f"UPDATE listings SET {assignments}, last_seen = ? WHERE id = ?",
                         (*changes.values(), now, listing_id))
            if metadata_only:
                stats.unchanged += 1
            else:
                stats.updated += 1
        else:
            conn.execute("UPDATE listings SET last_seen = ? WHERE id = ?", (now, listing_id))
            stats.unchanged += 1
    if commit:
        conn.commit()
    return stats, ordered_ids


def review_price_per_m2(listings: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Flag statistical anomalies within this cycle. Never reject or rewrite prices.

    Prefer same-city reference (>=8 valid comparable prices); otherwise the
    whole page reference (>=8). These ratios are heuristic, not market truth.
    Uses SOURCE price, even for a quarantined candidate; does not use DB price.
    """
    unique = {item["id"]: item for item in listings}
    comparable: dict[str, tuple[dict[str, Any], float]] = {}
    for item in unique.values():
        price, surface = item.get("price_mad"), item.get("surface_m2")
        if price is not None and price > 0 and surface is not None and surface > 0:
            comparable[item["id"]] = (item, price / surface)
    all_rates = [value for _, value in comparable.values()]
    by_city: dict[tuple, list[float]] = {}
    by_transaction: dict[str | None, list[float]] = {}
    for item, rate in comparable.values():
        scope = item.get("transaction_type")
        by_transaction.setdefault(scope, []).append(rate)
        if item.get("location"):
            by_city.setdefault((item["location"], scope), []).append(rate)
    flags: dict[str, dict[str, Any]] = {}
    for listing_id, (item, rate) in comparable.items():
        city_rates = by_city.get((item.get("location"), item.get("transaction_type")), [])
        if len(city_rates) >= PRICE_M2_MIN_SAMPLE:
            baseline = city_rates
            reference_scope = "city"
        else:
            baseline = by_transaction.get(item.get("transaction_type"), [])
            reference_scope = "same_transaction_cycle"
        if len(baseline) < PRICE_M2_MIN_SAMPLE:
            status, reference, ratio = "insufficient_comparables", None, None
        else:
            reference = median(baseline)
            ratio = rate / reference
            status = ("review_low" if ratio < PRICE_M2_LOW_RATIO else
                      "review_high" if ratio > PRICE_M2_HIGH_RATIO else "within_heuristic_range")
        flags[listing_id] = {
            "id": listing_id,
            "source_price_mad": item["price_mad"],
            "surface_m2": item["surface_m2"],
            "source_price_per_m2_mad": round(rate, 2),
            "reference_median_price_per_m2_mad": round(reference, 2) if reference is not None else None,
            "reference_scope": reference_scope,
            "comparable_count": len(baseline),
            "ratio_to_median": round(ratio, 4) if ratio is not None else None,
            "status": status,
            "method": "heuristic_0.2x_5x_median_review_only"
        }
    return flags



def persist_price_reviews(conn: sqlite3.Connection, reviews: dict[str, dict[str, Any]],
                          *, reviewed_at: datetime | None = None, commit: bool = True) -> None:
    """Keep human-review flags between cycles; clear only after new evidence.

    The status is statistical, not a verification of the price or a human signoff.
    """
    moment = reviewed_at or datetime.now(timezone.utc)
    if moment.tzinfo is None or moment.utcoffset() is None:
        raise ValueError("reviewed_at must be timezone-aware")
    when = moment.astimezone(timezone.utc).isoformat(timespec="seconds")
    for ident, review in reviews.items():
        prior = conn.execute("SELECT price_review_status, price_mad FROM listings WHERE id = ?", (ident,)).fetchone()
        if not prior:
            continue
        current = review["status"]
        # Only save anomalous signals, or an explicit clearance of a previous flag.
        if current.startswith("review_"):
            effective = current
        elif current == "insufficient_comparables":
            # A small sample is missing evidence, never evidence to clear a flag.
            continue
        elif current == "within_heuristic_range" and prior["price_review_status"] and prior["price_review_status"].startswith("review_"):
            # A quarantined source-price candidate must not clear a flag for the
            # still-stored historical price. Clear only after stored price changed.
            if prior["price_mad"] != review.get("source_price_mad"):
                continue
            effective = "cleared_on_reobservation"
        else:
            continue
        conn.execute("UPDATE listings SET price_review_status=?, price_reviewed_at=?, price_review_payload=? WHERE id=?",
                     (effective,when,json.dumps(review,ensure_ascii=False),ident))
    if commit:
        conn.commit()


def persist_quality_signals(conn: sqlite3.Connection, listings: list[dict[str, Any]],
                            duplicate_candidates: dict[str, list[str]], *,
                            observed_at: datetime | None = None, commit: bool = True) -> None:
    """Persist review-only findings; absence of an item from the next page does not clear it.

    Signals are snapshots for manual review, not a claim of confirmed duplication.
    An observed item with no current signal retains an older signal until manual review.
    """
    instant = observed_at or datetime.now(timezone.utc)
    if instant.tzinfo is None or instant.utcoffset() is None:
        raise ValueError("observed_at must be timezone-aware")
    timestamp = instant.astimezone(timezone.utc).isoformat(timespec="seconds")
    for item in listings:
        signals = sorted(set(item.get("quality_signals") or []))
        pairs = sorted(set(duplicate_candidates.get(item["id"], [])))
        if not signals and not pairs:
            continue
        record = {"quality_signals": signals, "possible_duplicate_ids": pairs,
                  "review_status": "pending_human_review", "observed_at_utc": timestamp}
        conn.execute("""UPDATE listings SET quality_signals_json=?,
                       quality_signals_reviewed_at=? WHERE id=?""",
                     (json.dumps(record, ensure_ascii=False), timestamp, item["id"]))
    if commit:
        conn.commit()


def persistent_quality_signals(conn: sqlite3.Connection) -> dict[str, dict[str, Any]]:
    findings = {}
    for row in conn.execute("""SELECT id, quality_signals_json
                               FROM listings WHERE quality_signals_json IS NOT NULL ORDER BY id"""):
        findings[row["id"]] = json.loads(row["quality_signals_json"])
    return findings


def persistent_review_flags(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    result = []
    for r in conn.execute("SELECT id, price_review_status, price_reviewed_at, price_review_payload FROM listings WHERE price_review_status LIKE 'review_%' ORDER BY id"):
        source = json.loads(r["price_review_payload"]) if r["price_review_payload"] else {}
        result.append({**source,"id":r["id"],"status":r["price_review_status"],"reviewed_at_utc":r["price_reviewed_at"]})
    return result


def _write_atomic(path: str, contents: str) -> None:
    target = Path(path)
    tmp = target.with_name(target.name + ".tmp")
    try:
        tmp.write_text(contents, encoding="utf-8")
        os.replace(tmp, target)
    finally:
        if tmp.exists():
            tmp.unlink()


def _publication_key() -> bytes | None:
    """Secret supplied out of band; never stored inside the publication tree."""
    raw = os.environ.get(PUBLICATION_HMAC_KEY_ENV, "")
    if len(raw) != 64:
        return None
    try:
        key = bytes.fromhex(raw)
    except ValueError:
        return None
    return key if len(key) == 32 else None


def _signed_payload(marker: dict[str, Any]) -> bytes:
    return json.dumps({k: v for k, v in marker.items() if k != "hmac_sha256"},
                      ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sqlite_snapshot(path: Path) -> sqlite3.Connection:
    """SQLite backup includes committed WAL pages and captures a coherent snapshot."""
    source = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True, timeout=2.0)
    target = sqlite3.connect(":memory:")
    try:
        source.backup(target)
        return target
    except BaseException:
        target.close()
        raise
    finally:
        source.close()


def _db_logical_sha256(conn: sqlite3.Connection) -> str:
    """Hash a consistent *logical* SQLite snapshot, never only .db file bytes."""
    digest = hashlib.sha256()
    for statement in conn.iterdump():
        digest.update(statement.encode("utf-8"))
        digest.update(b"\n")
    return digest.hexdigest()


def _assert_export_matches_snapshot(db: sqlite3.Connection, data_json: bytes) -> None:
    """Prove exported data and immutable SQL snapshot have identical stored rows.

    The JSON may add two *derived* review fields, but every SQLite listing
    column, row ID and value must match exactly. No sample-based checks.
    """
    try:
        records = json.loads(data_json)
    except (UnicodeError, ValueError, TypeError) as exc:
        raise PublicationVerificationError("json_export_unreadable") from exc
    if not isinstance(records, list):
        raise PublicationVerificationError("json_export_not_list")
    cursor = db.execute("SELECT * FROM listings")
    columns = tuple(column[0] for column in cursor.description)
    expected: dict[str, dict[str, Any]] = {}
    for row in cursor:
        obj = dict(zip(columns, row))
        identifier = obj["id"]
        if identifier is None or identifier in expected:
            raise PublicationVerificationError("sqlite_export_duplicate_id")
        expected[identifier] = obj
    if len(records) != len(expected):
        raise PublicationVerificationError("database_export_mismatch")
    seen = set()
    for record in records:
        if not isinstance(record, dict):
            raise PublicationVerificationError("json_export_invalid_row")
        identifier = record.get("id")
        if identifier not in expected or identifier in seen:
            raise PublicationVerificationError("database_export_mismatch")
        seen.add(identifier)
        stored = expected[identifier]
        if any(col not in record or record[col] != value
               for col, value in stored.items()):
            raise PublicationVerificationError("database_export_mismatch")


def _trusted_head_path(root: Path | str = ".") -> Path:
    """Trust anchor location must not be under files an attacker can restore.

    A file is a testable local implementation, NOT a non-rollbackable service.
    The operator must protect this file/parent directory against rollback.
    """
    raw = os.environ.get(TRUSTED_HEAD_ENV, "")
    if not raw or not Path(raw).is_absolute():
        raise PublicationVerificationError("trusted_head_unconfigured")
    trusted = Path(raw).resolve()
    if trusted.is_relative_to(Path(root).resolve()):
        raise PublicationVerificationError("trusted_head_inside_publication")
    if not trusted.parent.is_dir():
        raise PublicationVerificationError("trusted_head_parent_missing")
    return trusted


def _read_trusted_head(root: Path | str = ".") -> dict[str, Any] | None:
    path = _trusted_head_path(root)
    if not path.exists():
        return None
    try:
        doc = json.loads(path.read_bytes())
    except (OSError, ValueError, TypeError) as exc:
        raise PublicationVerificationError("trusted_head_unreadable") from exc
    key = _publication_key()
    if key is None:
        raise PublicationVerificationError("authentication_key_unavailable")
    if not isinstance(doc, dict) or doc.get("schema_version") != 1:
        raise PublicationVerificationError("trusted_head_untrusted")
    signature = doc.get("hmac_sha256")
    if not isinstance(signature, str) or not hmac.compare_digest(
        hmac.new(key, _signed_payload(doc), hashlib.sha256).hexdigest(), signature
    ):
        raise PublicationVerificationError("trusted_head_authentication_mismatch")
    if not isinstance(doc.get("generation"), int) or doc["generation"] < 1:
        raise PublicationVerificationError("trusted_head_invalid_generation")
    return doc


def _write_trusted_head(run_id: str, status: str, generation: int, *,
                        root: Path | str = ".") -> None:
    """Atomic signed trust marker, separate from the replaceable export set.

    Security contract: operator enforces monotonic/rollback-resistant storage.
    A plain replaceable local file is insufficient against full-system rollback.
    """
    key = _publication_key()
    if key is None:
        raise PublicationVerificationError("authentication_key_unavailable")
    path = _trusted_head_path(root)
    doc: dict[str, Any] = {"schema_version": 1, "generation": generation,
                            "run_id": run_id, "status": status}
    doc["hmac_sha256"] = hmac.new(key, _signed_payload(doc), hashlib.sha256).hexdigest()
    temp = path.with_name(path.name + ".tmp")
    try:
        with temp.open("w", encoding="utf-8") as fp:
            json.dump(doc, fp, sort_keys=True)
            fp.flush()
            os.fsync(fp.fileno())
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def _write_publication_status(run_id: str, status: str, *,
                              failure_code: int | None = None,
                              generation: int | None = None) -> None:
    """Signed manifest; absent secret gives an explicit UNAUTHENTICATED result.

    Only verified-reader consumers may claim publication authenticity. Without
    an external secret, a successful offline batch remains *uncertified*.
    """
    marker: dict[str, Any] = {
        "schema_version": 2,
        "run_id": run_id,
        "status": status,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "consumer_contract": "read_verified_publication_only",
        "generation": generation,
    }
    if failure_code is not None:
        marker["failure_exit_code"] = failure_code
        marker["previous_exports_may_be_stale_or_mixed"] = True
        marker["db_committed_before_failure"] = failure_code == 5
    if status == "complete":
        marker["sha256"] = {
            name: hashlib.sha256(Path(name).read_bytes()).hexdigest()
            for name in (*PUBLICATION_FILES, DB_NAME)
        }
        with closing(_sqlite_snapshot(Path(DB_NAME))) as snapshot:
            marker["db_logical_sha256"] = _db_logical_sha256(snapshot)
            _assert_export_matches_snapshot(snapshot, Path("akarfinder_data.json").read_bytes())
        key = _publication_key()
        marker["authentication"] = "hmac_sha256" if key else "unsigned_untrusted"
        if key:
            marker["hmac_sha256"] = hmac.new(key, _signed_payload(marker), hashlib.sha256).hexdigest()
    _write_atomic(PUBLICATION_STATUS, json.dumps(marker, ensure_ascii=False,
                                                 sort_keys=True, indent=2) + "\n")


class PublicationVerificationError(ValueError):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


class ReadOnlySqliteSnapshot:
    """Restrict verified in-memory SQL snapshot to read-only queries.

    Not a hostile-code sandbox; prevents accidental writes through public API.
    """
    __slots__ = ("_conn", "_authorizer")

    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn
        permitted = {sqlite3.SQLITE_SELECT, sqlite3.SQLITE_READ, sqlite3.SQLITE_FUNCTION,
                     sqlite3.SQLITE_RECURSIVE}
        def authorizer(action, arg1, arg2, db_name, source):
            return sqlite3.SQLITE_OK if action in permitted else sqlite3.SQLITE_DENY
        self._authorizer = authorizer
        conn.set_authorizer(authorizer)

    def execute(self, sql: str, parameters: tuple | list = ()):
        return self._conn.execute(sql, parameters)

    def close(self) -> None:
        self._conn.close()


class VerifiedPublication:
    """Immutable verified export bytes + coherent in-memory SQLite snapshot.

    Do not open top-level files after verification; use read_export() and db.
    """
    def __init__(self, run_id: str, exports: dict[str, bytes], db: sqlite3.Connection):
        self.run_id = run_id
        self.exports = MappingProxyType(exports)
        self.db = ReadOnlySqliteSnapshot(db)

    def read_export(self, filename: str) -> bytes:
        return self.exports[filename]

    def close(self) -> None:
        self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


def read_verified_publication(root: Path | str = ".") -> VerifiedPublication:
    """Authenticate a publication and return only the bytes/snapshot verified.

    Captures all files before hashing; a subsequent mutation cannot change the
    returned immutable bytes. A SQLite backup includes WAL commits and fixes
    the snapshot used for the digest and subsequent SQL consumer queries.
    """
    root = Path(root)
    raw_marker = (root / PUBLICATION_STATUS).read_bytes()
    proof = json.loads(raw_marker)
    if proof.get("schema_version") != 2 or proof.get("status") != "complete":
        raise PublicationVerificationError("run_not_complete")
    key = _publication_key()
    if key is None:
        raise PublicationVerificationError("authentication_key_unavailable")
    if proof.get("authentication") != "hmac_sha256":
        raise PublicationVerificationError("publication_unsigned")
    auth = proof.get("hmac_sha256")
    if not isinstance(auth, str) or not hmac.compare_digest(
        hmac.new(key, _signed_payload(proof), hashlib.sha256).hexdigest(), auth
    ):
        raise PublicationVerificationError("authentication_mismatch")
    trusted = _read_trusted_head(root)
    if trusted is None or trusted.get("status") != "complete" or (
        trusted.get("run_id") != proof.get("run_id") or
        trusted.get("generation") != proof.get("generation")
    ):
        raise PublicationVerificationError("publication_superseded_or_revoked")
    digests = proof.get("sha256")
    expected_names = set((*PUBLICATION_FILES, DB_NAME))
    if not isinstance(digests, dict) or set(digests) != expected_names:
        raise PublicationVerificationError("manifest_incomplete")
    exports: dict[str, bytes] = {}
    for filename in PUBLICATION_FILES:
        data = (root / filename).read_bytes()
        expected = digests.get(filename)
        if not isinstance(expected, str) or hashlib.sha256(data).hexdigest() != expected:
            raise PublicationVerificationError("digest_mismatch:" + filename)
        exports[filename] = data
    db_file = root / DB_NAME
    db_bytes = db_file.read_bytes()
    if hashlib.sha256(db_bytes).hexdigest() != digests[DB_NAME]:
        raise PublicationVerificationError("digest_mismatch:" + DB_NAME)
    db_snapshot = _sqlite_snapshot(db_file)
    try:
        # This detects committed WAL changes even if .db bytes are unchanged.
        if _db_logical_sha256(db_snapshot) != proof.get("db_logical_sha256"):
            raise PublicationVerificationError("db_logical_digest_mismatch")
        _assert_export_matches_snapshot(db_snapshot, exports["akarfinder_data.json"])
        if (root / PUBLICATION_STATUS).read_bytes() != raw_marker:
            raise PublicationVerificationError("publication_changed_during_read")
        current_head = _read_trusted_head(root)
        if current_head != trusted:
            raise PublicationVerificationError("trusted_head_changed_during_read")
        return VerifiedPublication(str(proof["run_id"]), exports, db_snapshot)
    except BaseException:
        db_snapshot.close()
        raise


def verify_publication(root: Path | str = ".") -> dict[str, Any]:
    """Point-in-time check ONLY; consumers must use read_verified_publication.

    Never verify and subsequently reopen files: that is a TOCTOU vulnerability.
    """
    try:
        with read_verified_publication(root) as publication:
            return {"valid": True, "status": "complete", "run_id": publication.run_id,
                    "files_checked": len(PUBLICATION_FILES) + 1, "authenticated": True,
                    "read_contract": "use_read_verified_publication_snapshot"}
    except PublicationVerificationError as exc:
        if exc.reason.startswith("digest_mismatch:"):
            return {"valid": False, "reason": "digest_mismatch",
                    "file": exc.reason.split(":", 1)[1]}
        return {"valid": False, "reason": exc.reason}
    except (OSError, ValueError, TypeError, AttributeError, sqlite3.Error) as exc:
        return {"valid": False, "reason": "proof_unavailable", "detail": type(exc).__name__}


def export_reports(conn: sqlite3.Connection, cycle_ids: list[str], stats: ImportStats,
                   page_stats: dict[str, int], json_path: str = "akarfinder_data.json",
                   md_path: str = "akarfinder_report.md",
                   price_m2_reviews: dict[str, dict[str, Any]] | None = None) -> None:
    records = [dict(r) for r in conn.execute(
        "SELECT * FROM listings ORDER BY last_seen DESC, id ASC")]
    reviews = price_m2_reviews or {}
    # Only the current cycle has a valid contemporaneous reference distribution.
    for row in records:
        review = reviews.get(row["id"])
        # Persisted snapshot remains visible for unobserved listings.
        row["price_m2_review"] = (review if review is not None else
                                   json.loads(row["price_review_payload"]) if row.get("price_review_payload") else None)
        if row.get("price_m2_review") is not None:
            row["price_m2_review"]["reviewed_at_utc"] = row.get("price_reviewed_at")
        row["quality_signals_review"] = (json.loads(row["quality_signals_json"])
                                         if row.get("quality_signals_json") else None)
    _write_atomic(json_path, json.dumps(records, ensure_ascii=False, indent=2) + "\n")
    by_id = {r["id"]: r for r in records}
    observed = [by_id[listing_id] for listing_id in cycle_ids if listing_id in by_id]
    observed.sort(key=lambda r: (r["last_seen"], r["id"]), reverse=True)
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    lines = [
        "# Rapport d'extraction Akarfinder V6.4.6", "",
        f"- Généré le (UTC) : {generated_at}",
        f"- Pages : {page_stats['with_listings']} avec annonces / "
        f"{page_stats['http_ok']} HTTP 200 direct / {page_stats.get('browser_ok', 0)} pages Chromium / "
        f"{page_stats['requested']} demandées",
        f"- Annonces uniques observées ce cycle : {len(cycle_ids)}",
        f"- Nouvelles : {stats.inserted} | Modifiées : {stats.updated} | "
        f"Inchangées : {stats.unchanged} | Doublons de pagination : {stats.duplicates}",
        f"- Prix suspects observés ce cycle : {stats.anomalous_prices} (statut et candidat persistants)",
        f"- Signalements prix/m² atypiques dans le cycle : {sum(x['status'].startswith('review_') for x in reviews.values())} (sans rejet automatique)",
        f"- Total cumulé : {len(records)}", "",
        "## Annonces observées durant cette session (maximum 50)", "",
    ]
    for idx, item in enumerate(observed[:50], 1):
        title = (item.get("title") or "Sans titre").replace("\n", " ")
        price = f"{item['price_mad']:,} MAD".replace(",", " ") if item["price_mad"] is not None else "Non communiqué"
        surface = f"{item['surface_m2']:g} m²" if item["surface_m2"] is not None else "Non communiquée"
        rooms = str(item["rooms"]) if item["rooms"] is not None else "N/D"
        bedrooms = str(item["bedrooms"]) if item["bedrooms"] is not None else "N/D"
        lines.extend([f"### {idx}. {title}", f"- Prix : {price}",
                      f"- Secteur : {item.get('district') or 'N/D'} | Salles de bains : {item.get('bathrooms') if item.get('bathrooms') is not None else 'N/D'}",
                      f"- Surface : {surface} | Pièces : {rooms} | Chambres : {bedrooms}",
                      f"- Prix : statut={item.get('price_status')} | candidat={item.get('pending_price_mad')} | observations={item.get('pending_price_count')}",
                      f"- Revue prix/m² : {(item.get('price_m2_review') or {}).get('status', 'non évalué ce cycle')} "
                      f"| taux source={(item.get('price_m2_review') or {}).get('source_price_per_m2_mad')}",
                      f"- Dernière vue : {item['last_seen']}",
                      f"- Lien : {item['link']}", ""])
    _write_atomic(md_path, "\n".join(lines))


def needs_browser_fallback(result: FetchResult) -> bool:
    """Use the browser ONLY for a 200 response whose cards are not rendered yet.

    A 403/429/challenge is terminal ("blocked"): never re-request the same URL
    through another client stack. Never retry a 404, an offline network
    failure, or a generic 5xx in a browser.
    """
    return result.status == "ok" and not parse_listings_audited(result.html).passes_quality


def build_page_diagnostics(results: list[FetchResult], urls: list[str],
                           diagnostics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Attach parser outcome to every URL, not just the successful pages."""
    for idx, (url, result) in enumerate(zip(urls, results)):
        d = diagnostics[idx]
        audit = parse_listings_audited(result.html) if result.html else ParseAudit()
        d.update({
            "page": idx + 1,
            "url": url,
            "final_status": result.status,
            "final_http_code": result.code,
            "final_attempts": result.attempts,
            "error": result.error,
            "parsed_listings": len(audit.listings),
            "price_coverage": round(audit.price_coverage, 4),
            "price_on_request_ratio": round(audit.price_on_request_ratio, 4),
            "price_recognition_coverage": round(audit.price_recognition_coverage, 4),
            "locality_coverage": round(audit.locality_coverage, 4),
            "source_price_on_request": sum(x.get("price_source_status") == "on_request" for x in audit.listings),
            "surface_coverage": round(audit.surface_coverage, 4),
            "quality_reasons": audit.quality_reasons,
            "quality_accepted": result.status == "ok" and audit.passes_quality,
        })
        d.update({"total_cards": audit.total_cards, "ignored_cards": audit.ignored,
                  "rejected_cards": audit.rejected, "eligible_cards": audit.eligible_cards,
                  "acceptance_rate": round(audit.acceptance_rate, 4)})
        if result.status == "ok":
            d["final_status"] = ("ok" if audit.passes_quality else
                                 "excluded_quality" if audit.listings else "empty")
    return diagnostics


async def gather_results(urls: list[str], engine: str = "auto",
                         headed: bool = False,
                         browser_path: str | None = None,
                         diagnostics: list[dict[str, Any]] | None = None) -> list[FetchResult]:
    """HTTP, browser or HTTP+JS fallback. Preserve usable HTTP on browser failure."""
    if engine not in ("auto", "http", "browser"):
        raise ValueError("engine must be auto, http, or browser")
    notes = [{} for _ in urls]
    if engine == "browser":
        from browser_fetcher import BrowserFetcher, BrowserConfig
        async with BrowserFetcher(BrowserConfig(headed=headed, executable_path=browser_path)) as browser:
            results = list(await asyncio.gather(*(browser.fetch(url) for url in urls)))
        for note in notes:
            note.update({"http_status": "not_attempted", "browser_fallback": True})
    else:
        try:
            from curl_cffi.requests import AsyncSession
        except ImportError as exc:
            raise RuntimeError("Installer curl_cffi: pip install curl_cffi") from exc
        semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
        async with AsyncSession() as session:
            results = list(await asyncio.gather(*(
                fetch_page(session, url, semaphore) for url in urls
            )))
        for note, result in zip(notes, results):
            note.update({"http_status": result.status, "http_code": result.code,
                         "http_attempts": result.attempts, "browser_fallback": False})
        if engine == "auto":
            to_retry = [i for i, result in enumerate(results) if needs_browser_fallback(result)]
            for index in to_retry:
                notes[index]["browser_fallback"] = True
            if to_retry:
                from browser_fetcher import BrowserFetcher, BrowserConfig
                try:
                    async with BrowserFetcher(BrowserConfig(headed=headed,
                                                           executable_path=browser_path)) as browser:
                        rendered = await asyncio.gather(
                            *(browser.fetch(urls[i]) for i in to_retry),
                            return_exceptions=True,
                        )
                    for index, result in zip(to_retry, rendered):
                        if isinstance(result, BaseException):
                            notes[index]["browser_status"] = "error"
                            notes[index]["fallback_error"] = f"{type(result).__name__}: {result}"
                        else:
                            notes[index]["browser_status"] = result.status
                            # Never trade partial HTTP data for worse browser output.
                            if (result.status == "ok" and
                                    parse_listings_audited(result.html).passes_quality):
                                results[index] = result
                            elif results[index].status != "ok":
                                results[index] = result
                            elif not parse_listings_audited(results[index].html).listings:
                                results[index] = result
                            else:
                                notes[index]["browser_quality_rejected"] = True
                except (RuntimeError, ImportError, OSError) as exc:
                    # Do not turn an unavailable optional browser into a total loss
                    # if other HTTP pages have already succeeded.
                    for index in to_retry:
                        notes[index]["browser_status"] = "unavailable"
                        notes[index]["fallback_error"] = f"{type(exc).__name__}: {exc}"
    if diagnostics is not None:
        diagnostics.extend(build_page_diagnostics(results, urls, notes))
    return results


def export_diagnostics(diagnostics: list[dict[str, Any]],
                       path: str = "akarfinder_diagnostics.json",
                       fatal_error: str | None = None) -> None:
    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fatal_error": fatal_error,
        "pages": diagnostics,
        "summary": {
            "requested": len(diagnostics),
            "with_listings": sum(d.get("final_status") == "ok" for d in diagnostics),
            "excluded_quality": sum(d.get("final_status") == "excluded_quality" for d in diagnostics),
            "blocked": sum(d.get("final_status") == "blocked" for d in diagnostics),
            "empty": sum(d.get("final_status") == "empty" for d in diagnostics),
            "browser_fallbacks": sum(bool(d.get("browser_fallback")) for d in diagnostics),
            "browser_unavailable": sum(d.get("browser_status") == "unavailable" for d in diagnostics),
            "total_cards": sum(d.get("total_cards", 0) for d in diagnostics),
            "rejected_cards": sum(sum(d.get("rejected_cards", {}).values()) for d in diagnostics),
            "pages_missing_price_coverage": sum("price_coverage_below_threshold" in d.get("quality_reasons", []) for d in diagnostics),
            "pages_missing_surface_coverage": sum("surface_coverage_below_threshold" in d.get("quality_reasons", []) for d in diagnostics),
        },
    }
    _write_atomic(path, json.dumps(report, ensure_ascii=False, indent=2) + "\n")


def approved_shard_baseline(source_url: str) -> int:
    """Mandatory one-snapshot provisional card-count reference for the bounded pilot."""
    data = json.loads(Path(__file__).with_name("quality_baselines_v646_20261103.json").read_text(encoding="utf-8"))
    if data.get("schema_version") != 1 or data.get("minimum_coverage_ratio") != MIN_BASELINE_COVERAGE:
        raise ValueError("Pilot baseline file changed or unversioned; review before fetching")
    samples = data.get("eligible_cards_by_shard")
    if not isinstance(samples, dict) or len(samples) != MAX_APPROVED_SHARDS:
        raise ValueError("Pilot baselines missing, unexpected or invalid")
    approved = resolve_source_urls(1, str(Path(__file__).with_name("pilot-urls.txt")))
    if set(samples) != set(approved) or source_url not in samples:
        raise ValueError("Missing approved one-page baseline for source URL")
    value = samples[source_url]
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError("Invalid pilot eligible-card baseline")
    return value


def resolve_source_urls(pages: int, urls_file: str | None = None) -> list[str]:
    """Strictly sale/apartment search shards. Not a licence to scrape or reuse."""
    if pages != 1:
        raise ValueError("pagination :p:N interdite; --pages doit rester 1; fournir --urls-file")
    if urls_file is None:
        urls = [BASE_URL]
    else:
        raw = Path(urls_file).read_text(encoding="utf-8").splitlines()
        urls = [line.strip() for line in raw if line.strip() and not line.strip().startswith("#")]
    if not (1 <= len(urls) <= MAX_APPROVED_SHARDS):
        raise ValueError(f"--urls-file exige 1..{MAX_APPROVED_SHARDS} URLs supervisées")
    if len(set(urls)) != len(urls):
        raise ValueError("URLs répétées dans --urls-file")
    for url in urls:
        u = urlsplit(url)
        if (u.scheme != "https" or u.hostname != "www.mubawab.ma" or
                u.username or u.password or u.port not in (None, 443) or
                u.query or u.fragment or u.netloc != "www.mubawab.ma"):
            raise ValueError(f"source URL non admissible (HTTPS/host): {url}")
        # Repeated percent-decoding MUST NOT reveal a second reserved character.
        path = u.path
        for _ in range(4):
            decoded = unquote(path)
            if decoded == path:
                break
            path = decoded
        if "%" in path or ":" in path or "\\" in path or "//" in path:
            raise ValueError(f"source URL non admissible (obfuscated path): {url}")
        segments = path.strip("/").split("/")
        if len(segments) < 4 or segments[0] != "fr" or segments[1] not in ("st", "sd", "cd"):
            raise ValueError(f"source URL non admissible (shard): {url}")
        # st/city/type or sd/city/district/type or cd/city/district/type.
        if len(segments) != (4 if segments[1] == "st" else 5):
            raise ValueError(f"source URL non admissible (shard depth): {url}")
        if segments[-1] != "appartements-a-vendre":
            raise ValueError(f"source URL non admissible (sale only): {url}")
        if any(not re.fullmatch(r"[\w-]+", part, re.UNICODE) or part in (".", "..")
               for part in segments[2:-1]):
            raise ValueError(f"source URL non admissible (city/district): {url}")
    return urls


def _robots_rules(text: str, user_agent: str = ROBOTS_UA) -> list[tuple[str, str]]:
    """Return selected robots directives; fail closed on ambiguity, not on silence."""
    groups: list[tuple[list[str], list[tuple[str, str]]]] = []
    agents: list[str] = []
    rules: list[tuple[str, str]] = []
    saw_directive = False
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, val = [x.strip() for x in line.split(":", 1)]
        key = key.casefold()
        if key == "user-agent":
            if saw_directive and agents:
                groups.append((agents, rules))
                agents, rules, saw_directive = [], [], False
            agents.append(val.casefold())
        elif key in ("disallow", "allow") and agents:
            saw_directive = True
            if val:
                rules.append((key, val))
        elif key == "crawl-delay" and agents:
            saw_directive = True
        elif key == "sitemap":
            pass
    if agents:
        groups.append((agents, rules))
    name = user_agent.casefold()
    specific = [r for agents,r in groups if any(a != "*" and a in name for a in agents)]
    generic = [r for agents,r in groups if "*" in agents]
    matched = specific or generic
    if not matched:
        raise ValueError("robots.txt missing applicable User-agent group")
    return [rule for group in matched for rule in group]


def _robots_path_allowed(path: str, rules: list[tuple[str, str]]) -> bool:
    """Match robots wildcard '*' and '$', precedence by longest rule."""
    matched: list[tuple[int, bool]] = []
    for action, rule in rules:
        regex = "".join(".*" if ch == "*" else ("$" if ch == "$" else re.escape(ch)) for ch in rule)
        if re.match(regex, path):
            matched.append((len(rule.replace("*", "")), action == "allow"))
    return sorted(matched, key=lambda x: (x[0], x[1]), reverse=True)[0][1] if matched else True


def check_robots_policy(urls: list[str], robots_text: str) -> dict[str, Any]:
    encoded = robots_text.encode("utf-8")
    if not encoded or len(encoded) > MAX_ROBOTS_BYTES:
        raise ValueError("robots.txt empty or too large")
    rules = _robots_rules(robots_text)
    if not rules:
        raise ValueError("robots.txt has no applicable allow/disallow rules")
    for url in urls:
        path = urlsplit(url).path
        if not _robots_path_allowed(path, rules) or not _robots_path_allowed(unquote(path), rules):
            raise ValueError(f"robots.txt disallows {url}")
    return {"url": ROBOTS_URL, "status": "checked", "sha256": hashlib.sha256(encoded).hexdigest(),
            "checked_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "user_agent": ROBOTS_UA, "rule_count": len(rules), "admitted_urls": len(urls)}


def fetch_and_check_robots(urls: list[str]) -> dict[str, Any]:
    """One fresh robots check every run, BEFORE listing fetch or any DB mutation."""
    request = urllib.request.Request(ROBOTS_URL, headers={"User-Agent": ROBOTS_UA, "Accept": "text/plain"})
    with urllib.request.urlopen(request, timeout=15) as resp:
        if resp.status != 200 or resp.geturl() != ROBOTS_URL:
            raise ValueError("robots.txt not HTTP 200 at canonical same-origin URL")
        data = resp.read(MAX_ROBOTS_BYTES + 1)
        if len(data) > MAX_ROBOTS_BYTES:
            raise ValueError("robots.txt oversized")
        return check_robots_policy(urls, data.decode("utf-8-sig", errors="strict"))


async def main(engine: str = "auto", pages: int = MAX_PAGES,
                headed: bool = False,
                browser_path: str | None = None,
                urls_file: str | None = None) -> int:
    """Exit: 0 complete, 1 partial, 2 empty, 3 admission, 4 pre-commit crash,
    5 DB committed but artifact publication failed (requires reconciliation).

    A new run invalidates all previous exported files via an atomic state
    marker, even when it terminates before writing a single current row.
    """
    diagnostics: list[dict[str, Any]] = []
    run_id = uuid.uuid4().hex
    generation = None
    key = _publication_key()
    try:
        if key is not None:
            old_head = _read_trusted_head()
            generation = 1 if old_head is None else old_head["generation"] + 1
            _write_trusted_head(run_id, "running", generation)
        _write_publication_status(run_id, "running", generation=generation)
    except (OSError, PublicationVerificationError) as exc:
        # If replacing the initial marker fails, best-effort revocation of
        # the previous signed state. If even unlink is prohibited, a previous
        # publication cannot be forcibly revoked on a read-only filesystem.
        try:
            Path(PUBLICATION_STATUS).unlink(missing_ok=True)
        except OSError:
            pass
        print(f"[ERREUR PUBLICATION] Impossible d'invalider exports existants: {exc}")
        return 3  # never fetch or write SQLite after invalidation failed
    try:
        code = await _main(engine, pages, headed, browser_path, urls_file, diagnostics)
    except Exception as exc:  # an uncaught traceback would also exit 1 == "partial"
        message = f"{type(exc).__name__}: {exc}"
        print(f"[ERREUR INATTENDUE] {message}")
        try:
            export_diagnostics(diagnostics, fatal_error=message)
        except Exception:
            pass
        code = 4
    try:
        _write_publication_status(run_id, "complete" if code == 0 else "failed",
                                  failure_code=code if code else None, generation=generation)
        if generation is not None:
            _write_trusted_head(run_id, "complete" if code == 0 else "failed", generation)
    except (OSError, ValueError, TypeError) as exc:
        # Never report success without a published and hash-verifiable marker.
        print(f"[ERREUR PUBLICATION] Marqueur non vérifiable: {exc}")
        return 5 if code == 0 else code
    return code

async def _main(engine: str, pages: int, headed: bool, browser_path: str | None,
                urls_file: str | None, diagnostics: list[dict[str, Any]]) -> int:
    try:
        urls = resolve_source_urls(pages, urls_file)
    except (ValueError, OSError, UnicodeError) as exc:
        print(f"[ERREUR URL/ROBOTS] {exc}")
        return 3
    try:
        for url in urls:
            approved_shard_baseline(url)
        robots_proof = fetch_and_check_robots(urls)
        _write_atomic("robots_policy_evidence.json", json.dumps(robots_proof, ensure_ascii=False, indent=2) + "\n")
    except (OSError, ValueError, UnicodeError, urllib.error.URLError) as exc:
        _write_atomic("robots_policy_evidence.json", json.dumps({"status": "BLOCKED", "url": ROBOTS_URL,
                      "error": f"{type(exc).__name__}: {exc}",
                      "checked_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds")},
                      ensure_ascii=False, indent=2) + "\n")
        print(f"[ERREUR ROBOTS] {exc}; aucun fetch annonce et aucune écriture DB")
        return 3
    try:
        results = await gather_results(urls, engine=engine, headed=headed,
                                       browser_path=browser_path,
                                       diagnostics=diagnostics)
    except (RuntimeError, ImportError, OSError) as exc:
        print(f"[ERREUR CONFIGURATION] {type(exc).__name__}: {exc}")
        return 3

    page_stats = {
        "requested": len(urls),
        # Count actual successful raw-HTTP attempts only. Browser success is
        # recorded separately and must not inflate HTTP 200 counts.
        "http_ok": sum(d.get("http_code") == 200 for d in diagnostics),
        "browser_ok": sum(d.get("browser_status") == "ok" for d in diagnostics),
        "with_listings": 0,
    }
    collected: list[dict[str, Any]] = []
    for index, result in enumerate(results, 1):
        if result.status != "ok":
            print(f"[!] Page {index}: {result.status} (HTTP {result.code}, {result.error})")
            continue
        baseline = approved_shard_baseline(urls[index - 1])
        audit = parse_listings_audited(result.html, require_locality=True,
                                      baseline_eligible_cards=baseline,
                                      expected_city=expected_city_for_shard(urls[index - 1]),
                                      require_apartment=True)
        listings = audit.listings
        if not audit.passes_quality:
            print(f"[!] Page {index}: qualité insuffisante "
                  f"({len(listings)}/{audit.eligible_cards}, prix={audit.price_coverage:.1%}, "
                  f"surface={audit.surface_coverage:.1%}, motifs={audit.quality_reasons}). Page exclue.")
            diagnostics[index - 1]["final_status"] = "excluded_quality" if listings else "empty"
            diagnostics[index - 1]["quality_accepted"] = False
            diagnostics[index - 1]["quality_reasons"] = audit.quality_reasons
            diagnostics[index - 1]["rejected_cards"] = audit.rejected
            diagnostics[index - 1]["shard_context_violations"] = audit.shard_context_violations
            continue
        if not listings:
            print(f"[!] Page {index}: HTTP 200 mais aucune annonce valide.")
            continue
        page_stats["with_listings"] += 1
        for item in listings:
            item["source_search_url"] = urls[index - 1]
            item["transaction_type"] = "sale"
        collected.extend(listings)
    if not collected:
        export_diagnostics(diagnostics)
        print("[ERREUR] Aucune annonce exploitable : aucun export de données généré.")
        print("Diagnostic généré : akarfinder_diagnostics.json")
        return 2

    # Fail closed at the batch boundary: no partial SQLite ingestion when any
    # requested shard failed fetch/quality. Diagnostics remain available.
    if page_stats["with_listings"] != page_stats["requested"]:
        export_diagnostics(diagnostics)
        print("[ERREUR] Lot incomplet : import SQLite annulé ; corriger les shards en échec.")
        return 1

    # Reports are staged (not published) until every SQL write and report
    # serializer has succeeded. Only then is the SQLite transaction committed.
    # No cross-resource (SQLite + filesystem) ACID guarantee is claimed.
    with tempfile.TemporaryDirectory(prefix=".akar-v646-stage-", dir=".") as staging:
        files = PUBLICATION_FILES
        path = lambda name: str(Path(staging) / name)
        conn = init_db()
        try:
            # SQLite changes are atomic across importer, field-change journal,
            # price and quality reviews, and all serializers. A pre-commit crash
            # must leave no new listing rows committed.
            conn.execute("BEGIN")
            try:
                price_m2_reviews = review_price_per_m2(collected)
                stats, cycle_ids = import_listings(conn, collected, commit=False)
                persist_price_reviews(conn, price_m2_reviews, commit=False)
                duplicate_candidates = flag_possible_duplicates(collected)
                persist_quality_signals(conn, collected, duplicate_candidates, commit=False)
                stored_flags = persistent_review_flags(conn)
                stored_quality = persistent_quality_signals(conn)
                export_reports(conn, cycle_ids, stats, page_stats,
                               json_path=path("akarfinder_data.json"),
                               md_path=path("akarfinder_report.md"),
                               price_m2_reviews=price_m2_reviews)
                _write_atomic(path("akarfinder_price_anomalies.json"),
                              json.dumps(stats.anomalies, indent=2, ensure_ascii=False) + "\n")
                _write_atomic(path("akarfinder_price_m2_flags.json"), json.dumps(
                    {"generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                     "page_scope": "current_cycle_plus_persisted_history",
                     "observations": len(price_m2_reviews),
                     "heuristic_ratio_limits": [PRICE_M2_LOW_RATIO, PRICE_M2_HIGH_RATIO],
                     "flags": stored_flags,
                     "current_cycle_flags": [x for x in price_m2_reviews.values()
                                             if x["status"].startswith("review_")]},
                    ensure_ascii=False, indent=2) + "\n")
                _write_atomic(path("akarfinder_quality_signals.json"), json.dumps({
                    "flags_by_listing": stored_quality,
                    "page_scope": "current_cycle_plus_persisted_history",
                    "signals_are_review_only": True},
                    ensure_ascii=False, indent=2) + "\n")
                export_diagnostics(diagnostics, path=path("akarfinder_diagnostics.json"))
                conn.commit()
            except BaseException:
                conn.rollback()
                raise
        finally:
            conn.close()
        # SQLite is now committed. If an OS failure prevents publishing staged
        # reports, report a DISTINCT exit code 5 (committed / reports failed),
        # never the pre-commit crash code 4.
        try:
            for name in files:
                os.replace(path(name), name)
        except OSError as exc:
            print(f"[ERREUR PUBLICATION] SQLite commitée, export incomplet: {exc}")
            return 5
    incomplete = page_stats["with_listings"] < page_stats["requested"]
    print(f"Pages avec annonces: {page_stats['with_listings']}/{page_stats['requested']}; "
          f"annonces uniques: {len(cycle_ids)}; nouvelles: {stats.inserted}; "
          f"modifiées: {stats.updated}; doublons: {stats.duplicates}; "
          f"statut: {'PARTIEL' if incomplete else 'COMPLET (sur pages demandées)'}")
    print("Exports générés: akarfinder_data.json, akarfinder_report.md, akarfinder_diagnostics.json")
    return 0 if not incomplete else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Akarfinder Scraper V6.4.6")
    parser.add_argument("--engine", choices=("auto", "http", "browser"),
                        default="auto", help="auto: HTTP + fallback navigateur JavaScript")
    parser.add_argument("--pages", type=int, default=MAX_PAGES,
                        help="toujours 1; pagination colon interdite; utiliser --urls-file")
    parser.add_argument("--urls-file", default=None, help="liste vérifiée de shards HTTPS sans pagination (max 3)")
    parser.add_argument("--headed", action="store_true", help="affiche le navigateur Chromium")
    parser.add_argument("--browser-path", default=None,
                        help="chemin optionnel vers un exécutable Chromium déjà installé")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(main(engine=args.engine, pages=args.pages,
                                     headed=args.headed, browser_path=args.browser_path,
                                      urls_file=args.urls_file)))
