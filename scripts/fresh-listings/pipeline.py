"""Text-only, resumable listing sieve. Python standard library only."""
import argparse
import json
import math
import re
import sqlite3
import time
import unicodedata
from collections import Counter
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit, unquote, quote
from urllib.request import Request, build_opener, HTTPRedirectHandler
from xml.etree import ElementTree as ET

VERSION = "1.5.0"
UA = "AkarFinderListingAudit/1.0 (+https://github.com/hraaaaf/Akarfinder)"
ROOT = Path(__file__).resolve().parents[2]
TYPES = {"apartment": "appartement", "appartement": "appartement", "studio": "studio", "villa": "villa", "house": "maison", "maison": "maison", "terrain": "terrain", "land": "terrain", "bureau": "bureau", "office": "bureau", "local commercial": "local_commercial", "local_commercial": "local_commercial", "riad": "riad", "ferme": "ferme"}

def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()

def fold(value):
    return "".join(c for c in unicodedata.normalize("NFKD", clean(value).lower()) if not unicodedata.combining(c))

def canonical(raw):
    if not isinstance(raw, str) or any(ord(c) < 32 for c in raw):
        raise ValueError("unsafe_url")
    u = urlsplit(raw)
    if u.scheme != "https" or not u.hostname or u.username or u.password or u.port not in (None, 443):
        raise ValueError("unsafe_url")
    return urlunsplit(("https", u.hostname.lower(), quote(u.path or "/", safe="/%:@-._~!$&'()*+,;="), quote(u.query, safe="=&?/%:@-._~!$'()*+,;"), ""))

def identity(raw):
    u = urlsplit(canonical(raw))
    return u.hostname.removeprefix("www."), unquote(u.path).rstrip("/"), u.query

def number(raw):
    if isinstance(raw, bool) or raw is None:
        return None
    s = clean(raw).replace(" ", "")
    if not re.fullmatch(r"\d+(?:[.,]\d+)*", s):
        return None
    if s.isdigit():
        pass
    elif re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", s):
        s = re.sub(r"[.,]", "", s)
    elif s.count(",") + s.count(".") == 1:
        s = s.replace(",", ".")
    elif "," in s and "." in s:
        decimal = "," if s.rfind(",") > s.rfind(".") else "."
        s = s.replace("." if decimal == "," else ",", "").replace(decimal, ".")
    else:
        return None
    n = float(s)
    return n if math.isfinite(n) and n > 0 else None

def date(raw):
    if not isinstance(raw, str):
        return None
    try:
        d = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        # Unknown timezone must not be silently interpreted as UTC.
        return d.astimezone(timezone.utc) if d.tzinfo else None
    except ValueError:
        return None

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.meta = {}
        self.links = {}
        self.headline = []
        self.primary = []
        self.blocks = []
        self.script = None
        self.script_parts = []
        self.script_kind = None
        self.next_data = None
        self.anchors = []
        self.districts = []
        self.features = []
        self.definitions = []
        self.definition_label = []
        self.definition_value = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "dt":
            self.definition_label = []
        if tag == "dd":
            self.definition_value = []
        if tag == "a" and a.get("href"):
            self.anchors.append(a["href"])
            if any("adBread" in b.get("class", "").split() for t, b in self.stack) and re.match(r"^/fr/sd/", urlsplit(a["href"]).path) and a.get("title"):
                self.districts.append((a["href"], a["title"]))
        if tag == "meta":
            self.meta[a.get("property", a.get("name", ""))] = a.get("content", "")
        if tag == "link" and a.get("rel") == "canonical":
            self.links["canonical"] = a.get("href", "")
        if tag == "script" and (a.get("type") == "application/ld+json" or a.get("id") == "__NEXT_DATA__"):
            self.script = True
            self.script_kind = "next" if a.get("id") == "__NEXT_DATA__" else "ld"
            self.script_parts = []
        if tag not in {"meta", "link", "img", "br", "hr", "input", "source", "wbr", "area", "embed", "param"}:
            self.stack.append((tag, a))

    def handle_endtag(self, tag):
        if tag == "dd" and self.definition_label:
            self.definitions.append((clean(" ".join(self.definition_label)), clean(" ".join(self.definition_value))))
        if tag == "script" and self.script:
            try:
                parsed = json.loads("".join(self.script_parts))
                if self.script_kind == "next":
                    self.next_data = parsed
                else:
                    self.blocks.append(parsed)
            except (ValueError, TypeError):
                pass
            self.script = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        if self.script:
            self.script_parts.append(data)
            return
        if any(t == "dl" for t, a in self.stack):
            if any(t == "dt" for t, a in self.stack):
                self.definition_label.append(data)
            if any(t == "dd" for t, a in self.stack):
                self.definition_value.append(data)
        if any(t in {"script", "style", "nav", "aside", "footer"} for t, a in self.stack):
            return
        if any(t == "h1" for t, a in self.stack):
            self.headline.append(data)
        if any("entry-content" in a.get("class", "").split() for t, a in self.stack):
            self.primary.append(data)
        if any("adDetails" in a.get("class", "").split() for t, a in self.stack) and any("adDetailFeature" in a.get("class", "").split() for t, a in self.stack):
            self.features.append(data)

