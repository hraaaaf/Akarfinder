#!/usr/bin/env python3
"""Evidence-first critical-field recovery for canonical real-estate listings.

V2 wraps the conservative L4 extractor and only enriches/repairs fields when
there is explicit page/URL evidence. It never invents values to reach a target
coverage percentage.
"""

from __future__ import annotations

import re
import unicodedata
from urllib.parse import unquote, urlparse
from typing import Any

import canonical_listing_extractor as base

CRITICAL_FIELDS = (
    "location.city",
    "location.neighborhood",
    "classification.property_type",
    "surfaces.surface_total_m2",
    "offer.price_amount",
)

# Canonical Moroccan city names + common spelling variants encountered in URLs/text.
CITY_ALIASES: dict[str, tuple[str, ...]] = {
    "Casablanca": ("casablanca", "casa"),
    "Rabat": ("rabat",),
    "Salé": ("sale", "salé"),
    "Témara": ("temara", "témara"),
    "Marrakech": ("marrakech", "marrakesh"),
    "Tanger": ("tanger", "tangier"),
    "Agadir": ("agadir",),
    "Fès": ("fes", "fès", "fez"),
    "Meknès": ("meknes", "meknès"),
    "Kénitra": ("kenitra", "kénitra"),
    "El Jadida": ("el jadida", "el-jadida", "jadida"),
    "Mohammedia": ("mohammedia",),
    "Bouskoura": ("bouskoura",),
    "Dar Bouazza": ("dar bouazza", "dar-bouazza"),
    "Nouaceur": ("nouaceur",),
    "Berrechid": ("berrechid",),
    "Settat": ("settat",),
    "Safi": ("safi",),
    "Essaouira": ("essaouira",),
    "Oujda": ("oujda",),
    "Nador": ("nador",),
    "Tétouan": ("tetouan", "tétouan"),
    "Larache": ("larache",),
    "Ifrane": ("ifrane",),
    "Khouribga": ("khouribga",),
    "Béni Mellal": ("beni mellal", "béni mellal", "beni-mellal"),
    "Dakhla": ("dakhla",),
    "Laâyoune": ("laayoune", "laâyoune"),
    "Al Hoceïma": ("al hoceima", "al-hoceima", "al hoceïma"),
}

LABELED_SURFACE_RE = re.compile(
    r"(?:superficie|surface(?:\s+(?:habitable|totale|utile|construite))?)\s*[:\-]?\s*"
    r"(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2|m\^2)\b",
    re.I,
)

PRICE_UNIT_RE = re.compile(
    r"(?<!\d)(\d{1,6}(?:[.,]\d{1,3})?)\s*"
    r"(mdh|m\s*dh|million(?:s)?(?:\s+de)?\s*(?:dh|mad|dirhams?)|kdh|k\s*dh)\b",
    re.I,
)

NEIGHBORHOOD_RE = re.compile(
    r"(?:quartier|secteur|zone|lotissement|résidence|residence)\s*[:\-]?\s*"
    r"([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9'’\-]*(?:\s+[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9'’\-]*){0,3})",
    re.I,
)

CONFIDENCE_BY_METHOD_PREFIX = {
    "jsonld:": 0.99,
    "meta:": 0.96,
    "html:title": 0.96,
    "url:": 0.90,
    "title:": 0.92,
    "text:labeled_": 0.88,
    "text:": 0.76,
    "lexical:": 0.78,
}


def _norm(value: str) -> str:
    value = unicodedata.normalize("NFD", value or "")
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.lower().replace("-", " ").replace("_", " ")
    return " ".join(value.split())


def _confidence(method: str) -> float:
    for prefix, score in CONFIDENCE_BY_METHOD_PREFIX.items():
        if method.startswith(prefix):
            return score
    return 0.70


def _decorate_confidence(fields: dict[str, Any]) -> None:
    for fact in fields.values():
        if not isinstance(fact, dict):
            continue
        evidence = fact.get("evidence") or {}
        method = str(evidence.get("method") or "")
        fact.setdefault("confidence", _confidence(method))


