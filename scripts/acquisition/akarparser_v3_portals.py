"""Small, site-scoped extraction rules for captured public listing detail HTML.

Only explicit source hero/breadcrumb labels or URL route labels are used.
Never confuses a mortgage monthly amount with the listing sale price.
Do not infer commercial permissions, current availability, or freshness.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse, unquote

import akarparser_v2 as v2


def _set(row: dict, evidence: dict, field: str, value, source: str) -> None:
    if value is None or value == "":
        return
    if row.get(field) is not None and row.get(field) != "":
        return
    row[field] = value
    evidence[field] = {"path": source, "method": "portal_detail_explicit", "verified": False}


def _title_slug(text: str) -> str:
    return " ".join(unquote(text).replace("_", " ").replace("-", " ").split()).title()


def enrich(page, row: dict, evidence: dict) -> None:
    source_url = row.get("source_url")
    if not isinstance(source_url, str):
        return
    parsed = urlparse(source_url)
    host = (parsed.hostname or "").removeprefix("www.")
    path = unquote(parsed.path)
    lines = [x.strip() for x in "".join(page.text).splitlines() if x.strip()]
    hero = lines[:100]
    if host == "agenz.ma":
        # Factual route metadata on individual listing pages (not search results).
        match = re.fullmatch(
            r"/fr/annonces/immo-([^/]+)/(vente|location)-([^/]+)/([^/]+)/(\d+)(?:/)?",
            path, flags=re.I)
        if match:
            city, transaction, ptype, district, _id = match.groups()
            _set(row, evidence, "city", _title_slug(city), "agenz.detail_url.city")
            _set(row, evidence, "district", _title_slug(district), "agenz.detail_url.district")
            _set(row, evidence, "transaction_type",
                 "sale" if transaction.lower() == "vente" else "rent",
                 "agenz.detail_url.transaction")
            mapped = {"appartements": "apartment", "villas": "villa", "maisons": "house",
                      "terrains": "land", "studios": "studio", "bureaux": "office"}
            _set(row, evidence, "property_type", mapped.get(ptype.lower()),
                 "agenz.detail_url.property_type")

    elif host == "mubawab.ma":
        if not re.match(r"^/fr/a/\d+/", path):
            return
        # Mubawab sometimes declares Sell in JSON-LD for rentals too.
        # Preserve this as independent contradictory metadata, never as a
        # definitive sale classification.
        for obj in page.jsonld:
            if obj.get("@type") != "RealEstateListing":
                continue
            offer = obj.get("offers")
            if isinstance(offer, dict):
                business_function = str(offer.get("businessFunction") or "")
                if business_function.endswith("#Sell"):
                    row["_mubawab_schema_offer_sell"] = True
            break
        # The early breadcrumb is: Immobilier <City>, <Category> <City>, <District>.
        for i, label in enumerate(hero[:-2]):
            city = re.fullmatch(r"Immobilier ([\wÀ-ÿ][\wÀ-ÿ '-]{1,55})", label)
            if not city:
                continue
            city_name = city.group(1).strip()
            category = hero[i + 1]
            district = hero[i + 2]
            if not category.endswith(city_name) or not re.fullmatch(r"[\wÀ-ÿ][\wÀ-ÿ '-]{1,55}", district):
                continue
            _set(row, evidence, "city", city_name, "mubawab.detail_breadcrumb.city")
            _set(row, evidence, "district", district, "mubawab.detail_breadcrumb.district")
            break

    elif host == "avito.ma":
        if not re.search(r"/(appartements|villas|maisons|terrains)/[^/]+\.htm$", path, re.I):
            return
        # Avito displays financing quotes before the actual listing price.
        # Disable all generic body-price fallback even when og:title is missing.
        row["_portal_skip_price_regex"] = True
        og = page.meta.get("og:title") or ""
        matches = re.findall(r"-\s*([\d\s\u00a0\u202f.,]{3,20})\s*(?:DH|MAD)\s*-", og, flags=re.I)
        if len(matches) == 1:
            amount = v2.number(matches[0])
            if amount and 100 <= amount <= 1_000_000_000:
                _set(row, evidence, "price_mad", amount, "avito.meta.og:title.price")
        if re.search(r"\bà\s+vendre\b", og, re.I):
            _set(row, evidence, "transaction_type", "sale", "avito.meta.og:title.transaction")
        elif re.search(r"\bà\s+louer\b", og, re.I):
            _set(row, evidence, "transaction_type", "rent", "avito.meta.og:title.transaction")
        kind = re.search(r"/(appartements|villas|maisons|terrains)/", path, re.I)
        mapped = {"appartements": "apartment", "villas": "villa",
                  "maisons": "house", "terrains": "land"}
        _set(row, evidence, "property_type", mapped.get(kind.group(1).lower()) if kind else None,
             "avito.detail_url.property_type")
        # Listing-level breadcrumb only, before unrelated recommendations.
        for i, label in enumerate(hero[:-2]):
            if label != "Tout le Maroc":
                continue
            city, district = hero[i + 1], hero[i + 2]
            if not re.fullmatch(r"[\wÀ-ÿ][\wÀ-ÿ '-]{1,55}", city):
                continue
            if not re.fullmatch(r"[\wÀ-ÿ][\wÀ-ÿ '-]{1,55}", district):
                continue
            if city.lower() not in og.lower():
                continue
            _set(row, evidence, "city", city, "avito.detail_breadcrumb.city")
            _set(row, evidence, "district", district, "avito.detail_breadcrumb.district")
            break
        # Surface is explicitly labelled as such in the primary listing facts
        # (site's m² display); never use related-listing cards.
        if row.get("surface_m2") is None:
            for title in ("Surface totale", "Surface habitable"):
                candidates = [re.fullmatch(r"(\d{1,5})\s*" + title, line, flags=re.I) for line in hero]
                first = next((m for m in candidates if m), None)
                if first:
                    area = v2.number(first.group(1))
                    if area and 5 <= area <= 100_000:
                        _set(row, evidence, "surface_m2", area, "avito.listing_primary." + title.replace(" ", "_").lower())
                        break
