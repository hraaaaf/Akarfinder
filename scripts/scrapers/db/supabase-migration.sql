-- Supabase / PostgreSQL migration for P3.
-- Apply with: supabase db push  OR  psql -f supabase-migration.sql
--
-- Equivalent of db/schema.sql, written in PostgreSQL dialect.

CREATE TABLE IF NOT EXISTS scrape_runs (
  id                   BIGINT    PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  started_at           TIMESTAMPTZ NOT NULL,
  finished_at          TIMESTAMPTZ,
  source_file          TEXT,
  source_file_hash     TEXT        UNIQUE,
  sources_attempted    JSONB,
  sources_succeeded    JSONB,
  total_raw            INTEGER     DEFAULT 0,
  total_clean          INTEGER     DEFAULT 0,
  errors_count         INTEGER     DEFAULT 0,
  quality_report_json  JSONB,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_listings (
  id             BIGINT   PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  scrape_run_id  BIGINT   NOT NULL REFERENCES scrape_runs(id) ON DELETE CASCADE,
  source_name    TEXT     NOT NULL,
  source_url     TEXT,
  listing_url    TEXT     NOT NULL,
  raw_json       JSONB    NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scrape_run_id, listing_url)
);

CREATE TABLE IF NOT EXISTS property_listings (
  id                      BIGINT   PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  canonical_fingerprint   TEXT     NOT NULL UNIQUE,
  title                   TEXT,
  price_mad               INTEGER,
  city                    TEXT,
  district                TEXT,
  property_type           TEXT,
  transaction_type        TEXT,
  surface_m2              INTEGER,
  rooms_count             INTEGER,
  bedrooms_count          INTEGER,
  bathrooms_count         INTEGER,
  description_snippet     TEXT,
  images_count            INTEGER,
  seller_name             TEXT,
  data_completeness_score INTEGER  DEFAULT 0,
  field_confidence        JSONB,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listing_sources (
  id                   BIGINT   PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  property_listing_id  BIGINT   NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  source_name          TEXT     NOT NULL,
  listing_url          TEXT     NOT NULL UNIQUE,
  source_url           TEXT,
  first_seen_at        TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at         TIMESTAMPTZ DEFAULT NOW(),
  is_active            BOOLEAN  DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_pl_city        ON property_listings(city);
CREATE INDEX IF NOT EXISTS idx_pl_type_tx     ON property_listings(property_type, transaction_type);
CREATE INDEX IF NOT EXISTS idx_pl_price       ON property_listings(price_mad);
CREATE INDEX IF NOT EXISTS idx_pl_surface     ON property_listings(surface_m2);
CREATE INDEX IF NOT EXISTS idx_pl_fingerprint ON property_listings(canonical_fingerprint);
CREATE INDEX IF NOT EXISTS idx_rl_run         ON raw_listings(scrape_run_id);
CREATE INDEX IF NOT EXISTS idx_ls_property    ON listing_sources(property_listing_id);

-- P6: persisted enrichment columns (safe to re-run — IF NOT EXISTS).
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS duplicate_group_id TEXT;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS duplicate_score     DOUBLE PRECISION;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS reliability_score   INTEGER;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS reliability_badge   TEXT;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS reliability_reasons JSONB;

CREATE INDEX IF NOT EXISTS idx_pl_dup_group ON property_listings(duplicate_group_id);
CREATE INDEX IF NOT EXISTS idx_pl_rel_score ON property_listings(reliability_score);

-- P8A: advanced property characteristics (safe to re-run — IF NOT EXISTS).
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS built_surface_m2        INTEGER;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS plot_surface_m2         INTEGER;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS condition                TEXT;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS property_age_range      TEXT;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS orientation              TEXT;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS floor_type              TEXT;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS floors_count            INTEGER;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS garden_m2               INTEGER;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS terrace_m2              INTEGER;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS garage_spaces           INTEGER;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS has_pool                BOOLEAN DEFAULT FALSE;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS has_concierge           BOOLEAN DEFAULT FALSE;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS has_moroccan_living_room BOOLEAN DEFAULT FALSE;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS has_european_living_room BOOLEAN DEFAULT FALSE;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS has_equipped_kitchen    BOOLEAN DEFAULT FALSE;
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS premium_features        JSONB;

-- Enable Row Level Security (Supabase default best practice).
-- ENABLE ROW LEVEL SECURITY is idempotent (safe to re-run).
ALTER TABLE scrape_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_listings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_sources  ENABLE ROW LEVEL SECURITY;

-- Service-role policy: full access for backend ingestion.
-- DROP IF EXISTS makes the whole block idempotent — safe to re-run.
DROP POLICY IF EXISTS "service_role_all" ON scrape_runs;
DROP POLICY IF EXISTS "service_role_all" ON raw_listings;
DROP POLICY IF EXISTS "service_role_all" ON property_listings;
DROP POLICY IF EXISTS "service_role_all" ON listing_sources;

CREATE POLICY "service_role_all" ON scrape_runs      FOR ALL USING (true);
CREATE POLICY "service_role_all" ON raw_listings     FOR ALL USING (true);
CREATE POLICY "service_role_all" ON property_listings FOR ALL USING (true);
CREATE POLICY "service_role_all" ON listing_sources  FOR ALL USING (true);

-- P7: read-only anon access for property_listings (public data, no PII).
-- Uncomment if you want to expose read access via the anon key.
-- DROP POLICY IF EXISTS "anon_read" ON property_listings;
-- DROP POLICY IF EXISTS "anon_read" ON listing_sources;
-- CREATE POLICY "anon_read" ON property_listings FOR SELECT USING (true);
-- CREATE POLICY "anon_read" ON listing_sources   FOR SELECT USING (true);