def ld_nodes(blocks):
    for block in blocks:
        if isinstance(block, list):
            yield from ld_nodes(block)
        elif isinstance(block, dict):
            yield block
            yield from ld_nodes(block.get("@graph", []))

def avito_extract(p, url):
    """Read only the URL-bound ad in the page's public SSR cache."""
    match = re.search(r"_(\d+)\.htm$", urlsplit(url).path)
    if not match or not isinstance(p.next_data, dict):
        return {"erreur": "avito_missing_bound_ad"}
    props = p.next_data.get("props", {}).get("pageProps", {})
    cache = props.get("apolloState", {})
    if not isinstance(cache, dict):
        return {"erreur": "avito_missing_bound_ad"}
    def resolve(value):
        if isinstance(value, dict) and "__ref" in value:
            return cache.get(value["__ref"], {})
        return value if isinstance(value, dict) else {}
    matches = []
    for key, response in cache.get("ROOT_QUERY", {}).items():
        if not key.startswith("getPublishedAd("):
            continue
        try:
            query = json.loads(key[len("getPublishedAd("):-1])
            if str(query.get("query", {}).get("listId")) != match[1]:
                continue
        except (ValueError, TypeError):
            continue
        ad = resolve(resolve(response).get("ad"))
        if str(ad.get("listId")) == match[1] and ad.get("__typename") == "PublishedAd":
            matches.append(ad)
    if len(matches) != 1:
        return {"erreur": "avito_missing_or_ambiguous_bound_ad"}
    ad = matches[0]
    out = {"preuves": {}}
    location = resolve(ad.get("location"))
    for key, field in [("city", "ville"), ("area", "quartier")]:
        label = resolve(location.get(key)).get("name")
        if isinstance(label, str) and clean(label):
            out[field] = clean(label)
            out["preuves"][field] = "avito:bound-PublishedAd.location." + key + ".name"
    category = fold(resolve(ad.get("category")).get("name"))
    mapping = {"appartements": "appartement", "maisons": "maison", "villas": "villa", "bureaux": "bureau", "locaux commerciaux": "local_commercial"}
    if category in mapping:
        out["type"] = mapping[category]
        out["preuves"]["type"] = "avito:bound-PublishedAd.category.name"
    price = resolve(ad.get("price"))
    if re.search(r"\b(?:DH|MAD)\b", str(price.get("withCurrency", ""))):
        amount = number(price.get("withoutCurrency"))
        if amount:
            out["prix"] = amount
            out["devise"] = "MAD"
            out["preuves"]["prix"] = "avito:bound-PublishedAd.price.withoutCurrency:MAD"
    params = resolve(ad.get("params"))
    items = [n for group in ("primary", "secondary") for n in params.get(group, []) if isinstance(n, dict)]
    for key in ("habitable_size", "size"):
        areas = {number(n.get("numericValue")) for n in items if n.get("id") == key and n.get("unit") in ("m²", "m2")}
        areas.discard(None)
        if len(areas) == 1:
            out["superficie"] = areas.pop()
            out["preuves"]["superficie"] = "avito:bound-PublishedAd.params." + key + ":m2"
            break
    # listTime is exposed publicly, but its first-publication vs bump semantics
    # have not been verified. It MUST NOT certify the user's seven-day rule.
    out["source_list_time"] = ad.get("listTime")
    out["erreur"] = "publication_semantics_unverified"
    return out

