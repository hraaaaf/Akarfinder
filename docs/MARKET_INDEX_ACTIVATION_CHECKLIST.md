# Market Index — Activation Checklist

For the future `AKARFINDER-MARKET-INDEX-FOUNDATION-PROD-ACTIVATION-1` mission. This foundation mission
does **not** perform any of the steps below — it only prepares them.

## Pre-activation gates

- [ ] `data/audits/market-index-foundation-prod-readonly-dry-run.json` re-run against current Production
      counts (they will have moved since 2026-07-16; re-run and compare, don't assume stale numbers).
- [ ] Migrations 1-5 applied to a **real** ephemeral/staging Postgres instance at least once (this
      mission could not — `LOCAL_DB_APPLICATION_NOT_EXECUTED`, see `data/audits/market-index-foundation-
      local-validation.json`), confirming no environment-specific DDL failure.
- [ ] `docs/MARKET_INDEX_EXISTING_MODEL_AUDIT.md`'s live-schema assumptions re-verified (columns may have
      changed since this audit).
- [ ] Rollback SQL block in each migration file dry-run tested against the same staging instance.

## Activation order (once the above gates pass)

1. Apply migrations 1-4 (new tables) to Production.
2. Apply migration 5 (`listing_sources` additive columns) to Production.
3. Set `MARKET_INDEX_READ_ENABLED=true` only — verify no public behavior changes (no code path reads
   these tables for public rendering yet; this flag exists for the *next* mission's own activation, not
   this one).
4. Run the (updated, re-verified) dry-run backfill script one more time against Production, still with
   `--dry-run`, to get a final go/no-go snapshot.
5. Only then, in a **separate**, explicitly-authorized mission, flip `MARKET_INDEX_WRITE_ENABLED=true` and
   perform an actual backfill (not a dry run) — this is `AKARFINDER-MARKET-INDEX-FOUNDATION-PROD-
   ACTIVATION-1`'s job, not this one's.
6. `MARKET_INDEX_OBSERVATIONS_ENABLED` flips only once the 30-minute ingestion writer
   (`OPENSERP-AUTOMATED-INGESTION-30MIN-1`) is ready to call `recordObservationIfChanged()` for real.
7. `MARKET_INDEX_CLUSTERING_ENABLED` stays `false` indefinitely until a **separate**, explicitly-scoped
   mission defines and validates the `manual_review`/`explicit_partner_identifier` human-in-the-loop
   workflow this mission's `assignSourceOfferToCluster()` already gates on. There is no roadmap mission
   yet that requests turning this on.

## What must NOT change when flipping these flags

- `/search`, `/listings/[id]`, all public routes: zero code reads `discovery_candidates`, `property_
  clusters`, `property_cluster_members`, or `source_offer_observations` in this mission's codebase. Adding
  a public read must be its own reviewed change, not a side effect of a flag flip.
- `property_listings`/`listing_sources`' existing columns: never altered by this foundation, and the
  additive columns on `listing_sources` default to `NULL` — no existing `select("*")` consumer breaks.
- The price-hotfix (`5c94919`) and partner-label fixes (`68eea2a`/`4232718b`) currently in Production:
  entirely independent of this foundation; nothing here touches `lib/listings/map-db-listing.ts` or
  `components/search/LightZillowSearchShell.tsx`.

## Known open items carried forward (not fixed by this mission, by design)

- `property_listings.duplicate_group_id` still contains demonstrated false merges (see audit finding).
  It is not touched, not deprecated, not migrated by this foundation — a future mission must decide
  whether to backfill corrected `property_clusters` from a human review pass, or leave the legacy field
  as historical/informational only.
- `listing_sources` rows already attached to the "wrong" `property_listing_id` in 4 known cases (see
  audit) are not corrected by this foundation's legacy adapter — it surfaces them
  (`multi_source_unverified: true`) rather than silently trusting or silently un-linking them, pending a
  human decision.
