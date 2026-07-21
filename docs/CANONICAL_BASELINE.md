# AkarFinder Canonical Baseline

Status: P0.4 alignment candidate — NOT YET MERGED TO `main`.

## Canonical target

- Future canonical branch: `main`
- Reconciliation branch: `reconcile/p0-canonical-baseline-20260721`
- Functional source baseline: `fix/openserp-serverless-state-persistence` at `8c2ab8b02aac1e7b906b22c4357e45d600d7e8ce`
- Absorbed historical `main`: `2c83cb3fc8b35340c3893911e37d645b32365240`
- Absorbed SearXNG POC lineage: `8c26d740e7e742099197eab2d129849e8b05aca2`

The reconciliation history preserves all three lineages through merge commits. No squash/rebase/force-push is permitted for the final promotion to `main`.

## Workflow invariant

- Single scheduled OpenSERP ingestion producer: `.github/workflows/openserp-github-native-ingestion.yml`
- Expected cadence: `*/30 * * * *`
- Legacy Vercel endpoint workflow: `.github/workflows/openserp-ingestion-cron.yml` is manual-only (`workflow_dispatch`), with no schedule.
- Workflows must checkout the triggering/canonical ref; hardcoded `ref: fix/*`, `ref: feat/*`, and `ref: poc/*` are forbidden.
- Diagnostic workflows remain manual-only unless a future explicit decision changes that contract.

## Migration history carried by the canonical candidate

Known Production-applied schema changes from the reconciled lineage:

- `20260718140000_create_openserp_query_rotation_state.sql`
- `20260718140100_create_openserp_engine_budget_state.sql`
- `20260718180000_create_openserp_ingestion_run_lock.sql`
- `20260719220000_alter_openserp_query_rotation_state_discovery_yield_numeric.sql`
- `20260721000000_create_source_offer_seeds.sql` — applied during P0.4 through Supabase migration tracking as `20260721163349_create_source_offer_seeds`; table verified empty with RLS enabled.

The first four schema changes predate tracked Supabase migration history in the currently connected Production project and were verified by live schema inspection rather than replayed. They must not be blindly reapplied.

## Query universe rule during P0

`data/openserp/query-universe-v1.json` is retained from the functional `fix` lineage without regeneration during reconciliation. Any future regeneration/state reconciliation is a separate mission.

## Production separation

Git canonicalization and Production deployment are separate gates. Merging the reconciliation PR to `main`, changing Vercel deployment behavior, activating flags, or changing Production data requires an explicit subsequent gate.

## Required certification before final promotion

- No cross-branch workflow refs.
- Exactly one scheduled OpenSERP ingestion producer.
- Legacy Vercel cron remains manual-only.
- Critical test suites pass.
- TypeScript passes.
- Production build passes.
- Supabase Production schema alignment is verified.
- Vercel Git integration/deployment behavior is verified before final merge/promotion.
