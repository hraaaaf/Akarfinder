-- Historical, unlicensed listing observations for PRIVATE internal diagnostics only.
-- NEVER join to public.property_listings or public.listing_sources. Never publish.
-- Dataset Q1B 2026-11-07, 9990 historical URL observations, 0 rights proven.
-- Supabase project's Data API must not expose the akarfinder_internal schema.
BEGIN;
DO $preflight$
BEGIN
  IF to_regclass('akarfinder_internal.historical_listing_observations') IS NOT NULL THEN
    RAISE EXCEPTION 'historical_staging_must_be_new';
  END IF;
END $preflight$;

CREATE SCHEMA IF NOT EXISTS akarfinder_internal;
REVOKE ALL ON SCHEMA akarfinder_internal FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE akarfinder_internal.historical_listing_observations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dataset_id text NOT NULL DEFAULT 'q1b_detailed_union_20261107'
    CHECK (dataset_id = 'q1b_detailed_union_20261107'),
  source_domain text NOT NULL,
  source_listing_id text NOT NULL,
  canonical_url text NOT NULL,
  title text NOT NULL,
  city text NOT NULL,
  district text,
  property_type text NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('sale','rent')),
  price_amount numeric(18,2) NOT NULL CHECK (price_amount > 0),
  price_currency text NOT NULL CHECK (price_currency IN ('MAD','EUR','USD')),
  surface_m2 numeric(14,2) NOT NULL CHECK (surface_m2 > 0),
  observed_at timestamptz NOT NULL,
  observed_at_raw text NOT NULL,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  evidence_store text NOT NULL,
  payload_hash text,
  quality_status text NOT NULL DEFAULT 'historical_detailed'
    CHECK (quality_status = 'historical_detailed'),
  rights_status text NOT NULL DEFAULT 'unknown_not_proven'
    CHECK (rights_status = 'unknown_not_proven'),
  publication_state text NOT NULL DEFAULT 'private_historical_only'
    CHECK (publication_state = 'private_historical_only'),
  is_public boolean NOT NULL DEFAULT false CHECK (is_public = false),
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT historical_observation_identity UNIQUE (source_domain, source_listing_id, observed_at_raw),
  CONSTRAINT historical_observation_url UNIQUE (canonical_url)
);

CREATE INDEX historical_q1b_filter_idx
  ON akarfinder_internal.historical_listing_observations
  (city, property_type, transaction_type, price_amount, surface_m2);
CREATE INDEX historical_q1b_source_idx
  ON akarfinder_internal.historical_listing_observations (source_domain, observed_at DESC);

ALTER TABLE akarfinder_internal.historical_listing_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE akarfinder_internal.historical_listing_observations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA akarfinder_internal FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA akarfinder_internal FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON SCHEMA akarfinder_internal IS
  'Internal-only historical analysis. Not exposed by PostgREST. No public listing rights.';
COMMENT ON TABLE akarfinder_internal.historical_listing_observations IS
  'Q1B 9990 historical observations; source rights and offer freshness unverified. Never public.';
COMMIT;
