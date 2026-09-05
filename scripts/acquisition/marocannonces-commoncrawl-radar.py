#!/usr/bin/env python3
"""Read-only MarocAnnonces discovery through the official Common Crawl Parquet URL Index."""
from __future__ import annotations

import gzip
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import duckdb

COLLINFO = "https://index.commoncrawl.org/collinfo.json"
DATA_ROOT = "https://data.commoncrawl.org/"
UA = "AkarFinder-public-index/2.0 (+https://akarfinder.vercel.app)"
OUT = Path("artifacts/marocannonces-commoncrawl-radar")
OUT.mkdir(parents=True, exist_ok=True)
ID_RE = re.compile(r"^/annonce/(\d+)(?:/|$)", re.I)


def fetch_bytes(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def latest_collection() -> str:
    data = json.loads(fetch_bytes(COLLINFO).decode("utf-8", "replace"))
    for item in data:
        crawl_id = str(item.get("id", ""))
        if re.fullmatch(r"CC-MAIN-\d{4}-\d{2}", crawl_id):
            return crawl_id
    raise RuntimeError("no Common Crawl collection")


def parquet_files(crawl: str) -> tuple[str, list[str]]:
    manifest_url = f"{DATA_ROOT}crawl-data/{crawl}/cc-index-table.paths.gz"
    raw = fetch_bytes(manifest_url, 45)
    text = gzip.decompress(raw).decode("utf-8", "replace")
    paths = [line.strip() for line in text.splitlines() if line.strip() and "/subset=warc/" in line]
    if not paths:
        raise RuntimeError("no WARC parquet paths in Common Crawl manifest")
    return manifest_url, [DATA_ROOT + path.lstrip("/") for path in paths]


def main() -> None:
    crawl = latest_collection()
    manifest_url, files = parquet_files(crawl)

    con = duckdb.connect(database=":memory:")
    con.execute("INSTALL httpfs")
    con.execute("LOAD httpfs")
    con.execute("SET threads=2")
    file_list = "[" + ",".join("'" + f.replace("'", "''") + "'" for f in files) + "]"

    sql = f"""
      SELECT DISTINCT url
      FROM read_parquet({file_list}, hive_partitioning=true)
      WHERE lower(url_host_name) IN ('marocannonces.com','www.marocannonces.com')
        AND fetch_status = 200
        AND regexp_matches(lower(coalesce(url_path,'')), '^/annonce/[0-9]+(?:/|$)')
      ORDER BY url
    """
    rows = con.execute(sql).fetchall()

    records: dict[str, dict] = {}
    for (url,) in rows:
        path = __import__("urllib.parse", fromlist=["urlsplit"]).urlsplit(str(url)).path
        match = ID_RE.search(path)
        if not match:
            continue
        listing_id = match.group(1)
        records.setdefault(listing_id, {"id": listing_id, "url": str(url), "collection": crawl})

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Common Crawl Parquet URL Index",
        "target": "marocannonces.com",
        "collection": crawl,
        "manifest_url": manifest_url,
        "parquet_files": len(files),
        "rows_seen": len(rows),
        "unique_listing_ids": len(records),
        "zero_db_writes": True,
        "direct_marocannonces_requests": 0,
        "commoncrawl_http_requests_minimum": 2,
        "errors": [],
        "exhaustive_claim": False,
    }
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n")
    (OUT / "listing_ids.txt").write_text("\n".join(sorted(records)) + ("\n" if records else ""))
    (OUT / "records.jsonl").write_text("".join(json.dumps(v, ensure_ascii=False) + "\n" for _, v in sorted(records.items())))
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