def _set_field(
    fields: dict[str, Any],
    key: str,
    value: Any,
    source_url: str,
    method: str,
    raw: str,
    *,
    overwrite_if_weaker_than: float | None = None,
) -> None:
    existing = fields.get(key)
    if existing is not None:
        if overwrite_if_weaker_than is None:
            return
        existing_conf = float(existing.get("confidence") or _confidence(str((existing.get("evidence") or {}).get("method") or "")))
        if existing_conf >= overwrite_if_weaker_than:
            return
    fields[key] = {
        "value": value,
        "evidence": {"source_url": source_url, "method": method, "raw": raw},
        "confidence": _confidence(method),
    }


def _find_city(text: str) -> tuple[str, str] | tuple[None, None]:
    normalized = _norm(text)
    hits: list[tuple[int, int, str, str]] = []
    for canonical, aliases in CITY_ALIASES.items():
        for alias in aliases:
            needle = _norm(alias)
            match = re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", normalized)
            if match:
                hits.append((match.start(), -len(needle), canonical, alias))
    if not hits:
        return None, None
    _, _, canonical, raw = sorted(hits)[0]
    return canonical, raw


def _city_from_url(source_url: str) -> tuple[str, str] | tuple[None, None]:
    parsed = urlparse(source_url)
    decoded = unquote(parsed.path + " " + parsed.query).replace("/", " ")
    return _find_city(decoded)


def _clean_neighborhood(raw: str) -> str | None:
    value = " ".join(raw.strip(" ,.;:-").split())
    if len(value) < 2 or len(value) > 60:
        return None
    bad = {"immobilier", "appartement", "villa", "maison", "terrain", "vente", "location"}
    if _norm(value) in bad:
        return None
    return value


def _price_with_unit(text: str) -> tuple[int | float, str] | tuple[None, None]:
    match = PRICE_UNIT_RE.search(text)
    if not match:
        return None, None
    raw_number = base._parse_number(match.group(1))
    if raw_number is None:
        return None, None
    unit = _norm(match.group(2))
    multiplier = 1_000 if unit in {"kdh", "k dh"} else 1_000_000
    value = raw_number * multiplier
    if not 1_000 <= value <= 1_000_000_000:
        return None, None
    return int(value) if float(value).is_integer() else value, match.group(0)


def _jsonld_address(nodes: list[dict[str, Any]]) -> tuple[str | None, str | None, str | None]:
    for node in nodes:
        address = node.get("address")
        if not isinstance(address, dict):
            continue
        city = base._normalize_spaces(str(address.get("addressLocality") or "")) or None
        neighborhood = base._normalize_spaces(str(address.get("addressRegion") or "")) or None
        street = base._normalize_spaces(str(address.get("streetAddress") or "")) or None
        if city or neighborhood or street:
            return city, neighborhood, street
    return None, None, None


