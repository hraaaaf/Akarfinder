# Market Index — Data Model

Companion to `docs/AKARFINDER_MARKET_INDEX_FOUNDATION.md`. Full field lists for the four domain
concepts. All new tables/columns are nullable-by-default and additive (see `docs/
MARKET_INDEX_MIGRATION_PLAN.md` for the actual SQL).

## A. `discovery_candidates` (new table) — `DiscoveryCandidate`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK, default `gen_random_uuid()` | |
| `provider` | text, not null | e.g. `openserp` |
| `discovery_query` | text | raw query string, no PII expected |
| `query_hash` | text, not null | stable hash of the normalized query |
| `result_rank` | integer | position in the discovery result set |
| `source_domain` | text, not null | e.g. `mubawab.ma` |
| `source_url` | text, not null | as discovered |
| `canonical_url` | text | normalized (tracking params/fragments stripped) |
| `title` | text | |
| `snippet` | text | short snippet only — never full page text |
| `discovered_at` | timestamptz, not null, default `now()` | |
| `last_seen_at` | timestamptz, not null, default `now()` | |
| `discovery_status` | text, not null, default `'discovered'` | see status enum below |
| `compliance_status` | text | e.g. `robots_allowed`, `third_party_legacy`, `unknown` |
| `content_fingerprint` | text | hash of title+snippet, for idempotence/dup detection |
| `metadata` | jsonb | small, bounded — never HTML, never contact info |
| `created_at` | timestamptz, not null, default `now()` | |
| `updated_at` | timestamptz, not null, default `now()` | |

**`discovery_status` values:** `discovered`, `accepted`, `rejected`, `unclassified`, `expired`,
`promoted_to_source_offer`.

**Explicitly never stored:** raw HTML, phone, WhatsApp, seller email, cookies, private headers, tokens,
image galleries. Enforced by `lib/market-index/market-index-validation.ts::validateDiscoveryCandidate()`
(rejects any `metadata`/`snippet`/`title` value matching a PII or HTML-tag pattern).

**Idempotency:** unique index on `(provider, query_hash, canonical_url)` — a `discovery_window` bucket is
folded into `query_hash` computation rather than kept as its own column, to keep the unique index simple
and immutable per discovery run.

## B. `listing_sources` additive columns — `SourceOffer` (extends the existing table)

New nullable columns added to the existing, unmodified `listing_sources` table:

