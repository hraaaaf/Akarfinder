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


## Fresh-window update — 2026-09-23
- Neon MCP retest: same `project_id` validation contradiction. This connector path is abandoned for the migration.
- #1084 failures diagnosed and corrected: governance now recognizes the explicit migration-freeze state, and sitemap PR validation no longer performs a live Supabase read.
- #1084 current HEAD: `b4d014b16790203ca3c25c511b64f62b3cc4ac6e`; exact-head CI was queued at last check.
- Direct fallback prepared on #1082: `.github/workflows/neon-direct-db-read-only-probe.yml`, manual-only and read-only, using PostgreSQL 17 tooling. Current #1082 HEAD before this documentation update: `ffc2ccfc08f8e1d7534b39c02d160447cfa2a116`.
- Local runtime has no PostgreSQL client tools and no target DB URL injected, so no direct target query has been claimed from this runtime.
- Next exact: continue runtime inventory; configure the direct target connection outside the repo; run the manual smoke probe, then inventory; merge #1084 only after exact-head checks are green.


## Runtime read-path update — 2026-09-23
- Neon runtime driver pinned to `@neondatabase/serverless@^1.1.0`; runtime connection variable is `NEON_DATABASE_URL`.
- `DATABASE_PROVIDER=neon` is explicit and fail-closed: missing Neon config or Neon read failure does not silently fall back to stale SQLite.
- Public listing read path ported in `lib/db/neon-listings.ts` with parameterized SQL, JSONB/BOOLEAN normalization, list/getById/stats contracts, and preserved listing-source selection.
- Market Index read parity ported via `lib/market-index/neon-market-index-read-repository.ts`. Schema types were checked against canonical migrations: `property_clusters.id uuid`, `legacy_property_listing_id bigint`, `property_cluster_members.property_cluster_id uuid`, `source_offer_id bigint`.
- Dedicated offline CI: `.github/workflows/neon-runtime-read-path.yml` runs npm ci, Neon provider/listing tests and TypeScript without contacting Neon/Supabase.
- Current runtime-read-path HEAD: `376a6f3999178d4bd84483d95333b45ec88e47fb`.
- Nothing has been deployed and `DATABASE_PROVIDER` has not been switched.


## DB-first migration guard update — 2026-09-23
- Current PR #1082 HEAD before this documentation update: `a63e5b0cef25e9d347f5a97af169db4828974cf1`.
- Core migration workflow exists: `.github/workflows/neon-core-db-migration.yml`.
- It is manual-only and defaults to `validate`.
- Approved DB-first table allowlist is exactly:
  - `public.property_listings`
  - `public.listing_sources`
  - `public.property_clusters`
  - `public.property_cluster_members`
- Validation restores the selected archive into clean PostgreSQL 17 before any target write and compares source/scratch row counts.
- Apply mode requires `NEON_DATABASE_URL_DIRECT`, rejects pooled target endpoints, refuses to proceed if any core target table already exists, and uses no `--clean` / no target drop.
- Added static guard: `scripts/scrapers/__tests__/neon-core-db-migration-guard.test.ts`.
- Neon runtime CI now includes this migration safety guard in addition to provider/listing/TypeScript validation.
- #1084 remains queued on GitHub Actions; no new failure evidence was observed.
- Real core validation cannot be executed from this ChatGPT runtime because GitHub workflow dispatch is not exposed by the connected GitHub tool and database secrets are not accessible here.
- Human execution gate for the real validate run:
  - GitHub secret `SUPABASE_DATABASE_URL_DIRECT`
  - GitHub secret `NEON_DATABASE_URL_DIRECT` (needed only for apply; validate uses source only)
  - manually dispatch `Neon Core DB Migration` with mode `validate`.
- No Vercel deployment, no Neon write, no Supabase deletion.

