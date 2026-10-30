#!/usr/bin/env python3
"""Mubawab listing collector with SQLite resume state.

Requires Python 3.9+, requests, beautifulsoup4. This script only reads public
listing pages, obeys robots.txt, and stops on HTTP 403/429. It does not collect
telephone numbers or attempt to bypass access controls.

Examples:
  python mubawab_full.py --phase list --cities casablanca --max-pages 1
  python mubawab_full.py --phase list --discover-cities
  python mubawab_full.py --phase details --limit 20
  python mubawab_full.py --phase export

Set MUBAWAB_CONTACT to a real contact address before crawling. Keep --delay at
or above two seconds. Image URLs are exported; image downloading is disabled in this release.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import re
import sqlite3
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote
from xml.etree import ElementTree
from datetime import datetime, timezone
from urllib.robotparser import RobotFileParser

try:
    import requests
    from bs4 import BeautifulSoup
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Dépendances manquantes. Installe-les avec: "
        "python -m pip install requests beautifulsoup4"
    ) from exc

BASE = "https://www.mubawab.ma"
HOST = "www.mubawab.ma"
DEFAULT_CITIES = ("casablanca", "rabat", "marrakech", "tanger")
LINK_RE = re.compile(r"/fr/(?:a|pa)/(\d+)(?:/|$)")
SEED_RE = re.compile(r"/fr/ct/([a-z0-9-]+)/immobilier-a-(?:vendre|louer)", re.I)
PRICE_RE = re.compile(r"(\d[\d\s\u00a0\u202f.,]*)\s*(DH|EUR)\b", re.I)
AREA_RE = re.compile(r"^(\d+(?:[.,]\d+)?)\s*m²$", re.I)
ROOMS_RE = re.compile(r"^(\d+)\s*Pièces?$", re.I)
BEDS_RE = re.compile(r"^(\d+)\s*(?:Chambres?|Ch\.)$", re.I)
BATHS_RE = re.compile(r"^(\d+)\s*Salles? de bains?$", re.I)
RENTAL_RE = re.compile(r"\b(à louer|a louer|location|louer)\b", re.I)
IMG_RE = re.compile(r"(?:https?:)?//www\.mubawab-media\.com/[^\"'\s)\\<>]+", re.I)
UA_PREFIX = "AkarFinderBot/0.3"


def make_user_agent():
    contact = os.environ.get("MUBAWAB_CONTACT", "").strip()
    if not contact:
        print("[warn] MUBAWAB_CONTACT absent; configure un contact avant un crawl réel.", file=sys.stderr)
        return UA_PREFIX
    return f"{UA_PREFIX} (+{contact})"


def canonical_url(href: str) -> str:
    return urljoin(BASE + "/", href.strip())


def listing_id(url: str):
    m = LINK_RE.search(urlparse(url).path)
    return m.group(1) if m else None


def card_for(anchor):
    """Return the largest ancestor that appears to contain only this listing."""
    box = anchor.find_parent(class_="listingBox")
    if box is not None:
        return box
    node = anchor
    last_single = anchor
    while node.parent is not None:
        parent = node.parent
        ids = {listing_id(urljoin(BASE, item.get("href", "")))
               for item in parent.find_all("a", href=True)}
        ids.discard(None)
        if len(ids) > 1:
            break
        if ids:
            last_single = parent
        node = parent
    return last_single


def _unique_lines(card):
    lines, previous = [], None
    for raw in card.get_text("\n").splitlines():
        value = " ".join(raw.split())
        if value and value != previous:
            lines.append(value)
        previous = value
    return lines


def parse_card(card, anchor):
    href = canonical_url(anchor.get("href", ""))
    lid = listing_id(href)
    lines = _unique_lines(card)
    title = " ".join(anchor.get_text(" ", strip=True).split())
    text = " ".join(lines)
    price_match = PRICE_RE.search(text)
    price = None
    if price_match:
        before_price = text[:price_match.start()].lower()
        if "à consulter" not in before_price[-40:]:
            numeric = re.sub(r"\D", "", price_match.group(1))
            price = int(numeric) if numeric else None

    rec = {
        "source": "mubawab", "id": lid, "url": href, "title": title,
        "price_dh": price if price_match and price_match.group(2).upper() == "DH" else None,
        "district": None, "city": None, "area_m2": None, "rooms": None,
        "bedrooms": None, "bathrooms": None, "description_snippet": None,
        "rental_suspect": bool(RENTAL_RE.search(title)),
    }
    if title in lines:
        index = lines.index(title)
        if index + 1 < len(lines) and "," in lines[index + 1]:
            rec["district"], _, rec["city"] = (part.strip() for part in lines[index + 1].rpartition(","))
    location = card.select_one('.listingH3')
    if location:
        location_text = ' '.join(location.get_text(' ', strip=True).split())
        if ',' in location_text:
            rec['district'], rec['city'] = [x.strip() for x in location_text.rsplit(',', 1)]
    for line in lines:
        if (m := AREA_RE.match(line)) and rec["area_m2"] is None:
            rec["area_m2"] = float(m.group(1).replace(",", "."))
        elif (m := ROOMS_RE.match(line)) and rec["rooms"] is None:
            rec["rooms"] = int(m.group(1))
        elif (m := BEDS_RE.match(line)) and rec["bedrooms"] is None:
            rec["bedrooms"] = int(m.group(1))
        elif (m := BATHS_RE.match(line)) and rec["bathrooms"] is None:
            rec["bathrooms"] = int(m.group(1))
        elif len(line) > 80 and rec["description_snippet"] is None:
            rec["description_snippet"] = line
    return rec


def clean_photos(urls):
    result = []
    for raw in urls:
        url = urljoin(BASE, raw.strip())
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or parsed.hostname != "www.mubawab-media.com":
            continue
        if "/assets/" in parsed.path or "/business/" in parsed.path:
            continue
        if url not in result:
            result.append(url)
    return result


def _srcset_urls(value):
    candidates = []
    for item in value.split(","):
        parts = item.strip().split()
        if not parts:
            continue
        score = 0
        if len(parts) > 1:
            token = parts[1]
            try:
                score = float(token[:-1]) if token.endswith(("w", "x")) else 0
            except ValueError:
                pass
        candidates.append((score, parts[0]))
    return [url for _, url in sorted(candidates, reverse=True)]


def card_photos(card):
    urls = []
    for image in card.find_all("img"):
        for attr in ("src", "data-src", "data-lazy", "data-original", "data-image"):
            value = image.get(attr)
            if value:
                urls.append(value)
        for attr in ("srcset", "data-srcset"):
            if image.get(attr):
                urls.extend(_srcset_urls(image[attr]))
    return clean_photos(urls)


def parse_page(html):
    soup = BeautifulSoup(html, "html.parser")
    output, seen = [], set()
    anchors = soup.select("h2 a[href]") or soup.find_all("a", href=True)
    for anchor in anchors:
        href = canonical_url(anchor["href"])
        lid = listing_id(href)
        if urlparse(href).hostname != HOST or not lid or lid in seen:
            continue
        title = " ".join(anchor.get_text(" ", strip=True).split())
        if not title:
            continue
        seen.add(lid)
        card = card_for(anchor)
        record = parse_card(card, anchor)
        record["photos"] = card_photos(card)
        output.append(record)
    return output


def parse_detail(html):
    soup = BeautifulSoup(html, "html.parser")
    jsonld = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            value = json.loads(script.string or script.get_text() or "")
        except (ValueError, TypeError):
            continue
        jsonld.append(value)
    meta = soup.find("meta", attrs={"name": "description"})
    urls = []
    for image in soup.find_all("img"):
        for attr in ("src", "data-src", "data-original", "data-lazy"):
            if image.get(attr):
                urls.append(image[attr])
        for attr in ("srcset", "data-srcset"):
            if image.get(attr):
                urls.extend(_srcset_urls(image[attr]))
    if meta and meta.get("content"):
        urls.extend(IMG_RE.findall(meta["content"]))
    urls.extend(IMG_RE.findall(html))
    og = soup.find("meta", property="og:image")
    if og and og.get("content"):
        urls.insert(0, og["content"])
    return {"photos": clean_photos(urls), "jsonld": jsonld,
            "description": meta.get("content") if meta else None}


class RobotsPolicy(RobotFileParser):
    """Handle wildcard rules missing from Python's default rule matcher.

    Conservative normalization also applies exclusions to percent-encoded paths.
    """
    def can_fetch(self, useragent, url):
        if self.disallow_all:
            return False
        if not self.last_checked:
            return False
        token = useragent.split('/')[0].lower()
        entries = []
        best = 0
        for entry in self.entries:
            score = max((len(a) for a in entry.useragents if a != '*' and a.lower() in token), default=0)
            if score > best:
                best, entries = score, [entry]
            elif score and score == best:
                entries.append(entry)
        if not entries and self.default_entry:
            entries = [self.default_entry]
        path = urlparse(url).path or '/'
        if urlparse(url).query:
            path += '?' + urlparse(url).query
        path = unquote(path)
        matches = []
        for entry in entries:
            for rule in entry.rulelines:
                pattern = unquote(rule.path)
                if not pattern:
                    continue
                terminal = pattern.endswith('$')
                body = pattern[:-1] if terminal else pattern
                regex = '^' + re.escape(body).replace(r'\*', '.*') + ('$' if terminal else '')
                if re.search(regex, path):
                    matches.append((len(body.replace('*', '')), rule.allowance))
        return max(matches)[1] if matches else True


class Http:
    def __init__(self, delay, user_agent, capture_dir=None):
        self.capture_dir = capture_dir
        self.delay = max(2.0, float(delay))
        self.user_agent = user_agent
        self.blocked = False
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent, "Accept-Language": "fr-FR,fr;q=0.9"})
        self.robots = RobotsPolicy()
        self.robots.set_url(BASE + "/robots.txt")
        self.robots_ready = False
        self.errors = []
        self.pages = []
        self._load_robots()

    def _load_robots(self):
        try:
            response = self.session.get(BASE + "/robots.txt", timeout=20, allow_redirects=False)
        except requests.RequestException as exc:
            raise RuntimeError(f"robots.txt inaccessible; crawl annulé par prudence: {exc}") from exc
        if response.status_code != 200:
            raise RuntimeError(f"robots.txt HTTP {response.status_code}; crawl annulé par prudence")
        self.robots.parse(response.text.splitlines())
        self.robots_ready = True
        self.delay = max(self.delay, self.robots.crawl_delay(self.user_agent) or 0)

    def allowed(self, url):
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname != HOST:
            return False
        return self.robots_ready and self.robots.can_fetch(self.user_agent, url)

    def get(self, url):
        if self.blocked:
            return None
        if not self.allowed(url):
            self.errors.append({"url": url, "reason": "robots_or_domain_denied"})
            print(f"[robots] URL non autorisée ou hors domaine: {url}", file=sys.stderr)
            return None
        time.sleep(random.uniform(self.delay, self.delay * 1.8))
        for attempt in range(3):
            try:
                response = self.session.get(url, timeout=30, allow_redirects=False)
            except requests.RequestException as exc:
                if attempt == 2:
                    self.errors.append({"url": url, "reason": "network_error", "error": str(exc)})
                    print(f"[erreur réseau] {url}: {exc}", file=sys.stderr)
                    return None
                time.sleep(3 * (2 ** attempt))
                continue
            if response.status_code == 200:
                if getattr(self, 'capture_dir', None):
                    dest = Path(self.capture_dir)
                    dest.mkdir(parents=True, exist_ok=True)
                    (dest / (hashlib.sha256(url.encode()).hexdigest() + '.html')).write_text(response.text, encoding='utf-8')
                return response.text
            if response.status_code in (403, 429):
                self.blocked = True
                self.errors.append({"url": url, "reason": "http_blocked", "status": response.status_code})
                print(f"[stop] HTTP {response.status_code} sur {url}; arrêt immédiat.", file=sys.stderr)
                return None
            if response.status_code == 404:
                self.errors.append({"url": url, "reason": "http_404"})
                print(f"[404] {url}", file=sys.stderr)
                return None
            print(f"[HTTP {response.status_code}] tentative {attempt + 1}/3: {url}", file=sys.stderr)
            if attempt == 2:
                self.errors.append({"url": url, "reason": "http_error", "status": response.status_code})
            if attempt < 2:
                time.sleep(3 * (2 ** attempt))
        return None


def db_open(path):
    db = sqlite3.connect(path)
    db.execute("PRAGMA journal_mode=WAL")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS seeds(
            url TEXT PRIMARY KEY, deal TEXT, next_page INTEGER DEFAULT 1,
            finished INTEGER DEFAULT 0, last_signature TEXT
        );
        CREATE TABLE IF NOT EXISTS listings(
            id TEXT PRIMARY KEY, url TEXT, deal TEXT, data TEXT, photos TEXT,
            detail TEXT, detail_done INTEGER DEFAULT 0, photos_done INTEGER DEFAULT 0
        );
    """)
    # Upgrade databases made by earlier versions.
    columns = {row[1] for row in db.execute("PRAGMA table_info(seeds)")}
    if "last_signature" not in columns:
        db.execute("ALTER TABLE seeds ADD COLUMN last_signature TEXT")
    db.commit()
    return db


