"""Collect the newest public SoukImmobilier properties from its declared sitemap."""
import argparse
import json
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from xml.etree import ElementTree as ET

from pipeline import Client, ROOT, VERSION, canonical, date, export, extract, sieve

ORIGIN = "https://www.soukimmobilier.com"
SITEMAP = ORIGIN + "/sitemaps/properties.xml"
DETAIL = re.compile(r"^/(?:fr|ar)/[^/]+/[^/]+/(\d+)$")


def normalize_url(url):
    parts = urlsplit(canonical(url))
    if parts.hostname not in {"soukimmobilier.com", "www.soukimmobilier.com"}:
        raise ValueError("cross_origin_sitemap_url")
    return urlunsplit(("https", "www.soukimmobilier.com", parts.path, "", ""))


def sitemap_rows(xml):
    root = ET.fromstring(xml)
    namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    rows = []
    for node in root.findall("s:url", namespace):
        raw = node.findtext("s:loc", namespaces=namespace)
        if not raw:
            continue
        url = normalize_url(raw)
        match = DETAIL.fullmatch(urlsplit(url).path)
        if match:
            rows.append((int(match[1]), url, node.findtext("s:lastmod", namespaces=namespace)))
    return sorted(rows, reverse=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "data" / "annonces-fraiches")
    parser.add_argument("--max-details", type=int, default=500)
    parser.add_argument("--target", type=int, default=200_000)
    parser.add_argument("--only-unseen", action="store_true", help="Skip every URL already present in the checkpoint")
    args = parser.parse_args()
    if args.max_details < 1:
        parser.error("positive detail limit required")
    args.output.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(args.output / "checkpoint.sqlite")
    db.execute("CREATE TABLE IF NOT EXISTS observations (url TEXT PRIMARY KEY, payload TEXT NOT NULL)")
    client = Client(ORIGIN)
    candidates = sitemap_rows(client.get(SITEMAP, max_bytes=52_428_800))
    now = datetime.now(timezone.utc)
    stats = {
        "run_id": now.isoformat(),
        "sources": [{"origin": ORIGIN, "channel": "robots-declared-public-properties-sitemap"}],
        "discovered": len(candidates), "fetched": 0, "errors": [], "parser_version": VERSION,
        "sitemap": SITEMAP, "photos_downloaded": 0,
    }
    selected = 0
    for _, url, _ in candidates:
        if selected >= args.max_details:
            break
        previous = db.execute("SELECT payload FROM observations WHERE url=?", (url,)).fetchone()
        if previous:
            if args.only_unseen:
                continue
            row = json.loads(previous[0])
            verified = date(row.get("verifie_le"))
            if verified and verified >= now - timedelta(hours=24) and not sieve(row, now):
                continue
        selected += 1
        try:
            row = extract(client.get(url), url)
            row.update(http_status=200, verifie_le=datetime.now(timezone.utc).isoformat(), run_id=stats["run_id"])
            stats["fetched"] += 1
            db.execute("INSERT OR REPLACE INTO observations VALUES (?,?)", (url, json.dumps(row, ensure_ascii=False)))
            db.commit()
        except Exception as error:
            stats["errors"].append({"url": url, "error": str(error)[:200]})
            if any(token in str(error).lower() for token in ("403", "429", "robots_disallowed", "access_challenge", "captcha")):
                break
        if selected % 25 == 0:
            print(json.dumps({"details_processed": selected, "accepted": export(db, args.output, datetime.now(timezone.utc), args.target, stats)["accepted"]}), flush=True)
    stats["details_processed"] = selected
    print(json.dumps(export(db, args.output, datetime.now(timezone.utc), args.target, stats), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