def extract_canonical(source_url: str, html: str) -> dict[str, Any]:
    result = base.extract_canonical(source_url, html)
    if result.get("page_kind") != "listing_detail":
        return result

    fields: dict[str, Any] = result.setdefault("fields", {})
    _decorate_confidence(fields)

    collector = base._HTMLCollector()
    collector.feed(html)
    title = base._normalize_spaces(" ".join(collector.title) or collector.meta.get("og:title", ""))
    description = base._normalize_spaces(collector.meta.get("description", "") or collector.meta.get("og:description", ""))
    text = base._normalize_spaces(" ".join(collector.text))
    nodes = base._load_jsonld(collector.jsonld_blocks)
    combined = base._normalize_spaces(f"{title} {description} {text}")

    # CITY: JSON-LD > explicit title/meta/body > URL slug.
    json_city, json_neighborhood, json_street = _jsonld_address(nodes)
    if json_city:
        canonical, _ = _find_city(json_city)
        _set_field(fields, "location.city", canonical or json_city, source_url, "jsonld:address.addressLocality", json_city, overwrite_if_weaker_than=0.99)
    if "location.city" not in fields:
        city, raw = _find_city(f"{title} {description}")
        if city:
            _set_field(fields, "location.city", city, source_url, "title:city_lexicon", raw or city)
    if "location.city" not in fields:
        city, raw = _city_from_url(source_url)
        if city:
            _set_field(fields, "location.city", city, source_url, "url:city_slug", raw or city)
    if "location.city" not in fields:
        city, raw = _find_city(text)
        if city:
            _set_field(fields, "location.city", city, source_url, "text:city_lexicon", raw or city)

    # NEIGHBORHOOD: structured region first, then explicit labelled text only.
    if json_neighborhood:
        clean = _clean_neighborhood(json_neighborhood)
        if clean:
            _set_field(fields, "location.neighborhood", clean, source_url, "jsonld:address.addressRegion", json_neighborhood, overwrite_if_weaker_than=0.99)
    # base v1 maps streetAddress to neighborhood. Keep it only as moderate confidence.
    existing_neighborhood = fields.get("location.neighborhood")
    if existing_neighborhood and str((existing_neighborhood.get("evidence") or {}).get("method") or "").endswith("streetAddress"):
        existing_neighborhood["confidence"] = min(float(existing_neighborhood.get("confidence") or 0.76), 0.72)
    if "location.neighborhood" not in fields or float(fields["location.neighborhood"].get("confidence") or 0) < 0.80:
        match = NEIGHBORHOOD_RE.search(f"{title} {description} {text}")
        if match:
            clean = _clean_neighborhood(match.group(1))
            if clean:
                _set_field(fields, "location.neighborhood", clean, source_url, "text:labeled_neighborhood", match.group(0), overwrite_if_weaker_than=0.88)

    # PROPERTY TYPE / TRANSACTION: title + URL are stronger than incidental body text.
    ptype, ptype_raw = base._find_property_type(f"{title} {unquote(urlparse(source_url).path)}")
    if ptype:
        _set_field(fields, "classification.property_type", ptype, source_url, "title:url_property_type", ptype_raw or ptype, overwrite_if_weaker_than=0.90)
    transaction, tx_raw = base._find_transaction(title, source_url)
    if transaction:
        _set_field(fields, "offer.transaction_type", transaction, source_url, "title:url_transaction", tx_raw or transaction, overwrite_if_weaker_than=0.90)

    # PRICE: recover compact Moroccan formats such as 1.2 MDH / 850 kDH.
    price, price_raw = _price_with_unit(f"{title} {description} {text}")
    if price is not None:
        _set_field(fields, "offer.price_amount", price, source_url, "text:labeled_price_unit", price_raw or str(price), overwrite_if_weaker_than=0.88)

    # SURFACE: labelled total/habitable surface outranks a generic first m² hit
    # which may otherwise pick terrace/garden/plot fragments.
    surface_match = LABELED_SURFACE_RE.search(combined)
    if surface_match:
        surface = base._parse_number(surface_match.group(1))
        if surface is not None and 5 <= surface <= 100_000:
            _set_field(fields, "surfaces.surface_total_m2", surface, source_url, "text:labeled_surface", surface_match.group(0), overwrite_if_weaker_than=0.88)

    _decorate_confidence(fields)

    critical = {}
    for key in CRITICAL_FIELDS:
        fact = fields.get(key)
        critical[key] = {
            "present": fact is not None,
            "confidence": float(fact.get("confidence") or 0.0) if isinstance(fact, dict) else 0.0,
            "method": str((fact.get("evidence") or {}).get("method") or "") if isinstance(fact, dict) else "",
        }
    result["critical"] = critical
    result["critical_complete"] = all(item["present"] for item in critical.values())
    result["parser_version"] = "canonical_listing_extractor_v2"
    return result


if __name__ == "__main__":
    raise SystemExit("Use as a module; acquisition runners supply bounded public pages.")
