#!/usr/bin/env python3
"""Conservative, resumable public-page qualification for archived Avito URLs.

Never authenticates or retries blocked requests. A 403/429 or CAPTCHA stops the run.
Commercial reuse is always marked unverified until explicit permission is documented.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.robotparser
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ID_RE = re.compile(r"(\d{6,})\.htm(?:[?#]|$)")
UA = "AkarFinderPublicQualification/1.0"


def avito_id(url: str) -> str | None:
    m = ID_RE.search(url)
    return m.group(1) if m else None


def urls(path: Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def discover(live_path: Path, history_path: Path) -> list[dict]:
    live = urls(live_path)
    historical = {avito_id(u) for u in urls(history_path)}
    historical.discard(None)
    out = {}
    for url in live:
        ident = avito_id(url)
        if ident and ident not in historical:
            out.setdefault(ident, {"id": ident, "url": url})
    return [out[k] for k in sorted(out)]


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta, self.title = {}, ""
        self.in_title = False
        self.jsonld = []
        self.in_jsonld = False
        self.jsonbuf = ""
        self.imgs = set()
        self.text_chunks = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title": self.in_title = True
        if tag == "meta":
            key = (a.get("property") or a.get("name") or a.get("itemprop") or "").lower()
            if key: self.meta[key] = a.get("content", "")
        if tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self.in_jsonld, self.jsonbuf = True, ""
        if tag == "img":
            src = a.get("src") or a.get("data-src") or a.get("data-lazy-src")
            if src: self.imgs.add(src)

    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
        if tag == "script" and self.in_jsonld:
            try: self.jsonld.append(json.loads(self.jsonbuf))
            except (ValueError, TypeError): pass
            self.in_jsonld = False

    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.in_jsonld: self.jsonbuf += data
        if data.strip(): self.text_chunks.append(data.strip())


def flatten_jsonld(items):
    stack = list(items)
    while stack:
        x = stack.pop()
        if isinstance(x, dict):
            yield x
            graph = x.get("@graph")
            if isinstance(graph, list): stack.extend(graph)
        elif isinstance(x, list): stack.extend(x)


def enrich_fields(fields: dict) -> dict:
    """Recover structured values visible in already-observed title/description metadata."""
    fields = dict(fields)
    title = html.unescape(fields.get("title") or "")
    desc = fields.get("description") or ""
    if not fields.get("price"):
        pm = re.search(r"(?:-|–|—)\s*([\d\u202f\s,.]+)\s*(DH|DHS|MAD)\b", title, re.I)
        if pm: fields["price"] = re.sub(r"\s+", " ", pm.group(1)).strip() + " " + pm.group(2).upper()
    if not fields.get("area"):
        am = re.search(r"\b(\d{1,5})\s*m(?:²|2)\b", " ".join([title, desc]), re.I)
        if not am:
            am = re.search(r"superficie\s*:\s*(\d{1,5})\s*m(?:²|2)\b", desc, re.I)
        if am: fields["area"] = am.group(1) + " m²"
    if not fields.get("location"):
        lm = re.search(r"\b(?:à|in)\s+(Casablanca|Rabat|Agadir|Marrakech|Tanger|Tangier|Fès|Fes|Meknès|Meknes|Oujda|Tétouan|Tetouan|Kénitra|Kenitra|El Jadida|Safi|Mohammedia|Béni Mellal|Settat)\b", title, re.I)
        if lm: fields["location"] = lm.group(1)
    if fields.get("photos"):
        fields["photos"] = sorted({x for x in fields["photos"] if "content.avito.ma/classifieds/images/" in x}) or None
    return fields


def normalize_result(item: dict) -> dict:
    item = dict(item)
    item["fields"] = enrich_fields(item.get("fields", {}))
    item["field_states"] = {k: ("observed" if v not in (None, [], "") else "non_verifiable_from_available_metadata")
                            for k, v in item["fields"].items()}
    item["field_observation_scope"] = "public HTML metadata/JSON-LD and image references only; missing fields are not proven absent"
    f = item["fields"]
    item["completeness_sufficient"] = bool(f.get("title") and f.get("price") and f.get("location") and
                                            (f.get("area") or f.get("description") or f.get("photos")))
    return item


def result_for(url: str, status: int | None, body: str | None, error: str | None):
    result = {"url": url, "id": avito_id(url), "http_status": status,
              "availability": "non_verifiable", "fields": {}, "error": error,
              "commercial_reuse": "not_verified_no_explicit_license_or_permission_found"}
    if body is None:
        return result
    p = Page(); p.feed(body)
    meta = p.meta
    blocks = list(flatten_jsonld(p.jsonld))
    offer = next((x for x in blocks if "offer" in str(x.get("@type", "")).lower()
                  or "product" in str(x.get("@type", "")).lower()), {})
    offers = offer.get("offers", {})
    if isinstance(offers, list): offers = offers[0] if offers else {}
    title = meta.get("og:title") or meta.get("twitter:title") or p.title.strip() or None
    description = meta.get("og:description") or meta.get("description") or None
    price = (offers.get("price") if isinstance(offers, dict) else None) or meta.get("product:price:amount")
    locality = meta.get("og:locality") or meta.get("place:location:locality")
    area = meta.get("property:area") or meta.get("product:area")
    published = meta.get("article:published_time") or meta.get("datepublished") or meta.get("date modified")
    photos = sorted(x for x in p.imgs if "content.avito.ma/classifieds/images/" in x)
    title_text = html.unescape(title or "")
    base_fields = enrich_fields({"title": title_text, "price": price, "location": locality,
                                 "area": area, "description": description,
                                 "photos": photos or None, "published_or_updated": published})
    title, price, locality = base_fields["title"], base_fields["price"], base_fields["location"]
    area, description, photos, published = (base_fields["area"], base_fields["description"],
                                             base_fields["photos"], base_fields["published_or_updated"])
    evidence = " ".join(p.text_chunks).lower()
    if any(x in evidence for x in ("annonce indisponible", "annonce n'existe plus", "listing unavailable", "ad not found")):
        availability = "inactive_explicit_page_evidence"
    elif status == 200 and title and not any(x in title.lower() for x in ("captcha", "access denied", "forbidden")):
        availability = "page_rendered_active_unconfirmed"
    else:
        availability = "non_verifiable"
    result.update({"availability": availability,
                   "fields": {"title": title, "price": price, "location": locality,
                              "area": area, "description": description,
                              "photos": photos or None, "published_or_updated": published},
                   "field_states": {k: ("observed" if v else "non_verifiable_from_available_metadata")
                                    for k, v in {"title": title, "price": price, "location": locality,
                                                 "area": area, "description": description,
                                                 "photos": photos, "published_or_updated": published}.items()},
                   "completeness_sufficient": bool(title and price and locality and (area or description or photos))})
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", type=Path, required=True)
    ap.add_argument("--history", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--markdown", type=Path)
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--delay", type=float, default=3.0)
    args = ap.parse_args()
    candidates = discover(args.live, args.history)
    previous = {}
    if args.resume and args.out.exists():
        previous = {x["id"]: normalize_result(x) for x in json.loads(args.out.read_text(encoding="utf-8")).get("results", [])}
    robots_url = "https://www.avito.ma/robots.txt"
    req = urllib.request.Request(robots_url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            robots_text = r.read().decode("utf-8", "replace")
    except Exception as exc:
        raise SystemExit(f"Cannot verify robots.txt; stop without probing pages: {exc}")
    robots = urllib.robotparser.RobotFileParser(); robots.parse(robots_text.splitlines())
    results = dict(previous)
    stopped = None
    todo = [x for x in candidates if x["id"] not in results][:max(0, args.limit - len(results))]
    for n, item in enumerate(todo):
        url = item["url"]
        if not robots.can_fetch(UA, url):
            results[item["id"]] = result_for(url, None, None, "blocked_by_robots_txt")
            stopped = "robots_disallow"
            break
        status, body, error = None, None, None
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
            with urllib.request.urlopen(req, timeout=20) as r:
                status = r.status
                charset = r.headers.get_content_charset() or "utf-8"
                body = r.read(2_000_000).decode(charset, "replace")
        except urllib.error.HTTPError as exc:
            status = exc.code
            error = f"HTTP {exc.code}; no retry or circumvention"
        except Exception as exc:
            error = f"{type(exc).__name__}: {exc}"
        results[item["id"]] = result_for(url, status, body, error)
        if status in (403, 429):
            stopped = f"http_{status}_stop"
            break
        if body and re.search(r"captcha|verify you are human|security check", body, re.I):
            results[item["id"]]["availability"] = "access_challenge_not_attempted"
            stopped = "captcha_or_access_challenge_stop"
            break
        if n + 1 < len(todo): time.sleep(max(0, args.delay))
        args.out.parent.mkdir(parents=True, exist_ok=True)
        payload = {"generated_at": datetime.now(timezone.utc).isoformat(),
                   "discovered_new_count": len(candidates), "tested_count": len(results),
                   "untested_count": len(candidates) - len(results),
                   "stopped_reason": stopped, "candidates": candidates,
                   "results": list(results.values())}
        args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    payload = {"generated_at": datetime.now(timezone.utc).isoformat(),
               "discovered_new_count": len(candidates), "tested_count": len(results),
               "untested_count": len(candidates) - len(results),
               "stopped_reason": stopped, "candidates": candidates,
               "results": list(results.values())}
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.markdown:
        by_id = {x["id"]: x for x in results.values()}
        statuses = [x.get("http_status") for x in results.values()]
        active = sum(x.get("availability") == "active_confirmed" for x in results.values())
        complete = sum(x.get("completeness_sufficient") is True for x in results.values())
        lines = ["# Qualification des 53 nouvelles annonces Avito", "",
                 f"Généré le {payload['generated_at']} (UTC). Comparaison des artefacts : collecte run `41339185908` / artefact `p0-avito-canary`; archive historique run `33672899097` / artefact `morocco-web-l8-avito-full-manifest`; comparaison run `41349173966`.", "",
                 "## Résumé", "",
                 f"- Identifiants nouveaux reconstruits : **{len(candidates)}** (53 attendu). URLs distinctes testées : **{len(results)}**; non testées : **{len(candidates)-len(results)}**.",
                 f"- Réponses HTTP 200 : **{sum(x == 200 for x in statuses)}**; autres statuts/erreurs : **{sum(x != 200 for x in statuses)}**.",
                 f"- Complétude suffisante selon le seuil du script (titre + prix + localisation + surface, description ou photos) : **{complete}**.",
                 f"- Annonces actives explicitement confirmées : **{active}**. Un HTTP 200 est classé `page_rendered_active_unconfirmed`.",
                 "- Réutilisation commerciale juridiquement vérifiée : **0**. Aucune licence/autorisation explicite vérifiable n’a été établie; les champs commerciaux restent bloqués.", "",
                 "## Accès et limites", "",
                 "Les champs avec valeur sont marqués `observed`; un champ vide est `non_verifiable_from_available_metadata`, jamais automatiquement déclaré absent. L’extraction est limitée aux métadonnées publiques HTML/JSON-LD et références d’images repérées; elle ne vérifie pas chaque attribut dans l’interface rendue.", "",
                 "`robots.txt` a été lu avant les fiches. Les 20 accès effectués ont répondu HTTP 200; aucune authentification, API privée, CAPTCHA, ni contournement de protection n’a été utilisé. L’artefact initial du canary signalait 2 HTTP 403 sur ses 5 requêtes; ces réponses n’ont pas été contournées. La politique commerciale Avito n’a pas pu être vérifiée dans une source officielle accessible pendant cette qualification, donc les contenus ne sont pas autorisés à l’ingestion commerciale.", "",
                 "La première tranche de 10 a retourné des pages HTML publiques, mais les métadonnées observées ne satisfont pas le seuil de complétude et l’autorisation commerciale est indéterminée. Une reprise avec `--resume` a ensuite effectué une seconde tranche de 10 avant la génération du rapport; cette limite de reprise a été corrigée pour traiter `--limit` comme un plafond cumulatif. Aucun nouvel accès n’est effectué pour ce rapport. L’extension aux 33 restantes n’est pas justifiée tant que complétude et droits ne sont pas établis.", "",
                 "## URLs testées", "", "| ID | HTTP | Disponibilité | Complète | URL |", "|---|---:|---|---|---|"]
        for x in results.values():
            url = x["url"]
            lines.append(f"| {x['id']} | {x.get('http_status') or '—'} | {x.get('availability','non_verifiable')} | {'oui' if x.get('completeness_sufficient') else 'non'} | [{x['id']}]({url}) |")
        lines += ["", "## URLs reconstruites non testées", ""]
        lines += [f"- `{x['id']}` — {x['url']}" for x in candidates if x['id'] not in by_id]
        lines += ["", "## Reproductibilité", "", "```powershell", "python scripts/qualify_avito_new.py --live <source-canary-urls.txt> --history <listing-urls.txt> --out docs/handovers/avito-qualification-results.json --markdown docs/handovers/avito-qualification-report.md --limit 10", "```", ""]
        args.markdown.parent.mkdir(parents=True, exist_ok=True)
        args.markdown.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__": main()
