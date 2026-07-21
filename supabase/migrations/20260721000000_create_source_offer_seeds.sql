-- AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#4/10 Common Crawl bulk seed harvest)
-- Objective: create source_offer_seeds — a raw, unvalidated stock of bulk-
--   discovered canonical URLs (Common Crawl CDX today, other bulk-discovery
--   providers later). Distinct from:
--   - discovery_candidates: query-based discovery events (provider+query_hash
--     +canonical_url identity) — a CDX seed has no discovery_query/query_hash,
--     synthesizing one would misrepresent it as query-based discovery.
--   - source_offer_observations: observations of an EXISTING listing_sources
--     row (source_offer_id bigint not null references listing_sources(id)).
--     A seed_only URL has no listing_sources row by design (doctrine: no
--     property/listing is ever created from a seed alone) — the NOT NULL FK
--     makes this table structurally unable to represent a seed.
-- Preconditions: none.
-- Impact: creates 1 new table + indexes. Zero impact on any existing table/row.
-- Lock estimate: negligible (new empty table, no lock on existing tables).
-- Re-run behavior: idempotent via IF NOT EXISTS on table/index/constraint.
-- Rollback: see bottom of file — safe, table starts empty and nothing else
--   depends on it (no writer ships enabled by this migration alone).
--
-- Invariant (enforced at application level, not by this migration): a row
-- with freshness_status = 'seed_only' must NEVER surface in public search
-- and must NEVER cause a property_listing/listing_sources row to be created.
-- Promotion out of seed_only requires exact canonical_url reobservation by
-- an authorized fresh channel (OpenSERP/Yandex), never Common Crawl alone.

create table if not exists source_offer_seeds (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null,
  source_domain text not null,
  seed_provider text not null,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  observation_count integer not null default 1,
  metadata jsonb,
  freshness_status text not null default 'seed_only',
  fresh_last_seen_at timestamptz,
  fresh_channels text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_offer_seeds_freshness_status_check check (
    freshness_status in ('seed_only', 'fresh_confirmed', 'aging', 'stale', 'rejected')
  ),
  constraint source_offer_seeds_observation_count_check check (observation_count >= 1)
);

alter table source_offer_seeds enable row level security;

-- Idempotency: one logical row per canonical_url, regardless of provider or
-- how many times it was re-observed across CDX indexes/harvest runs.
create unique index if not exists source_offer_seeds_canonical_url_idx
on source_offer_seeds (canonical_url);

create index if not exists source_offer_seeds_source_domain_idx
on source_offer_seeds (source_domain);

create index if not exists source_offer_seeds_freshness_status_idx
on source_offer_seeds (freshness_status);

create index if not exists source_offer_seeds_last_observed_at_idx
on source_offer_seeds (last_observed_at desc);

-- Service-role only: no anonymous/public read or write policy created.
-- (No policy = no access under RLS for any role other than service_role,
-- matching discovery_candidates/source_offer_observations in this project.)

-- ROLLBACK (manual, not auto-applied):
-- drop table if exists source_offer_seeds;
