"""Re-fetch only recent rejected details after a source-parser improvement."""
import argparse
import json
import sqlite3
from collections import defaultdict, Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit, unquote
from pipeline import Client, ROOT, VERSION, date, explicit_quartier, export, extract, sieve, title_district

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin', default='https://1immo.ma')
    parser.add_argument('--max-details', type=int, default=40)
    args = parser.parse_args()
    if args.max_details < 1:
        parser.error('positive max-details required')
    output = ROOT / "data" / "annonces-fraiches"
    db = sqlite3.connect(output / "checkpoint.sqlite")
    now = datetime.now(timezone.utc)
    stats = {"run_id": now.isoformat(), "sources": [], "discovered": 0, "fetched": 0, "errors": [], "channel": "recent-rejection-review"}
    groups = defaultdict(list)
    priority = {}
    for url, raw in db.execute("SELECT url,payload FROM observations ORDER BY json_extract(payload, '$.parser_version') = ?, url", (VERSION,)):
        row = json.loads(raw)
        published = date(row.get("date_publication"))
        if (not published or now - timedelta(days=30) < published <= now) and sieve(row, now):
            if urlsplit(url).netloc == urlsplit(args.origin).netloc:
                groups[args.origin].append(url)
                # URL words only prioritize inspection; they never become field evidence.
                candidate = title_district(unquote(urlsplit(url).path).replace('-', ' '), row.get('ville'))
                priority[url] = (0 if candidate and not row.get('quartier') else 1, row.get('parser_version') == VERSION)
    recovered_fields = Counter()
    recovered_urls = []
    before = export(db, output, now, 200000, stats)["accepted"]
    # Stored headings are already bound to their canonical listing. Reapply safe
    # title rules immediately after a dictionary/parser correction, without I/O.
    for urls in groups.values():
        for url in urls:
            row = json.loads(db.execute("SELECT payload FROM observations WHERE url=?", (url,)).fetchone()[0])
            if row.get("quartier") or not row.get("source_title"):
                continue
            district = explicit_quartier(row["source_title"]) or title_district(row["source_title"], row.get("ville"))
            if not district:
                continue
            was_rejected = bool(sieve(row, now))
            row["quartier"] = district
            row.setdefault("preuves", {})["quartier"] = "stored-bound-title:explicit-or-reviewed-dictionary"
            row["parser_version"] = VERSION
            recovered_fields["quartier"] += 1
            if was_rejected and not sieve(row, now):
                recovered_urls.append(url)
            db.execute("INSERT OR REPLACE INTO observations VALUES (?, ?)", (url, json.dumps(row, ensure_ascii=False)))
        db.commit()
    for origin, urls in groups.items():
        client = Client(origin)
        stats["sources"].append({"origin": origin, "candidates": len(urls)})
        for url in sorted(urls, key=lambda url: priority[url])[:args.max_details]:
            stats["discovered"] += 1
            try:
                previous = json.loads(db.execute("SELECT payload FROM observations WHERE url=?", (url,)).fetchone()[0])
                if not sieve(previous, datetime.now(timezone.utc)):
                    continue
                html = client.get(url)
                stats["fetched"] += 1
                row = {**extract(html, url), "http_status": 200, "verifie_le": datetime.now(timezone.utc).isoformat(), "run_id": stats["run_id"]}
                for field in ('ville', 'quartier', 'superficie', 'prix', 'type', 'date_publication'):
                    if not previous.get(field) and row.get(field):
                        recovered_fields[field] += 1
                if sieve(previous, now) and not sieve(row, datetime.now(timezone.utc)):
                    recovered_urls.append(url)
                db.execute("INSERT OR REPLACE INTO observations VALUES (?, ?)", (url, json.dumps(row, ensure_ascii=False)))
                db.commit()
            except Exception as e:
                stats["errors"].append({"url": url, "error": str(e)[:200]})
                error = str(e).lower()
                if any(token in error for token in ('403', '429', 'robots_disallowed', 'access_challenge', 'captcha')):
                    break
                continue
    report = export(db, output, datetime.now(timezone.utc), 200000, stats)
    report["recovered_fields"] = dict(recovered_fields)
    report["recovered_urls"] = recovered_urls
    report["accepted_before_review"] = before
    report["accepted_after_review"] = report["accepted"]
    report["net_gain"] = report["accepted"] - before
    from pipeline import atomic_json
    atomic_json(output / "rapport.json", report)
    with (output / "review-history.jsonl").open("a", encoding="utf-8") as history:
        history.write(json.dumps(report, ensure_ascii=False) + "\n")
    print(json.dumps(report, ensure_ascii=True, indent=2), flush=True)
    db.close()

if __name__ == "__main__":
    main()

