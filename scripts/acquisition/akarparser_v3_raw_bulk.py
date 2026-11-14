#!/usr/bin/env python3
"""V3: offline raw HTML/JSON/JSONL/CSV batch -> scored internal listings.

Input and results are private. No network, publication, Neon writes or rights approval.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import csv
import gzip
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from typing import Any, Iterator
from urllib.parse import urlparse

import akarparser_v2 as v2
import akarparser_v3_portals as portals

VERSION = "akarparser-v3-bulk-0.1.0"
EXTENSIONS = (".html", ".htm", ".json", ".jsonl", ".jsonl.gz", ".ndjson", ".ndjson.gz", ".csv", ".csv.gz")
CORE = ("title", "city", "district", "price_mad", "surface_total_m2", "property_type", "transaction_type")
WEIGHTS = {"url": 8, "title": 5, "city": 10, "district": 10, "price": 15,
           "surface": 15, "type": 10, "transaction": 7, "freshness": 15,
           "description": 3, "details": 2}
assert sum(WEIGHTS.values()) == 100
ALIASES = {
    "source_url": ("source_url", "listing_url", "canonical_url", "url", "link"),
    "title": ("title", "headline", "adTitle", "name"),
    "description": ("description_snippet", "description", "adDescription", "short_description"),
    "city": ("city", "ville", "addressLocality", "cityName"),
    "district": ("district", "quartier", "neighborhood", "addressNeighborhood"),
    "property_type": ("property_type", "propertyType", "type_bien"),
    "transaction_type": ("transaction_type", "transactionType", "offer_type"),
    "price_mad": ("price_mad", "extracted_price_mad"),
    "price": ("price", "price_amount", "priceValue"),
    "price_currency": ("price_currency", "priceCurrency", "currency"),
    "surface_m2": ("surface_m2", "area_m2", "surface", "floorSize", "superficie"),
    "bedrooms": ("bedrooms_count", "bedrooms", "numberOfBedrooms"),
    "bathrooms": ("bathrooms_count", "bathrooms", "numberOfBathroomsTotal"),
    "observed_at": ("observed_at", "fetched_at", "captured_at", "scraped_at"),
    "published_at": ("published_at", "published_at_source", "datePublished"),
    "source_offer_id": ("source_offer_key", "source_offer_id", "external_offer_id", "listing_id"),
    "image_urls": ("image_urls", "images", "photos", "image"),
}
NESTED = ("listing", "property", "data", "details", "attributes", "raw_json", "payload",
          "raw_payload", "listing_data", "structured_data", "address", "location",
          "offers", "offer", "mainEntity", "itemOffered", "@graph")


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1048576), b""):
            h.update(block)
    return h.hexdigest()


def present(v: Any) -> bool:
    return v is not None and v != "" and v != [] and v != {}


def utc_date(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        d = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        return d.astimezone(timezone.utc) if d.tzinfo else None
    except ValueError:
        return None


def url_ok(value: Any) -> bool:
    if not isinstance(value, str) or len(value) > 2048:
        return False
    p = urlparse(value)
    return p.scheme in ("http", "https") and bool(p.hostname) and not (p.username or p.password)


class Page(HTMLParser):
    """Never executes JavaScript and never fetches links."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta: dict[str, str] = {}
        self.canonical = None
        self.title: list[str] = []
        self.text: list[str] = []
        self.jsonld: list[dict] = []
        self.in_title = False
        self.in_ld = False
        self.skip = 0
        self.ld_data: list[str] = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("script", "style", "noscript"):
            self.skip += 1
            if tag == "script" and "ld+json" in (attrs.get("type") or "").lower():
                self.in_ld = True
                self.ld_data = []
            return
        if self.skip:
            return
        if tag == "title":
            self.in_title = True
        if tag in ("p", "div", "li", "section", "article", "h1", "h2", "br"):
            self.text.append("\n")
        if tag == "meta" and attrs.get("content"):
            self.meta[(attrs.get("property") or attrs.get("name") or "").lower()] = attrs["content"]
        if tag == "link" and (attrs.get("rel") or "").lower() == "canonical":
            self.canonical = attrs.get("href")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "script" and self.in_ld:
            self.in_ld = False
            try:
                val = json.loads("".join(self.ld_data))
                self.jsonld.extend(x for x in (val if isinstance(val, list) else [val]) if isinstance(x, dict))
            except (TypeError, ValueError):
                pass
        if tag in ("script", "style", "noscript") and self.skip:
            self.skip -= 1

    def handle_data(self, value):
        if self.in_ld:
            if sum(map(len, self.ld_data)) < 300000:
                self.ld_data.append(value)
        elif not self.skip and len(self.text) < 20000:
            self.text.append(value)
            if self.in_title:
                self.title.append(value)


