# ODM-09E — Production Certification

## Purpose

Certify that the production AkarFinder Search Gateway serves the ODM-09 public cursor contract and that the complete eligible Thin Index is traversable from the public search surface.

## Required evidence

- `/search` returns the production application successfully.
- `/api/search/gateway` exposes `total_count`, `has_more`, and opaque `next_cursor` values.
- Cursor traversal terminates without loops.
- At least 40,000 eligible representations are traversable.
- No legacy capped-index fallback is used.
- No duplicate canonical result keys are emitted across pages.
- Every traversed result has a canonical key and a usable HTTP URL.
- Latency and page-count evidence are retained as a CI artifact.

## Current status

Certification is pending a fresh production deployment containing merge commit `f44c8a91d4b1974baf33ecc6bdfed7b02431fb5c` (ODM-09D).

The first external production probe on 2026-07-26 found that the served Gateway response did not expose `has_more`, proving that the production deployment was still behind the canonical `main` branch at that moment.
