"""Re-fetch only recent rejected details after a source-parser improvement."""
import json
import sqlite3
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from pipeline import Client, ROOT, date, export, extract, sieve

def main():
    output = ROOT / "data" / "annonces-fraiches"
    db = sqlite3.connect(output / "checkpoint.sqlite")
    now = datetime.now(timezone.utc)
    current = json.loads((output / "rapport.json").read_text(encoding="utf-8"))
    stats = {"run_id": now.isoformat(), "sources": [], "discovered": 0, "fetched": 0, "errors": [], "channel": "recent-rejection-review"}
    groups = defaultdict(list)
    for url, raw in db.execute("SELECT url,payload FROM observations"):
        row = json.loads(raw)
        published = date(row.get("date_publication"))
        if published and now - timedelta(days=7) < published <= now and sieve(row, now):
            if url.startswith("https://www.marocimmo.com/"):
                groups["https://www.marocimmo.com"].append(url)
    before = current["accepted"]
    for origin, urls in groups.items():
        client = Client(origin)
        stats["sources"].append({"origin": origin, "candidates": len(urls)})
        for url in urls:
            stats["discovered"] += 1
            try:
                html = client.get(url)
                stats["fetched"] += 1
                row = {**extract(html, url), "http_status": 200, "verifie_le": datetime.now(timezone.utc).isoformat(), "run_id": stats["run_id"]}
                db.execute("INSERT OR REPLACE INTO observations VALUES (?, ?)", (url, json.dumps(row, ensure_ascii=False)))
                db.commit()
            except Exception as e:
                stats["errors"].append({"url": url, "error": str(e)[:200]})
                break
    report = export(db, output, datetime.now(timezone.utc), 200000, stats)
    report["accepted_before_review"] = before
    report["accepted_after_review"] = report["accepted"]
    report["net_gain"] = report["accepted"] - before
    from pipeline import atomic_json
    atomic_json(output / "rapport.json", report)
    print(json.dumps(report, ensure_ascii=True, indent=2), flush=True)
    db.close()

if __name__ == "__main__":
    main()
