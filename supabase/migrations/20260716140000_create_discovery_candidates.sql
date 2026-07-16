-- AKARFINDER-MARKET-INDEX-FOUNDATION-1
-- Objective: create discovery_candidates (DiscoveryCandidate) — pre-admission
--   staging for a discovered result, before it is promoted to a SourceOffer.
-- Preconditions: none. Purely additive, new table, no dependency on existing data.
-- Impact: creates 1 new table + indexes + RLS (service-role only, no public grant).
--   Zero impact on property_listings/listing_sources/any existing table or row.
-- Lock estimate: negligible (new empty table, no lock on existing tables).
-- Re-run behavior: idempotent via IF NOT EXISTS on table/index/policy creation.
-- Rollback: see bottom of file (commented DROP block) — safe, no data loss possible
--   since this table starts empty and nothing else depends on it yet
--   (MARKET_INDEX_WRITE_ENABLED stays false).

create extension if not exists pgcrypto;

create table if not exists discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  discovery_query text,
  query_hash text not null,
  result_rank integer,
  source_domain text not null,
  source_url text not null,
  canonical_url text,
  title text,
  snippet text,
  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  discovery_status text not null default 'discovered',
  compliance_status text,
  content_fingerprint text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discovery_candidates_status_check check (
    discovery_status in ('discovered', 'accepted', 'rejected', 'unclassified', 'expired', 'promoted_to_source_offer')
  )
);

alter table discovery_candidates enable row level security;

-- Idempotency: same provider+query+canonical URL is one candidate, not a duplicate row.
create unique index if not exists discovery_candidates_idempotency_idx
on discovery_candidates (provider, query_hash, canonical_url)
where canonical_url is not null;

create index if not exists discovery_candidates_source_domain_idx
on discovery_candidates (source_domain);

create index if not exists discovery_candidates_status_idx
on discovery_candidates (discovery_status);

create index if not exists discovery_candidates_discovered_at_idx
on discovery_candidates (discovered_at desc);

-- Service-role only: no anonymous/public read or write policy created.
-- (No policy = no access under RLS for any role other than service_role,
-- which bypasses RLS entirely — matches the pattern already used by
-- listing_observation_history and search_gateway_cache in this project.)

-- ROLLBACK (manual, not auto-applied):
-- drop table if exists discovery_candidates;
