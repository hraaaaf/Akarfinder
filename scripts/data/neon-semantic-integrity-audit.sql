-- NEON SEMANTIC INTEGRITY AUDIT — READ ONLY
-- Goal: detect semantic contradictions before any row can be considered certified.
-- No mutation. No inferred repair. Ambiguous/suspicious rows must remain uncertified.

WITH base AS (
  SELECT
    p.id,
    p.title,
    p.city,
    p.district,
    p.property_type,
    p.transaction_type,
    p.price_mad,
    p.surface_m2,
    p.rooms_count,
    p.bedrooms_count,
    p.bathrooms_count,
    p.description_snippet,
    s.source_name,
    s.listing_url,
    lower(coalesce(p.title,'')) AS title_l,
    lower(coalesce(s.listing_url,'')) AS url_l
  FROM property_listings p
  JOIN listing_sources s ON s.property_listing_id = p.id
),
typed AS (
  SELECT *,
    CASE
      WHEN title_l ~ '(^|[^a-z])(terrain|lot de terrain|ferme)([^a-z]|$)' THEN 'land'
      WHEN title_l ~ '(^|[^a-z])(villa)([^a-z]|$)' THEN 'villa'
      WHEN title_l ~ '(^|[^a-z])(studio)([^a-z]|$)' THEN 'studio'
      WHEN title_l ~ '(^|[^a-z])(bureau|plateau bureau)([^a-z]|$)' THEN 'office'
      WHEN title_l ~ '(^|[^a-z])(local commercial|commerce|magasin)([^a-z]|$)' THEN 'commercial'
      WHEN title_l ~ '(^|[^a-z])(riad)([^a-z]|$)' THEN 'riad'
      WHEN title_l ~ '(^|[^a-z])(appartement|appart)([^a-z]|$)' THEN 'apartment'
      WHEN title_l ~ '(^|[^a-z])(maison)([^a-z]|$)' THEN 'house'
    END AS strong_title_type,
    CASE
      WHEN title_l ~ '(à|a)[[:space:]]+vendre|vente|vendu'
        OR url_l ~ '/(vente|vendre|achat|buy)(/|[-_])' THEN 'sale'
      WHEN title_l ~ '(à|a)[[:space:]]+louer|location|loué|loue'
        OR url_l ~ '/(location|louer|rent)(/|[-_])' THEN 'rent'
    END AS strong_tx_evidence
  FROM base
),
flags AS (
  SELECT *,
    (transaction_type NOT IN ('sale','rent')) AS bad_tx_enum,
    (
      strong_tx_evidence IS NOT NULL
      AND transaction_type <> strong_tx_evidence
      AND (
        (strong_tx_evidence='sale' AND (title_l ~ '(à|a)[[:space:]]+vendre|vente|vendu') AND url_l ~ '/(vente|vendre|achat|buy)(/|[-_])')
        OR
        (strong_tx_evidence='rent' AND (title_l ~ '(à|a)[[:space:]]+louer|location|loué|loue') AND url_l ~ '/(location|louer|rent)(/|[-_])')
      )
    ) AS strong_tx_contradiction,
    (
      strong_title_type IS NOT NULL
      AND property_type <> strong_title_type
      AND NOT (strong_title_type='studio' AND property_type='apartment')
      AND NOT (strong_title_type='villa' AND property_type='house')
      AND NOT (strong_title_type='house' AND property_type='villa')
      AND NOT (strong_title_type='riad' AND property_type IN ('house','villa'))
    ) AS strong_type_contradiction,
    (
      surface_m2 IS NOT NULL AND (
        surface_m2 < 8
        OR (property_type <> 'land' AND surface_m2 > 10000)
        OR (property_type = 'land' AND surface_m2 > 10000000)
      )
    ) AS suspicious_surface,
    (
      bedrooms_count IS NOT NULL AND (bedrooms_count < 0 OR bedrooms_count > 30)
    ) AS suspicious_bedrooms,
    (
      bathrooms_count IS NOT NULL AND (bathrooms_count < 0 OR bathrooms_count > 20)
    ) AS suspicious_bathrooms,
    (
      rooms_count IS NOT NULL AND (rooms_count < 0 OR rooms_count > 50)
    ) AS suspicious_rooms,
    (
      price_mad IS NOT NULL AND (
        (transaction_type='sale' AND price_mad < 10000)
        OR (transaction_type='rent' AND price_mad < 100)
        OR price_mad > 500000000
      )
    ) AS suspicious_price
  FROM typed
)
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE bad_tx_enum) AS bad_tx_enum,
  count(*) FILTER (WHERE strong_tx_contradiction) AS strong_tx_contradiction,
  count(*) FILTER (WHERE strong_type_contradiction) AS strong_type_contradiction,
  count(*) FILTER (WHERE suspicious_surface) AS suspicious_surface,
  count(*) FILTER (WHERE suspicious_rooms) AS suspicious_rooms,
  count(*) FILTER (WHERE suspicious_bedrooms) AS suspicious_bedrooms,
  count(*) FILTER (WHERE suspicious_bathrooms) AS suspicious_bathrooms,
  count(*) FILTER (WHERE suspicious_price) AS suspicious_price,
  count(*) FILTER (
    WHERE bad_tx_enum
       OR strong_tx_contradiction
       OR strong_type_contradiction
       OR suspicious_surface
       OR suspicious_rooms
       OR suspicious_bedrooms
       OR suspicious_bathrooms
       OR suspicious_price
  ) AS rows_with_any_strong_integrity_flag
