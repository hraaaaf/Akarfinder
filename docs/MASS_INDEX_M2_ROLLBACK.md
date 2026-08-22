# DATA MASS-INDEX — M2 rollback runbook

Status: PREPARED, not executed.

## Scope

M2 adds native `openserp` / `serper_mass_harvest` materialization for net-new external-index seeds. It does not alter `search_public_representations_v2`, does not relabel legacy `serper_search` rows, and must preserve every pre-existing canonical seed.

## Preconditions before any remote migration/write

1. Dedicated M1-M2 certification is green.
2. M1 manifest is read-only, snapshot-bounded and keyset-paginated.
3. M2 dry-run has zero provider relabels and zero listing-classification violations.
4. Existing `source_offer_seeds` are partitioned as `PRESERVE_EXISTING`; only `INSERT_NATIVE` rows may be written.
5. Canary receipt records every inserted canonical URL and resulting seed id.
6. Public Search RPC still excludes `openserp` and `serper_mass_harvest` until M6.

## Canary rollback order

If the canary violates any invariant:

1. Delete only the exact canary `source_offer_seeds` inserted by the canary receipt. Never delete rows classified `PRESERVE_EXISTING`.
2. Confirm the FK cascade removed corresponding `thin_index_search_documents` rows.
3. Drop `trg_zz_mass_index_sync_native_discovery_seed`.
4. Drop `public.mass_index_sync_native_discovery_seed_row()`.
5. Restore `public.odm06_display_eligibility(...)` and `public.odm06_display_eligibility_reason(...)` to the pre-M2 provider set: `public_sitemap`, `commoncrawl_cdx`, `serper_search`.
6. Verify native-provider seed count is back to the pre-M2 baseline and Search behavior is unchanged.

## Structural rollback before any native seed write

If the migration itself fails validation before the first native seed write, only steps 3–6 are required; there is no data rollback.

## Trigger-order invariant

Live `source_offer_seeds` currently has `thin_index_search_documents_sync_write` as the existing AFTER INSERT/UPDATE sync trigger. M2 names the second AFTER trigger `trg_zz_mass_index_sync_native_discovery_seed`, so PostgreSQL alphabetical trigger ordering executes the historical sync first and the native materializer second.

## Forbidden rollback shortcuts

- No broad delete by source domain.
- No broad delete of all `serper_search` rows.
- No rewrite of legacy `persisted_openserp` bridge rows during M2.
- No Search RPC activation as part of rollback or migration.
- No Vercel deployment.
