# AkarFinder — Supabase → Neon migration — Handover

Date: 2026-09-23

## Goal
Move AkarFinder off the overloaded Supabase project onto Neon without losing data, silently changing behavior, or deploying to Vercel before explicit authorization.

## Success
- Supabase production project is no longer generating load.
- Neon target is inspected and reachable.
- Current Supabase schema/data are preserved or exported before any irreversible cutover.
- AkarFinder supports `DATABASE_PROVIDER=neon` through the existing DB abstraction.
- Read paths, writes, jobs, migrations, auth/storage dependencies and scheduled ingestion are mapped and migrated.
- Tests/build pass on the migration branch.
- No Vercel deployment occurs without explicit human approval.

## Current verified state
### Supabase
- Project: `AqarFinder`
- Project ref: `kusfiyimwvxblvsrhaes`
- Plan: Free
- Pause request accepted: `{"success":true}`
- Latest observed status after request: `PAUSING`
- Previous incident evidence:
  - `SELECT 1` failed with `Connection terminated due to connection timeout`
  - Dashboard showed quota exhausted
  - memory commitment ~1.64 GB near ~1.65 GB limit
  - swap ~92%
  - CPU >100%
- 0 Supabase branches.
- 1 Edge Function `neighborhood-visual-p0-7-ingest`, already fail-closed with `INGESTION_ENABLED = false`.

### Repository
- Repo: `hraaaaf/Akarfinder`
- Base: `main@aa91e48724b1878f0225d31f061fbbc55a289c6e`
- Migration branch: `infra/neon-migration-20260923`
- Existing DB abstraction:
  - `lib/db/provider.ts` supports only `sqlite | supabase`
  - `lib/db/index.ts` routes primary listing reads to SQLite or Supabase
  - `lib/db/supabase-client.ts`
  - `lib/db/supabase-listings.ts`
- Repo contains many Supabase-coupled paths beyond the main listing read path, including ingestion state, search cache, observation ledger, public property index, property intelligence and numerous SQL migrations/workflows.

## Neon blocker
The connected Neon tool is currently internally inconsistent:
- exposed methods are project-scoped and document that `project_id` is injected automatically;
- calls such as `run_sql`, `get_database_tables`, `list_branches`, and `get_branch` fail inside the connector because the backend still requires a missing `project_id`;
- adding `project_id` is rejected by the exposed schema.

No Neon schema/data claim is therefore made yet.

## Migration rule
Do not destroy Supabase data. Pausing is reversible. Do not delete the Supabase project until Neon parity and a verified backup/export exist.

## Migration sequence
1. Finish Supabase pause verification.
2. Restore Neon connector access / obtain reachable Neon project context.
3. Inspect Neon branch/database/schema/storage/auth.
4. Create a direct, non-pooled migration path for schema/data import.
5. Export Supabase schema + data when source access is available.
6. Apply schema to a Neon temporary/dev branch first.
7. Validate row counts, constraints, functions/views/triggers and critical queries.
8. Add `neon` to the repo DB provider abstraction.
9. Port primary reads first.
10. Port writes/jobs/state stores and remove Supabase-specific PostgREST assumptions.
11. Port or replace Supabase Storage/Auth dependencies only where actually used.
12. Run targeted tests + full build + migration parity checks.
13. Open PR, review, merge only after evidence.
14. Vercel environment switch/deploy requires explicit user authorization.
15. After production parity: keep Supabase paused for rollback window, then decide deletion separately.

## Immediate next exact
Fix/reconnect Neon project access, then run a single read-only inventory: project → default branch → databases → tables → storage/auth capabilities.

## Human gates
- Vercel deployment: explicit authorization required.
- Supabase project deletion: explicit authorization required.
- Any destructive Neon branch/database/storage operation: explicit authorization required.


## Runtime coupling inventory — first pass
Observed runtime / operational paths coupled to Supabase or its PostgREST semantics:
- `lib/db/supabase-client.ts`
- `lib/db/supabase-listings.ts`
- `lib/observation-ledger/supabase-observation-ledger.ts`
- `lib/property-intelligence/supabase-backfill-adapter.ts`
- `lib/public-property-index/supabase-index-store.ts`
- `lib/search-gateway-cache/supabase-cache-store.ts`
- `lib/seed-freshness/supabase-retry.ts`
- `lib/openserp-ingestion/*` including state repositories, lock and writer paths
- `app/api/internal/cron/openserp-ingestion/route.ts`
- `.github/workflows/openserp-ingestion-cron.yml`
- `scripts/acquisition/*-supabase-shard-runner.mjs`
- `scripts/check-supabase.ts`
- `scripts/sync-supabase.ts`
- Supabase Edge Functions under `supabase/functions/*`
- legacy SQL files under `db/supabase-*.sql`
- the full `supabase/migrations/*` chain, which must be classified into portable Postgres SQL vs Supabase-only constructs.

This inventory is not yet a claim that every listed path is active in production. It is the migration review surface.