FROM flags;

-- City canonicalization collisions (case-only at this stage).
WITH city_groups AS (
  SELECT lower(city) AS canonical_key,
         array_agg(DISTINCT city ORDER BY city) AS variants,
         count(*) AS rows
  FROM property_listings
  GROUP BY lower(city)
)
SELECT canonical_key, variants, rows
FROM city_groups
WHERE cardinality(variants) > 1
ORDER BY rows DESC;

-- Exact rows carrying strong contradictions for export/review.
WITH base AS (
  SELECT
    p.id,p.title,p.city,p.property_type,p.transaction_type,p.price_mad,p.surface_m2,
    p.rooms_count,p.bedrooms_count,p.bathrooms_count,
    s.source_name,s.listing_url,
    lower(coalesce(p.title,'')) title_l,
    lower(coalesce(s.listing_url,'')) url_l
  FROM property_listings p
  JOIN listing_sources s ON s.property_listing_id=p.id
),
x AS (
 SELECT *,
   CASE
     WHEN title_l ~ '(^|[^a-z])(terrain|lot de terrain|ferme)([^a-z]|$)' THEN 'land'
     WHEN title_l ~ '(^|[^a-z])(villa)([^a-z]|$)' THEN 'villa'
     WHEN title_l ~ '(^|[^a-z])(studio)([^a-z]|$)' THEN 'studio'
     WHEN title_l ~ '(^|[^a-z])(bureau|plateau bureau)([^a-z]|$)' THEN 'office'
     WHEN title_l ~ '(^|[^a-z])(local commercial|commerce|magasin)([^a-z]|$)' THEN 'commercial'
     WHEN title_l ~ '(^|[^a-z])(riad)([^a-z]|$)' THEN 'riad'
     WHEN title_l ~ '(^|[^a-z])(appartement|appart)([^a-z]|$)' THEN 'apartment'
     WHEN title_l ~ '(^|[^a-z])(maison)([^a-z]|$)' THEN 'house'
   END strong_title_type
 FROM base
)
SELECT *
FROM x
WHERE
  (strong_title_type IS NOT NULL AND property_type<>strong_title_type
    AND NOT (strong_title_type='studio' AND property_type='apartment')
    AND NOT (strong_title_type='villa' AND property_type='house')
    AND NOT (strong_title_type='house' AND property_type='villa')
    AND NOT (strong_title_type='riad' AND property_type IN ('house','villa')))
  OR (surface_m2 IS NOT NULL AND (
       surface_m2<8
       OR (property_type<>'land' AND surface_m2>10000)
       OR (property_type='land' AND surface_m2>10000000)))
  OR (bedrooms_count IS NOT NULL AND (bedrooms_count<0 OR bedrooms_count>30))
  OR (bathrooms_count IS NOT NULL AND (bathrooms_count<0 OR bathrooms_count>20))
  OR (rooms_count IS NOT NULL AND (rooms_count<0 OR rooms_count>50))
  OR (price_mad IS NOT NULL AND (
       (transaction_type='sale' AND price_mad<10000)
       OR (transaction_type='rent' AND price_mad<100)
       OR price_mad>500000000))
ORDER BY id;
