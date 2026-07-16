-- AKARFINDER-MARKET-INDEX-FOUNDATION-1
-- Objective: create property_clusters (PropertyCluster) — a cluster identity
--   independent of the legacy, unvalidated property_listings.duplicate_group_id
--   heuristic (see docs/MARKET_INDEX_EXISTING_MODEL_AUDIT.md section 4 for why
--   that field cannot be trusted as cluster evidence).
-- Preconditions: property_listings must exist (it does, 316 rows in Production).
-- Impact: creates 1 new table + a nullable, unique FK-style column referencing
--   property_listings.id. No column added to property_listings itself. No
--   existing row is read, written, or locked by this migration.
-- Lock estimate: negligible (new empty table; the FK reference is validated
--   only against future inserts, not backfilled here).
-- Re-run behavior: idempotent via IF NOT EXISTS.
-- Rollback: see bottom of file — safe, this table starts empty.

create table if not exists property_clusters (
  id uuid primary key default gen_random_uuid(),
  cluster_origin text not null,
  legacy_property_listing_id bigint unique references property_listings(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  notes text,
  constraint property_clusters_origin_check check (
    cluster_origin in (
      'manual_review',
      'explicit_partner_identifier',
      'deterministic_same_source_identifier',
      'legacy_one_to_one_projection'
    )
  )
);

alter table property_clusters enable row level security;

create index if not exists property_clusters_origin_idx
on property_clusters (cluster_origin);

-- ROLLBACK (manual, not auto-applied):
-- drop table if exists property_clusters;