def add_seeds(db, cities, deals):
    for city in cities:
        for deal in deals:
            db.execute("INSERT OR IGNORE INTO seeds(url,deal) VALUES(?,?)",
                       (f"{BASE}/fr/ct/{city}/immobilier-a-{deal}", deal))
    db.commit()


def discover_cities(http, db, deals):
    html = http.get(BASE + "/fr")
    if html is None:
        return
    cities = sorted(set(SEED_RE.findall(html)))
    print(f"[villes] {len(cities)} trouvées: {', '.join(cities[:20])}")
    add_seeds(db, cities, deals)


def discover_sitemaps(http, db, max_files=50):
    # robots.txt has already been checked and parsed.
    queue, seen, found = list(http.robots.site_maps() or []), set(), 0
    while queue and len(seen) < max_files and not http.blocked:
        url = queue.pop(0)
        if url in seen or url.endswith(".gz") or urlparse(url).hostname != HOST:
            continue
        seen.add(url)
        xml = http.get(url)
        if not xml:
            continue
        try:
            tree = ElementTree.fromstring(xml)
        except ElementTree.ParseError:
            http.errors.append({"url": url, "reason": "invalid_xml"})
            continue
        for loc in tree.iter():
            if loc.tag.split('}')[-1] != 'loc':
                continue
            target = (loc.text or '').strip()
            lid = listing_id(target)
            if lid and urlparse(target).hostname == HOST:
                found += db.execute("INSERT OR IGNORE INTO listings(id,url) VALUES(?,?)",
                                    (lid, target)).rowcount
            elif target.endswith(".xml") and urlparse(target).hostname == HOST:
                queue.append(target)
    db.commit()
    print(f"[sitemaps] {len(seen)} fichiers lus, {found} annonces ajoutées")