## Content-integrity gate update — 2026-09-23
- Core migration validation was strengthened beyond row counts.
- `.github/workflows/neon-core-db-migration.yml` now computes a deterministic per-table content digest using canonical row JSON hashes sorted before aggregation.
- Validation requires both count parity and content-digest parity for source → scratch.
- Apply requires both count parity and content-digest parity for source → Neon.
- This closes the prior false-positive case where equal row counts could hide changed/missing content.
- Static guard updated in `scripts/scrapers/__tests__/neon-core-db-migration-guard.test.ts`.
- Commits:
  - workflow: `47d07b000ec0dd681b617de76f450ca06fd2431d`
  - guard: `59a4b27dda1d99b2344dcc9051cd60da39610723`
- #1084 exact-head checks remain queued; no new failure evidence.
- No Neon write, no Vercel deployment, no Supabase deletion.

## District parity + ODM blocker update — 2026-09-23
- Found and fixed a Neon parity bug in district searches: the exact district total helper was Supabase-only, so Neon could return district rows with a city-wide total.
- Added `queryNeonStructuredDistrictTotal()` with parameterized district/city-alias/property/transaction/price/surface filters.
- `queryStructuredDistrictTotal()` now routes exact-count reads by provider.
- Offline coverage added for city aliases and structured filters.
- Commits:
  - Neon exact-count implementation: `bad74579a1d5dca241c1136033fea07a50bdb1c0`
  - provider routing: `49b2dcfafc82e8501120c17b474640555a77b2e9`
  - test: `61fea2c5dc2fc38e29987e17a4d19855cd63ec2d`
  - matrix update: `899ba95a8da60fbe79b14c6a4b036d5ea24fb6e2`
- Full read cutover is still blocked by the ODM lane: `search_public_representations_v2` and owner public search still call Supabase RPCs.
- Search Gateway cache remains Supabase-client coupled but is non-critical and can be adapted separately.
- No production provider switch, no Neon write, no Vercel deployment.

## ODM portability gate — 2026-09-23
- Reconstructed the current public ODM serving contract from migration history, including M7 policy guard/recovery, M5 fresh-only hardening, and M7 policy-expiry hardening.
- Current runtime `search_public_representations_v2` depends on:
  - `thin_index_search_documents`
  - `source_policy_registry`
  - `listing_sources`
  - `professional_listing_ownership`
  - `search_business_entitlements`
  - portable ODM04 normalizers.
- The serving contract also enforces policy windows, rich-content vs canonical-link-only separation, business lanes, exact URL dedupe, source diversity, and deterministic cursor ordering. These invariants must not be dropped in the Neon port.
- ODM04 normalization portability verified from repo: the authoritative portable alias migration uses built-in `translate()`, not an external unaccent dependency.
- Added validation-only workflow `.github/workflows/neon-odm-portability-probe.yml` to dump those five candidate tables and restore them into clean PostgreSQL 17 with count + deterministic content-digest parity. It never connects to Neon.
- This probe is intentionally separate from the 4-table core apply allowlist because `professional_listing_ownership` may pull Auth-linked DDL dependencies. A failing scratch restore is treated as evidence, not bypassed.
- Added static guard `scripts/scrapers/__tests__/neon-odm-portability-guard.test.ts` and wired it into Neon CI.
- Cursor cutover hardened: when `DATABASE_PROVIDER=neon`, `SEARCH_CURSOR_SECRET` is mandatory; the legacy `SUPABASE_SERVICE_ROLE_KEY` fallback is no longer accepted.
- Commits:
  - cursor decoupling: `6dd8be27b4b050a3658c80f119e303c421968660`
  - cursor test: `fe5eed621b78d40ecf6760bfc666e466bdf98a99`
  - ODM gate doc: `979b2328e3951bf3f28b37ce3a9d52446c03da44`
  - portability workflow: `b14765281512db2316acfd9c1c57cb72299b4bf1`
  - static guard: `61e1c760d289fd7d3945e78142ca753e083e2118`
  - CI wiring: `3dbab3a1cbd7982ed511673eaca282a53c0f801e`
