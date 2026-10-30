# AkarFinder — Common Crawl Parquet discovery safety review

## Verified result / why the former strategy was retired

GitHub run [41096782493](https://github.com/hraaaaf/Akarfinder/actions/runs/41096782493), artifact `12997031958`, fetched the real `CC-MAIN-2026-43` manifest with **300** Parquet files, inspected **8** footer ranges and produced **0 URL rows**. No HTTP or file-reading error occurred. However, the measured footer ranges were **not globally monotonic by SURT** in file-number order (for example shard 150 starts with `com,musica...`, shard 225 with `my,gov...`, shard 188 with `ch,foto...`). The previous **binary search was invalid**. Zero rows were therefore a *false negative*, not evidence of no archived Mubawab URLs.

The script's `pick_shards()` now **requires metadata for every shard** before selecting matching files. If a manifest exceeds the explicit footer budget, it raises `metadata budget exceeded: UNSORTED...` **before reading any Parquet shard**; it never claims absence of URLs based on partial metadata.

The associated CI is renamed **Parquet Safety Gate**. It performs offline unit tests plus a 300-shard fail-closed assertion; **it does not run a live Parquet scan** or promise data. A future Parquet strategy requires a verified domain→partition locator or a separately approved complete metadata pass.

## Current acquisition path

For the next independent URL inventory, use the *bounded Common Crawl CDX index*, already demonstrated with 616 actual archived URL IDs across two probes. The next separate workflow tests five new prefixes `81,80,79,78,77` against two monthly indexes, at no more than 500 rows per query and at least 1 second pause. It never requests Mubawab directly.

**Validation:** 10/10 offline unit tests for the Parquet safety code locally; GitHub CI status must be checked on the exact HEAD. Detailed source captures remain outside the public repository. No active listing status, site coverage, image access or content-reuse permission has been verified.