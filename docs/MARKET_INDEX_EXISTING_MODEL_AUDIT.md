# Market Index — Existing Model Audit

**Mission:** AKARFINDER-MARKET-INDEX-FOUNDATION-1, section 6
**Method:** read-only inspection via the Supabase JS client (no direct Postgres connection string is
available in this environment — only `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, i.e. PostgREST access).
Column lists below are the **actual live schema**, inferred from `select("*").limit(1)` responses and
cross-checked against `lib/db/supabase-listings.ts` / `lib/listings/db-listings.ts` types. No raw SQL
introspection (`information_schema`, `pg_policies`) was possible — this is disclosed as a limitation in
`docs/MARKET_INDEX_SECURITY_AND_RLS.md`.

## 1. `property_listings` (316 rows)

**Role:** the single source-of-truth table for a displayed property. One row = one thing shown on
`/search` and `/listings/[id]`.

**Live columns (39):** `id`, `canonical_fingerprint`, `title`, `price_mad`, `city`, `district`,
`property_type`, `transaction_type`, `surface_m2`, `rooms_count`, `bedrooms_count`, `bathrooms_count`,
`description_snippet`, `images_count`, `seller_name`, `data_completeness_score`, `field_confidence`
(jsonb), `created_at`, `updated_at`, `duplicate_group_id`, `duplicate_score`, `reliability_score`,
`reliability_badge`, `reliability_reasons` (jsonb), `built_surface_m2`, `plot_surface_m2`, `condition`,
`property_age_range`, `orientation`, `floor_type`, `floors_count`, `garden_m2`, `terrace_m2`,
`garage_spaces`, `has_pool`, `has_concierge`, `has_moroccan_living_room`, `has_european_living_room`,
`has_equipped_kitchen`, `premium_features` (jsonb).

**Notably absent:** `thumbnail_url` — code (`lib/db/supabase-listings.ts` line 44, `lib/listings/db-listings.ts`
`MUBAWAB-DB-THUMBNAILS-RISK-ACCEPTED-1` comment) already handles its absence gracefully; the Supabase
migration adding it was never applied. Confirmed empirically: not present in a live row's key list.

**Source of truth or projection?** Source of truth for the property's own attributes (price, surface,
city…). NOT a source of truth for *where it was found* — that's `listing_sources`.

**Mutable data:** yes — `price_mad`, `updated_at`, `data_completeness_score`, `reliability_*`,
`duplicate_*` are all updated in place by enrichment/sync scripts (`scripts/scrapers/enrich-p6.ts`,
`scripts/sync-supabase.ts`). There is **no history of prior values** — an update overwrites, it does not
append.

**Provenance:** `field_confidence` (jsonb) carries `{provider, acquisition_provider, publication_lane,
classification_lane}` — this is the *only* place provenance lives today, and it is a loosely-typed JSON
blob, not a normalized column. `deriveSourceDisplayPolicy()` and `derivePersistedExternalDisplayPolicy()`
(`lib/listings/map-db-listing.ts`) both parse it at read time to decide `source_display_type`
(`external_web_result` vs `public_index_source` vs `audit_source`) — **this is computed on every read,
never persisted as its own column.**

**URL handling:** no URL column on `property_listings` itself — URLs live on `listing_sources`.

**Price:** `price_mad` (numeric, nullable). No separate `price_status`/`price_period` column — a `null`
price is the only "not disclosed" signal today; there's no distinction between "not disclosed", "invalid",
and "ambiguous".

**History:** none. No append-only observation log references `property_listings`.

**Relation to "an annonce":** 1 row = 1 displayed property, by construction.

**Multi-source capability today:** **yes, already exercised** — see section 4 below. `listing_sources`
is 1-to-many against `property_listings.id` via `property_listing_id`, and 4 of 316 properties already
have 2-3 attached `listing_sources` rows.

**Multi-observation capability today:** none. No append-only table observes `property_listings` over
time; `updated_at` + in-place overwrites are the only trace of change.

## 2. `listing_sources` (321 rows)

**Role:** represents one (source, URL) pair backing a `property_listings` row.

**Live columns (8):** `id`, `property_listing_id` (FK → `property_listings.id`), `source_name`,
`listing_url`, `source_url`, `is_active`, `first_seen_at`, `last_seen_at`.

**Source of truth or projection?** Source of truth for "which site published this, at which URL, when
first/last seen." It is structurally the closest existing analogue to the mission's `SourceOffer` concept
— **but at the wrong grouping level** (see section 4: some rows attached to the same
`property_listing_id` are demonstrably different properties, not different publications of the same one).

**Provenance:** `source_name` (free string: `mubawab`, `agenz`, `avito`, etc.) — no `ingestion_method`,
no `compliance_status`, no `ingestion_run_id`.

**URL handling:** `listing_url` (as displayed) and `source_url` (canonical?) — the exact distinction
between the two is not documented in code comments; both are plain `text`, no normalization/hash column,
no uniqueness constraint verified (not independently checkable without SQL access — inferred safe
assumption: none, since 4 `property_listing_id`s already carry multiple distinct URLs without apparent
conflict).

**Multi-source:** yes, mechanically supported (`property_listing_id` is not unique in this table). See
section 4 for why this is a **risk finding**, not a clean precedent to build on directly.

## 3. `listing_observation_history` (0 rows, table exists)

**Migration:** `supabase/migrations/20260710093000_create_listing_observation_history.sql` (main repo
only — absent from the OpenSERP worktree's migration folder, meaning it was applied to Production from a
different branch/worktree than the one carrying the price-hotfix work).

**Columns:** `observation_key` (text, PK), `source_host`, `source_url`, `title`, `first_observed_at`,
`last_observed_at`, `observation_count`, `last_query`, `result_kind` (default `'external_gateway'`),
`created_at`, `updated_at`.

**Role:** tracks repeat sightings of a **Search Gateway** result (an ephemeral, non-persisted candidate
surfaced at query time), *not* a persisted `property_listings`/`listing_sources` row. There is **no
foreign key to `property_listings`** — this table is scoped entirely to the Search Gateway's own
candidate stream, a different subsystem from the one this mission's `Observation` concept targets.

**Current usage:** 0 rows in Production. This table exists as schema but has never been written to. It is
explicitly on the mission's "do not touch" list (section 5) and this audit does not touch it — noted here
only to establish that it is **not** a reusable `Observation` implementation for `SourceOffer`
(different subject, different key, no FK, currently unused).

## 4. Critical finding: `duplicate_group_id` and multi-source `listing_sources` already exhibit false merges

This finding directly informs `PropertyCluster`'s design (section 7) and answers architecture question
10 ("comment évite-t-on les faux merges ?") honestly rather than by assumption.

**`duplicate_group_id`** (P5A/P6 heuristic, `lib/listings/duplicate.ts`) is a **coarse, threshold-based,
transitively-chained similarity score** — no hard blocks (no unconditional veto on city/type/transaction
mismatch), just a weighted sum (city 0.25, property_type 0.15, transaction 0.15, price-within-10% 0.15,
surface-within-10% 0.10, same-bedrooms 0.10, title-Jaccard×0.10) unioned via union-find at a 0.70
threshold. 82/316 rows carry a non-null `duplicate_group_id`; **14 groups have >1 member**. Spot-check of
the largest group (id=5, 9 members, all Marrakech apartments "for sale"): prices range 800,000–1,650,000
DH and surfaces range 30–130 m² — **these are not the same property**, and several individual pairs
inside the group would not even meet the pairwise 0.70 threshold directly (transitive union-find chaining
through intermediate members is the likely mechanism, since price and surface differ by well over the
intended ±10%).

**`listing_sources` multi-attachment**: 4 `property_listing_id`s carry 2-3 rows. Inspecting the actual
URLs (e.g. `property_listing_id=134`: `.../palmier-superficie-55-m²-bien-meublé` vs
`.../oasis-1-belle-chambre-antenne-parabolique-et-porte-blindée`) shows **different listing slugs
describing what read as different apartments**, not the same listing re-observed at two URLs. The same
pattern repeats for the other 3 multi-source IDs.

**Conclusion — this is a pre-existing, live, out-of-scope issue, not something this mission introduces or
is asked to fix.** It is documented here because it is the single most important input to this mission's
own design: **`duplicate_group_id` must NOT be treated as a validated `PropertyCluster`, and a
multi-row `listing_sources` attachment must NOT be treated as a validated multi-source `SourceOffer`
group.** Both are products of a legacy, hard-block-free, transitively-chaining heuristic that the
project's own just-concluded Web Index Stack Benchmark (`NO_MATCHING_JUSTIFIED`, `docs/
AKARFINDER_WEB_INDEX_STACK_BENCHMARK_1.md`) would not certify for automatic clustering. This is exactly
the class of error (coarse-attribute false merge, chain-merge via transitive union-find) that benchmark's
cluster-level exploratory check flagged as a real, demonstrated risk in the *new*, harder-corpus
methodology — and it turns out the *old*, already-live heuristic exhibits the same failure mode on real
Production data.

**Design consequence:** the legacy adapter (section 16) treats every `property_listings` row as its own
atomic `PropertyCluster` (`legacy_one_to_one_projection`), and ignores `duplicate_group_id` entirely when
deciding cluster membership. Existing `listing_sources` rows are surfaced as candidate `SourceOffer`
records under their own `property_listings`' cluster, but the adapter does **not** assume that a
multi-row group is a validated same-property observation — it flags this explicitly (see `docs/
MARKET_INDEX_DATA_MODEL.md` question 9-10).

## 5. `public_property_index` (migration exists, table absent in Production)

`supabase/migrations/20260709193000_create_public_property_index_poc.sql` defines this table (FTS
index, trigram search) but **it does not exist in the live Production schema** (`PostgREST` returns
`Could not find the table 'public.public_property_index' in the schema cache`). This was a POC migration,
apparently applied to a different environment (or never applied at all) — not a live dependency. Not
touched by this mission.

## 6. `search_gateway_cache` (0 rows, table exists)

`supabase/migrations/20260706130000_create_search_gateway_cache.sql`. Currently empty in Production
(confirmed via a read-only count). Backs the ephemeral Search Gateway result cache, unrelated to
persisted listings. Not touched.

## 7. Repositories / services / APIs touching these tables

| File | Role |
|---|---|
| `lib/listings/db-listings.ts` | SQLite (local dev) reader — same `DbListingRow` shape reused for Supabase |
| `lib/db/supabase-listings.ts` | Supabase (Production) reader — maps `property_listings` + embedded `listing_sources` to `DbListingRow` |
| `lib/listings/map-db-listing.ts` | `DbListingRow` → public `Listing` type; computes `source_display_type`/SERP display policy at read time (not persisted) |
| `lib/listings/duplicate.ts` | P5A/P6 similarity scoring + union-find grouping — writes `duplicate_group_id`/`duplicate_score` via enrichment scripts, not at request time |
| `lib/listings/reliability.ts` | Computes `reliability_score`/`reliability_badge` when not already persisted |
| `lib/openserp-ingestion/*` | OpenSERP discovery → classification → persisted write pipeline (writes `property_listings`/`listing_sources` with `field_confidence.provider="openserp"`) |
| `scripts/scrapers/enrich-p6.ts`, `scripts/sync-supabase.ts` | Batch enrichment/sync jobs that populate `duplicate_group_id`, `reliability_score`, etc. |
| `app/api/search`, `app/api/search/gateway` (implied by `search-result-display-model.ts` usage) | Public read APIs |

**TypeScript types:** hand-written (`lib/listings/types.ts`, `lib/listings/db-listings.ts`,
`lib/db/supabase-listings.ts`), not generated from the DB schema. No `supabase gen types` artifact found
in the repo.

## 8. Constraints, indexes, RLS — verifiability limitation

No direct Postgres connection was available in this environment (no `DATABASE_URL`/`SUPABASE_DB_URL` in
`.env.local`/`.env.mission`), only PostgREST access via the service-role key. This means:
- Foreign keys, unique constraints, and indexes on `property_listings`/`listing_sources` could not be
  read directly from `information_schema` / `pg_constraint` / `pg_indexes`.
- RLS policies could not be read directly from `pg_policies`.

What *is* verifiable: the service-role key bypasses RLS by design (used throughout server-side code), and
no anonymous/public Supabase key is used client-side for these tables (confirmed by grep — all
`property_listings`/`listing_sources` access goes through server-side API routes, never a client-side
Supabase call). This is documented as an audit limitation, not assumed away, in
`docs/MARKET_INDEX_SECURITY_AND_RLS.md`.

## 9. Summary table

| Existing table | Rows | Closest Market Index concept | Reused as-is? |
|---|---|---|---|
| `property_listings` | 316 | `PropertyCluster` (1:1 per legacy row) | Extended additively, not duplicated |
| `listing_sources` | 321 | `SourceOffer` (partial — see finding above) | Extended additively via a read adapter, not trusted for multi-source grouping |
| `listing_observation_history` | 0 | Not `Observation` (different subject: Search Gateway candidates, no FK) | Not reused, not touched |
| `duplicate_group_id` (column) | 82 tagged / 14 multi-groups | **Not** `PropertyCluster` — demonstrated false merges | Explicitly NOT reused as cluster evidence |
| `public_property_index` | absent in Production | N/A (POC, unapplied) | N/A |
| `search_gateway_cache` | 0 | N/A (ephemeral Gateway cache) | N/A |
