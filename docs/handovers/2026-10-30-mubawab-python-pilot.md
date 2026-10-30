# Handover — Mubawab Python pilot (2026-10-30)

## Goal and status

Goal: establish a small, restartable Python parser for public Mubawab listings, test it against one real Casablanca page, and hand off a bounded next step. The pilot is complete; nationwide coverage and production ingestion are not.

This is an exploratory companion to the existing acquisition code. The repository already contains `scripts/acquisition/mubawab-exhaustive-enumerator.mjs`, `scripts/acquisition/mubawab-marocannonces-public-adapter.mjs`, and `scripts/acquisition/mubawab-reconciliation-audit.mjs`. Review and reuse those paths before expanding this Python utility or starting a parallel crawler.

## Verified evidence

- Site page: `https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre`
- Captured 2026-10-30 10:30:20 UTC. One authorized page returned 31 distinct `/fr/a/` or `/fr/pa/` listing links; 31/31 had parsed price, area, city, district; 30/31 had a room count.
- Listing cards contained 432 photo URLs across 30 listings (median 11). URL presence does not verify image availability, original resolution, uniqueness, listing activity, or reuse rights.
- HTML SHA-256: `bae727bf6283f562926fe5b2697ff655cd5ee753233c04b3bb1a3f44ba98e6dd`.
- `robots.txt` returned HTTP 200 and the `*` group contains `Disallow: /*:`. The script's robots matcher denied the legacy `:p:2` URL before a request. No second page was fetched; pagination is unresolved.
- 12 local tests passed for parsing, restart state, repeated/empty pages, robots matching, HTTP 403 stop, sitemap XML, and export. The live HTML fixture is intentionally not committed.
- The source data export and raw HTML are not committed here. The CSV/JSONL and full evidence bundle are in the user's Library and the linked Notion handover.

## Files in this branch

- `scripts/acquisition/mubawab-python/mubawab_full.py` — one-file CLI and SQLite state.
- `scripts/acquisition/mubawab-python/test_mubawab.py` — offline unit checks.
- `scripts/acquisition/mubawab-python/requirements.txt` — pinned Python dependencies.
- This handover.

The image-download phase is explicitly disabled. Details/gallery parsing is not certified on real listing pages. No database write, merge, or deployment was performed.

## How to run checks

```sh
python -m pip install -r scripts/acquisition/mubawab-python/requirements.txt
cd scripts/acquisition/mubawab-python
python -m unittest -v test_mubawab.py
```

## Order of mission for the next agent

1. Read this handover and compare the Python path with the existing exhaustive enumerator and public adapter. Do not replace or duplicate their canonical flow without a short design note describing scope and provenance.
2. Re-read the current Mubawab `robots.txt`. The known colon pagination is disallowed. Do not request `:p:2`, encode it to bypass the rule, or infer support from the page-one success.
3. From an allowed base page, inspect only linked public shards/URLs permitted by robots, using the existing enumerator's request budget, provenance, stop handling, and output format. Start with a small dry-run and no database writes.
4. If that path adds value, compare parser output against the existing canonical listing schema and deduplicate by source ID/canonical URL. Preserve source URL, capture time, page provenance, and unknowns. Do not fetch images or telephone numbers.
5. Report counts by page, parse-field coverage, robots exclusions, errors, duplicates, and exact artifacts. Expand only after a successful bounded comparison.

Success for the next lot: a reproducible, robots-compliant small sample with independent counts and a documented decision to reuse, integrate, or retire the Python parser. Do not claim exhaustive Mubawab coverage.
