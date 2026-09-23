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
- Base at migration start: `main@aa91e48724b1878f0225d31f061fbbc55a289c6e`
- Migration branch: `infra/neon-migration-20260923`
- Draft PR: #1082
- Verified PR head before this handover update: `e78dbc8a2de3d787077ff0ec0285f422f5b0d28a`
- Existing DB abstraction:
  - `lib/db/provider.ts` supports only `sqlite | supabase`
  - `lib/db/index.ts` routes primary listing reads to SQLite or Supabase
  - `lib/db/supabase-client.ts`
  - `lib/db/supabase-listings.ts`
- Repo contains many Supabase-coupled paths beyond the main listing read path, including ingestion state, search cache, observation ledger, public property index, property intelligence and numerous SQL migrations/workflows.

## Neon target — identifiers now known
The user created the Neon target project.

Verified identifiers supplied from the Neon console/snippet:
- Project ID: `ancient-violet-43534870`
- Branch ID: `br-frosty-glitter-b2762sv1`
- Database: `AkarFinder`
- Role: `neondb_owner`
- Region/host family: `eu-central-1`
- Endpoint host prefix: `ep-red-leaf-b2w913ul`
- Connection shown by Neon is pooled.

Important:
- Do not copy the database secret into repo/docs.
- Rotate the database password before production cutover because it was pasted into the ChatGPT conversation during setup.

## Neon connector blocker — still active after project creation
Fresh verification after the user created and reconfigured the Neon project still fails.

Observed connector behavior:
- `describe_project({})` → backend error: missing `project_id`
- `get_branch({branch_id:"br-frosty-glitter-b2762sv1"})` → backend error: missing `project_id`
- `run_sql({branch_id:"br-frosty-glitter-b2762sv1", database_name:"AkarFinder", sql:"select 1 as ok;"})` → backend error: missing `project_id`
- When `project_id:"ancient-violet-43534870"` is passed explicitly, the exposed ChatGPT tool schema rejects it as an unexpected property.

Conclusion limited to proof:
- The Neon project exists and its IDs are known.
- The current ChatGPT↔Neon MCP wrapper is internally inconsistent for project scoping in this conversation.
- `SELECT 1` has NOT executed successfully yet.
- No Neon schema/data inventory has been performed yet.

A fresh ChatGPT window is the next intended recovery path so the project-scoped MCP connection can initialize cleanly.

## Migration rule
Do not destroy Supabase data. Pausing is reversible. Do not delete the Supabase project until Neon parity and a verified backup/export exist.

## Migration sequence
1. Reopen in a fresh conversation with the project-scoped Neon connection.
2. Verify Neon access with one read-only chain:
   - project
   - branch
   - databases
   - `SELECT 1`
3. Inspect tables/schema/storage/auth/Data API capabilities.
4. Finish Supabase pause verification.
5. Create a direct, non-pooled migration path for schema/data import.
6. Export Supabase schema + data when source access is available.
7. Apply schema to a Neon temporary/dev branch first.
8. Validate row counts, constraints, functions/views/triggers and critical queries.
9. Add `neon` to the repo DB provider abstraction.
10. Port primary reads first.
11. Port writes/jobs/state stores and remove Supabase-specific PostgREST assumptions.
12. Port or replace Supabase Storage/Auth dependencies only where actually used.
13. Run targeted tests + full build + migration parity checks.
14. Open/review migration PR and merge only after evidence.
15. Vercel environment switch/deploy requires explicit user authorization.
16. After production parity: keep Supabase paused for rollback window, then decide deletion separately.

## Immediate next exact
Open a fresh ChatGPT conversation, load this handover first, verify repo/PR state, then test Neon with:
- Project ID `ancient-violet-43534870`
- Branch ID `br-frosty-glitter-b2762sv1`
- DB `AkarFinder`
- read-only `SELECT 1`

If the fresh window still returns the same `project_id missing` contradiction, stop retrying the same connector path and switch strategy to a direct migration/runtime connection path rather than more MCP retries.

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

## Confirmed migration mechanics (Neon official docs)
- Database transfer path: `pg_dump -Fc` from Supabase using a **direct/unpooled** connection, then `pg_restore --no-owner --no-acl` into Neon.
- Target Neon Postgres should match the Supabase major version. Supabase source is PostgreSQL 17, so Neon target must be PostgreSQL 17.
- Auth compatibility exists via `@neondatabase/neon-js` + `SupabaseAuthAdapter`, but existing password-based Supabase users cannot be directly migrated because password hashes are incompatible. Existing OAuth users are a different case and must be inventoried before cutover.
- Neon Data API keeps `.from()` / filter / RPC query ergonomics, but backend privileged paths must not be made public by granting broad anonymous access merely to emulate the Supabase service-role key.
- Storage is not optional in this migration:
  - public bucket `neighborhood-visuals`
  - seller bucket `seller-property-drafts`
  - seller upload route currently uses `supabase.storage` plus `seller_property_draft_photos`
  Neon Object Storage can replace this only after target project/region capability is verified.

## Emergency automation freeze
Two unattended GitHub workflows were confirmed to hit Supabase automatically:
- `.github/workflows/openserp-github-native-ingestion.yml` — schedule `*/10 * * * *`
- `.github/workflows/sitemap-public-seed-harvest.yml` — schedule `23 */6 * * *` and push auto-apply

Urgent PR: #1084
- head: `497c5c344c264f3631c79140bcd6e84ada788259`
- OpenSERP exact-head check: no schedule; manual dispatch retained
- Sitemap exact-head check: no schedule; no push auto-apply; PR validation + manual dispatch retained
- PR currently open, mergeable, not merged.
- Latest exact-head CI observed:
  - Canonical Baseline Validation #35848651759 → failure
  - Public Sitemap Seed Harvest #35848651718 → failure
  - OpenSERP P0 Atomic Upsert Gate → success
  - Phase 1 P1 Final Sweep Gate → success
  - UX Gate 0 Contracts → success
  - Canonical Baseline Compile Validation → success
  - Phase 1 P0 Closure Gate → success
  - Phase 1 P2 Residual Closure Gate → success
  - CI Workflow Efficiency Policy → success
- #1084 is therefore not merge-ready yet; the two failures need diagnosis in the next work window before merge.
