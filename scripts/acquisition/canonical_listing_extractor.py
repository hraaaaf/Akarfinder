#!/usr/bin/env python3
"""Deterministic public listing-page classifier + canonical field extractor.

L4 scope: classify candidate URLs as listing-detail vs discovery/non-listing and
extract only facts directly supported by page evidence. No DB writes.
"""

from __future__ import annotations

import html as html_lib
import json
import re
from dataclasses import dataclass, asdict
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse

PROPERTY_TYPES = [
    ("apartment", ("appartement", "apartment")),
    ("studio", ("studio",)),
    ("duplex", ("duplex",)),
    ("villa", ("villa",)),
    ("riad", ("riad",)),
    ("house", ("maison", "house")),
    ("land", ("terrain", "land")),
    ("office", ("bureau", "office")),
    ("commercial", ("local commercial", "commerce", "commercial")),
    ("warehouse", ("entrepot", "entrepôt", "warehouse")),
]

DETAIL_PATH_PATTERNS = [
    re.compile(r"/fr/(?:a|pa)/\d+(?:/|$)", re.I),  # Mubawab
    re.compile(r"/annonce/\d+(?:/|$)", re.I),      # MarocAnnonces
    re.compile(r"/biens?/\d+(?:/|$)", re.I),      # long-tail agencies
    re.compile(r"/(?:property|bien)/[^/?#]+/?$", re.I),
]

DISCOVERY_PATH_PATTERNS = [
    re.compile(r"/(?:search|recherche|acheter|louer|location|vente)(?:/|$)", re.I),
    re.compile(r"/(?:category|categorie|area|all-properties)(?:/|$)", re.I),
    re.compile(r"sitemap.*\.xml$", re.I),
]

PRICE_RE = re.compile(r"(?<!\d)(\d{1,3}(?:[\s\u00a0.,]\d{3})+|\d{4,10})(?:[\s\u00a0]*(?:MAD|DH|DHS|درهم))", re.I)
SURFACE_RE = re.compile(r"(?<!\d)(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2|m\^2)\b", re.I)
BEDROOM_RE = re.compile(r"(?<!\d)(\d{1,2})\s*(?:chambres?|ch(?:\.|\b)|bedrooms?)", re.I)
BATHROOM_RE = re.compile(r"(?<!\d)(\d{1,2})\s*(?:salles?\s+de\s+bains?|sdb|bathrooms?)", re.I)
FLOOR_RE = re.compile(r"(?:étage|etage|floor)\s*[:\-]?\s*(\d{1,2})", re.I)


@dataclass(frozen=True)
class Evidence:
    source_url: str
    method: str
    raw: str


@dataclass(frozen=True)
class FieldFact:
    value: Any
    evidence: Evidence


class _HTMLCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.text: list[str] = []
        self.title: list[str] = []
        self.meta: dict[str, str] = {}
        self._in_title = False
        self._jsonld = False
        self._jsonld_buf: list[str] = []
        self.jsonld_blocks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {str(k).lower(): (v or "") for k, v in attrs}
        if tag.lower() == "title":
            self._in_title = True
        if tag.lower() == "meta":
            key = (values.get("property") or values.get("name") or "").lower()
            content = values.get("content", "").strip()
            if key and content:
                self.meta[key] = content
        if tag.lower() == "script" and "ld+json" in values.get("type", "").lower():
            self._jsonld = True
            self._jsonld_buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False
        if tag.lower() == "script" and self._jsonld:
            self._jsonld = False
            block = "".join(self._jsonld_buf).strip()
            if block:
                self.jsonld_blocks.append(block)
            self._jsonld_buf = []

    def handle_data(self, data: str) -> None:
        if self._jsonld:
            self._jsonld_buf.append(data)
            return
        clean = " ".join(data.split())
        if not clean:
            return
        self.text.append(clean)
        if self._in_title:
            self.title.append(clean)


def _normalize_spaces(value: str) -> str:
    return " ".join(html_lib.unescape(value or "").replace("\xa0", " ").split())


def _parse_number(raw: str) -> float | int | None:
    text = raw.strip().replace("\xa0", " ").replace(" ", "")
    if not text:
        return None
    if text.count(",") == 1 and len(text.split(",")[-1]) <= 2:
        text = text.replace(".", "").replace(",", ".")
    else:
        text = text.replace(",", "").replace(".", "") if re.search(r"[.,]\d{3}(?:[.,]\d{3})*$", text) else text.replace(",", ".")
    try:
        number = float(text)
    except ValueError:
        return None
    return int(number) if number.is_integer() else number