def layers(raw: dict, page: Page | None) -> list[tuple[str, dict]]:
    queue = [("row", raw, 0)]
    if page:
        queue.extend((f"jsonld[{i}]", x, 1) for i, x in enumerate(page.jsonld[:30]))
    out, seen = [], set()
    while queue and len(out) < 200:
        path, obj, depth = queue.pop(0)
        if id(obj) in seen:
            continue
        seen.add(id(obj))
        out.append((path, obj))
        if depth >= 5:
            continue
        for key in NESTED:
            val = obj.get(key)
            if isinstance(val, str) and val.strip().startswith(("{", "[")):
                try:
                    val = json.loads(val)
                except ValueError:
                    pass
            if isinstance(val, dict):
                queue.append((path + "." + key, val, depth + 1))
            elif isinstance(val, list):
                queue.extend((f"{path}.{key}[{i}]", x, depth + 1)
                             for i, x in enumerate(val[:12]) if isinstance(x, dict))
    return out


def labelled(text: str, label: str) -> str | None:
    m = re.search(r"(?im)^\s*(?:" + label + r")\s*:\s*([^\r\n;,|]{2,65})", text)
    return m.group(1).strip() if m else None


def annotated(text: str, kind: str) -> float | None:
    if kind == "price":
        m = re.search(r"(?<!\w)(\d[\d \u00a0.,]{1,18})\s*(?:MAD|DHS?|DH|DRH|درهم)(?!\w)", text, re.I)
        v = v2.number(m.group(1)) if m else None
        return v if v and 100 <= v <= 1e9 else None
    m = re.search(r"(?<!\w)(\d[\d \u00a0.,]{0,8})\s*(?:m²|m2|sqm|mètres carrés)(?!\w)", text, re.I)
    v = v2.number(m.group(1)) if m else None
    return v if v and 5 <= v <= 100000 else None


