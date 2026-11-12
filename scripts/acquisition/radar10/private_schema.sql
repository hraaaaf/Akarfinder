-- PRIVATE ONLY. PROPOSAL, NOT AN APPLIED SUPABASE MIGRATION.
CREATE SCHEMA IF NOT EXISTS acquisition;
REVOKE ALL ON SCHEMA acquisition FROM PUBLIC;
CREATE TABLE IF NOT EXISTS acquisition.radar_candidates (
  source_url text PRIMARY KEY CHECK (length(source_url) BETWEEN 16 AND 2048),
  source_domain text NOT NULL,
  source_offer_id text NOT NULL,
  title text,
  city text,
  district text,
  price_mad bigint,
  surface_m2 numeric,
  property_type text,
  transaction_type text,
  quality_status text NOT NULL CHECK (quality_status IN
      ('ready_internal','complete_requires_freshness','requires_manual_review','partial')),
  raw_sha256 text NOT NULL CHECK (raw_sha256 ~ '^[0-9a-f]{64}$'),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  first_discovered_at timestamptz NOT NULL DEFAULT now(),
  last_observed_at timestamptz NOT NULL DEFAULT now(),
  changed_at timestamptz NOT NULL DEFAULT now(),
  freshness_independently_verified boolean NOT NULL DEFAULT false
      CHECK (freshness_independently_verified = false),
  publication_eligible boolean NOT NULL DEFAULT false
      CHECK (publication_eligible = false),
  UNIQUE (source_domain, source_offer_id)
);
CREATE INDEX IF NOT EXISTS radar_candidates_seen_idx
  ON acquisition.radar_candidates(last_observed_at DESC);
CREATE TABLE IF NOT EXISTS acquisition.radar_runs (
  run_id uuid PRIMARY KEY,
  finished_at timestamptz NOT NULL DEFAULT now(),
  snapshot_sha256 text NOT NULL CHECK (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  observed_count integer NOT NULL CHECK (observed_count >= 0),
  accepted_count integer NOT NULL CHECK (accepted_count >= 0),
  inserted_count integer NOT NULL CHECK (inserted_count >= 0),
  updated_count integer NOT NULL CHECK (updated_count >= 0),
  unchanged_count integer NOT NULL CHECK (unchanged_count >= 0),
  rejected_count integer NOT NULL CHECK (rejected_count >= 0),
  public_writes integer NOT NULL DEFAULT 0 CHECK (public_writes = 0)
);
REVOKE ALL ON ALL TABLES IN SCHEMA acquisition FROM PUBLIC;
DO $$
BEGIN
 IF to_regrole('anon') IS NOT NULL THEN
   EXECUTE 'REVOKE ALL ON SCHEMA acquisition FROM anon';
   EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA acquisition FROM anon';
 END IF;
 IF to_regrole('authenticated') IS NOT NULL THEN
   EXECUTE 'REVOKE ALL ON SCHEMA acquisition FROM authenticated';
   EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA acquisition FROM authenticated';
 END IF;
END $$;
