# AkarFinder / Mubawab — bulk URL inventory (offline)

## Why this exists

Manual pagination of 10 first city pages found only 322 listing URLs. This is not a scalable inventory strategy. The bulk input pipeline replaces page-at-a-time manual data entry with **streaming ingestion of pre-obtained public URL index files**, preserving source provenance and de-duplicating by listing ID/URL.

## Inputs and output

```bash
python bulk_url_inventory.py --input exported-urls.cdxj sitemap.xml.gz index.zip --out ./fresh-bulk-20261030
# Re-run with already seen SHA skipped and additional sources
python bulk_url_inventory.py --input exported-urls.cdxj new-url-index.jsonl --out ./fresh-bulk-20261030 --resume
```

Supported local formats: sitemap XML / XML.GZ, CDXJ or JSONL with `url` or `original`, plain URL text, and ZIPs of supported entries. External URL indexes (e.g. Common Crawl) can serve as candidates, not proof that a listing remains active. No HTTP requests or historical files are read automatically.

The outputs are `url_index.sqlite`, `discovered_listing_links.jsonl`, `discovery_provenance.jsonl`, `report.json`. The import stream is locally transactional, checks file SHA-256 on resume, de-duplicates IDs and URLs, preserves individual source→URL evidence; changed files fail closed and require a new run directory.

Follow with the separate existing `fresh_snapshot.py compare` only *after* collecting genuinely new input. The compare phase may use a known historical archive, but never treat old-only IDs as confirmed delisted. For record details or photos, obtain permitted, live page access separately; this tool never fetches them.

## Proof, 2026-10-30

- **5/5 local offline tests PASS**, including a **100,000 synthetic listing-URL XML.GZ sitemap**, 100,000/100,000 distinct IDs, no duplicates and idempotent replay. Entire test suite ran in 3.615 seconds in the local container. This demonstrates local URL-index throughput only; not Mubawab coverage or live network throughput.
- **0 HTTP requests**, 0 detail pages, 0 image files.
- Local DNS could not resolve `www.mubawab.ma`, `index.commoncrawl.org`, or GitHub; no live bulk source fetched from this container.
- The public Common Crawl URL Index is a possible **passive** high-scale input; its separate indexed URLs are not current-active listing evidence or a license to republish Mubawab content.

## What still blocks the global goal

Sourcing a genuinely comprehensive, current, usable URL inventory and securing legitimate access/reuse rights for all details and photos. A faster local index alone does not solve these conditions. Do not claim complete site scraping from a synthetic 100k test.