def adapt(raw: dict) -> tuple[dict, dict]:
    if not isinstance(raw, dict):
        raise ValueError("RECORD_NOT_OBJECT")
    row = dict(raw)
    html = next((raw[k] for k in ("raw_html", "html", "page_html", "body_html") if isinstance(raw.get(k), str)), None)
    page = None
    if html and html.lstrip().startswith("<"):
        if len(html.encode("utf-8")) > 3_000_000:
            raise ValueError("HTML_TOO_LARGE")
        page = Page()
        page.feed(html)
        row["raw_html"] = html
    sources = layers(row, page)
    evidence = {}
    # Some portals put the listing price in RealEstateListing.price as a
    # schema.org PriceSpecification object, not as a scalar or offers[].
    # Accept only an explicitly currency-labelled price; never convert EUR.
    for origin, obj in sources:
        typ = obj.get("@type")
        kinds = typ if isinstance(typ, list) else [typ]
        if "RealEstateListing" not in kinds:
            continue
        spec = obj.get("price")
        if not isinstance(spec, dict) or not present(spec.get("price")) or not present(spec.get("priceCurrency")):
            continue
        if not present(row.get("price")) or isinstance(row.get("price"), dict):
            row["price"] = spec["price"]
            evidence["price"] = {"path": origin + ".price.price", "method": "schema_price_specification", "verified": False}
        if not present(row.get("price_currency")):
            row["price_currency"] = spec["priceCurrency"]
            evidence["price_currency"] = {"path": origin + ".price.priceCurrency", "method": "schema_price_specification", "verified": False}
        break
    for field, aliases in ALIASES.items():
        if field in ("price", "price_currency") and field in evidence:
            continue
        for origin, obj in sources:
            matched = next(((obj[a], a) for a in aliases if present(obj.get(a))
                            and not (a == "name" and "address" in origin)), None)
            if matched:
                val, key = matched
                if field == "surface_m2" and isinstance(val, dict):
                    unit = str(val.get("unitCode") or val.get("unit") or "").lower()
                    if unit not in ("mtk", "m2", "m²", "sqm"):
                        if origin == "row":
                            row.pop(key, None)
                            row.pop("surface_m2", None)
                        continue  # never interpret SQF / unlabelled QuantitativeValue as m²
                if field == "observed_at":
                    row["observed_at"] = val
                elif not present(row.get(field)):
                    row[field] = val
                evidence[field] = {"path": f"{origin}.{key}", "method": "structured", "verified": False}
                break
    if page:
        html_fallback = {
            "source_url": page.canonical or page.meta.get("og:url"),
            "title": page.meta.get("og:title") or " ".join(page.title),
            "description": page.meta.get("og:description") or page.meta.get("description"),
            "price": page.meta.get("product:price:amount"),
            "price_currency": page.meta.get("product:price:currency"),
            "image_urls": page.meta.get("og:image"),
        }
        for key, val in html_fallback.items():
            if present(val) and not present(row.get(key)):
                row[key] = val
                evidence[key] = {"path": "html.meta." + key, "method": "html_metadata", "verified": False}
        # Domio's PRIMARY listing hero has a scoped type/transaction label and
        # occasionally "District, City"; generic page navigation and price-area
        # comparison widgets must never be treated as listing facts.
        if urlparse(str(row.get("source_url") or "")).hostname in ("domio.ma", "www.domio.ma"):
            hero_lines = [x.strip() for x in "".join(page.text).splitlines() if x.strip()]
            hero_stop = next((i for i, x in enumerate(hero_lines) if x == "Copier le lien"), 0)
            hero_lines = hero_lines[:hero_stop] if hero_stop else []
            for value in hero_lines:
                hero = re.fullmatch(r"(Appartement|Studio|Villa|Maison|Terrain|Duplex|Riad|Bureau)\s*[·•]\s*(Acheter|Louer)", value, re.I)
                if hero:
                    if not present(row.get("property_type")):
                        row["property_type"] = hero.group(1)
                        evidence["property_type"] = {"path": "domio.listing_hero.type", "method": "hero_label", "verified": False}
                    if not present(row.get("transaction_type")):
                        row["transaction_type"] = "sale" if hero.group(2).casefold() == "acheter" else "rent"
                        evidence["transaction_type"] = {"path": "domio.listing_hero.transaction", "method": "hero_label", "verified": False}
                district = re.fullmatch(r"([^,\n]{2,45}),\s*([^,\n]{2,45})", value)
                if district and not present(row.get("district")) and present(row.get("city")):
                    # Some listing HEADLINES are "... à vendre – Quartier, City".
                    # A comma+city is insufficient to make the entire heading
                    # a neighborhood. Require a location-like phrase instead.
                    neighborhood = district.group(1).strip()
                    heading_like = bool(re.search(
                        r"\b(?:appartement|appartements|studio|villa|maison|"
                        r"terrain|duplex|bureau|vendre|louer|vente|location)\b",
                        neighborhood, re.I
                    ))
                    if (not heading_like
                            and district.group(2).strip().casefold()
                            == str(row["city"]).strip().casefold()):
                        row["district"] = neighborhood
                        evidence["district"] = {"path": "domio.listing_hero.location",
                                               "method": "hero_label", "verified": False}
        portals.enrich(page, row, evidence)
        # Discounted Agenz primary offer: the old price is struck through.
        # Explicit HTML element order is essential; avoid first-number regex.
        host = (urlparse(str(row.get("source_url") or "")).hostname or "").removeprefix("www.")
        if host == "agenz.ma" and isinstance(html, str):
            current = portals.agenz_explicit_discounted_price(html)
            if current is not None:
                row["price_mad"] = current
                row["price"] = current  # also override stale JSON-LD old offer
                row["price_currency"] = "MAD"
                evidence["price_mad"] = {
                    "path": "agenz.detail_primary.discounted_current_price",
                    "method": "explicit_struck_old_followed_by_current",
                    "verified": False,
                }
            elif "data-old-price" in html:
                # Fail-closed: microdata first price is the obsolete value.
                row["price_mad"] = None
                row["price"] = None
                row["price_currency"] = None
                evidence.pop("price_mad", None)
                row["_agenz_discounted_current_price_ambiguous"] = True
        body = "\n".join(x.strip() for x in "".join(page.text).splitlines() if x.strip())[:250000]
    else:
        body = str(raw.get("raw_text") or raw.get("text") or "")[:250000]
    if body:
        for key, labels in (("city", "ville|city"), ("district", "quartier|neighborhood|district")):
            if not present(row.get(key)):
                val = labelled(body, labels)
                if val:
                    row[key] = val
                    evidence[key] = {"path": "visible_text.label." + key, "method": "label_regex", "verified": False}
        for key, kind in (("price_mad", "price"), ("surface_m2", "area")):
            if key == "price_mad" and row.get("_portal_skip_price_regex"):
                continue  # never mistake Avito financing instalments for sale prices
            if not present(row.get(key)) and not (key == "price_mad" and present(row.get("price"))):
                val = annotated(body, kind)
                if val:
                    row[key] = val
                    evidence[key] = {"path": "visible_text." + kind, "method": "explicit_unit_regex", "verified": False}
        if not present(row.get("bedrooms")):
            m = v2.BED_RX.search(body)
            if m:
                row["bedrooms"] = int(m.group(1))
                evidence["bedrooms"] = {"path": "visible_text.bedrooms", "method": "unit_regex", "verified": False}
        if not present(row.get("description")) and len(body) > 30:
            row["description"] = body[:3000]
            evidence["description"] = {"path": "html.visible_text", "method": "visible_text", "verified": False}
    # V2 sees ONLY V3-vetted fields: otherwise unvetted nested JSON-LD might
    # reinterpret e.g. SQF as square metres. Preserve original bytes via raw_sha256.
    for key in ("raw_html", "html", "page_html", "body_html", "raw_json", "payload",
                "raw_payload", "listing_data", "structured_data"):
        row.pop(key, None)
    return row, evidence


