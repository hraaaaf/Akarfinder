-- Applied on 2026-11-08 to the freshly selected Supabase project
-- mgqsckxsqdqbzqwkgvwo as migration
-- akarfinder_unified_market_authorized_observations_v1.
-- Server-only observational data: no external/OpenSERP sources without
-- separately proved publication rights. This is NOT an offer census.
CREATE OR REPLACE FUNCTION public.read_market_observations_v1(
  p_city text,
  p_district_variants text[],
  p_authorized_sources text[],
  p_max_rows integer DEFAULT 10001
)
RETURNS TABLE (
  id bigint,
  canonical_fingerprint text,
  district text,
  transaction_type text,
  price_mad integer,
  surface_m2 integer,
  updated_at timestamp with time zone,
  source_name text,
  listing_url text,
  source_url text
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT pl.id, pl.canonical_fingerprint, pl.district,
         pl.transaction_type, pl.price_mad, pl.surface_m2,
         pl.updated_at, ls.source_name, ls.listing_url, ls.source_url
  FROM public.property_listings AS pl
  JOIN LATERAL (
    SELECT s.source_name, s.listing_url, s.source_url
    FROM public.listing_sources AS s
    WHERE s.property_listing_id = pl.id AND s.is_active IS TRUE
      AND lower(btrim(s.source_name)) = ANY (p_authorized_sources)
    ORDER BY s.first_seen_at NULLS LAST, s.id
    LIMIT 1
  ) AS ls ON TRUE
  WHERE lower(btrim(pl.city)) = lower(btrim(p_city))
    AND lower(btrim(pl.district)) = ANY (p_district_variants)
  ORDER BY pl.updated_at DESC NULLS LAST, pl.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_max_rows,10001),1),10001);
$$;
REVOKE ALL ON FUNCTION public.read_market_observations_v1(text,text[],text[],integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_market_observations_v1(text,text[],text[],integer) TO service_role;
COMMENT ON FUNCTION public.read_market_observations_v1(text,text[],text[],integer)
IS 'Akarfinder server-only observations of authorized active sources. Not freshness, price or availability certification.';