| Column | Type | Notes |
|---|---|---|
| `source_offer_key` | text, nullable | stable per-source identifier if the source exposes one; else null |
| `origin_type` | text, nullable | `partner_api` \| `partner_feed` \| `first_party_user` \| `persisted_openserp` \| `authorized_static_page` \| `legacy_import` |
| `compliance_status` | text, nullable | mirrors `discovery_candidates.compliance_status` for the offer that was promoted from one |
| `content_fingerprint` | text, nullable | hash of title+description, for `Observation` change detection |
| `ingestion_run_id` | text, nullable | which run created/last touched this row |
| `displayed_price` | numeric, nullable | source-level price (may differ from the cluster's `property_listings.price_mad` for genuinely multi-source clusters) |
| `price_currency` | text, nullable | `MAD` today |
| `price_period` | text, nullable | `vente` \| `mois` \| `jour` |
| `price_status` | text, nullable | `valid` \| `not_disclosed` \| `invalid` \| `ambiguous` \| `unavailable` |

**Existing columns, unchanged:** `id`, `property_listing_id`, `source_name`, `listing_url`, `source_url`,
`is_active`, `first_seen_at`, `last_seen_at`.

**Idempotency:** additive unique index on `(source_domain_of(source_url), source_offer_key)` where
non-null; a second additive unique index on `(source_domain_of(source_url), canonical_url_hash)` as the
fallback identity when no `source_offer_key` exists. Both computed via a generated column
(`source_domain` extracted from `source_url`) — see migration plan for the exact SQL, since Postgres
partial unique indexes handle the "only when non-null" requirement natively.

## C. `property_clusters` (new table) — `PropertyCluster`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK, default `gen_random_uuid()` | |
| `cluster_origin` | text, not null | `manual_review` \| `explicit_partner_identifier` \| `deterministic_same_source_identifier` \| `legacy_one_to_one_projection` |
| `legacy_property_listing_id` | bigint, nullable, **unique** | FK → `property_listings.id`; null for a cluster with no legacy backing row |
| `created_at` | timestamptz, not null, default `now()` | |
| `updated_at` | timestamptz, not null, default `now()` | |
| `created_by` | text, nullable | operator/service identity for audit trail |
| `notes` | text, nullable | free-text justification, required (enforced in code, not DB) for `manual_review` origin |

**Clustering rule (mission section 8.C, enforced in code):** `MARKET_INDEX_CLUSTERING_ENABLED` must be
`true` (it never is, in this mission) before more than one `property_cluster_members` row can be attached
to the same `property_cluster_id`. The default backfill mode is exclusively
`legacy_one_to_one_projection` — one cluster per existing `property_listings` row, never merging.

## D. `property_cluster_members` (new table) — cluster ↔ source-offer membership

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK, default `gen_random_uuid()` | |
| `property_cluster_id` | uuid, not null | FK → `property_clusters.id` |
| `source_offer_id` | bigint, not null | FK → `listing_sources.id` |
| `added_at` | timestamptz, not null, default `now()` | |
| `added_by` | text, nullable | operator/service identity |
| `origin_type` | text, not null | same 4-value enum as `property_clusters.cluster_origin`, recorded per-membership too |

**Unique index:** `(property_cluster_id, source_offer_id)` — a given source offer cannot be added twice to
the same cluster.

## E. `source_offer_observations` (new table) — `Observation`, append-only

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK, default `gen_random_uuid()` | |
| `source_offer_id` | bigint, not null | FK → `listing_sources.id` |
| `observed_at` | timestamptz, not null, default `now()` | |
| `displayed_price` | numeric, nullable | |
| `currency` | text, nullable | |
| `surface_m2` | numeric, nullable | |
| `title_fingerprint` | text, nullable | |
| `content_fingerprint` | text, nullable | |
| `source_status` | text, nullable | e.g. `active`, `removed`, `unreachable` |
| `availability_claim` | text, nullable | verbatim claim from the source, never asserted as fact by AkarFinder |
| `observation_origin` | text, not null | e.g. `discovery_ingestion`, `manual_recheck` |
| `ingestion_run_id` | text, nullable | |
| `created_at` | timestamptz, not null, default `now()` | |

**Append-only, enforced two ways:**
1. **Database:** no `UPDATE`/`DELETE` grant is requested in this migration for the application role beyond
   `INSERT`/`SELECT` (RLS policy — see `docs/MARKET_INDEX_SECURITY_AND_RLS.md`).
2. **Code:** `lib/market-index/market-index-repository.ts`'s `ObservationRepository` interface exposes
   only `create()` and `findLatest()` — no `update`/`delete` method exists on the interface at all.

**Idempotency:** unique index on `(source_offer_id, observed_at_bucket, content_fingerprint)` where
`observed_at_bucket` is a generated column truncating `observed_at` to the hour — prevents duplicate
observations from a retried ingestion run without preventing a genuine same-hour re-check that finds a
real change (different `content_fingerprint` still inserts).

## Price semantics (mission section 9, unchanged doctrine)

`price_status` values and their meaning, enforced by `lib/market-index/market-index-price.ts`:

| `price_status` | Meaning | Displayed as |
|---|---|---|
| `valid` | positive numeric price present | the formatted amount |
| `not_disclosed` | source has no price (null/absent) | "Prix non communiqué" |
| `invalid` | non-numeric, `NaN`, `Infinity`, or empty string | "Prix non communiqué" |
| `ambiguous` | a range or multiple conflicting values found, no single number can be trusted | "Prix non communiqué" |
| `unavailable` | listing removed/expired, no current price to show | "Prix non communiqué" |

Zero and negative values are always `invalid`, never `valid`, matching the doctrine already enforced by
`formatPrice()` (`5c94919`) — this mission does not change that function, it only extends the same rule
into the new domain layer for future use.