def quality(e: dict, source: dict, as_of: datetime, *, quarantine: bool, serp: bool,
            review_reasons: tuple[str, ...] = ()) -> dict:
    observed = utc_date(e.get("observed_at"))
    age = round((as_of - observed).total_seconds() / 86400, 2) if observed else None
    freshness = ("unproven" if age is None else "future_invalid" if age < -0.05
                 else "recent_claimed" if age <= 30 else "aging_claimed" if age <= 90
                 else "stale_claimed")
    exists = {
        "url": url_ok(source.get("source_url")), "title": present(e.get("title")),
        "city": present(e.get("city")), "district": present(e.get("district")),
        "price": present(e.get("price_mad")), "surface": present(e.get("surface_total_m2")),
        "type": present(e.get("property_type")), "transaction": present(e.get("transaction_type")),
        "description": present(e.get("description")),
        "details": bool(e.get("bedrooms_count") or e.get("image_urls_count") or any((e.get("features") or {}).values())),
    }
    score_parts = {key: WEIGHTS[key] if exists[key] else 0 for key in exists}
    score_parts["freshness"] = 15 if freshness == "recent_claimed" else 5 if freshness == "aging_claimed" else 0
    score = sum(score_parts.values())
    if quarantine or serp:
        score = min(score, 49)
    missing = [key for key in CORE if not present(e.get(key))]
    if not exists["url"]:
        missing.append("source_url")
    status = ("source_snippet_only" if serp else "quarantine" if quarantine or freshness == "future_invalid"
              else "ready_internal" if not missing and freshness == "recent_claimed" and score >= 80
              else "complete_requires_freshness" if not missing else "partial")
    if review_reasons and status == "ready_internal":
        status = "requires_manual_review"
    return {
        "score": score, "score_breakdown": score_parts, "status": status,
        "review_reasons": list(review_reasons),
        # A partial listing may still carry a safety flag. Never let its
        # status hide it from the human-review queue.
        "human_review_required": bool(review_reasons),
        "missing_fields": missing, "freshness_status": freshness, "observation_age_days": age,
        "freshness_independently_verified": False, "rights_verified": False,
        "availability_verified": False, "physical_uniqueness_verified": False,
        "neon_product_admission_authorized": False,
    }


