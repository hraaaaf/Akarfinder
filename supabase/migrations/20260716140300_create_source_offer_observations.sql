-- AKARFINDER-MARKET-INDEX-FOUNDATION-1
-- Objective: create source_offer_observations (Observation) — append-only time
--   series of a SourceOffer's (listing_sources row's) observed state. Distinct
--   from listing_observation_history, which tracks a different subject
--   (ephemeral Search Gateway candidates, no FK, 0 rows in Production — see
--   docs/MARKET_INDEX_EXISTING_MODEL_AUDIT.md section 3).
-- Preconditions: listing_sources must exist.
-- Impact: creates 1 new table + indexes. Zero impact on listing_sources rows.
-- Lock estimate: negligible (new empty table).
-- Re-run behavior: idempotent via IF NOT EXISTS.
-- Rollback: see bottom of file — safe, this table starts empty and is never
--   written to by this mission (MARKET_INDEX_OBSERVATIONS_ENABLED stays false).

create table if not exists source_offer_observations (
  id uuid primary key default gen_random_uuid(),
  source_offer_id bigint not null references listing_sources(id),
  observed_at timestamptz not null default now(),
  observed_at_bucket timestamptz generated always as (date_trunc('hour', observed_at)) stored,
  displayed_price numeric,
  currency text,
  surface_m2 numeric,
  title_fingerprint text,
  content_fingerprint text,
  source_status text,
  availability_claim text,
  observation_origin text not null,
  ingestion_run_id text,
  created_at timestamptz not null default now()
);

alter table source_offer_observations enable row level security;

-- Idempotency: same source offer, same hour bucket, same content fingerprint
-- is a duplicate observation (e.g. a retried ingestion run), not a new one.
-- A genuine change within the same hour (different content_fingerprint) still
-- inserts a new row.
create unique index if not exists source_offer_observations_idempotency_idx
on source_offer_observations (source_offer_id, observed_at_bucket, content_fingerprint);

create index if not exists source_offer_observations_source_offer_idx
on source_offer_observations (source_offer_id, observed_at desc);

-- ROLLBACK (manual, not auto-applied):
-- drop table if exists source_offer_observations;