def run_list(http, db, max_pages, cities=None, deals=None):
    seeds = db.execute("SELECT url,deal,next_page,last_signature FROM seeds WHERE finished=0 ORDER BY url").fetchall()
    if cities is not None:
        selected = {f"{BASE}/fr/ct/{city}/immobilier-a-{deal}" for city in cities for deal in deals}
        seeds = [row for row in seeds if row[0] in selected]
    for seed_url, deal, page, last_signature in seeds:
        fetched = 0
        while fetched < max_pages:
            # Colon pagination is denied by the known robots policy. Never even
            # offer a :p:N URL to an injected/mock HTTP implementation.
            if page != 1:
                http.errors.append({"url": seed_url, "reason": "pagination_disallowed_by_policy", "next_page": page})
                break
            page_url = seed_url
            html = http.get(page_url)
            if html is None:
                if http.blocked:
                    return
                break
            records = parse_page(html)
            ids = [record["id"] for record in records]
            signature = hashlib.sha256("\n".join(sorted(ids)).encode()).hexdigest() if ids else ""
            if not records:
                print(f"{page_url}: 0 carte; arrêt à vérifier (sélecteur/page vide).", file=sys.stderr)
                http.errors.append({"url": page_url, "reason": "empty_parse_unverified"})
                break
            if signature == last_signature:
                print(f"{page_url}: contenu identique à la page précédente; arrêt anti-boucle.", file=sys.stderr)
                http.errors.append({"url": page_url, "reason": "repeated_page_unverified"})
                break
            http.pages.append({"url": page_url, "cards": len(records),
                               "photo_url_counts": [len(r["photos"]) for r in records],
                               "html_sha256": hashlib.sha256(html.encode()).hexdigest()})
            new_count = 0
            with db:
                for record in records:
                    photos = json.dumps(record.pop("photos"), ensure_ascii=False)
                    row = db.execute("SELECT data IS NULL FROM listings WHERE id=?", (record["id"],)).fetchone()
                    if row is None:
                        db.execute("INSERT INTO listings(id,url,deal,data,photos) VALUES(?,?,?,?,?)",
                                   (record["id"], record["url"], deal,
                                    json.dumps(record, ensure_ascii=False), photos))
                        new_count += 1
                    elif row[0]:
                        db.execute("UPDATE listings SET url=?,deal=?,data=?,photos=? WHERE id=?",
                                   (record["url"], deal, json.dumps(record, ensure_ascii=False), photos, record["id"]))
                db.execute("UPDATE seeds SET next_page=?,last_signature=? WHERE url=?",
                           (page + 1, signature, seed_url))
            fetched += 1
            print(f"{page_url}: {len(records)} cartes, {new_count} nouvelles", file=sys.stderr)
            last_signature, page = signature, page + 1