def explicit_unit_rate_equals_price(description: str, price: float | None) -> bool:
    """Shared source-only rule; a price per m² is never a listing total."""
    return portals.primary_unit_rate_equals_amount(description, price)


def stable_observation_id(raw_hash: str, base: dict) -> tuple[str, str]:
    """Keep source-backed V2 IDs; bind source-less observations to the immutable capture.

    Never key a reparse on extracted fields (e.g., district) or current clock.
    Capture hash includes raw source metadata and content, so a new capture
    is independently identifiable without claiming two pages are one property.
    """
    source = base["source"]
    if (source.get("identity_state") in ("explicit", "url_candidate")
            and source.get("domain") and source.get("source_offer_id")
            and base["extracted"].get("observed_at")):
        return base["record_id"], "v2_source_id_observation"
    immutable_basis = ("akarparser-v3-capture-v1:" + raw_hash).encode("ascii")
    return "observation-" + hashlib.sha256(immutable_basis).hexdigest()[:24], "v3_capture_sha256"


def parse_raw(raw: dict, clock: datetime) -> dict:
    row, provenance = adapt(raw)
    base = v2.parse_record(row, generated_at=clock.isoformat())
    raw_hash = hashlib.sha256(json.dumps(raw, ensure_ascii=False, sort_keys=True,
                                       default=str).encode("utf-8")).hexdigest()
    record_id, identity_scheme = stable_observation_id(raw_hash, base)
    e = base["extracted"]
    # Mubawab's schema Sell tag is unreliable for rentals, and V2 may infer
    # sale/rent from incidental marketing text without direct evidence.
    # On captured HTML detail pages, retain only V3's explicitly evidenced
    # transaction. A missing transaction is safer than a false classification.
    host = (urlparse(str(row.get("source_url") or "")).hostname or "").removeprefix("www.")
    strict_mubawab = host == "mubawab.ma" and any(
        isinstance(raw.get(k), str) and raw[k].lstrip().startswith("<")
        for k in ("raw_html", "html", "page_html", "body_html")
    )
    if strict_mubawab and provenance.get("transaction_type", {}).get("method") != "portal_detail_explicit":
        if e.get("transaction_type") is not None:
            base["quality"]["issues"].append("MUBAWAB_UNPROVEN_TRANSACTION_SUPPRESSED")
        e["transaction_type"] = None
    # Mubawab can publish a *unit rate* as offers.price. A value explicitly
    # identified as MAD/m² in the primary description must never masquerade
    # as a total listing sale price, even if the schema says #Sell.
    if strict_mubawab and row.get("_mubawab_unit_price_not_total"):
        e["price_mad"] = None
        e["price_amount_raw"] = None
        e["price_currency_raw"] = None
        base["quality"]["issues"].append("MUBAWAB_UNIT_RATE_SUPPRESSED_AS_TOTAL")
    # Domio can likewise encode the advertised MAD/m² rate as its JSON-LD
    # price specification. Match the actual number in the *primary listing*
    # description, not unrelated price comparisons elsewhere on the page.
    domio_unit_rate = (host == "domio.ma"
        and str(provenance.get("description", {}).get("path") or "").startswith("jsonld[")
        and explicit_unit_rate_equals_price(str(row.get("description") or ""), e.get("price_mad")))
    if domio_unit_rate:
        e["price_mad"] = None
        e["price_amount_raw"] = None
        e["price_currency_raw"] = None
        base["quality"]["issues"].append("DOMIO_UNIT_RATE_SUPPRESSED_AS_TOTAL")
    if host == "agenz.ma" and row.get("_agenz_discounted_current_price_ambiguous"):
        # Even if V3 dropped obsolete price, V2 may independently reparse it
        # from page prose. Do not re-admit this historic price as current.
        e["price_mad"] = None
        e["price_amount_raw"] = None
        e["price_currency_raw"] = None
        base["quality"]["issues"].append("AGENZ_STRUCK_OLD_PRICE_SUPPRESSED")
    # V2 can independently infer a number from description text. For Avito,
    # an undifferentiated 5 002 DH/month financing figure must never become
    # a sale price, even if its source was not picked by the V3 regex.
    if (row.get("_portal_skip_price_regex") and not present(row.get("price_mad"))
            and not present(row.get("price"))):
        e["price_mad"] = None
        e["price_amount_raw"] = None
        e["price_currency_raw"] = None
        base["quality"]["issues"].append("UNTRUSTED_FINANCING_PRICE_SUPPRESSED")
    if str(row.get("property_type") or "").strip().lower() in ("ferme", "farm"):
        if e.get("property_type") and e["property_type"] != "farm":
            base["status"] = "quarantine"  # explicit farm contradicts lexical type inference
            base["quality"]["issues"].append("PROPERTY_TYPE_CONFLICT")
        e["property_type"] = "farm"  # preserve the explicit source type
    e["image_urls"] = v2.media_items(row.get("image_urls") or row.get("images"))
    http_code = row.get("http_status")
    invalid_http = str(http_code) in ("404", "410", "403", "429", "500", "503")
    if invalid_http:
        base["quality"]["issues"].append("SOURCE_HTTP_NON_SUCCESS")
    foreign_country = bool(e.get("country") and e["country"] != "Morocco")
    if foreign_country:
        base["quality"]["issues"].append("EXPLICIT_COUNTRY_OUTSIDE_MOROCCO")
    # Price plausibility is NOT evidence of an incorrect listing. It is a
    # conservative manual-review gate, never a silent price correction.
    review_reasons = []
    if (strict_mubawab and row.get("_mubawab_unit_price_not_total")) or domio_unit_rate:
        review_reasons.append("UNIT_PRICE_RATE_NOT_TOTAL_REQUIRES_REVIEW")
    price = e.get("price_mad")
    area = e.get("surface_total_m2")
    if e.get("transaction_type") == "sale" and isinstance(price, (int, float)) and price > 0:
        if price < 50_000:
            review_reasons.append("LOW_SALE_PRICE_REQUIRES_REVIEW")
        if isinstance(area, (int, float)) and area > 0 and price / area < 1_000:
            review_reasons.append("LOW_SALE_PRICE_PER_M2_REQUIRES_REVIEW")
    # Preserve extreme prices as published; even explicit source markup can
    # contain placeholders. Manual review, never an automatic normalization.
    if (isinstance(price, (int, float)) and price > 50_000_000
            and isinstance(area, (int, float)) and area > 0
            and price / area > 250_000):
        review_reasons.append("EXTREME_REPORTED_PRICE_PER_M2_REQUIRES_REVIEW")
    if row.get("_mubawab_schema_offer_sell") and e.get("transaction_type") == "rent":
        review_reasons.append("SCHEMA_SELL_CONTRADICTS_RENTAL_TEXT")
    if row.get("_agenz_neighborhood_claim_conflicts_with_route"):
        review_reasons.append("AGENZ_EXPLICIT_NEIGHBORHOOD_CONFLICT_REQUIRES_REVIEW")
    if row.get("_agenz_discounted_current_price_ambiguous"):
        review_reasons.append("AGENZ_DISCOUNT_CURRENT_PRICE_AMBIGUOUS")
    if row.get("_mubawab_title_area_mismatch"):
        review_reasons.append("PRIMARY_AREA_DIFFERS_FROM_TITLE_AREA")
    if row.get("_mubawab_title_transaction_ambiguous"):
        review_reasons.append("TITLE_CONTAINS_SALE_AND_RENT")
    if row.get("_mubawab_primary_transaction_conflict"):
        review_reasons.append("PRIMARY_TITLE_DESCRIPTION_TRANSACTION_CONFLICT")
    status = quality(e, base["source"], clock,
                     quarantine=base["status"] == "quarantine" or invalid_http or foreign_country,
                     serp=bool(row.get("query_id") and row.get("source_domain")),
                     review_reasons=tuple(review_reasons))
    return {
        "version": VERSION, "record_id": record_id,
        "record_id_scheme": identity_scheme, "source": base["source"],
        "raw_sha256": raw_hash,
        "fields": e, "field_evidence": provenance,
        "quality": {**status, "v2_issues": base["quality"]["issues"]},
    }