def extract(html, url):
    p = Page()
    p.feed(html)
    out = {"url": canonical(url), "preuves": {}, "parser_version": VERSION}
    target = identity(url)
    declared = p.links.get("canonical") or p.meta.get("og:url")
    if declared:
        try:
            if identity(urljoin(url, declared)) != target:
                out["erreur"] = "canonical_mismatch"
                return out
        except ValueError:
            out["erreur"] = "invalid_canonical"
            return out
    if target[0] == "avito.ma":
        result = avito_extract(p, url)
        out.update(result)
        return out
    pub = p.meta.get("article:published_time")
    if pub:
        out["date_publication"] = pub
        out["preuves"]["date_publication"] = "meta:article:published_time"
    if re.search(r"\b(?:noindex|noarchive)\b", p.meta.get("robots", ""), re.I):
        out["erreur"] = "source_noindex_or_noarchive"
    nodes = list(ld_nodes(p.blocks))
    # A directly nested itemOffered belongs to its URL-bound listing only.
    for n in nodes:
        if n.get("@type") not in ("RealEstateListing", "Offer"):
            continue
        try:
            if identity(n.get("url", n.get("@id", ""))) != target:
                continue
        except ValueError:
            continue
        for field in ("mainEntity", "itemOffered"):
            child = n.get(field)
            if not isinstance(child, dict):
                continue
            raw_identity = child.get("url") or child.get("@id")
            try:
                if raw_identity and identity(urljoin(url, raw_identity)) != target:
                    continue
            except ValueError:
                continue
            nodes.append({**child, "url": url})
            if field == "mainEntity" and child.get("@type") == "Offer":
                n["offers"] = child
    for n in nodes:
        raw_url = n.get("url") or n.get("@id")
        if not isinstance(raw_url, str):
            continue
        try:
            if identity(urljoin(url, raw_url)) != target:
                continue
        except ValueError:
            continue
        typ = str(n.get("@type", ""))
        if typ == "RealEstateListing" and n.get("datePosted"):
            published = n.get("datePublished") or out.get("date_publication")
            if published and date(published) != date(n["datePosted"]):
                out["erreur"] = "conflicting_publication_dates"
            else:
                out["date_publication"] = n["datePosted"]
                out["preuves"]["date_publication"] = "jsonld:RealEstateListing.datePosted"
        # Dates on article/webpage nodes identify the current source publication.
        if n.get("datePublished") and re.search("Article|WebPage|RealEstateListing|Residence|Apartment|House", typ):
            existing_publication = out.get("date_publication")
            if existing_publication and date(existing_publication) != date(n["datePublished"]):
                out["erreur"] = "conflicting_publication_dates"
            else:
                out["date_publication"] = n["datePublished"]
                out["preuves"]["date_publication"] = "jsonld:datePublished"
        if not re.search("RealEstateListing|Residence|Apartment|House|Accommodation|Product", typ):
            continue
        addr = n.get("address") or {}
        if isinstance(addr, dict):
            for key, field in [("addressLocality", "ville"), ("neighborhood", "quartier")]:
                if isinstance(addr.get(key), str):
                    out[field] = clean(addr[key])
                    out["preuves"][field] = "jsonld:address." + key
        if target[0] in {"sawim.ma", "marocimmo.com"}:
            place = n.get("containedInPlace") or {}
            if isinstance(place, dict) and isinstance(place.get("name"), str) and out.get("ville"):
                district = clean(place["name"])
                suffix = ", " + out["ville"]
                if district.endswith(suffix):
                    district = district[:-len(suffix)]
                if district and fold(district) != fold(out["ville"]):
                    out["quartier"] = district
                    out["preuves"]["quartier"] = "jsonld:bound-property.containedInPlace.name"
        surface = n.get("floorSize") or {}
        if isinstance(surface, dict) and surface.get("unitCode", surface.get("unitText")) in ("MTK", "m2", "m²"):
            out["superficie"] = number(surface.get("value"))
            out["preuves"]["superficie"] = "jsonld:floorSize"
        offers = n.get("offers") or []
        offers = offers if isinstance(offers, list) else [offers]
        if any(isinstance(o, dict) and str(o.get("availability", "")).split("/")[-1] in {"SoldOut", "OutOfStock", "Discontinued"} for o in offers):
            out["erreur"] = "listing_unavailable"
        prices = {(number(o.get("price")), o.get("priceCurrency")) for o in offers if isinstance(o, dict) and o.get("priceCurrency") in {"MAD", "EUR", "USD"} and not o.get("priceSpecification")}
        prices = {(amount, currency) for amount, currency in prices if amount is not None}
        if len(prices) == 1:
            out["prix"], out["devise"] = prices.pop()
            out["preuves"]["prix"] = "jsonld:offers.price:" + out["devise"]
        elif len(prices) > 1:
            out["erreur"] = "ambiguous_price"
        for k, v in TYPES.items():
            if fold(typ) == k:
                out["type"] = v
                out["preuves"]["type"] = "jsonld:@type"
    title = clean(" ".join(p.headline))
    text = clean(" ".join(p.primary))
    if re.search(r"a partir de|starting from", fold(title)):
        out["erreur"] = "starting_price_not_exact"
    if re.search(r"(?:dh|mad|eur|usd)\s*(?:/|par)\s*m[²2]", fold(title)):
        out["erreur"] = "unit_price_not_total"
    if target[0] == "sawim.ma":
        if not re.match(r"^/annonce/[A-Za-z0-9]+/[^/]+$", urlsplit(url).path):
            out["erreur"] = "not_detail_url"
        types = {TYPES.get(fold(v)) for k, v in p.definitions if fold(k) == "type de bien"}
        types.discard(None)
        if len(types) == 1:
            out["type"] = types.pop()
            out["preuves"]["type"] = "sawim:dl:Type de bien"
        surfaces = {number(m.group(1)) for k, v in p.definitions if fold(k) in {"surface", "surface habitable", "superficie"} and (m := re.fullmatch(r"([\d\s.,]+)\s*m[²2]", v))}
        surfaces.discard(None)
        if len(surfaces) == 1:
            out["superficie"] = surfaces.pop()
            out["preuves"]["superficie"] = "sawim:dl:surface:m2"
    if re.search(r"annonce (?:supprimee|expiree|retiree|indisponible)|bien (?:vendu|deja loue)", fold(title + " " + text)):
        out["erreur"] = "listing_unavailable"
    if target[0] == "mubawab.ma":
        if not re.match(r"^/(fr|en|ar)/a/\d+/", urlsplit(url).path):
            out["erreur"] = "not_detail_url"
        districts = {clean(label) for href, label in p.districts if identity(urljoin(url, href))[0] == target[0]}
        if len(districts) == 1:
            out["quartier"] = districts.pop()
            out["preuves"]["quartier"] = "mubawab:adBread:district-label"
        surfaces = {number(v) for v in re.findall(r"(\d+(?:[.,]\d+)?)\s*m[²2]\b", clean(" ".join(p.features)))}
        surfaces.discard(None)
        if len(surfaces) == 1:
            out["superficie"] = surfaces.pop()
            out["preuves"]["superficie"] = "mubawab:adDetails:adDetailFeature:m2"
    if target[0] == "daragadir.com":
        # Reviewed source adapter. Never inspect related cards outside entry-content.
        if not re.match(r"^/annonces/annonces-immobilieres/.+\.html$", unquote(urlsplit(url).path)):
            out["erreur"] = "not_detail_url"
        t = fold(title)
        for k in ("terrain", "appartement", "studio", "villa", "maison", "bureau", "local commercial", "riad", "ferme"):
            if re.search(r"\b" + re.escape(k) + r"s?\b", t):
                out["type"] = TYPES[k]
                out["preuves"]["type"] = "daragadir:h1"
                break
        # The city's spelling must appear explicitly, never inferred from the host.
        if re.search(r"\bagadir\b", t):
            out["ville"] = "Agadir"
            out["preuves"]["ville"] = "daragadir:h1"
        districts = ("Hay Mohammadi", "Haut Anza", "Extension Illigh", "Tilila", "Dakhla", "Talborjt", "Founty", "Sonaba", "Illigh", "Anza", "Taddart", "Cité Suisse", "Hay Salam")
        matched = [d for d in districts if re.search(r"\b" + re.escape(fold(d)) + r"\b", t)]
        if len(matched) == 1:
            out["quartier"] = matched[0]
            out["preuves"]["quartier"] = "daragadir:h1:reviewed-dictionary"
        surfaces = {number(m) for m in re.findall(r"(\d+(?:[.,]\d+)?)[\s\u202f]*m[²2]\b", title)}
        surfaces.discard(None)
        if len(surfaces) == 1:
            out["superficie"] = surfaces.pop()
            out["preuves"]["superficie"] = "daragadir:h1:m2"
        if not re.search(r"(?:par\s*(?:jour|nuit)|quotidien|journalier|/\s*m[²2]|par\s*m[²2]|a partir de|prix\s*(?:sur demande|a negocier))", fold(title + " " + text)):
            prices = {number(m) for m in re.findall(r"(\d[\d\s.,\u202f]*?)\s*(?:DH|MAD|dirhams?)\b", title, re.I)}
            prices.discard(None)
            if len(prices) == 1:
                out["prix"] = prices.pop()
                out["devise"] = "MAD"
                out["preuves"]["prix"] = "daragadir:h1:MAD"
    return out