- No Vercel deploy, no provider switch, no Neon write, no Supabase deletion.

## Provider-aware ODM runtime port — 2026-09-23
- Added `lib/search-gateway/neon-public-search.ts`: direct Neon PostgreSQL implementation of the current M7 `search_public_representations_v2` read contract.
- Preserved verified invariants: LISTING-only, `fresh_confirmed`, policy authorization/display/machine/ingestion gates, effective/expiry windows, rich-content vs canonical-link-only separation, price/surface privacy boundary, verified professional business lanes, URL dedupe, source diversity penalty, and keyset cursor ordering.
- `lib/search-gateway/public-search-cursor.ts` now routes ODM reads by `DATABASE_PROVIDER`: Neon uses direct PostgreSQL, Supabase retains the existing RPC path.
- Added offline parity tests in `scripts/scrapers/__tests__/neon-public-search.test.ts` and wired them into the Neon CI.
- Cutover matrix updated.
- Commits:
  - Neon ODM query: `2263bc5e7311b6de0a0aae72ce40888441bc4430`
  - provider routing: `a8bc8612b8181e2d3fafdde903c04a167dd83159`
  - parity tests: `e31a732fcabe9f660374bf4ef85da37898b53007`
  - CI wiring: `4187b92be33d88f93b4b6669bde3ca43102958f5`
  - matrix: `47b9df086068264b311e84cad395b0ff466b1671`
- Important boundary: code-side Supabase RPC coupling is closed for ODM when Neon is selected, but production activation is still blocked until the five-table ODM dataset passes the PG17 portability probe and data parity is proven.
- No Vercel deploy, no provider switch, no Neon write.

## Owner public Search read port — 2026-09-23
- Added `lib/seller/neon-owner-listing-search.ts` with a direct Neon read equivalent of `search_owner_public_representations_v1`.
- `searchOwnerListings()` now routes by `DATABASE_PROVIDER`; the existing `OWNER_LISTINGS_PUBLIC_SEARCH_ENABLED` flag remains unchanged.
- Preserved owner Search eligibility, structured filters, text matching, quality ordering and numeric normalization.
- Added offline parity coverage and Neon CI wiring.
- Commits:
  - Neon owner query: `6cc416bd1250c17e9e486dc7abcbc799ff3597bd`
  - provider routing: `139af73b295266c573ad4478d863a7938fe94160`
  - tests: `1f1d6b7c9a1309f7ca9f674b07f6254c9438248c`
  - CI: `d12f9e4a21aafbb9d7b59f47af1a32ba9069bf85`
  - matrix: `81b72c5f84eab702ed31f2cd46947508bb70fcb7`
- Boundary: seller projection/write flow still uses Supabase. `owner_listing_representations` also references seller draft/publication tables, so its target-schema portability is not yet proven.
- No Vercel deploy, no provider switch, no Neon write.

## Owner read portability closure — 2026-09-23
- DDL chain verified for public owner Search:
  - `buyer_leads`
  - `seller_property_drafts`
  - `seller_listing_publications`
  - `owner_listing_representations`
- No direct `auth.users` or `storage.*` dependency appears in this four-table read closure.
- Storage remains isolated in `seller_property_draft_photos` + Supabase Storage bucket and is excluded.
- Added manual validation-only workflow `.github/workflows/neon-owner-read-portability-probe.yml`: PG17 dump → clean PG17 restore → row count + deterministic content digest parity.
- Added static guard and wired it into Neon CI.
- Commits:
  - workflow: `82dc7ca1d9d65a641c7a79b5471f822f33658813`
  - guard: `57bd4331a600250f4509fa4fbb912ab8682896fb`
  - CI: `5f788470bdf456c4e958733e0b36991b493561e8`
  - matrix: `42c8345dc7bbedb0cca765cc0ef6c15639fd16e2`
- This does not authorize seller-write/Auth/Storage migration.
- No Vercel deploy, no provider switch, no Neon write.
