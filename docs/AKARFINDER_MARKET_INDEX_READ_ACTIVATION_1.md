# AkarFinder — Market Index Read Activation 1

**Mission:** AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1
**Status:** `MARKET_INDEX_READ_ACTIVE_WITH_LEGACY_FALLBACK`
**Date:** 2026-07-17

## Objective

Activate a Market Index-aware read path for the 177 single-source, provenance-verified listings
created by the controlled backfill, with mandatory legacy fallback for every other listing (144
rows), under a strict parity contract: no listing lost, no listing gained, no ranking change, no
internal identifier ever exposed.

## Read path audit (section 7)

Every server-side consumer of `property_listings`/`listing_sources` (6 files, all routing through
`lib/db/index.ts`) was inventoried. The single integration point is
`lib/db/supabase-listings.ts`'s `mapToDbRow()` source selection. For 312/316 structurally
single-source listings, the pre-existing heuristic (`sources.find(is_active) ?? sources[0]`) and a
Market-Index-verified cluster lookup are mathematically forced to select the same row. Full detail:
`docs/MARKET_INDEX_READ_PATH_AUDIT.md`.

## Architecture

- `lib/market-index/market-index-read-repository.ts` — read-only, batched lookup of verified
  `legacy_one_to_one_projection` clusters via the service-role Supabase client (no new RLS policy
  needed, confirmed by section 8's gate).
- `lib/market-index/market-index-read-adapter.ts` — pure decision logic: verify single source +
  explicit `origin_type='persisted_openserp'` + exactly 1 membership + membership points back to
  the same source, or fall back to the unchanged legacy heuristic. Never touches
  `duplicate_group_id` (not even in scope — the type carries no such field).
- `lib/market-index/market-index-read-service.ts` — orchestrates the batch, produces internal-only
  metrics (`market_index_rows_used`, `legacy_fallback_rows`, `invalid_cluster_rows`,
  `missing_membership_rows`, `multi_membership_clusters`, `parity_mismatch_count`), logged
  server-side, never returned in an HTTP response.
- Wired into `lib/db/supabase-listings.ts`'s `querySupabaseListings`/`querySupabaseListingById`
  behind `MARKET_INDEX_READ_ENABLED`; any repository error is caught and falls through to the
  exact legacy behavior — never an empty page.

## Validation

- **Live parity, local:** with the flag on vs. off, `/api/search` output is byte-identical (after
  excluding the `generated_at` timestamp) across every major city (Rabat, Casablanca, Marrakech,
  Tanger, Agadir, Fes) and `queryListingById`, even when 20-135 rows per query were actively served
  through the Market Index path.
- **Shadow-read parity suite:** 34 queries against Production (read-only), 0 total mismatches, 0
  missing/extra IDs, 0 duplicates, 0 field mismatches, 0 ranking-order mismatches.
- **Per-row validation:** all 177 memberships individually verified (correct cluster, exactly 1
  membership, matching source, `displayed_price` matching legacy `price_mad`). The 144-row
  fallback matches exactly: 135 unenriched single-source + 4 ambiguous groups (9 sources), all
  confirmed still unclustered.
- **Tests:** 15 new unit tests (flag defaults, verified pick, every fallback reason, no
  `duplicate_group_id` reference, no internal metric in the public shape, repository error
  propagation). 118/118 Market Index tests, 1561+53 global tests, 20/20 OpenSERP ingestion, build
  PASS, `git diff --check` PASS.
- **Preview READ=false:** baseline unchanged, 14/14 routes correct.
- **Preview READ=true (same commit):** 14/14 routes correct, 0 lost/extra listings via live HTTP
  comparison against the READ=false Preview, 0 console/hydration errors, 0 overflow across 4
  viewports, 0 leaked internal identifier in the client bundle (16 scripts scanned).
- **Production shadow read-only:** same 34-query suite, 0 mismatches, re-confirmed post-freeze.

## Deployment sequence

1. `dpl_AwV6cBnvYWPZ4oEfb3Yb21KDCNk8` — Production, commit `b265c431` (frozen HEAD), `READ_ENABLED`
   absent (false). 14/14 routes validated. Previous deployment (`dpl_GLoQM3wLm4oD6MKkqJZg5zTtKgZR`)
   became the rollback target.
2. **User confirmation gate** — closed question asked verbatim per the mission's own wording;
   answered OUI.
3. `MARKET_INDEX_READ_ENABLED=true` added persistently to the Production environment (Vercel
   project settings, Production scope only — not Preview/Development).
4. `dpl_74owY6RLa3x7NBFWFSDpSgPuyxdF` — redeploy of the exact same commit `b265c431`, now with
   `READ_ENABLED=true`. 14/14 routes, 0 DB writes, 0 console/hydration errors, 4/4 viewports clean.
5. Live Production runtime logs (Vercel Functions, real traffic from the validation pass) confirm
   the flag is genuinely active: `market_index_rows_used` values ranging 0-135 depending on query,
   0 `invalid_cluster_rows`, 0 `missing_membership_rows`, 0 `multi_membership_clusters`, 0
   `parity_mismatch_count` across every real request. The only error-level log entry is the
   pre-existing, expected `NEXT_HTTP_ERROR_FALLBACK;404` for `/listings/137`, identical on both
   the READ=false and READ=true deployments.

## Rollback

Not executed — no condition requiring it was ever met. Two rollback levels remain ready:
1. Set `MARKET_INDEX_READ_ENABLED=false` and redeploy the same commit (or restore
   `dpl_AwV6cBnvYWPZ4oEfb3Yb21KDCNk8`).
2. Restore `dpl_GLoQM3wLm4oD6MKkqJZg5zTtKgZR` (the deployment active before this mission).

No database rollback is applicable — this mission performs zero writes to any table.

## Result

Production status: `MARKET_INDEX_READ_ACTIVE_WITH_LEGACY_FALLBACK`. `READ_ENABLED=true`,
`WRITE_ENABLED`/`OBSERVATIONS_ENABLED`/`CLUSTERING_ENABLED` all absent/false. Public listing volume
unchanged. Product completion `98.5% → 98.7%`.

## Next mission

Not started under this mission, per its own instruction: `OPENSERP-AUTOMATED-INGESTION-30MIN-1` —
the mission that will actually begin increasing the number of discovered listings.
