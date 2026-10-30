# Kaynly sitemap link pilot — AkarFinder

Bounded public sitemap/landing discovery. Current robots file denies /resultats and /api/; neither is accessed. Max 60 pages, >=1.3s between requests; stop on 401/403/429. Only outbound original listing URLs from Mubawab, Avito, Sarouty, Yakeey, Noura; record provenance, no original detail pages, images, auth bypass, proxies or production writes.

Usage: python -m unittest -v test_collector.py ; python collector.py --out ./run --max-pages 60 --delay 1.3
Outputs: source_links.jsonl, provenance.jsonl, report.json. Historical stock never used to discover links. Unique source-platform IDs are not unique physical properties. Robots permission does not establish rights to republish listings or photos.