def _walk_jsonld(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _walk_jsonld(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk_jsonld(child)


def _load_jsonld(blocks: list[str]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for block in blocks:
        try:
            parsed = json.loads(block)
        except Exception:
            continue
        out.extend(item for item in _walk_jsonld(parsed) if isinstance(item, dict))
    return out


def _first_jsonld(nodes: list[dict[str, Any]], keys: tuple[str, ...]) -> tuple[Any, str] | tuple[None, None]:
    for node in nodes:
        for key in keys:
            value = node.get(key)
            if value not in (None, "", []):
                return value, key
    return None, None


def _find_property_type(text: str) -> tuple[str, str] | tuple[None, None]:
    lower = text.lower()
    hits: list[tuple[int, int, str, str]] = []
    for priority, (canonical, terms) in enumerate(PROPERTY_TYPES):
        for term in terms:
            match = re.search(rf"(?<!\w){re.escape(term)}(?!\w)", lower, re.I)
            if match:
                hits.append((match.start(), priority, canonical, match.group(0)))
    if not hits:
        return None, None
    _, _, canonical, raw = sorted(hits)[0]
    return canonical, raw


def _find_transaction(text: str, url: str) -> tuple[str, str] | tuple[None, None]:
    combined = f"{url} {text}".lower()
    sale = re.search(r"(?<!\w)(?:vente|vendre|à vendre|a vendre|for sale|acheter|achat)(?!\w)", combined)
    rent = re.search(r"(?<!\w)(?:location|louer|à louer|a louer|for rent)(?!\w)", combined)
    if sale and rent:
        return ("sale", sale.group(0)) if sale.start() < rent.start() else ("rent", rent.group(0))
    if sale:
        return "sale", sale.group(0)
    if rent:
        return "rent", rent.group(0)
    return None, None


def _regex_fact(regex: re.Pattern[str], text: str, source_url: str, method: str, *, numeric: bool = True) -> FieldFact | None:
    match = regex.search(text)
    if not match:
        return None
    raw = match.group(0)
    value: Any = _parse_number(match.group(1)) if numeric else match.group(1)
    if value is None:
        return None
    return FieldFact(value, Evidence(source_url, method, raw))


def classify_page(source_url: str, title: str, text: str, nodes: list[dict[str, Any]]) -> tuple[str, list[str]]:
    path = urlparse(source_url).path
    reasons: list[str] = []
    if any(pattern.search(path) for pattern in DETAIL_PATH_PATTERNS):
        reasons.append("detail_url_pattern")
    if any(pattern.search(path) for pattern in DISCOVERY_PATH_PATTERNS):
        reasons.append("discovery_url_pattern")

    structured_types = {str(node.get("@type", "")).lower() for node in nodes}
    if structured_types & {"product", "singlefamilyresidence", "apartment", "house", "residence", "offer"}:
        reasons.append("structured_listing_type")

    body = f"{title} {text}"
    property_type, _ = _find_property_type(body)
    transaction, _ = _find_transaction(body, source_url)
    price = PRICE_RE.search(body)
    surface = SURFACE_RE.search(body)
    strong_fields = sum(bool(item) for item in (property_type, transaction, price, surface))
    if strong_fields >= 3:
        reasons.append("listing_fact_density")

    if "structured_listing_type" in reasons or "detail_url_pattern" in reasons or "listing_fact_density" in reasons:
        if "discovery_url_pattern" in reasons and "structured_listing_type" not in reasons and "detail_url_pattern" not in reasons:
            return "discovery", reasons
        return "listing_detail", reasons
    if "discovery_url_pattern" in reasons:
        return "discovery", reasons
    return "unknown", reasons


def extract_canonical(source_url: str, html: str) -> dict[str, Any]:
    collector = _HTMLCollector()
    collector.feed(html)
    title = _normalize_spaces(" ".join(collector.title) or collector.meta.get("og:title", ""))
    description_meta = _normalize_spaces(collector.meta.get("description", "") or collector.meta.get("og:description", ""))
    text = _normalize_spaces(" ".join(collector.text))
    nodes = _load_jsonld(collector.jsonld_blocks)

    page_kind, classification_reasons = classify_page(source_url, title, text, nodes)
    result: dict[str, Any] = {
        "source_url": source_url,
        "page_kind": page_kind,
        "classification_reasons": classification_reasons,
        "fields": {},
        "rejected": [],
    }
    if page_kind != "listing_detail":
        return result

    fields: dict[str, FieldFact] = {}
    combined = _normalize_spaces(f"{title} {description_meta} {text}")

    if title:
        fields["offer.title"] = FieldFact(title, Evidence(source_url, "html:title", title))
    if description_meta:
        fields["offer.description"] = FieldFact(description_meta, Evidence(source_url, "meta:description", description_meta))

    ptype, ptype_raw = _find_property_type(combined)
    if ptype:
        fields["classification.property_type"] = FieldFact(ptype, Evidence(source_url, "lexical:first_property_concept", ptype_raw or ptype))

    transaction, transaction_raw = _find_transaction(combined, source_url)
    if transaction:
        fields["offer.transaction_type"] = FieldFact(transaction, Evidence(source_url, "lexical:transaction", transaction_raw or transaction))

    price_value, price_key = _first_jsonld(nodes, ("price",))
    if price_value is not None:
        parsed = _parse_number(str(price_value))
        if parsed is not None and parsed > 0:
            fields["offer.price_amount"] = FieldFact(parsed, Evidence(source_url, f"jsonld:{price_key}", str(price_value)))
    if "offer.price_amount" not in fields:
        fact = _regex_fact(PRICE_RE, combined, source_url, "text:price")
        if fact and 1_000 <= fact.value <= 1_000_000_000:
            fields["offer.price_amount"] = fact

    floor_size, floor_key = _first_jsonld(nodes, ("floorSize",))
    if isinstance(floor_size, dict):
        value = floor_size.get("value")
        parsed = _parse_number(str(value)) if value is not None else None
        if parsed and 5 <= parsed <= 100_000:
            fields["surfaces.surface_total_m2"] = FieldFact(parsed, Evidence(source_url, f"jsonld:{floor_key}.value", str(value)))
    if "surfaces.surface_total_m2" not in fields:
        fact = _regex_fact(SURFACE_RE, combined, source_url, "text:surface")
        if fact and 5 <= fact.value <= 100_000:
            fields["surfaces.surface_total_m2"] = fact

    for key, regex, method in (
        ("layout.bedrooms_count", BEDROOM_RE, "text:bedrooms"),
        ("layout.bathrooms_count", BATHROOM_RE, "text:bathrooms"),
        ("building.floor_number", FLOOR_RE, "text:floor"),
    ):
        fact = _regex_fact(regex, combined, source_url, method)
        if fact and 0 <= fact.value <= 100:
            fields[key] = fact

    address_value, address_key = _first_jsonld(nodes, ("address",))
    if isinstance(address_value, dict):
        city = _normalize_spaces(str(address_value.get("addressLocality") or ""))
        neighborhood = _normalize_spaces(str(address_value.get("streetAddress") or ""))
        if city:
            fields["location.city"] = FieldFact(city, Evidence(source_url, f"jsonld:{address_key}.addressLocality", city))
        if neighborhood:
            fields["location.neighborhood"] = FieldFact(neighborhood, Evidence(source_url, f"jsonld:{address_key}.streetAddress", neighborhood))

    bool_signals = {
        "features.has_parking": ("parking", "place de parking"),
        "features.has_garage": ("garage",),
    }
    lower = combined.lower()
    for field_name, terms in bool_signals.items():
        hit = next((term for term in terms if re.search(rf"(?<!\w){re.escape(term)}(?!\w)", lower)), None)
        if hit:
            fields[field_name] = FieldFact(True, Evidence(source_url, "text:explicit_presence", hit))

    orientation_match = re.search(r"(?:orientation|orienté|oriente)\s*[:\-]?\s*(nord|sud|est|ouest|nord-est|nord-ouest|sud-est|sud-ouest)", lower, re.I)
    if orientation_match:
        fields["building.orientation"] = FieldFact(orientation_match.group(1).lower(), Evidence(source_url, "text:orientation", orientation_match.group(0)))

    required_identity = ("classification.property_type", "offer.transaction_type")
    for key in required_identity:
        if key not in fields:
            result["rejected"].append({"field": key, "reason": "unsupported_or_ambiguous"})

    result["fields"] = {key: {"value": fact.value, "evidence": asdict(fact.evidence)} for key, fact in sorted(fields.items())}
    return result


if __name__ == "__main__":
    raise SystemExit("Use as a module; L4 live runner supplies bounded public pages.")