def source_records(root: Path) -> Iterator[tuple[str, int, dict]]:
    paths = [root] if root.is_file() else sorted(p for p in root.rglob("*") if p.is_file())
    found = False
    for path in paths:
        if path.is_symlink():
            raise ValueError("SYMLINK_INPUT_NOT_ALLOWED")
        lower = path.name.lower()
        if lower.endswith(".html.meta.json") or lower.endswith(".htm.meta.json"):
            continue  # capture-sidecar metadata, never an independent listing
        if not any(lower.endswith(ext) for ext in EXTENSIONS):
            continue
        found = True
        label = str(path.relative_to(root)) if root.is_dir() else path.name
        if lower.endswith((".html", ".htm")):
            if path.stat().st_size > 3_000_000:
                yield label, 1, {"_v3_invalid": "HTML_TOO_LARGE"}
            else:
                item = {"raw_html": path.read_text(encoding="utf-8")}
                sidecar = Path(str(path) + ".meta.json")
                if sidecar.exists():
                    if sidecar.is_symlink() or sidecar.stat().st_size > 65536:
                        raise ValueError("INVALID_CAPTURE_SIDECAR")
                    meta = json.loads(sidecar.read_text(encoding="utf-8"))
                    if not isinstance(meta, dict):
                        raise ValueError("CAPTURE_SIDECAR_MUST_BE_OBJECT")
                    expected = meta.pop("html_sha256", None)
                    if expected and sha_file(path) != expected:
                        item = {"_v3_invalid": "CAPTURE_HASH_MISMATCH"}
                    else:
                        item.update({k: v for k, v in meta.items()
                                     if k in ("source_url", "source_offer_id", "fetched_at", "observed_at", "captured_at", "http_status")})
                yield label, 1, item
        elif lower.endswith((".jsonl", ".jsonl.gz", ".ndjson", ".ndjson.gz")):
            opener = gzip.open if lower.endswith(".gz") else open
            with opener(path, "rt", encoding="utf-8") as f:
                for i, line in enumerate(f, 1):
                    if not line.strip():
                        continue
                    try:
                        if len(line) > 3_000_000:
                            raise ValueError("RAW_RECORD_OVER_3MB")
                        value = json.loads(line)
                        if not isinstance(value, dict):
                            raise ValueError("NOT_OBJECT")
                    except (ValueError, TypeError):
                        value = {"_v3_invalid": "INVALID_JSONL_RECORD"}
                    yield label, i, value
        elif lower.endswith((".csv", ".csv.gz")):
            opener = gzip.open if lower.endswith(".gz") else open
            with opener(path, "rt", encoding="utf-8", newline="") as f:
                for i, row in enumerate(csv.DictReader(f), 2):
                    yield label, i, row
        else:
            if path.stat().st_size > 64_000_000:
                raise ValueError("JSON_ARRAY_TOO_LARGE_USE_JSONL")
            try:
                raw = json.loads(path.read_text(encoding="utf-8"))
            except (ValueError, UnicodeError):
                yield label, 1, {"_v3_invalid": "INVALID_JSON_FILE"}
                continue
            if isinstance(raw, dict):
                raw = raw["listings"] if isinstance(raw.get("listings"), list) else [raw]
            if not isinstance(raw, list):
                raise ValueError("JSON_INPUT_NOT_ARRAY_OR_OBJECT")
            for i, item in enumerate(raw, 1):
                yield label, i, item if isinstance(item, dict) else {"_v3_invalid": "NOT_OBJECT"}
    if not found:
        raise ValueError("NO_SUPPORTED_INPUT_FILES")


