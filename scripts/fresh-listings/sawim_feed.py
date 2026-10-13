"""Use Sawim's documented public JSON feed, then verify each recent detail.

No private API, media request, proxy, or access bypass. See /llms.txt.
"""
import argparse
import json
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit

from pipeline import Client, ROOT, TYPES, VERSION, canonical, clean, date, export, extract, fold, identity, number

DOCS = "https://sawim.ma/llms.txt"
ORIGIN = "https://sawim.ma"

def normalize(item, feed_url):
    url = canonical(item.get("url", ""))
    match = re.fullmatch(r"/annonce/([A-Za-z0-9]+)/[^/]+", urlsplit(url).path)
    if urlsplit(url).netloc != "sawim.ma" or not match or match[1] != item.get("id"):
        raise ValueError("feed_identity_mismatch")
    proofs = {}
    row = {"url": url, "preuves": proofs, "parser_version": VERSION, "source_feed_url": feed_url}
    for key, field in [("city", "ville"), ("quartier", "quartier")]:
        if isinstance(item.get(key), str) and clean(item[key]):
            row[field] = clean(item[key])
            proofs[field] = "sawim:public-recherche.json:bound-id:" + key
    typ = TYPES.get(fold(item.get("property_type")).replace("-", " "))
    if typ:
        row["type"] = typ
        proofs["type"] = "sawim:public-recherche.json:bound-id:property_type"
    area = number(item.get("surface_m2"))
    if area:
        row["superficie"] = area
        proofs["superficie"] = "sawim:public-recherche.json:bound-id:surface_m2"
    amount = number(item.get("price"))
    currency = item.get("currency")
    if amount and currency in {"MAD", "EUR", "USD"}:
        row.update(prix=amount, devise=currency)
        proofs["prix"] = "sawim:public-recherche.json:bound-id:price:" + currency
    if isinstance(item.get("posted_at"), str):
        row["date_publication"] = item["posted_at"]
        proofs["date_publication"] = "sawim:public-recherche.json:bound-id:posted_at"
    transactions = {"ventes-immobilieres": "vente", "locations": "location", "location-vacances": "location_vacances"}
    if item.get("category") in transactions:
        row["transaction"] = transactions[item["category"]]
    periods = {"month": "mois", "night": "nuit"}
    if item.get("price_per") in periods:
        row["periode_prix"] = periods[item["price_per"]]
    elif item.get("category") == "ventes-immobilieres" and item.get("price_per") is None:
        row["periode_prix"] = "total"
    if re.search(r"a partir de|starting from", fold(item.get("title"))):
        row["erreur"] = "starting_price_not_exact"
    # Fields cover, image_count and seller/contact are deliberately discarded.
    return row

