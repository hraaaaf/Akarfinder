# Kaynly sitemap link pilot — AkarFinder

Bounded public sitemap/landing discovery. Current robots file denies /resultats and /api/; neither is accessed. Max 60 pages, >=1.3s between requests; stop on 401/403/429. Only outbound original listing URLs from Mubawab, Avito, Sarouty, Yakeey, Noura; record provenance, no original detail pages, images, auth bypass, proxies or production writes.

Usage: python -m unittest -v test_collector.py ; python collector.py --out ./run --max-pages 60 --delay 1.3
Outputs: source_links.jsonl, provenance.jsonl, report.json. Historical stock never used to discover links. Unique source-platform IDs are not unique physical properties. Robots permission does not establish rights to republish listings or photos.

## Balanced acquisition (new pages only)

`python collector.py --out ./balanced --max-pages 60 --delay 1.3 --selection balanced-new` selects new sitemap pages excluding the original sorted first 60, aiming for 30 sales and 30 rentals spread round-robin over city slugs. It interleaves sale and rental requests so a stop on HTTP denial does not concentrate one transaction type. If one class lacks 30 pages, it backfills from the other class and reports actual counts. The workflow fails unless both classes have at least 25 selected, no first-60 overlap, at least 40 successful pages, and a clean page-budget stop. Realtime active status and permission to republish remain unverified. The URLs/IDs are independent discoveries, never seeded with prior AkarFinder IDs.