def sieve(row, now, days=7):
    reasons = []
    for field in ("ville", "quartier", "type"):
        if not isinstance(row.get(field), str) or not clean(row[field]) or fold(row[field]) in {"inconnu", "unknown", "n/a", "non precise"}:
            reasons.append("missing_" + field)
    if row.get("type") not in set(TYPES.values()):
        reasons.append("unsupported_type")
    if row.get("devise") not in {"MAD", "EUR", "USD"}:
        reasons.append("missing_or_unsupported_currency")
    for field in ("prix", "superficie"):
        v = row.get(field)
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v <= 0:
            reasons.append("invalid_" + field)
    if isinstance(row.get("prix"), (int, float)) and row["prix"] > 500_000_000:
        reasons.append("implausible_price")
    try:
        canonical(row.get("url", ""))
    except (ValueError, TypeError):
        reasons.append("invalid_url")
    published = date(row.get("date_publication"))
    if not published:
        reasons.append("missing_publication_date")
    elif published > now:
        reasons.append("future_publication_date")
    elif published <= now - timedelta(days=days):
        reasons.append("older_than_7_days")
    verified = date(row.get("verifie_le"))
    if not verified or row.get("http_status") != 200:
        reasons.append("not_live_verified")
    elif verified > now or verified < now - timedelta(hours=24):
        reasons.append("verification_expired_or_future")
    if row.get("erreur"):
        reasons.append(row["erreur"])
    for field in ("ville", "quartier", "type", "prix", "superficie", "date_publication"):
        if not row.get("preuves", {}).get(field):
            reasons.append("missing_evidence_" + field)
    return sorted(set(reasons))

