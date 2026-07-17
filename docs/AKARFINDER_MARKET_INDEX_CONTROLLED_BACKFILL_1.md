# AkarFinder — Market Index Controlled Backfill 1

**Mission:** AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1
**Status:** `MARKET_INDEX_BACKFILL_COMPLETED_READ_OFF`
**Date:** 2026-07-17

## Objective

Initialize the Market Index foundation (activated schema-only, empty, in
`AKARFINDER-MARKET-INDEX-FOUNDATION-PROD-ACTIVATION-3`) from existing legacy
`property_listings`/`listing_sources` data — conservatively, additively, with
zero invented facts and zero automatic clustering of ambiguous data.

## Eligibility rules (the core safety property)

A `listing_sources` row is enriched, and its parent `property_listings` row
gets a `legacy_one_to_one_projection` cluster + membership, if and only if:

1. The parent has exactly one attached `listing_sources` row (not part of an
   ambiguous multi-source group).
2. The parent's `field_confidence` JSON contains an **explicit**
   `provider === "openserp"` or `acquisition_provider === "openserp"` marker
   — the only provenance signal this backfill trusts.
3. The row has a non-empty `listing_url` or `source_url`.

Measured against Production: **177 of 321** rows qualified. The other **144**
(135 single-source without the explicit signal + 9 across the 4 known
ambiguous multi-source groups) are untouched in every one of the 9 whitelisted
columns — not just `origin_type`.

`duplicate_group_id` is never read: `computeBackfillPlan()`'s input type
carries no such field. `source_name`/domain is never used to infer
provenance — empirically proven unreliable (`mubawab` appears identically
across all three provenance buckets: explicit OpenSERP, null
`field_confidence`, and the older data-completeness-rating schema). Full
justification: `docs/MARKET_INDEX_CONTROLLED_BACKFILL_COLUMN_MAPPING.md`.

## Deterministic IDs

`cluster_id = UUIDv5(RFC4122_DNS_namespace, "market-index-legacy-cluster-v1:" + property_listing_id)`
`membership_id = UUIDv5(RFC4122_DNS_namespace, "market-index-legacy-membership-v1:" + listing_source_id)`

Verified against the standard RFC 4122 test vector before use. Same input
always reproduces the same IDs — the same run, re-executed, is a true no-op
(`INSERT ... ON CONFLICT DO NOTHING` + `UPDATE ... WHERE <all 9 columns NULL>`).

## Gates

- **Gate A (PGlite):** 12 synthetic property_listings / 13 listing_sources
  covering every required case (single valid source, ambiguous multi-source,
  missing provenance, invalid URL, non-explicit partner-like marker, fake
  shared `duplicate_group_id`, null price, rent transaction, near-identical
  text across 2 distinct listings). apply → 8 eligible clusters created →
  second apply (0-diff, idempotent) → rollback (state restored) → clean
  reapply (succeeds). All PASS.
- **Gate B (real PostgreSQL 18.2 + Supabase-equivalent role model):** same
  fixtures, same generated SQL, against a genuine `anon`/`authenticated`/
  `service_role` role model. `anon`/`authenticated` SELECT return 0 rows, no
  error; `anon` INSERT explicitly rejected by RLS; `service_role` (BYPASSRLS)
  succeeds. Same apply → verify → second-apply-idempotent → rollback →
  clean-reapply sequence, all PASS.

Original design flaw found and fixed during Gate A: the first draft of the
apply SQL had a blanket "the 4 new tables must be completely empty"
precondition, which made the second (idempotent) apply always fail — a
legitimate rerun of the same script would find its own first run's rows and
hard-abort. Fixed by removing that blanket check and relying entirely on the
row-level idempotency guards (`ON CONFLICT DO NOTHING`, NULL-guarded
`UPDATE ... WHERE`), which are correct and sufficient on their own.

## Application mechanism

No direct Postgres connection string is available in this environment (only
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, PostgREST-level access). Per
the mission's own rule, the agent did not choose an application mechanism
unilaterally: a closed question was presented to the project owner (with the
exact SQL SHA-256), who confirmed running the generated `apply.sql` manually
via the Supabase Dashboard SQL Editor. The agent never handled a database
credential.

## Result

- `run_id`: `market-index-controlled-backfill-1`
- `plan_sha256`: `96289d98fc852d49cdaf9131aa22ce7822c3e6e7fb64def6a290102e499ba1b9`
  (stable pre- and post-freeze, and identical between the dry-run and
  generate-sql modes)
- `apply_sql_sha256`: `d7c88f773015df895bd7ba988a46003466e96845aac9f908bbbc935841b3df8c`
- Production, verified read-only afterward: 177 `property_clusters`, 177
  `property_cluster_members` (every cluster has exactly 1 membership), 0
  `discovery_candidates`, 0 `source_offer_observations`, `property_listings`
  unchanged (316), `listing_sources` unchanged (321), the 4 known ambiguous
  groups (`property_listing_id` 134/129/315/44) confirmed never clustered.
- Live app: 14/14 required routes correct, 0 rendered fake zero-prices, 0
  Market Index exposure anywhere in the rendered page, 0 console/hydration
  errors. No deployment was performed or needed.
- All 4 `MARKET_INDEX_*` flags confirmed absent/false, before and after.

## Rollback

Prepared (`data/audits/market-index-controlled-backfill-rollback.sql`,
SHA-256 `a2c8d3bad8e64d07b072ca5b969c76afac330cab8a54764e563a65e6c4c9e629`),
validated in both Gate A and Gate B. **Not executed** — no condition requiring
rollback was ever met (no ambiguous group clustered, no multi-membership
cluster, no invented provenance, no unexpected rowcount, no active flag).

## Next mission

Not started under this mission, per its own instruction.
`AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1`, then
`OPENSERP-AUTOMATED-INGESTION-30MIN-1` (the mission that will actually begin
increasing the discovered-listing volume).
