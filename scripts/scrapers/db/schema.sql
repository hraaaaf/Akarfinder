-- P3 SQLite schema — AkarFinder scraping pipeline.
-- For Supabase/PostgreSQL migration see: db/supabase-migration.sql
--
-- Differences vs PostgreSQL:
--   AUTOINCREMENT  →  BIGSERIAL / GENERATED ALWAYS AS IDENTITY
--   TEXT (jsonb)   →  JSONB
--   INTEGER (bool) →  BOOLEAN
--   datetime('now') → NOW()

-- Audit log: one row per ingest run.
CREATE TABLE IF NOT EXISTS scrape_runs (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at           TEXT    NOT NULL,
  finished_at          TEXT,
  source_file          TEXT,
  source_file_hash     TEXT    UNIQUE,   -- idempotency guard: same file → same hash → skip
  sources_attempted    TEXT,             -- JSON array  ["avito","mubawab","sarouty"]
  sources_succeeded    TEXT,             -- JSON array
  total_raw            INTEGER DEFAULT 0,
  total_clean          INTEGER DEFAULT 0,
  errors_count         INTEGER DEFAULT 0,
  quality_report_json  TEXT,             -- full source-quality-report.json content
  created_at           TEXT    DEFAULT (datetime('now'))
);

-- One row per listing per ingest run — raw audit copy.
CREATE TABLE IF NOT EXISTS raw_listings (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  scrape_run_id  INTEGER NOT NULL REFERENCES scrape_runs(id) ON DELETE CASCADE,
  source_name    TEXT    NOT NULL,
  source_url     TEXT,
  listing_url    TEXT    NOT NULL,
  raw_json       TEXT    NOT NULL,   -- full ScrapedListingP0 serialised
  created_at     TEXT    DEFAULT (datetime('now')),
  UNIQUE(scrape_run_id, listing_url)
);

-- Deduplicated canonical listing — one row per logical property.
-- P3: deduplication is approximate via canonical_fingerprint.
-- P4 will introduce duplicate groups + reliability scoring.
CREATE TABLE IF NOT EXISTS property_listings (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_fingerprint   TEXT    NOT NULL UNIQUE,
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
  data_completeness_score INTEGER DEFAULT 0,
  field_confidence        TEXT,   -- JSON FieldConfidence object
  -- P6: persisted enrichment (added via runMigrations for existing DBs; NULL = not yet enriched)
  duplicate_group_id      TEXT,
  duplicate_score         REAL,
  reliability_score       INTEGER,
  reliability_badge       TEXT,
  reliability_reasons     TEXT,   -- JSON string[]
  -- P8A: advanced property characteristics (NULL = not yet extracted)
  built_surface_m2        INTEGER,
  plot_surface_m2         INTEGER,
  condition               TEXT,
  property_age_range      TEXT,
  orientation             TEXT,
  floor_type              TEXT,
  floors_count            INTEGER,
  garden_m2               INTEGER,
  terrace_m2              INTEGER,
  garage_spaces           INTEGER,
  has_pool                INTEGER DEFAULT 0,
  has_concierge           INTEGER DEFAULT 0,
  has_moroccan_living_room INTEGER DEFAULT 0,
  has_european_living_room INTEGER DEFAULT 0,
  has_equipped_kitchen    INTEGER DEFAULT 0,
  premium_features        TEXT,   -- JSON string[]
  created_at              TEXT    DEFAULT (datetime('now')),
  updated_at              TEXT    DEFAULT (datetime('now'))
);

-- Source URLs linked to a canonical property — one row per unique URL.
CREATE TABLE IF NOT EXISTS listing_sources (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  property_listing_id  INTEGER NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  source_name          TEXT    NOT NULL,
  listing_url          TEXT    NOT NULL UNIQUE,
  source_url           TEXT,
  first_seen_at        TEXT    DEFAULT (datetime('now')),
  last_seen_at         TEXT    DEFAULT (datetime('now')),
  is_active            INTEGER DEFAULT 1   -- 1=true, 0=false
);

-- Indexes for the most common query patterns.
CREATE INDEX IF NOT EXISTS idx_pl_city        ON property_listings(city);
CREATE INDEX IF NOT EXISTS idx_pl_type_tx     ON property_listings(property_type, transaction_type);
CREATE INDEX IF NOT EXISTS idx_pl_price       ON property_listings(price_mad);
CREATE INDEX IF NOT EXISTS idx_pl_surface     ON property_listings(surface_m2);
CREATE INDEX IF NOT EXISTS idx_pl_fingerprint ON property_listings(canonical_fingerprint);
CREATE INDEX IF NOT EXISTS idx_rl_run         ON raw_listings(scrape_run_id);
CREATE INDEX IF NOT EXISTS idx_ls_property    ON listing_sources(property_listing_id);