def merge_verified(feed_row, detail, now):
    row = {**feed_row, "preuves": dict(feed_row["preuves"])}
    for key in ("ville", "quartier", "superficie", "prix", "devise", "type", "date_publication", "erreur"):
        if detail.get(key) is not None:
            row[key] = detail[key]
            if key in detail.get("preuves", {}):
                row["preuves"][key] = detail["preuves"][key]
    if date(feed_row.get("date_publication")) != date(detail.get("date_publication")):
        row["erreur"] = "feed_detail_publication_mismatch"
    for field in ("ville", "quartier"):
        if feed_row.get(field) and detail.get(field) and fold(feed_row[field]) != fold(detail[field]):
            row["erreur"] = "feed_detail_" + field + "_mismatch"
    row.update(http_status=200, verifie_le=now.isoformat(), parser_version=VERSION)
    return row

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-pages", type=int, default=232)
    parser.add_argument("--target", type=int, default=200000)
    parser.add_argument("--output", type=Path, default=ROOT / "data" / "annonces-fraiches")
    args = parser.parse_args()
    if args.max_pages < 1 or args.target < 1:
        parser.error("positive limits required")
    args.output.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(args.output / "checkpoint.sqlite")
    db.execute("CREATE TABLE IF NOT EXISTS observations (url TEXT PRIMARY KEY, payload TEXT NOT NULL)")
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=7)
    stats = {"run_id": now.isoformat(), "sources": [], "discovered": 0, "fetched": 0, "errors": [], "feed_documentation": DOCS, "feed_pages_read": 0, "feed_rows_read": 0, "feed_total_advertised": None, "recent_candidates": 0, "older_feed_rows": 0, "complete": False}
    seen = set()
    last_posted = None
    monotonic = True
    def save(row):
        row["run_id"] = stats["run_id"]
        db.execute("INSERT OR REPLACE INTO observations VALUES (?, ?)", (row["url"], json.dumps(row, ensure_ascii=False)))
        db.commit()
    try:
        client = Client(ORIGIN)
        # The source explicitly documents this endpoint for agents and scripts.
        docs = client.get(DOCS)
        if "https://sawim.ma/recherche.json" not in docs:
            raise ValueError("public_feed_documentation_missing")
        for page in range(1, args.max_pages + 1):
            feed_url = ORIGIN + "/recherche.json?sort=recent&page=" + str(page)
            payload = json.loads(client.get(feed_url))
            if not isinstance(payload, dict) or not isinstance(payload.get("results"), list) or payload.get("page") != page:
                raise ValueError("unexpected_feed_shape_or_page")
            stats["feed_pages_read"] += 1
            stats["feed_total_advertised"] = payload.get("total")
            page_dates = []
            for item in payload["results"]:
                stats["feed_rows_read"] += 1
                try:
                    row = normalize(item, feed_url)
                except Exception as e:
                    stats["errors"].append({"feed_url": feed_url, "error": str(e)[:200]})
                    continue
                published = date(row.get("date_publication"))
                if published:
                    page_dates.append(published)
                    if last_posted and published > last_posted:
                        monotonic = False
                    last_posted = published
                if row["url"] in seen:
                    continue
                seen.add(row["url"])
                stats["discovered"] += 1
                if published and published <= cutoff:
                    stats["older_feed_rows"] += 1
                    row["http_status"] = None
                    save(row)
                    continue
                stats["recent_candidates"] += 1
                try:
                    html = client.get(row["url"])
                    stats["fetched"] += 1
                    row = merge_verified(row, extract(html, row["url"]), datetime.now(timezone.utc))
                except Exception as e:
                    row.update(http_status=None, erreur=str(e)[:200])
                    save(row)
                    raise
                save(row)
                if stats["fetched"] % 10 == 0:
                    report = export(db, args.output, datetime.now(timezone.utc), args.target, stats)
                    print(json.dumps({"feed_page": page, "details_verified": stats["fetched"], "accepted": report["accepted"]}), flush=True)
            report = export(db, args.output, datetime.now(timezone.utc), args.target, stats)
            print(json.dumps({"feed_page": page, "rows_read": stats["feed_rows_read"], "accepted": report["accepted"]}), flush=True)
            # Early stop relies on the documented sort=recent contract and
            # checked monotonic timestamps. No lastmod-based publication inference.
            if payload["results"] and len(page_dates) == len(payload["results"]) and monotonic and all(d <= cutoff for d in page_dates):
                stats.update(complete=True, tail_not_fetched_reason="documented_sort_recent_older_than_seven_day_cutoff")
                break
            if page >= int(payload.get("page_count", page)) or not payload["results"]:
                stats["complete"] = True
                break
    except Exception as e:
        stats["errors"].append({"origin": ORIGIN, "error": str(e)[:300]})
    stats["sources"] = [{"origin": ORIGIN, "discovered": stats["discovered"], "channel": "documented_public_json_feed"}]
    report = export(db, args.output, datetime.now(timezone.utc), args.target, stats)
    print(json.dumps(report, ensure_ascii=True, indent=2), flush=True)
    db.close()

if __name__ == "__main__":
    main()
