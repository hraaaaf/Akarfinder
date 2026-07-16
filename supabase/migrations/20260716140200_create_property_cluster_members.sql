-- AKARFINDER-MARKET-INDEX-FOUNDATION-1
-- Objective: create property_cluster_members — auditable join table recording
--   exactly which SourceOffer (listing_sources row) belongs to which
--   PropertyCluster, and by which authorized origin. This is the single choke
--   point that makes automatic clustering structurally impossible: a row here
--   is only ever created by code paths gated behind an explicit, non-scoring
--   origin_type (see lib/market-index/market-index-service.ts).
-- Preconditions: property_clusters and listing_sources must exist.
-- Impact: creates 1 new table + indexes. Zero impact on listing_sources rows
--   (no column added there by this migration).
-- Lock estimate: negligible (new empty table).
-- Re-run behavior: idempotent via IF NOT EXISTS.
-- Rollback: see bottom of file — safe, this table starts empty.

create table if not exists property_cluster_members (
  id uuid primary key default gen_random_uuid(),
  property_cluster_id uuid not null references property_clusters(id),
  source_offer_id bigint not null references listing_sources(id),
  added_at timestamptz not null default now(),
  added_by text,
  origin_type text not null,
  constraint property_cluster_members_origin_check check (
    origin_type in (
      'manual_review',
      'explicit_partner_identifier',
      'deterministic_same_source_identifier',
      'legacy_one_to_one_projection'
    )
  )
);

alter table property_cluster_members enable row level security;

create unique index if not exists property_cluster_members_unique_idx
on property_cluster_members (property_cluster_id, source_offer_id);

create index if not exists property_cluster_members_source_offer_idx
on property_cluster_members (source_offer_id);

-- ROLLBACK (manual, not auto-applied):
-- drop table if exists property_cluster_members;
