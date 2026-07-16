# Market Index — Security and RLS

## Verifiability limitation (disclosed)

This environment has `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (PostgREST access) but no direct
Postgres connection string. RLS policies on existing tables (`property_listings`, `listing_sources`,
`listing_observation_history`, `search_gateway_cache`) could not be read from `pg_policies` directly.
What is independently verifiable:
- All server-side code (`lib/db/supabase-listings.ts`, `lib/openserp-ingestion/*`, `scripts/*`) uses the
  **service-role key**, which bypasses RLS entirely by Supabase design — this is why the app works
  regardless of what policies exist.
- No client-side (`"use client"`) code was found calling `createClient` with a Supabase anon key against
  any of these tables (grep confirmed all reads go through server-side API routes:
  `app/api/search`, `app/api/search/gateway`, and server components).
- The two existing migrations that create tables similar in spirit to this mission's new ones
  (`listing_observation_history`, `search_gateway_cache`) both do `ENABLE ROW LEVEL SECURITY` with **no**
  policy statements at all — under Postgres RLS semantics, a table with RLS enabled and zero policies
  denies all access to every role except one that bypasses RLS (`service_role`, or a table owner using
  `BYPASSRLS`). This project's existing convention is therefore "deny hy default, service-role only,"
  and this mission's new tables follow the identical pattern.

## Per-table access model (mission section 13)

| Table | Public read? | Public write? | Access model |
|---|---|---|---|
| `discovery_candidates` | No | No | RLS enabled, zero policies → service-role only |
| `listing_sources` (extended) | Yes, via existing `/api/search` server route only | No | Unchanged — this mission adds nullable columns, not new access paths |
| `property_clusters` | No | No | RLS enabled, zero policies → service-role only. No public endpoint reads or writes this table in this mission. |
| `property_cluster_members` | No | No | Same as above |
| `source_offer_observations` | No | Append-only via service role | RLS enabled, zero policies. Even the service role only ever calls `INSERT`/`SELECT` through the `ObservationRepository` interface — `UPDATE`/`DELETE` methods do not exist on that interface (see `lib/market-index/market-index-repository.ts`), so "append-only" is enforced by the application's own type surface even though the service role is technically capable of more at the raw SQL level. |

**No PropertyCluster fusion or modification is ever reachable from the browser** — there is no public
API route in this mission that reads or writes `property_clusters`/`property_cluster_members` at all; the
only consumers are the internal `lib/market-index/market-index-service.ts` and the dry-run script, both
server-only, both never invoked by any public request handler.

## Secrets

No secret, token, or credential appears in:
- the 5 migration files (verified: no `SUPABASE_SERVICE_ROLE_KEY`/connection string/password string
  anywhere in `supabase/migrations/2026071614*.sql`);
- `lib/market-index/*` (no hardcoded credentials, reads `process.env.*` only where the existing project
  convention already does, e.g. `market-index-feature-flags.ts`);
- `scripts/market-index/dry-run-market-index-backfill.ts` (loads `.env.local`/`.env.mission` the same way
  every other audit script in this project does; prints counts only, never a key/row's raw contact
  fields);
- the two audit JSON deliverables (`market-index-foundation-local-validation.json`, `market-index-
  foundation-prod-readonly-dry-run.json`) — both contain counts and booleans only, no row-level PII, no
  key material, confirmed by grep before commit (see final bilan).

## Feature flags as a second, independent safety layer

Even if a future RLS policy were mistakenly added to `property_cluster_members` (accidentally exposing
membership writes), `MARKET_INDEX_CLUSTERING_ENABLED=false` is checked in code
(`lib/market-index/market-index-feature-flags.ts`) before `market-index-service.ts`'s
`assignSourceOfferToCluster()` will do anything beyond the single authorized `legacy_one_to_one_projection`
path — the two layers (RLS + feature flag + explicit origin-type enum) are intentionally redundant, not a
single point of failure.
