-- R2 archived freshness evidence: READ ONLY, fixed UTC as-of for reproducibility.
-- Run ONLY against archived Neon recovery, NEVER as a production freshness claim.
-- A legacy is_active=true flag and last_seen_at are NOT trusted positive availability evidence.
WITH params AS (
  SELECT TIMESTAMPTZ '2026-11-05 13:03:00+00' AS as_of_utc
)
SELECT s.source_name,
       COUNT(*)::bigint AS source_rows,
       COUNT(*) FILTER (WHERE s.is_active IS TRUE)::bigint AS legacy_flag_active,
       COUNT(*) FILTER (WHERE s.is_active IS FALSE)::bigint AS legacy_flag_inactive,
       COUNT(*) FILTER (WHERE s.is_active IS NULL)::bigint AS legacy_flag_unknown,
       COUNT(*) FILTER (WHERE s.last_seen_at IS NULL)::bigint AS missing_last_seen,
       COUNT(*) FILTER (
         WHERE s.last_seen_at >= p.as_of_utc - INTERVAL '48 hours'
           AND s.last_seen_at <= p.as_of_utc
       )::bigint AS observed_in_previous_48h,
       COUNT(*) FILTER (
         WHERE s.last_seen_at >= TIMESTAMPTZ '2026-10-06 00:00:00+00'
           AND s.last_seen_at <= p.as_of_utc
       )::bigint AS observed_since_oct6,
       MAX(s.last_seen_at) AS max_last_seen_utc
FROM public.listing_sources s
CROSS JOIN params p
WHERE s.source_name IN ('avito.ma','mubawab.ma','mubawab')
GROUP BY s.source_name
ORDER BY s.source_name;

-- No column in listing_sources/property_listings establishes a verified
-- partner-side availability event + evidence reference + checked_at.
-- Consequently eligible_fresh_active counts are UNKNOWN, not 0 or source_rows.
