#!/usr/bin/env python3
"""AkarParser V2: read-only, offline recovery from SQLite/JSONL/CSV to evidence-backed JSONL.

The source is never mutated, unknowns stay unknown, no candidate URL is promoted
into a structured observation without facts, and publication is always blocked.

Run: python scripts/acquisition/akarparser_v2.py --input input.sqlite --table property_listings --out private/output
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sqlite3
from datetime import datetime, timezone
from typing import Any, Iterable
from urllib.parse import urlparse, quote

VERSION = "akarparser-v2.0.0"
FIELD_ALIASES = {
    "source_url": ("listing_url", "source_url", "canonical_url", "url", "link"),
    "source_name": ("source_name", "source_domain", "source", "portal"),
    "source_offer_id": ("source_offer_key", "source_offer_id", "external_offer_id", "listing_id"),
    "title": ("title", "headline", "subject", "name", "adTitle"),
    "description": ("description_snippet", "description", "body", "text", "adDescription"),
    "city": ("city", "ville", "location_city", "cityName"),
    "district": ("district", "neighborhood", "quartier", "areaName"),
    "country": ("country", "pays", "addressCountry"),
    "property_type": ("property_type", "propertyType", "type_bien", "category"),
    "transaction_type": ("transaction_type", "transactionType", "offer_type", "operation"),
    "price": ("price_mad", "price_amount", "price", "prix", "priceValue"),
    "surface": ("surface_m2", "surface_total_m2", "area_m2", "surface", "superficie", "floorSize"),
    "bedrooms": ("bedrooms_count", "bedrooms", "nbBedrooms", "chambres"),
    "bathrooms": ("bathrooms_count", "bathrooms", "nbBathrooms", "sdb"),
    "rooms": ("rooms_count", "rooms", "pieces", "nbRooms"),
    "floor": ("floor_number", "floor", "etage"),
    "observed_at": ("first_seen_at", "observed_at", "scraped_at", "captured_at", "first_observed_at"),
    "published_at": ("published_at_source", "published_at", "datePublished"),
    "images": ("image_urls", "images", "photos", "media_urls"),
}
TYPES = {"appartement": "apartment", "apartment": "apartment", "villa": "villa", "maison": "house", "house": "house", "terrain": "land", "land": "land", "studio": "studio", "duplex": "duplex", "riad": "riad", "bureau": "office", "office": "office", "commercial": "commercial", "entrepot": "warehouse", "entrepôt": "warehouse"}
TRANSACTIONS = {"sale": "sale", "vente": "sale", "vendre": "sale", "sell": "sale", "achat": "sale", "rent": "rent", "location": "rent", "louer": "rent", "rental": "rent"}
PHONE = re.compile(r"(?<!\w)(?:\+?212[\s.\-]?)?0?[567](?:[\s.\-]?\d){8}(?!\w)")
EMAIL = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
PRICE_RX = re.compile(r"(?<!\d)(\d[\d \u00a0.,]{2,15}\d|\d{4,10})\s*(MAD|DHS?|DRH|درهم)\b", re.I)
AREA_RX = re.compile(r"(?<!\d)(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2)\b", re.I)
BED_RX = re.compile(r"(?<!\d)(\d{1,2})\s*(?:chambres?|bedrooms?)\b", re.I)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(2**20), b""):
            h.update(chunk)
    return h.hexdigest()


def clean(v: Any) -> str | None:
    if v is None or isinstance(v, (dict, list)):
        return None
    s = " ".join(html.unescape(str(v)).split())
    return s or None


def redact(text: str | None) -> str | None:
    if not text:
        return None
    return EMAIL.sub("[EMAIL]", PHONE.sub("[PHONE]", text))


def number(v: Any) -> float | None:
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v) if 0 < v < 10**12 else None
    s = clean(v)
    if not s:
        return None
    s = re.sub(r"[^\d.,]", "", s)
    if not s:
        return None
    if "," in s and "." in s:
        sep = "," if s.rfind(",") > s.rfind(".") else "."
        s = s.replace(".", "").replace(",", "") if len(s.rsplit(sep, 1)[-1]) == 3 else s.replace("." if sep == "," else ",", "").replace(",", ".")
    elif re.search(r"[.,]\d{3}(?:[.,]\d{3})*$", s):
        s = s.replace(".", "").replace(",", "")
    else:
        s = s.replace(",", ".")
    try:
        n = float(s)
        return n if 0 < n < 10**12 else None
    except ValueError:
        return None


def timestamp(v: Any) -> str | None:
    s = clean(v)
    if not s:
        return None
    try:
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if d.tzinfo is None:
            # Preserve the literal source date; do not assume a timezone.
            return d.isoformat()
        return d.isoformat()
    except ValueError:
        return None


def as_mapping(v: Any) -> dict:
    if isinstance(v, dict):
        return v
    if isinstance(v, str) and v.lstrip().startswith("{"):
        try:
            result = json.loads(v)
            return result if isinstance(result, dict) else {}
        except (ValueError, TypeError):
            return {}
    return {}


class HTMLFacts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_on = False
        self.title = []
        self.text = []
        self.meta = {}
        self.jsonld_on = False
        self.jsonld_buffer = []
        self.jsonld = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.title_on = tag == "title"
        if tag == "meta" and attrs.get("content"):
            self.meta[attrs.get("name") or attrs.get("property") or ""] = attrs["content"]
        if tag == "script" and "ld+json" in (attrs.get("type") or ""):
            self.jsonld_on = True
            self.jsonld_buffer = []

    def handle_endtag(self, tag):
        if tag == "title":
            self.title_on = False
        if tag == "script" and self.jsonld_on:
            self.jsonld_on = False
            try:
                value = json.loads("".join(self.jsonld_buffer))
                self.jsonld.extend(value if isinstance(value, list) else [value])
            except (ValueError, TypeError):
                pass

    def handle_data(self, data):
        if self.jsonld_on:
            self.jsonld_buffer.append(data)
        else:
            self.text.append(data)
            if self.title_on:
                self.title.append(data)


def raw_layers(row: dict) -> list[tuple[str, dict]]:
    layers = [("row", row)]
    for key in ("raw_json", "payload", "raw_payload", "listing_data", "structured_data"):
        obj = as_mapping(row.get(key))
        if obj:
            layers.append((key, obj))
    raw_html = row.get("raw_html") or row.get("html")
    if isinstance(raw_html, str) and raw_html.lstrip().startswith("<"):
        parser = HTMLFacts()
        try:
            parser.feed(raw_html)
            layers.append(("html", {"title": " ".join(parser.title), "description": parser.meta.get("description") or parser.meta.get("og:description"), "body": " ".join(parser.text)}))
            for node in parser.jsonld[:100]:
                if isinstance(node, dict):
                    layers.append(("jsonld", node))
        except Exception:
            pass
    return layers


def lookup(layers: list[tuple[str, dict]], key: str) -> tuple[Any, str | None]:
    aliases = FIELD_ALIASES[key]
    for origin, item in layers:
        for alias in aliases:
            value = item.get(alias)
            if value is not None and value != "" and value != []:
                return value, f"{origin}.{alias}"
    return None, None


def extract_identity(url: str | None) -> tuple[str | None, str | None]:
    if not url:
        return None, None
    parsed = urlparse(url)
    domain = (parsed.hostname or "").lower().removeprefix("www.").rstrip(".")
    path = parsed.path
    patterns = {
        "mubawab.ma": r"/fr/(?:a|pa)/(\d+)(?:/|$)",
        "avito.ma": r"_(\d{7,9})\.htm$",
        "agenz.ma": r"/(\d{3,12})/?$",
    }
    regex = patterns.get(domain)
    m = re.search(regex, path, flags=re.I) if regex else None
    return domain or None, m.group(1) if m else None


def enum_type(raw: Any, mapping: dict[str, str]) -> str | None:
    s = clean(raw)
    if not s:
        return None
    s = s.lower()
    if s in mapping:
        return mapping[s]
    for k, v in mapping.items():
        if re.search(rf"(?<!\w){re.escape(k)}(?!\w)", s):
            return v
    return None


def normalize_country(s: Any) -> str | None:
    v = clean(s)
    if v and v.lower() in ("ma", "maroc", "morocco", "المغرب"):
        return "Morocco"
    return v


def parse_record(row: dict, *, generated_at: str) -> dict:
    layers = raw_layers(row)
    values = {}
    evidence = {}
    for key in FIELD_ALIASES:
        raw, origin = lookup(layers, key)
        values[key] = raw
        if origin:
            evidence[key] = {"origin": origin, "raw": redact(clean(raw)) if not isinstance(raw, (dict, list)) else "[STRUCTURED]", "confidence": "high" if origin.startswith("row.") else "medium"}

    url = clean(values["source_url"])
    domain_from_url, url_id = extract_identity(url)
    source = clean(values["source_name"])
    domain = domain_from_url or (urlparse("https://" + source).hostname.lower().removeprefix("www.") if source and "." in source else None)
    explicit_id = clean(values["source_offer_id"])
    conflict = bool(explicit_id and url_id and explicit_id != url_id)
    source_id = explicit_id or url_id
    identity_state = "conflict" if conflict else "explicit" if explicit_id else "url_candidate" if url_id else "missing"

    title = redact(clean(values["title"]))
    description = redact(clean(values["description"]))
    searchable = " ".join(x for x in (title, description) if x)
    ptype = enum_type(values["property_type"], TYPES)
    if not ptype and searchable:
        ptype = enum_type(searchable, TYPES)
        if ptype:
            evidence["property_type"] = {"origin": "text:property_type", "raw": "[lexical_match]", "confidence": "medium"}
    tx = enum_type(values["transaction_type"], TRANSACTIONS)
    if not tx:
        tx_tokens = {v for k, v in TRANSACTIONS.items() if re.search(rf"(?<!\w){re.escape(k)}(?!\w)", searchable.lower())}
        tx = next(iter(tx_tokens)) if len(tx_tokens) == 1 else None
        if tx:
            evidence["transaction_type"] = {"origin": "text:transaction_type", "raw": "[lexical_match]", "confidence": "medium"}

    city = clean(values["city"])
    district = clean(values["district"])
    price = number(values["price"])
    # Only convert to MAD when unit is explicit or the input column states MAD.
    price_origin = (evidence.get("price") or {}).get("origin", "")
    source_currency = clean(row.get("price_currency")) or clean(as_mapping(row.get("raw_json")).get("priceCurrency"))
    currency = "MAD" if price_origin.endswith(".price_mad") else (source_currency.upper() if source_currency else None)
    if not price and searchable:
        m = PRICE_RX.search(searchable)
        if m:
            price, currency = number(m.group(1)), "MAD"
            evidence["price"] = {"origin": "text:price_regex", "raw": m.group(0), "confidence": "medium"}
    if currency is None and isinstance(values["price"], str) and re.search(r"\b(?:MAD|DHS?|DRH|درهم)\b", values["price"], re.I):
        currency = "MAD"
    # No silent conversion of EUR/USD/unspecified amount to MAD.
    price_mad = price if currency == "MAD" and price and 100 <= price <= 1_000_000_000 else None
    area = number(values["surface"])
    if not area and searchable:
        m = AREA_RX.search(searchable)
        if m:
            area = number(m.group(1))
            evidence["surface"] = {"origin": "text:surface_regex", "raw": m.group(0), "confidence": "medium"}
    if area and not 5 <= area <= 100_000:
        area = None
    bedrooms = number(values["bedrooms"])
    if not bedrooms and searchable:
        m = BED_RX.search(searchable)
        if m:
            bedrooms = number(m.group(1))
            evidence["bedrooms"] = {"origin": "text:bedrooms_regex", "raw": m.group(0), "confidence": "medium"}
    observed_at = timestamp(values["observed_at"])
    published_at = timestamp(values["published_at"])
    country = normalize_country(values["country"])
    identity_key = f"{domain}|{source_id}" if domain and source_id else None
    stable_basis = f"{identity_key}|{observed_at}" if identity_key and observed_at else f"{url or ''}|{json.dumps(row,sort_keys=True,default=str,ensure_ascii=False)}"
    record_id = "observation-" + digest(stable_basis.encode("utf-8"))[:24]

    core = bool(title and city and ptype and tx and price_mad and area)
    status = "quarantine" if conflict else ("ready_internal" if core and identity_state == "explicit" and observed_at else "complete_candidate" if core else "candidate_url" if url and not any((title, city, price_mad, area)) else "partial")
    issues = []
    if conflict:
        issues.append("source_id_conflicts_with_url")
    if not observed_at:
        issues.append("no_proven_observation_timestamp")
    if identity_state != "explicit":
        issues.append("identity_not_explicitly_verified")
    if not country:
        issues.append("country_unknown")
    if not core:
        issues.append("required_core_fields_missing")

    def fact(value: Any, key: str | None = None) -> dict:
        e = evidence.get(key or "", {})
        return {"value": value, "provenance": "DECLARED" if e.get("origin") and not e["origin"].startswith("text:") else "INFERRED", "confidence": e.get("confidence", "unknown") if value is not None else "unknown", "observed_at": observed_at, "source_ref": url, "verification_status": "unverified", "visibility": "INTERNAL"}

    canonical = None
    if observed_at and tx and title and city and ptype:
        canonical = {
            "property_id": record_id,
            "schema_version": "1.0",
            "canonical_status": "unknown",
            "project_id": None, "project_unit_id": None,
            "facts": {
                "classification": {"property_type": fact(ptype, "property_type"), "market_segment": fact("unknown")},
                "location": {"country": fact(country, "country"), "city": fact(city, "city"), "district": fact(district, "district"), "geo_precision": fact("unknown"), "geo_source": fact("unknown")},
                "surfaces": {"surface_total_m2": fact(area, "surface")} if area else {},
                "layout": {k: fact(v, k.replace("_count", "")) for k, v in (("bedrooms_count", int(bedrooms) if bedrooms else None), ("bathrooms_count", int(number(values["bathrooms"])) if number(values["bathrooms"]) else None), ("rooms_count", int(number(values["rooms"])) if number(values["rooms"]) else None)) if v is not None},
                "building": {}, "features": {}, "condition": {}, "land": {}, "legal": {},
            },
            "offers": [{
                "offer_id": record_id + ":offer", "property_id": record_id,
                "source_id": domain or "unknown", "source_name": source or domain or "unknown",
                "external_offer_id": source_id, "source_url": url, "canonical_source_url": url,
                "acquisition_channel": "system", "origin_type": "legacy_import", "transaction_type": tx,
                "title": fact(title, "title"), "description": fact(description, "description"),
                "price_amount": fact(price_mad, "price"), "price_currency": "MAD", "price_period": "unknown",
                "price_status": "valid" if price_mad else "unavailable",
                "availability_status": "unknown", "published_at_source": published_at,
                "first_observed_at": observed_at, "last_observed_at": observed_at,
                "updated_at_source": None, "offer_status": "unknown", "compliance_status": "review_required",
                "media_set_id": None, "ingestion_run_id": None,
            }],
            "media": [], "intelligence": None, "display_policies": [],
            "created_at": observed_at, "updated_at": observed_at,
        }
    return {
        "version": VERSION, "record_id": record_id, "status": status,
        "source": {"domain": domain, "source_name": source, "source_url": url, "source_offer_id": source_id, "identity_state": identity_state},
        "extracted": {"title": title, "description": description, "country": country, "city": city, "district": district, "property_type": ptype, "transaction_type": tx, "price_amount_raw": price, "price_currency_raw": currency, "price_mad": price_mad, "surface_total_m2": area, "bedrooms_count": int(bedrooms) if bedrooms else None, "observed_at": observed_at, "published_at": published_at},
        "canonical_property_v1": canonical,
        "evidence": evidence,
        "quality": {"core_facts_present": core, "timestamp_verified_from_source": bool(observed_at), "source_id_explicit": identity_state == "explicit", "issues": issues, "publication_allowed": False},
    }


def iter_records(path: Path, fmt: str, table: str | None) -> Iterable[dict]:
    if fmt == "sqlite":
        # Explicit read-only URI; a source DB cannot be created or modified.
        conn = sqlite3.connect(f"file:{quote(str(path.resolve()), safe='/')}?mode=ro", uri=True)
        try:
            conn.execute("PRAGMA query_only=ON")
            if table is None:
                found = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                for candidate in ("source_offer_observations", "property_listings", "raw_listings", "candidate_lake_l0"):
                    if candidate in found:
                        table = candidate
                        break
            if not table or not re.fullmatch(r"[A-Za-z_][\w]*", table):
                raise ValueError("Specify a valid --table matching the source schema")
            cursor = conn.execute(f'SELECT * FROM "{table}"')
            names = [x[0] for x in cursor.description]
            for row in cursor:
                yield dict(zip(names, row))
        finally:
            conn.close()
    elif fmt in ("jsonl", "ndjson"):
        opener = gzip.open if path.name.endswith(".gz") else open
        with opener(path, "rt", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    value = json.loads(line)
                    if isinstance(value, dict):
                        yield value
    elif fmt == "json":
        with path.open("r", encoding="utf-8") as f:
            obj = json.load(f)
        if isinstance(obj, dict):
            obj = obj.get("rows", [obj])
        if not isinstance(obj, list):
            raise ValueError("JSON input must be an array or contain rows[]")
        for item in obj:
            if isinstance(item, dict):
                yield item
    elif fmt == "csv":
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            yield from csv.DictReader(f)
    else:
        raise ValueError("Unsupported format: " + fmt)


def run(input_file: Path, output_dir: Path, *, fmt: str = "auto", table: str | None = None, limit: int | None = None) -> dict:
    if not input_file.is_file():
        raise FileNotFoundError(input_file)
    if output_dir.resolve() == input_file.resolve() or input_file.resolve().is_relative_to(output_dir.resolve()):
        raise ValueError("Output directory must not contain the input file")
    if output_dir.exists() and any(output_dir.iterdir()):
        raise FileExistsError("Output directory must be new or empty; never overwrite a verified run")
    detected = fmt if fmt != "auto" else ("sqlite" if input_file.suffix.lower() in (".sqlite", ".db") else "jsonl" if ".jsonl" in input_file.name or ".ndjson" in input_file.name else "csv" if input_file.suffix.lower() == ".csv" else "json" if input_file.suffix.lower() == ".json" else "unknown")
    if detected == "unknown":
        raise ValueError("Use --format sqlite/json/jsonl/csv")
    if detected == "sqlite":
        # Live WAL may contain rows absent from the DB-file checksum.
        wal = Path(str(input_file) + "-wal")
        if wal.exists() and wal.stat().st_size > 0:
            raise ValueError("WAL_PRESENT: copy/checkpoint the SQLite source snapshot first")
    source_sha = sha_file(input_file)
    now = datetime.now(timezone.utc).isoformat()
    output_dir.mkdir(parents=True, exist_ok=True)
    totals = {"input": 0, "ready_internal": 0, "complete_candidate": 0, "partial": 0, "candidate_url": 0, "quarantine": 0, "exact_duplicate_observations": 0, "rejected_errors": 0}
    registry = sqlite3.connect(str(output_dir / "private_identity_registry.sqlite"))
    registry.execute("CREATE TABLE seen (identity TEXT PRIMARY KEY, first_record_id TEXT)")
    files = {}
    raw_handles = []
    for name in ("records", "quarantine", "duplicates", "errors"):
        raw_output = (output_dir / (name + ".jsonl.gz")).open("wb")
        raw_handles.append(raw_output)
        gzip_output = gzip.GzipFile(filename="", mode="wb", fileobj=raw_output, mtime=0)
        files[name] = io.TextIOWrapper(gzip_output, encoding="utf-8")
    try:
        for raw in iter_records(input_file, detected, table):
            if limit is not None and totals["input"] >= limit:
                break
            totals["input"] += 1
            try:
                item = parse_record(raw, generated_at=now)
                key = item["source"]["domain"], item["source"]["source_offer_id"], item["extracted"]["observed_at"]
                if all(key) and item["source"]["identity_state"] == "explicit":
                    identity = "\x1f".join(key)
                    prev = registry.execute("INSERT OR IGNORE INTO seen VALUES (?, ?)", (identity, item["record_id"])).rowcount
                    if not prev:
                        totals["exact_duplicate_observations"] += 1
                        files["duplicates"].write(json.dumps(item, ensure_ascii=False, sort_keys=True, default=str) + "\n")
                        continue
                totals[item["status"]] += 1
                selected = "quarantine" if item["status"] == "quarantine" else "records"
                files[selected].write(json.dumps(item, ensure_ascii=False, sort_keys=True, default=str) + "\n")
            except Exception as e:
                totals["rejected_errors"] += 1
                files["errors"].write(json.dumps({"row_ordinal": totals["input"], "error_code": type(e).__name__}, ensure_ascii=False) + "\n")
        registry.commit()
    finally:
        for f in files.values():
            f.close()
        for h in raw_handles:
            h.close()
        registry.close()
    output_files = {p.name: {"sha256": sha_file(p), "bytes": p.stat().st_size} for p in output_dir.iterdir() if p.is_file()}
    manifest = {"version": VERSION, "generated_at": now, "input": {"sha256": source_sha, "format": detected, "table": table, "filename": input_file.name}, "counts": totals, "files": output_files, "invariants": {"source_unchanged": sha_file(input_file) == source_sha, "publications_authorized": 0, "production_db_writes": 0, "url_only_never_ready": True}}
    (output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    p = argparse.ArgumentParser(description="Private offline raw-to-canonical JSONL, no source mutation")
    p.add_argument("--input", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--format", default="auto", choices=("auto", "sqlite", "json", "jsonl", "csv"))
    p.add_argument("--table")
    p.add_argument("--limit", type=int, default=None)
    a = p.parse_args()
    print(json.dumps(run(a.input, a.out, fmt=a.format, table=a.table, limit=a.limit)["counts"], indent=2))


if __name__ == "__main__":
    main()