def run_details(http, db, limit):
    sql = "SELECT id,url,photos FROM listings WHERE detail_done=0 ORDER BY id"
    rows = db.execute(sql + (" LIMIT ?" if limit else ""), (limit,) if limit else ()).fetchall()
    for index, (lid, url, photos) in enumerate(rows, 1):
        html = http.get(url)
        if html is None:
            if http.blocked:
                return
            continue
        detail = parse_detail(html)
        merged = list(dict.fromkeys(detail.pop("photos") + json.loads(photos or "[]")))
        with db:
            db.execute("UPDATE listings SET photos=?,detail=?,detail_done=1 WHERE id=?",
                       (json.dumps(merged, ensure_ascii=False), json.dumps(detail, ensure_ascii=False), lid))
        if index % 20 == 0 or index == len(rows):
            print(f"details: {index}/{len(rows)}; dernière annonce {lid}, {len(merged)} photo(s)", file=sys.stderr)


def run_photos(db, out_dir, limit, workers=1):
    raise RuntimeError("Téléchargement d'images désactivé dans cette version: utilisez les URLs de l'export.")


def run_export(db, output):
    count = 0
    with open(output, "w", encoding="utf-8") as file:
        for lid, url, deal, data, photos, detail in db.execute(
                "SELECT id,url,deal,data,photos,detail FROM listings ORDER BY id"):
            record = json.loads(data) if data else {"source": "mubawab", "id": lid, "url": url}
            record["deal"] = deal
            record["photos"] = json.loads(photos or "[]")
            if detail:
                record["detail"] = json.loads(detail)
            file.write(json.dumps(record, ensure_ascii=False) + "\n")
            count += 1
    print(f"export: {count} annonces -> {output}")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Collecteur Mubawab reprenable, respectueux de robots.txt")
    parser.add_argument("--phase", default="list", help="list,details,photos,export (séparés par des virgules)")
    parser.add_argument("--db", default="mubawab.db")
    parser.add_argument("--cities", default=",".join(DEFAULT_CITIES))
    parser.add_argument("--deals", default="vendre", help="vendre,louer")
    parser.add_argument("--discover-cities", action="store_true")
    parser.add_argument("--sitemaps", action="store_true")
    parser.add_argument("--max-pages", type=int, default=1, help="1 uniquement : pagination :p:N interdite")
    parser.add_argument("--limit", type=int, default=10, help="nombre max. d'annonces en details (1 à 20)")
    parser.add_argument("--delay", type=float, default=3.0)
    parser.add_argument("--photos-dir", default="photos")
    parser.add_argument("--html-dir", help="Conserver le HTML brut pour audit local (optionnel)")
    parser.add_argument("--report", default="mubawab_report.json")
    parser.add_argument("--out", default="mubawab_full.jsonl")
    args = parser.parse_args(argv)
    if not (2 <= args.delay <= 3600):
        parser.error("--delay doit être >= 2 secondes")
    if args.max_pages != 1:
        parser.error("--max-pages=1 obligatoire : pas de pagination :p:N ou de crawl illimité")
    if not 1 <= args.limit <= 20:
        parser.error("--limit doit être compris entre 1 et 20")
    phases = {p.strip() for p in args.phase.split(",")}
    allowed_phases = {"list", "details", "photos", "export"}
    if not phases or phases - allowed_phases:
        parser.error(f"phases invalides: {', '.join(sorted(phases - allowed_phases))}")
    cities = [v.strip() for v in args.cities.split(',') if v.strip()]
    deals = [v.strip() for v in args.deals.split(',') if v.strip()]
    if not cities or any(not re.fullmatch(r'[a-z0-9-]+', c) for c in cities):
        parser.error('Villes: slugs minuscules séparés par des virgules')
    if not deals or set(deals) - {'vendre', 'louer'}:
        parser.error('Transactions autorisées: vendre,louer')
    db = db_open(args.db)
    failure = None
    http = None
    try:
        http = None
        if phases & {"list", "details"} or ("list" in phases and args.sitemaps):
            http = Http(args.delay, make_user_agent(), args.html_dir)
        if "list" in phases:
            if args.sitemaps:
                discover_sitemaps(http, db)
            add_seeds(db, [city.strip() for city in args.cities.split(",") if city.strip()],
                      [deal.strip() for deal in args.deals.split(",") if deal.strip()])
            if args.discover_cities:
                discover_cities(http, db, [deal.strip() for deal in args.deals.split(",") if deal.strip()])
            run_list(http, db, args.max_pages, None if args.discover_cities else cities, deals)
        if "details" in phases:
            run_details(http, db, args.limit)
        if "photos" in phases:
            run_photos(db, args.photos_dir, args.limit)
        if "export" in phases:
            run_export(db, args.out)
    except RuntimeError as exc:
        failure = str(exc)
        print(f"[stop] {exc}", file=sys.stderr)
    except KeyboardInterrupt:
        failure = 'interrupted'
        db.rollback()
        print("\n[interrompu] progression sauvegardée; relance la même commande pour reprendre.", file=sys.stderr)
        return 130
    finally:
        records = [(json.loads(d or '{}'), json.loads(p or '[]')) for d, p in db.execute('SELECT data,photos FROM listings')]
        report = {
            'timestamp_utc': datetime.now(timezone.utc).isoformat(),
            'db_listings_total': len(records),
            'with_photo_urls': sum(bool(p) for d,p in records),
            'photo_urls_total': sum(len(p) for d,p in records),
            'field_coverage': {k: sum(d.get(k) is not None for d,p in records) for k in ('price_dh','area_m2','city','district','rooms')},
            'pages_this_run': http.pages if http else [],
            'errors': http.errors if http else [],
            'failure': failure,
            'exhaustive': False,
            'note': 'URLs images uniquement; disponibilité, tailles et biens uniques non certifiés.'
        }
        Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        db.close()
    return 2 if failure or (http and http.errors) else 0


if __name__ == "__main__":
    raise SystemExit(main())