def robots_allowed(text, url):
    # RFC-style longest matching group/rule, including wildcard/end anchors.
    groups = []
    agents, rules, delay = [], [], 1.0
    for line in text.splitlines() + ["User-agent: __end__"]:
        key, sep, value = line.split("#", 1)[0].partition(":")
        if not sep:
            continue
        key, value = key.strip().lower(), value.strip()
        if key == "user-agent":
            if rules or key == "user-agent" and value == "__end__":
                groups.append((agents, rules, delay))
                agents, rules, delay = [], [], 1.0
            agents.append(value.lower())
        elif key in {"allow", "disallow"} and agents and value:
            rules.append((key, value))
        elif key == "crawl-delay":
            try:
                delay = max(1.0, float(value))
            except ValueError:
                pass
    specific = [g for g in groups if any(a != "*" and a in UA.lower() for a in g[0])]
    selected = specific or [g for g in groups if "*" in g[0]]
    if specific:
        best = max(len(a) for g in specific for a in g[0] if a in UA.lower())
        selected = [g for g in specific if any(len(a) == best and a in UA.lower() for a in g[0])]
    path = urlsplit(url).path + ("?" + urlsplit(url).query if urlsplit(url).query else "")
    hits = []
    for agents, rules, delay in selected:
        for kind, pattern in rules:
            end = pattern.endswith("$")
            expr = re.escape(pattern[:-1] if end else pattern).replace(r"\*", ".*")
            if re.match("^" + expr + ("$" if end else ""), path):
                hits.append((len(pattern.replace("*", "").rstrip("$")), kind == "allow"))
    return (max(hits)[1] if hits else True), max([g[2] for g in selected] or [1.0])

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("redirect_requires_review:" + str(code))

