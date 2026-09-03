#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from html.parser import HTMLParser
from dataclasses import dataclass, asdict

UA = "AkarFinder-L8-DiscoveryCard/1.0 (+https://akarfinder.ma)"
OUT = pathlib.Path("artifacts/morocco-web-l8-discovery-card-probe")
TIMEOUT = 20
MAX_BYTES = 3_000_000

TARGETS = {
    "avito": {
        "robots": "https://www.avito.ma/robots.txt",
        "url": "https://avito.ma/fr/rabat/agdal/immobilier/terrain",
        "delay_floor_ms": 3000,
    },
    "marocannonces": {
        "robots": "https://www.marocannonces.com/robots.txt",
        "url": "https://www.marocannonces.com/categorie/315/Vente-immobilier/Appartements.html",
        "delay_floor_ms": 3000,
    },
}

AVITO_ID = re.compile(r"_(\d{7,9})\.htm$", re.I)
MAROCANNONCES_ID = re.compile(r"/annonce/(\d+)/", re.I)


@dataclass
class Evidence:
    url: str
    status: int | None
    classification: str
    bytes: int


def fetch(url: str, accept: str) -> tuple[str | None, Evidence]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept, "Accept-Language": "fr-MA,fr;q=0.9"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ssl.create_default_context()) as r:
            body = r.read(MAX_BYTES + 1)
            status = int(getattr(r, "status", 200))
            if len(body) > MAX_BYTES:
                return None, Evidence(url, status, "oversize", len(body))
            text = body.decode("utf-8", errors="replace")
            if status == 403:
                return None, Evidence(url, status, "http_403", len(body))
            if status == 429:
                return None, Evidence(url, status, "http_429", len(body))
            if status >= 400:
                return None, Evidence(url, status, f"http_{status}", len(body))
            low = text.lower()
            if any(x in low for x in ("captcha", "cf-chl-", "verify you are human", "access denied")):
                return None, Evidence(url, status, "hard_block", len(body))
            return text, Evidence(url, status, "ok", len(body))
    except urllib.error.HTTPError as exc:
        return None, Evidence(url, int(exc.code), f"http_{exc.code}", 0)
    except Exception as exc:
        return None, Evidence(url, None, f"network:{type(exc).__name__}", 0)


def robots_policy(url: str):
    text, ev = fetch(url, "text/plain,*/*;q=0.5")
    if text is None or ev.status != 200:
        return None, ev
    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(url)
    rp.parse(text.splitlines())
    return rp, ev


def listing_id(source: str, href: str) -> str | None:
    try:
        u = urllib.parse.urlparse(href)
    except Exception:
        return None
    if source == "avito" and u.hostname in {"avito.ma", "www.avito.ma"}:
        m = AVITO_ID.search(u.path)
        return m.group(1) if m else None
    if source == "marocannonces" and u.hostname == "www.marocannonces.com":
        m = MAROCANNONCES_ID.search(u.path)
        return m.group(1) if m else None
    return None


class CardParser(HTMLParser):
    def __init__(self, source: str, base_url: str):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.base_url = base_url
        self.depth = 0
        self.active_depth: int | None = None
        self.active: dict | None = None
        self.cards: dict[str, dict] = {}

    def handle_starttag(self, tag, attrs):
        self.depth += 1
        values = {k.lower(): (v or "") for k, v in attrs}
        if tag.lower() == "a" and self.active is None and values.get("href"):
            href = urllib.parse.urljoin(self.base_url, values["href"])
            lid = listing_id(self.source, href)
            if lid:
                self.active_depth = self.depth
                self.active = {"id": lid, "url": href, "text": [], "image_alt": []}
        if self.active is not None and tag.lower() == "img" and values.get("alt"):
            self.active["image_alt"].append(values["alt"])

    def handle_data(self, data):
        if self.active is not None:
            clean = " ".join(data.split())
            if clean:
                self.active["text"].append(clean)

    def handle_endtag(self, tag):
        if self.active is not None and self.active_depth == self.depth:
            card = self.active
            text = " ".join(card["text"])
            alts = " | ".join(card["image_alt"])
            self.cards.setdefault(card["id"], {
                "id": card["id"],
                "url": card["url"],
                "anchorText": text[:700],
                "imageAlt": alts[:500],
            })
            self.active = None
            self.active_depth = None
        self.depth = max(0, self.depth - 1)


def main() -> int:
    report = {"zeroDbWrites": True, "sources": {}, "success": True}
    OUT.mkdir(parents=True, exist_ok=True)
    for source, cfg in TARGETS.items():
        rp, robots_ev = robots_policy(cfg["robots"])
        entry = {"robots": asdict(robots_ev), "target": cfg["url"]}
        report["sources"][source] = entry
        if rp is None:
            entry["decision"] = "robots_unavailable"
            report["success"] = False
            continue
        if not rp.can_fetch(UA, cfg["url"]):
            entry["decision"] = "robots_disallowed"
            report["success"] = False
            continue
        delay = rp.crawl_delay(UA)
        if delay is None:
            delay = rp.crawl_delay("*")
        delay_ms = max(cfg["delay_floor_ms"], int((delay or 0) * 1000))
        entry["delayMs"] = delay_ms
        time.sleep(delay_ms / 1000)
        html, page_ev = fetch(cfg["url"], "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5")
        entry["page"] = asdict(page_ev)
        if html is None:
            entry["decision"] = page_ev.classification
            report["success"] = False
            continue
        parser = CardParser(source, cfg["url"])
        parser.feed(html)
        cards = list(parser.cards.values())
        entry["listingCardCount"] = len(cards)
        entry["sampleCards"] = cards[:5]
        entry["decision"] = "cards_observed" if cards else "no_cards_observed"
        if not cards:
            report["success"] = False
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["success"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
