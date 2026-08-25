# OpenSERP Property Listings Batch Dedupe — Closeout

Status: **CLOSED / MERGED / RUNTIME CERTIFIED**

## Goal
Prevent accepted OpenSERP listings from being dropped when one writer batch contains multiple admitted results sharing the same `canonical_fingerprint`.

## Root cause
Production PostgreSQL logs repeatedly reported `ON CONFLICT DO UPDATE command cannot affect row a second time`.

`property_listings` enforces `UNIQUE (canonical_fingerprint)`. The national writer could admit the same canonical URL through multiple queries/engines and send duplicate conflict keys in one 25-row UPSERT. PostgreSQL rejected the statement, and the batch-level catch converted the failure into `write_conflicts`.

## Resolution
PR #911 was squash-merged to `main` as `274032ef7e04ca5000908f3941636c65eff928aa`.

The writer now collapses admitted candidates by `canonical_fingerprint` before property/listing-source batching. Last occurrence wins, matching the existing within-run discovery dedupe convention.

No schema migration. No RLS/policy change. No ranking/admission change. No Vercel deployment.

## Regression proof
- workflow run `32834491733` — SUCCESS;
- atomic discovery upsert regression — passed;
- property-listing batch dedupe regression — passed;
- TypeScript — passed.

The regression first reproduces PostgreSQL's same-row conflict, then proves the deduplicated payload succeeds.

## Runtime proof
Live Supabase state records a post-merge scheduled ingestion run: `openserp-github-cron-2026-08-25T20-02-23-835Z`.

At `2026-08-25 20:04:32.025+00` that run successfully touched:
- `property_listings`: 12 rows, all 12 updates;
- `listing_sources`: 12 rows, all 12 updates.

The last same-row conflict visible in the inspected PostgreSQL log sample is timestamped `2026-08-25T10:55:23.754Z`.

The certifying run began at `20:02:23Z`, wrote successfully at `20:04:32Z`, and the inspected PostgreSQL logs through `20:07:16Z` contain no recurrence of the same-row conflict.

## Success criterion
Met: a real post-merge scheduled OpenSERP write successfully updated property/listing-source rows without the duplicate-conflict-key failure during the certified runtime window.