class Client:
    def __init__(self, origin):
        self.origin = canonical(origin).rstrip("/")
        self.last = 0
        self.delay = 1.0
        self.robots = self.get(self.origin + "/robots.txt", robots=True)
        if "<html" in self.robots.lower() or "user-agent:" not in self.robots.lower():
            raise ValueError("robots_unavailable")

    def get(self, url, robots=False, max_bytes=3_000_000):
        url = canonical(url)
        if urlsplit(canonical(url)).netloc != urlsplit(self.origin).netloc:
            raise ValueError("cross_origin_request")
        if not robots:
            allowed, delay = robots_allowed(self.robots, url)
            if not allowed:
                raise ValueError("robots_disallowed")
            self.delay = max(self.delay, delay)
        time.sleep(max(0, self.last + self.delay - time.monotonic()))
        self.last = time.monotonic()
        with build_opener(NoRedirect()).open(Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xml,text/plain"}), timeout=20) as response:
            if response.status != 200:
                raise ValueError("http_" + str(response.status))
            if not any(k in response.headers.get("Content-Type", "") for k in ("text/", "xml", "json")):
                raise ValueError("non_text_response")
            body = response.read(max_bytes + 1)
            if len(body) > max_bytes:
                raise ValueError("body_too_large")
            html = body.decode("utf-8", errors="replace")
            if re.search(r"verify you are human|cf-chl-|captcha challenge|access denied", html, re.I):
                raise ValueError("access_challenge")
            return html

def discover(client, config, max_maps=30):
    namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    queue = re.findall(r"(?im)^\s*Sitemap:\s*(\S+)", client.robots)
    seen, urls, errors = set(), {}, []
    catalogue_priority = []
    while queue and len(seen) < max_maps:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            xml = ET.fromstring(client.get(url, max_bytes=52_428_800))
            if xml.tag.endswith("sitemapindex"):
                queue.extend(n.text for n in xml.findall("s:sitemap/s:loc", namespace) if n.text)
            elif xml.tag.endswith("urlset"):
                for n in xml.findall("s:url", namespace):
                    loc, modified = n.findtext("s:loc", namespaces=namespace), n.findtext("s:lastmod", namespaces=namespace)
                    if loc and re.search(config["detail_pattern"], unquote(urlsplit(loc).path)):
                        urls[canonical(loc)] = modified or ""
        except Exception as e:
            errors.append({"url": url, "error": str(e)[:200]})
    # Public configured catalogue pages are another explicit discovery channel.
    for catalogue in config.get("catalogues", []):
        try:
            page = Page()
            page.feed(client.get(catalogue))
            for href in page.anchors:
                loc = urljoin(catalogue, href)
                if urlsplit(loc).netloc == urlsplit(client.origin).netloc and re.search(config["detail_pattern"], unquote(urlsplit(loc).path)):
                    loc = canonical(loc)
                    urls.setdefault(loc, "")
                    if loc not in catalogue_priority:
                        catalogue_priority.append(loc)
        except Exception as e:
            errors.append({"url": catalogue, "error": str(e)[:200]})
            break
    if not urls:
        errors.append({"origin": client.origin, "error": "no_detail_urls_discovered"})
    # lastmod helps discovery order; it is NEVER publication evidence.
    remaining = sorted((u for u in urls if u not in catalogue_priority), key=lambda u: urls[u], reverse=True)
    return catalogue_priority + remaining, errors

def atomic_json(path, obj):
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)