class Writer:
    def __init__(self, path: Path):
        self.raw = path.open("xb")
        self.gz = gzip.GzipFile(filename="", mode="wb", fileobj=self.raw, mtime=0)

    def put(self, value: dict):
        self.gz.write((json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8"))

    def close(self):
        self.gz.close()
        self.raw.close()


def run(root: Path, out: Path, *, as_of: datetime, limit: int | None = None) -> dict:
    root, out = root.resolve(), out.resolve()
    if not root.exists():
        raise FileNotFoundError(root)
    if root.is_dir() and out.is_relative_to(root):
        raise ValueError("OUTPUT_MUST_BE_OUTSIDE_INPUT_DIRECTORY")
    if any((parent / ".git").exists() for parent in (out, *out.parents)):
        raise ValueError("PRIVATE_OUTPUT_MUST_BE_OUTSIDE_GIT_REPOSITORY")
    if out.exists() and any(out.iterdir()):
        raise FileExistsError("OUTPUT_ALREADY_CONTAINS_FILES")
    if limit is not None and limit < 1:
        raise ValueError("INVALID_LIMIT")
    out.mkdir(parents=True, exist_ok=True)
    writers = {k: Writer(out / (k + ".jsonl.gz")) for k in ("all", "ready_internal", "review", "quarantine", "errors")}
    counts, coverage, score_hist, sources = Counter(), Counter(), Counter(), Counter()
    seen_urls, inputs = set(), {}
    try:
        for file, line, raw in source_records(root):
            if limit is not None and counts["input"] >= limit:
                break
            counts["input"] += 1
            if file not in inputs:
                path = root if root.is_file() else root / file
                inputs[file] = {"sha256": sha_file(path), "bytes": path.stat().st_size}
            try:
                if "_v3_invalid" in raw:
                    raise ValueError(raw["_v3_invalid"])
                result = parse_raw(raw, as_of)
                # Bind the structured record to its immutable private input manifest.
                # Needed by independent, source-blind benchmark labels; no raw data exposed.
                result["input_ref"] = {"file": file, "line": line, "file_sha256": inputs[file]["sha256"]}
                url = result["source"]["source_url"]
                if url and url in seen_urls:
                    counts["duplicate_urls"] += 1
                    result["quality"]["status"] = "quarantine"
                    result["quality"]["v2_issues"].append("DUPLICATE_URL_IN_BATCH")
                if url:
                    seen_urls.add(url)
                status = result["quality"]["status"]
                counts[status] += 1
                sources[result["source"]["domain"] or "unknown"] += 1
                for key in CORE:
                    if present(result["fields"].get(key)):
                        coverage[key] += 1
                score_hist[str(result["quality"]["score"] // 10 * 10)] += 1
                writers["all"].put(result)
                destination = ("ready_internal" if status == "ready_internal"
                               else "quarantine" if status == "quarantine" else "review")
                writers[destination].put(result)
            except Exception as exc:
                counts["errors"] += 1
                writers["errors"].put({"input_file": file, "line": line, "error_type": type(exc).__name__,
                                       "error_code": str(exc) if str(exc) in ("HTML_TOO_LARGE", "NOT_OBJECT", "INVALID_JSONL_RECORD", "INVALID_JSON_FILE", "CAPTURE_HASH_MISMATCH", "RAW_RECORD_OVER_3MB") else "PARSE_FAILED"})
    finally:
        for f in writers.values():
            f.close()
    if counts["input"] == 0:
        raise ValueError("NO_INPUT_RECORDS")
    statuses = ("ready_internal", "requires_manual_review", "complete_requires_freshness",
                "partial", "source_snippet_only", "quarantine")
    if counts["input"] != counts["errors"] + sum(counts[s] for s in statuses):
        raise AssertionError("ACCOUNTING_ERROR")
    report = {
        "version": VERSION, "input_count": counts["input"], "status_counts": dict(counts),
        "field_presence_not_accuracy": dict(coverage), "score_deciles": dict(score_hist),
        "by_domain": dict(sources), "as_of_utc": as_of.isoformat(),
        "input_files": inputs, "output_sha256": {key: sha_file(out / (key + ".jsonl.gz")) for key in writers},
        "safety": {"network_requests": 0, "db_writes": 0, "neon_admission_authorized": False,
                   "independent_field_precision_certified": False, "source_rights_verified": False},
    }
    with (out / "aggregate_report.json").open("x", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2, sort_keys=True)
    return report


def main():
    p = argparse.ArgumentParser(description="AkarParser V3 private raw batch (no network / no Neon)")
    p.add_argument("--input", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--as-of", help="ISO 8601 with timezone for deterministic freshness")
    p.add_argument("--limit", type=int)
    args = p.parse_args()
    now = utc_date(args.as_of) if args.as_of else datetime.now(timezone.utc)
    if now is None:
        p.error("--as-of must contain a timezone")
    result = run(args.input, args.out, as_of=now, limit=args.limit)
    print(json.dumps({"input_count": result["input_count"], "status_counts": result["status_counts"],
                      "field_presence_not_accuracy": result["field_presence_not_accuracy"],
                      "neon_admission_authorized": False}, sort_keys=True))


if __name__ == "__main__":
    main()
