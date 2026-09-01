#!/usr/bin/env python3
"""Resilient bounded certification runner for the Common Crawl columnar URL Index.

The base discovery/extraction logic remains in commoncrawl_url_index_domain_discovery.py.
This runner changes only the index-query execution strategy: the 300 Parquet files
are processed in bounded batches so a transient 5xx/partial-transfer failure cannot
invalidate the entire public-index scan. HTTP 429 remains a hard stop.
"""

from __future__ import annotations

import re
import sys
from collections import defaultdict

import commoncrawl_url_index_domain_discovery as base

BATCH_SIZE = 25
MIN_SUCCESSFUL_BATCHES = 8
HTTP_RETRIES = 5


def classify_index_error(exc: Exception) -> str:
    text = str(exc)
    if re.search(r"HTTP\s+(?:Error:\s*)?429\b|429\s+Too\s+Many", text, re.I):
        return "http_429"
    match = re.search(r"HTTP(?:\s+Error:)?\s*(\d{3})", text, re.I)
    if match:
        return f"http_{match.group(1)}"
    if "partial file" in text.lower() or "partial transfer" in text.lower():
        return "partial_transfer"
    return f"query_error:{type(exc).__name__}"


def merge_batch_rows(accumulator: dict[str, dict], rows: list[dict]) -> None:
    for row in rows:
        host = str(row.get("host") or "").lower()
        if not host:
            continue
        current = accumulator.setdefault(host, {"host": host, "url_count": 0, "seed_urls": set()})
        current["url_count"] += int(row.get("url_count") or 0)
        current["seed_urls"].update(str(url) for url in (row.get("seed_urls") or []) if url)


def materialize_rows(accumulator: dict[str, dict]) -> list[dict]:
    rows = []
    for item in accumulator.values():
        rows.append({
            "host": item["host"],
            "url_count": item["url_count"],
            "seed_urls": sorted(item["seed_urls"])[: base.SEEDS_PER_DOMAIN],
        })
    rows.sort(key=lambda item: (-item["url_count"], item["host"]))
    return rows[:200]


def query_url_index_resilient(crawl: str) -> tuple[list[dict], dict]:
    try:
        import duckdb  # type: ignore
    except ImportError as exc:
        raise RuntimeError("duckdb_not_installed") from exc

    files = base._manifest_urls(crawl)
    batches = [files[i : i + BATCH_SIZE] for i in range(0, len(files), BATCH_SIZE)]
    con = duckdb.connect(database=":memory:")
    con.execute("INSTALL httpfs")
    con.execute("LOAD httpfs")
    con.execute("SET threads=2")
    con.execute(f"SET http_retries={HTTP_RETRIES}")
    con.execute("SET http_retry_wait_ms=100")
    con.execute("SET http_retry_backoff=2")

    known = ",".join("'" + item.replace("'", "''") + "'" for item in sorted(base.KNOWN_HOSTS))
    property_regex = r"(^|[/_.-])(immo|immobilier|immobiliere|appart|appartement|studio|villa|terrain|maison|riad|residence)([/_.-]|$)"
    host_regex = r"(immo|immobilier|property|realestate)"

    aggregate: dict[str, dict] = {}
    failures: list[dict] = []
    successful_batches = 0
    successful_files = 0

    for batch_index, batch in enumerate(batches):
        file_list = "[" + ",".join("'" + item.replace("'", "''") + "'" for item in batch) + "]"
        sql = f"""
            SELECT
                lower(url_host_name) AS host,
                count(*) AS url_count,
                list_slice(list(DISTINCT url ORDER BY url), 1, {base.SEEDS_PER_DOMAIN}) AS seed_urls
            FROM read_parquet({file_list}, hive_partitioning=true)
            WHERE url_host_tld = 'ma'
              AND fetch_status = 200
              AND lower(coalesce(content_mime_type, '')) LIKE 'text/html%'
              AND lower(url_host_name) NOT IN ({known})
              AND (
                regexp_matches(lower(url_host_name), '{host_regex}')
                OR regexp_matches(lower(coalesce(url_path, '')), '{property_regex}')
              )
            GROUP BY 1
            HAVING count(*) >= 1
            ORDER BY url_count DESC, host ASC
            LIMIT 200
        """
        try:
            cursor = con.execute(sql)
            columns = [item[0] for item in cursor.description]
            rows = [dict(zip(columns, values)) for values in cursor.fetchall()]
        except Exception as exc:
            classification = classify_index_error(exc)
            if classification == "http_429":
                raise RuntimeError("http_429") from exc
            failures.append({
                "batch": batch_index,
                "fileCount": len(batch),
                "classification": classification,
            })
            continue

        successful_batches += 1
        successful_files += len(batch)
        merge_batch_rows(aggregate, rows)

    if successful_batches < MIN_SUCCESSFUL_BATCHES:
        raise RuntimeError(f"insufficient_index_batches:{successful_batches}/{len(batches)}")

    rows = materialize_rows(aggregate)
    evidence = {
        "manifestUrl": f"{base.DATA_ROOT}crawl-data/{crawl}/cc-index-table.paths.gz",
        "parquetFileCount": len(files),
        "batchSize": BATCH_SIZE,
        "batchCount": len(batches),
        "successfulBatchCount": successful_batches,
        "failedBatchCount": len(failures),
        "successfulParquetFileCount": successful_files,
        "failedBatches": failures,
        "rawDomainCount": len(rows),
        "queryEngine": "duckdb-httpfs",
        "queryMode": "columnar-url-index-bounded-batches",
        "httpRetriesPerRequest": HTTP_RETRIES,
    }
    return rows, evidence


def main() -> int:
    base.query_url_index = query_url_index_resilient
    return base.run()


if __name__ == "__main__":
    raise SystemExit(main())
