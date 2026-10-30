# AkarFinder — Public Common Crawl Parquet URL index probe

**Objective:** efficiently locate Mubawab URL references in Common Crawl's official Parquet URL index **without** contacting Mubawab and without using historical AkarFinder listings as search seeds.

**How it differs from CDX:** Rather than broad `index.commoncrawl.org` wildcard endpoints returning 502/504, this probe downloads one ~200KB manifest for one crawl, binary-searches the **sorted global SURT key** via **Parquet footer metadata** and scans up to two confirmed shards. It will stop on missing min/max stats, unexpected layout, metadata budget or shard cap. This is a bounded experiment, not a blind full-index scan.

**Run:**

```bash
python -m pip install duckdb==1.4.1
python -m unittest -v test_parquet_index_probe.py
python parquet_index_probe.py \
  --crawl CC-MAIN-2026-43 --max-metadata 16 --max-shards 2 --max-rows 10000 \
  --out artifacts/mubawab-parquet-probe
```

**Outputs:** `parquet_urls.jsonl` (distinct IDs + direct URL references), `parquet_provenance.jsonl` (crawl, Parquet shard, archive timestamp), `report.json` (which shards and footers were examined, limits, and precise errors). The report always has `coverage_certified=false` and `live_availability_certified=false`.

**External evidence**: [Common Crawl URL Index](https://commoncrawl.org/url-index) and [DuckDB Parquet metadata](https://duckdb.org/docs/stable/data/parquet/metadata). Common Crawl uses Hive-partitioned Parquet over global URL keys. Older captures may be stale, duplicate or no longer available on Mubawab. Archived index URLs do not confer an image/content republication license.

**Next:** If the one-crawl probe returns a nonempty, integrity-checked artifact, import this JSONL *after* completion into the separate offline bulk SQLite importer. Then join its independent IDs with existing candidate indexes and, **after** that, compare with historical IDs. Keep private URL indexes and images outside public GitHub. Any expansion to additional crawls requires a fresh budget review.