def export(db, out, now, target, stats):
    accepted, rejected, seen = [], [], set()
    for raw, in db.execute("SELECT payload FROM observations ORDER BY url"):
        row = json.loads(raw)
        reasons = sieve(row, now)
        key = identity(row["url"])
        if key in seen:
            reasons.append("duplicate_canonical_url")
        seen.add(key)
        if reasons:
            rejected.append({"url": row["url"], "motifs": sorted(set(reasons)), "extraction": row})
        else:
            item = {k: row[k] for k in ("ville", "quartier", "superficie", "prix", "devise", "type", "url", "date_publication", "verifie_le", "preuves", "parser_version")}
            for field in ("transaction", "periode_prix"):
                if row.get(field):
                    item[field] = row[field]
            accepted.append(item)
    atomic_json(out / "annonces fraiches.json", accepted)
    with (out / "rejets.jsonl").open("w", encoding="utf-8") as f:
        for row in rejected:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    report = {**stats, "parser_version": VERSION, "generated_at": now.isoformat(), "freshness": "publication strictly within last 7 days; live HTTP 200 this run", "target": target, "accepted": len(accepted), "rejected": len(rejected), "target_reached": len(accepted) >= target, "shortfall": max(0, target - len(accepted)), "reasons": dict(Counter(reason for row in rejected for reason in row["motifs"])), "photos_downloaded": 0, "production_writes": 0, "deduplication": "canonical URL only; distinct properties not guaranteed"}
    report["freshness"] = "publication strictly within last 7 days; explicit successful HTTP verification within 24 hours"
    report["checkpoint_observations"] = len(accepted) + len(rejected)
    atomic_json(out / "rapport.json", report)
    return report

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=Path(__file__).with_name("sources.json"))
    parser.add_argument("--output", type=Path, default=ROOT / "data" / "annonces-fraiches")
    parser.add_argument("--max-details", type=int, default=60)
    parser.add_argument("--target", type=int, default=200_000)
    parser.add_argument("--input", type=Path, help="Reviewed extracted observations JSON; replays the sieve without network")
    args = parser.parse_args()
    if args.max_details < 1 or args.target < 1:
        parser.error("positive limits required")
    args.output.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(args.output / "checkpoint.sqlite")
    db.execute("CREATE TABLE IF NOT EXISTS observations (url TEXT PRIMARY KEY, payload TEXT NOT NULL)")
    now = datetime.now(timezone.utc)
    stats = {"run_id": now.isoformat(), "sources": [], "discovered": 0, "fetched": 0, "errors": []}
    def save(row):
        db.execute("INSERT OR REPLACE INTO observations VALUES (?, ?)", (row["url"], json.dumps(row, ensure_ascii=False)))
        db.commit()
    if args.input:
        for row in json.loads(args.input.read_text(encoding="utf-8")):
            # Offline imports cannot claim a fresh live verification.
            row.update(http_status=None, erreur="offline_replay_requires_live_verification")
            save(row)
    else:
        for config in json.loads(args.sources.read_text(encoding="utf-8")):
            if not config.get("enabled"):
                continue
            try:
                client = Client(config["origin"])
                urls, errors = discover(client, config)
                stats["errors"].extend(errors)
                stats["discovered"] += len(urls)
                stats["sources"].append({"origin": config["origin"], "discovered": len(urls)})
                source_limit = min(args.max_details, int(config.get("detail_limit", args.max_details)))
                for url in urls[:source_limit]:
                    row = {"url": url, "run_id": stats["run_id"]}
                    try:
                        html = client.get(url)
                        stats["fetched"] += 1
                        row.update(extract(html, url))
                        row.update(verifie_le=datetime.now(timezone.utc).isoformat(), http_status=200)
                    except Exception as e:
                        row["erreur"] = str(e)[:200]
                        stats["errors"].append({"url": url, "error": row["erreur"]})
                        save(row)
                        # Never retry around a protection or unavailable access channel.
                        break
                    save(row)
                    if stats["fetched"] % 10 == 0:
                        report = export(db, args.output, datetime.now(timezone.utc), args.target, stats)
                        print(json.dumps({"fetched": stats["fetched"], "accepted": report["accepted"], "last_url": url}), flush=True)
            except Exception as e:
                stats["errors"].append({"origin": config["origin"], "error": str(e)[:200]})
    report = export(db, args.output, datetime.now(timezone.utc), args.target, stats)
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    db.close()

if __name__ == "__main__":
    main()
