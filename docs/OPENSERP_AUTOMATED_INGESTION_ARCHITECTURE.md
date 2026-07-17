# OpenSERP Automated Ingestion — Architecture

**Mission:** AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1

## Objective

Discover, filter, persist and publish real estate offers found via OpenSERP search results,
automatically, every 30 minutes, nationally, while keeping every hard safety invariant the
Market Index mission chain has already established: no PII, no invented data, no multi-source
clustering, no Observations, no direct fetch of a source page.

## Data flow (one ingestion cycle)

```
query-rotation-planner.selectNextBatch(universe, budget, now)
  -> N queries picked (never-executed first, then more specific tiers, then yield-learned)
run-orchestrator.runIngestionCycle()
  -> for each query: openserp-live.runOpenSerpLiveQuery(engine, query, ...)
     (up to 2 active, non-suspended engines per query; stop at first non-empty result)
  -> for each raw SERP result: national-admission.decideAdmission()
       classify.ts.classifyOpenSerpResult(query, extractCityFn=national, extractDistrictFn=national)
       + domain-registry gate (approved_discovery/partner/authorized_static only)
       + PII/unsafe-URL/non-listing-page checks
  -> if write=true: national-writer.writeNationalIngestionRun(runId, decisions)
       1. discovery_candidates (every classified result, admitted or not)
       2. property_listings + listing_sources (admitted only)
       3. property_clusters + property_cluster_members, 1:1, cluster_origin=
          deterministic_same_source_identifier (admitted only)
  -> rotation state written back to data/openserp/query-universe-v1.json
  -> budget/backoff state written back to data/openserp/engine-budget-state.json
```

## Why generic city-level queries are deliberately not prioritized

During this mission's own live testing (dry-run mode, real OpenSERP calls, zero DB writes),
generic `"<type> <transaction> <city>"` queries (Tier 1, no district) returned **zero** admitted
candidates across two independent 12-query batches (0/122, then 0/114 raw results) — every result
was a portal **category/hub page** (e.g. `mubawab.ma/fr/st/casablanca/appartements-a-vendre`), not
an individual listing. A district-level query (`"appartement a vendre Casablanca Maarif"`, Tier 3)
showed the identical pattern on inspection. A domain-targeted query
(`"... site:mubawab.ma"`, Tier 4) did surface one individual-listing URL (matching mubawab.ma's
`/fr/is/` pattern) among category pages. This matches the project's own prior benchmark finding
(`docs/AKARFINDER_WEB_INDEX_STACK_BENCHMARK_1.md`, Phase 2A: 33.3% of raw OpenSERP results are
"unclassified" and price-presence in snippets is only 11.1% — "discovery signal only").

Consequence: `query-rotation-planner.ts`'s scoring intentionally favors **higher** priority-tier
numbers (3 = district, 4 = domain-targeted) over Tier 1 city-only queries when both are
never-executed, rather than treating Tier 1 as "most important, therefore first." Once any query
has run, its learned `discovery_yield` dominates future selection regardless of tier. This is a
data-driven adaptation made during this mission, not a blind implementation of "lower tier number
= higher priority."

## Deliberate ID-scheme adaptation vs. the mission's own pseudocode

Section 16 of the mission illustrates idempotent IDs as client-computed UUIDv5
(`UUIDv5("openserp-discovery-v1:" + provider + query_hash + canonical_url)`, etc.). This
implementation instead lets Postgres generate the UUID (`gen_random_uuid()`, the schema's own
default for `discovery_candidates.id`, `property_clusters.id`, `property_cluster_members.id`) and
achieves the identical idempotency guarantee — the same input never produces two rows — via
`upsert(..., { onConflict: "<table's own pre-existing unique constraint>" })`:

| Table | Idempotency key (existing unique constraint) |
|---|---|
| `discovery_candidates` | `(provider, query_hash, canonical_url)` |
| `property_listings` | `canonical_fingerprint` (unchanged, pre-existing) |
| `listing_sources` | `listing_url` (unchanged, pre-existing) |
| `property_clusters` | `legacy_property_listing_id` |
| `property_cluster_members` | `(property_cluster_id, source_offer_id)` |

This mirrors the pattern already used by every repository class in
`lib/market-index/market-index-repository.ts` (DB-generated id + a separate idempotency key,
never a client UUIDv5) and by the existing, already-Production-proven
`writeOpenSerpCandidatesToSupabase` (`pipeline.ts`) for `property_listings`/`listing_sources`.
The only prior use of client-computed UUIDv5 in this codebase
(`market-index-identifiers.ts`'s `computeLegacyClusterId`/`computeLegacyMembershipId`) was for a
one-off raw-SQL backfill script with no round-trip read from the database — not applicable here,
where every write already goes through `getSupabaseServerClient()` and gets the real row back.

## Overlap guard without a new migration

`run-lock.ts` acquires a lock via a plain `INSERT` (not `upsert`) of a sentinel row into the
already-existing `discovery_candidates` table, using a reserved
`provider = "openserp-ingestion-lock"` value that real discovery data never uses. The table's own
`(provider, query_hash, canonical_url)` unique index makes this an atomic compare-and-set: a
second concurrent `INSERT` for the same sentinel triple fails immediately (`SKIPPED_OVERLAPPING_RUN`).
A lock older than 10 minutes is considered abandoned (crashed run) and is stolen by the next
scheduled tick rather than wedging the schedule forever. No new table, no new migration.

## Flags (least privilege)

```
OPENSERP_AUTOMATED_INGESTION_ENABLED  -- master switch
OPENSERP_INGESTION_WRITE_ENABLED      -- writer may run (bootstrap or cron)
OPENSERP_INGESTION_CRON_ENABLED       -- unattended 30-minute schedule may fire
```

`isOpenSerpIngestionWriteAuthorized()` requires the first two; `isOpenSerpIngestionCronAuthorized()`
requires all three. A manual bootstrap run works with `CRON_ENABLED` still false. The cron route
(`/api/internal/cron/openserp-ingestion`) additionally requires a matching
`Authorization: Bearer $OPENSERP_CRON_SECRET` header, is never linked from any UI, and is a safe
200 no-op (not a 500) when any flag is off.

## What this mission never touches

Search Gateway, ranking, badges, public wording, `/listings/[id]` routing for external results,
`duplicate_group_id`, `MARKET_INDEX_OBSERVATIONS_ENABLED`, `MARKET_INDEX_CLUSTERING_ENABLED`. See
`docs/OPENSERP_SOURCE_ADMISSION_POLICY.md` and `docs/OPENSERP_QUERY_COVERAGE_STRATEGY.md` for the
admission and coverage rules in full detail.
