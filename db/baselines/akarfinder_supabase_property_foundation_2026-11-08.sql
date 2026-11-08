-- Akarfinder unified Supabase — source-controlled snapshot of the TWO
-- existing property tables on fresh Supabase mgqsckxsqdqbzqwkgvwo, read from catalog
-- on 2026-11-08. No data, no secrets. This is NOT the historical 214-file replay.
-- Only execute on a new disposable/approved EMPTY Supabase project.
BEGIN;
SET LOCAL search_path = public, pg_catalog;
DO $$ BEGIN
 IF to_regclass('public.property_listings') IS NOT NULL
 OR to_regclass('public.listing_sources') IS NOT NULL
 THEN RAISE EXCEPTION 'baseline_requires_empty_property_tables'; END IF;
END $$;

CREATE TABLE public.property_listings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  canonical_fingerprint text NOT NULL,
  title text,
  price_mad integer,
  city text,
  district text,
  property_type text,
  transaction_type text,
  surface_m2 integer,
  rooms_count integer,
  bedrooms_count integer,
  bathrooms_count integer,
  description_snippet text,
  images_count integer,
  seller_name text,
  data_completeness_score integer DEFAULT 0,
  field_confidence jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  duplicate_group_id text,
  duplicate_score double precision,
  reliability_score integer,
  reliability_badge text,
  reliability_reasons jsonb,
  built_surface_m2 integer,
  plot_surface_m2 integer,
  condition text,
  property_age_range text,
  orientation text,
  floor_type text,
  floors_count integer,
  garden_m2 integer,
  terrace_m2 integer,
  garage_spaces integer,
  has_pool boolean DEFAULT false,
  has_concierge boolean DEFAULT false,
  has_moroccan_living_room boolean DEFAULT false,
  has_european_living_room boolean DEFAULT false,
  has_equipped_kitchen boolean DEFAULT false,
  premium_features jsonb,
  thumbnail_url text,
  CONSTRAINT property_listings_canonical_fingerprint_key UNIQUE (canonical_fingerprint),
  CONSTRAINT property_listings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.listing_sources (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  property_listing_id bigint NOT NULL,
  source_name text NOT NULL,
  listing_url text NOT NULL,
  source_url text,
  first_seen_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  source_offer_key text,
  origin_type text,
  compliance_status text,
  content_fingerprint text,
  ingestion_run_id text,
  displayed_price numeric,
  price_currency text,
  price_period text,
  price_status text,
  CONSTRAINT listing_sources_listing_url_key UNIQUE (listing_url),
  CONSTRAINT listing_sources_origin_type_check CHECK (origin_type IS NULL OR (origin_type = ANY (ARRAY['partner_api'::text, 'partner_feed'::text, 'first_party_user'::text, 'persisted_openserp'::text, 'authorized_static_page'::text, 'legacy_import'::text, 'external_index_seed'::text]))),
  CONSTRAINT listing_sources_pkey PRIMARY KEY (id),
  CONSTRAINT listing_sources_price_status_check CHECK (price_status IS NULL OR (price_status = ANY (ARRAY['valid'::text, 'not_disclosed'::text, 'invalid'::text, 'ambiguous'::text, 'unavailable'::text]))),
  CONSTRAINT listing_sources_property_listing_id_fkey FOREIGN KEY (property_listing_id) REFERENCES property_listings(id) ON DELETE CASCADE
);

CREATE INDEX listing_sources_listing_active_idx ON public.listing_sources USING btree (property_listing_id, is_active, first_seen_at);
CREATE INDEX property_listings_city_district_idx ON public.property_listings USING btree (city, district, updated_at DESC);
CREATE INDEX property_listings_public_filters_idx ON public.property_listings USING btree (city, property_type, transaction_type, data_completeness_score DESC);
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.property_listings, public.listing_sources FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.property_listings, public.listing_sources TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
COMMENT ON TABLE public.property_listings IS 'Indexed data, never sufficient proof of publication rights.';
COMMENT ON TABLE public.listing_sources IS 'Source provenance. Publish only with independently verified permissions.';
COMMIT;
