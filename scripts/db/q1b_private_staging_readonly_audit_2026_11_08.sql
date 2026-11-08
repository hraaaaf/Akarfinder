-- DB-10, private historical-only Q1B SQL audit.
-- No raw records are printed, no public/partner publication, no writes.
-- Invoke only with privileged SQL access. NOT a PostgREST/Data API endpoint.
BEGIN TRANSACTION READ ONLY;
SELECT
  COUNT(*)::int AS archived_observations,
  COUNT(DISTINCT canonical_url)::int AS distinct_urls,
  COUNT(DISTINCT (source_domain, source_listing_id))::int AS source_identities,
  COUNT(*) FILTER (WHERE rights_status='unknown_not_proven'
    AND publication_state='private_historical_only' AND is_public=false)::int AS private_only,
  COUNT(*) FILTER (WHERE district IS NOT NULL)::int AS with_district,
  COUNT(*) FILTER (WHERE observed_at >= timestamptz '2026-10-09')::int AS observed_last_30_days,
  COUNT(*) - COUNT(DISTINCT (source_domain, source_listing_id, observed_at)) AS normalized_timestamp_collisions
FROM akarfinder_internal.historical_listing_observations;

SELECT source_domain, COUNT(*)::int AS historical_observations
FROM akarfinder_internal.historical_listing_observations
GROUP BY source_domain ORDER BY historical_observations DESC;

SELECT price_currency, transaction_type, COUNT(*)::int AS historical_observations
FROM akarfinder_internal.historical_listing_observations
GROUP BY price_currency, transaction_type ORDER BY price_currency, transaction_type;

-- Private demo search: case-insensitive city, exact original MAD currency,
-- not a current availability/ranking/live-offer result.
SELECT property_type, transaction_type, COUNT(*)::int AS historical_observations
FROM akarfinder_internal.historical_listing_observations
WHERE lower(trim(city))='casablanca'
  AND price_currency='MAD'
  AND price_amount BETWEEN 500000 AND 2000000
  AND surface_m2 BETWEEN 50 AND 150
GROUP BY property_type, transaction_type
ORDER BY historical_observations DESC;

SELECT
 (SELECT COUNT(*) FROM public.property_listings) AS public_listings,
 (SELECT COUNT(*) FROM public.listing_sources) AS public_sources,
 (SELECT COUNT(*) FROM public.owner_listing_representations) AS public_owner_rows;
COMMIT;
