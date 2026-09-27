# SUPERSEDED — no database staging before verification

User decision 2026-09-27: all remaining rows must be verified before any DB transfer. The prior raw_listings staging plan is cancelled. No 213,992-row DB staging is authorized.

# AkarFinder — V4.11 bulk transfer prep — 2026-09-27

## Goal

Prepare a durable, idempotent transfer of the remaining V4.11 scope-eligible corpus to the isolated Neon recovery branch without pretending that all rows are product-ready.

## Certified inputs

- Clean Corpus V4.11 rows: 226,286
- Product-scope eligible: 222,359
- G6-safe rows already promoted to product tables: 8,367
- Remaining scope-eligible rows to stage: 213,992
- Core artifact: 10910779576
- Core gzip SHA256: e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953
- Imported G6 artifact: 10918695596
- Imported G6 safe JSONL SHA256: 18b810d3eb07e0fb293cc815d6f4c5506126fa1ed3926b6f4fc14abbd67fb695

## Why staging, not direct product import

Of the remaining 213,992 rows:
- 211,913 have no deep fetch yet.
- 1,948 have only HTTP503 deep evidence.
- 53 have only status-0 deep evidence.
- 78 have direct HTTP200 evidence.
- 213,914 have no enriched fields in the V4.11 core.
- 45 have 4–7 enriched fields.
- 33 have 8–10 enriched fields.

Therefore a direct 213,992-row insert into `property_listings` would overstate product readiness.

## Neon target

Isolated recovery target only:
- project: ancient-violet-43534870
- branch: br-cold-mouse-b2a50yaa
- database: AkarFinder

Existing state before bulk staging:
- scrape_runs: 0
- raw_listings: 0
- property_listings: 8,544
- listing_sources: 8,544

Bulk staging target:
- scrape_runs: 1
- raw_listings: 213,992
- property_listings: unchanged at 8,544
- listing_sources: unchanged at 8,544

Production Neon writes: 0.
Vercel deployment: 0.

## Storage model

Use the existing recovery tables:
- `scrape_runs`: one durable staging-run record keyed by the bulk payload digest.
- `raw_listings`: one row per remaining canonical URL, with the complete V4.11 row stored in `raw_json`.

No new table is required.

Each `raw_json` preserves:
- canonical URL
- source domain
- classification
- scope state
- deep HTTP evidence
- enrichment fields when present
- contradiction flags
- certified core artifact/SHA provenance
- staging state = `eligible_not_promoted`
- `approved_for_import=false`

## Certified bulk staging artifact

- Builder run: 36305022738 — SUCCESS
- Artifact ID: 10925954921
- Artifact digest: sha256:f00ea20f396805d747f4247bfe0197077bc71e13707b34ebb8c88c5296a3f2c2
- Payload digest: sha256:2ad86337d919b5c013a77bc5bd555af5dd9c899b470c4caf027e6a28d5f865d8
- Independent post-download verification: 213,992 rows / 22 chunks / every chunk SHA matched / payload digest matched.

## Pack format

- 22 CSV chunks
- max 10,000 rows per chunk
- final chunk: 3,992 rows
- SHA256 per chunk
- aggregate payload digest derived from ordered chunk SHAs
- artifact builder must independently recalculate every chunk SHA and physical row count before upload.

## Import behavior

The controlled staging workflow:
1. requires a separate explicit approval JSON;
2. hard-pins the isolated Neon endpoint;
3. downloads one explicitly approved artifact;
4. verifies all chunk SHAs and total row count;
5. creates/reuses one `scrape_runs` record;
6. loads chunks idempotently into `raw_listings`;
7. checks exactly 213,992 staged rows;
8. checks `property_listings` and `listing_sources` remain unchanged;
9. marks the staging run complete.

A partial chunk failure is restart-safe because `raw_listings` is unique on `(scrape_run_id, listing_url)`.

## Safety boundary

Staging is not product approval.

Promotion from `raw_listings` to `property_listings` requires separate cohort-level evidence, mapping, identity, freshness, and human approval.

## Next exact

Build and execute a pre-DB verification campaign. Only rows that pass the verification gate may later be considered for DB import. No raw_listings staging step is allowed before verification.
