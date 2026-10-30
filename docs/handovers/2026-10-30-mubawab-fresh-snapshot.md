# AkarFinder — Mubawab fresh snapshot V0 / 2026-10-30

**Goal:** start independent fresh discovery with **zero historical seed**, then compare an actual fresh snapshot with already-held archives by stable ID/URL/photo, dedupe conservatively and retain provenance. The original goal of mirroring the entire Mubawab site including actual images is **not reached**.

## Scope and proof

- New Python implementation: `scripts/acquisition/mubawab-fresh/fresh_snapshot.py` is **not a fork** of old crawlers and has no baseline archive argument on `fresh`.
- `fresh`: uses fresh local SQLite queue, public site homepage as seed, obtains `robots.txt` before all site pages, 2+ second rate limit, stops on 403/429/unknown robots/network errors. Stores HTML by SHA-256, extracted listing records and URL image references. Bounded 1–100 discovery pages and 1–500 details by CLI. Does **not** bypass CAPTCHA/blockages or download image binaries. Each fresh run uses a new work directory; resume is explicit.
- `compare`: accepts a **separate** `.jsonl` / `.zip` / `.sqlite` historical baseline only after fresh snapshot exists. Hard-dedup by ID; preserves fresh-only, overlap, historical-only as three sets; changed fields; possible cross-ID photo matches/URL collisions are **review candidates**, not automatic physical merges.
- **Local tests 14/14 PASS** on synthetic fixtures, including no previous files as seeds, source-domain checks, robots-denied URLs, explicit 429 stop, HTML SHA preservation, photo references, historical SQLite, comparison with no network and ID collisions.
- **Real fresh attempt in this container failed before the first HTTP response:** DNS could not resolve `www.mubawab.ma` (requests `NameResolutionError`). `fresh_report.json`: `blocked`, `pages=0`, `details=0`, `photo_urls=0`, `coverage_certified=false`. No legitimate fresh-vs-history comparison has been executed.
- **Historical baseline** is separately stored in a private ZIP with 129 known saved listings and 530 photo URL references. It is **not** used as a fresh seed. Offline comparison algorithm was exercised with only synthetic fresh records (2 rows) vs that baseline: 1 overlapping ID, 1 new synthetic ID, 128 baseline-only IDs. This is a software dry-run, **not evidence of new listings or actual deletions**.

## Governance

- No new live listing retrieval, no photo downloads, no public data export to GitHub, no Supabase writes, no merge, no Vercel deployment.
- The current Mubawab terms restrict automated extraction and commercial database reuse; `robots.txt` permissions alone do not establish rights to republish content. Stop on server restrictions, no attempts to evade access controls.
- Old PR #1134 stays separate in DRAFT. This new fresh-snapshot PR uses an independent branch from `main`.

## Next exact

1. Verify GitHub CI tests for the new PR against the **exact** final HEAD.
2. Run `fresh` on a machine/network with normal DNS and permissible access; inspect `fresh_report.json`. If no successful detail extraction, don't run live comparison or make stock claims. If blocked by server policy or terms, document and stop.
3. If a real fresh JSONL is obtained, run `compare` with the private historical archive **afterwards**, validate ID overlaps, photo/URL review candidates, price changes and stale status without equating historical-only to deleted.
4. Human review/merge gate. No production deployment without explicit approval.

**Canonical file:** `docs/handovers/2026-10-30-mubawab-fresh-snapshot.md`. Completion % not estimated.