# OPENSERP_SERVERLESS_DB_CALL_AUDIT

Mission: OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1 — Phase 2.

Exhaustive inventory of every Supabase/PostgREST call reachable from the serverless ingestion path (`/api/internal/cron/openserp-ingestion` → `runIngestionCycle`). Client: `@supabase/supabase-js` 2.108.2 via `getSupabaseServerClient()` (`lib/db/supabase-client.ts`). The underlying `postgrest-js` builder natively supports `.abortSignal(signal)` on every query and RPC — real cancellation is available without changing clients.

**Finding that frames everything below: before this mission, not one of these calls had any timeout or abort signal.** The internal time budget (prior mission) only checks elapsed time *between* awaited calls; a single hanging call rides to Vercel's 120s kill (proven: run #10, "Task timed out after 120 seconds", 0 checkpoints persisted).

| # | Call | File | Table / RPC | Type | Max volume | Timeout (before) | Abort possible | Budget-aware (before) | Critical | Hang risk |
|---|------|------|-------------|------|-----------|------------------|----------------|----------------------|----------|-----------|
| 1 | acquire lease | state/ingestion-run-lock-repository.ts `acquireIngestionRunLock` | rpc `acquire_openserp_ingestion_lock` | RPC | 1 row | none | yes (`.abortSignal`) | no | critical (gates the whole run) | low (tiny) but unbounded |
| 2 | load query states | state/query-rotation-state-repository.ts `loadQueryStates` | openserp_query_rotation_state | SELECT `.in()` | **2718 ids in ONE IN clause** (via hydrateRotationQueries) | none | yes | no | critical (setup) | **HIGH — prime suspect: PostgREST encodes `.in()` as a URL query param; 2718×~22-char ids ≈ >60KB URL. Also called with ≤5 ids from checkpoints (low risk there)** |
| 3 | seed missing query states | state/query-rotation-state-repository.ts `seedMissingQueryStates` | openserp_query_rotation_state | UPSERT (ignoreDuplicates) | up to 2718 rows on first-ever call; 0 rows steady-state (calls #2 first, same IN-clause risk) | none | yes | no | critical (setup) | HIGH (delegates to #2's load first, then a potentially huge upsert body) |
| 4 | load engine budget states | state/engine-budget-state-repository.ts `loadEngineBudgetStates` | openserp_engine_budget_state | SELECT `.in()` | 3 ids | none | yes | no | critical (setup) | low but unbounded |
| 5 | checkpoint query state | state/query-rotation-state-repository.ts `upsertQueryStates` (via persistRotationUpdates) | openserp_query_rotation_state | UPSERT | 1 row per call (per-query checkpoint) | none | yes | no | critical (durability) | low but unbounded |
| 6 | checkpoint engine state | state/engine-budget-state-repository.ts `upsertEngineBudgetStates` (via persistBudgetState) | openserp_engine_budget_state | UPSERT | 3 rows | none | yes | no | critical (durability) | low but unbounded |
| 7 | writer: discovery candidates select | national-writer.ts `writeNationalDiscoveryCandidates` | discovery_candidates | SELECT `.in()` (chunked ×200 canonical URLs) | ≤200 per chunk | none | yes | no | non-critical (write=true only) | medium (URL length ×200 urls) |
| 8 | writer: discovery candidates insert/update | national-writer.ts | discovery_candidates | INSERT + UPDATE | ≤200 rows per chunk | none | yes | no | non-critical | medium |
| 9 | writer: fingerprint lookup | national-writer.ts `writeNationalAdmittedListings` | property_listings | SELECT `.in()` (chunked) | ≤batch | none | yes | no | non-critical | medium |
| 10 | writer: listing sources select | national-writer.ts | listing_sources | SELECT `.in()` | ≤batch | none | yes | no | non-critical | medium |
| 11 | writer: property_listings insert/update | national-writer.ts | property_listings | INSERT/UPDATE | 1 per admitted listing | none | yes | no | non-critical | low each, many calls |
| 12 | writer: listing_sources insert/update | national-writer.ts | listing_sources | INSERT/UPDATE | 1 per admitted listing | none | yes | no | non-critical | low each |
| 13 | writer: clusters insert | national-writer.ts | property_clusters | INSERT | 1 per new listing | none | yes | no | non-critical | low each |
| 14 | writer: memberships insert | national-writer.ts | property_cluster_members | INSERT | 1 per new listing | none | yes | no | non-critical | low each |
| 15 | release lease | state/ingestion-run-lock-repository.ts `releaseIngestionRunLock` | rpc `release_openserp_ingestion_lock` | RPC | 1 row | none | yes | no | non-critical (lease expiry is the ultimate backstop) | low but unbounded |

## Verdicts

- **Prime suspect for run #10's hang**: call #2 in its 2718-id form (plus #3's follow-on upsert on a first-ever seeded-but-cold path). Not *proven* as the blocking call (the platform kill left no application logs), which is exactly why Phase 3's instrumentation exists: any future timeout will name the last call started.
- **Systemic issue**: 15/15 calls unbounded before this mission. The fix must be a single shared wrapper, not 15 ad-hoc patches.
- **Design note**: the serverless path (batch ≤5) does not need 2718 hydrated rows at all. Phase 7 addresses this; Phase 6 bounds whatever remains.
