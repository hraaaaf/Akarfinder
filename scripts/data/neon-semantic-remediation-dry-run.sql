-- NEON SEMANTIC REMEDIATION DRY-RUN — NO WRITES
-- Deterministic candidates only. A correction is proposed only when two
-- independent persisted signals agree (title + URL) against the stored value.

WITH base AS (
  SELECT
    p.id,
    p.title,
    p.property_type,
    p.transaction_type,
    s.source_name,
    s.listing_url,
    lower(coalesce(p.title,'')) AS title_l,
    lower(coalesce(s.listing_url,'')) AS url_l
  FROM property_listings p
  JOIN listing_sources s ON s.property_listing_id=p.id
),
evidence AS (
  SELECT *,
    CASE
      WHEN title_l ~ '(à|a)[[:space:]]+vendre|vente|vendu'
       AND url_l ~ '/(vente|vendre|achat|buy)(/|[-_])' THEN 'sale'
      WHEN title_l ~ '(à|a)[[:space:]]+louer|location|loué|loue'
       AND url_l ~ '/(location|louer|rent)(/|[-_])' THEN 'rent'
    END AS evidence_tx,
    CASE
      WHEN title_l ~ '^(terrain|lot de terrain|ferme)([^a-z]|$)|(^|[^a-z])(terrain|lot de terrain|ferme)[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND url_l ~ '/(terrain|terrains)(/|[-_])' THEN 'land'
      WHEN title_l ~ '^villa([^a-z]|$)|(^|[^a-z])villa[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND url_l ~ '/(villa|villas)(/|[-_])' THEN 'villa'
      WHEN title_l ~ '^studio([^a-z]|$)|(^|[^a-z])studio[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND url_l ~ '/(studio|studios)(/|[-_])' THEN 'studio'
      WHEN title_l ~ '^(bureau|plateau bureau)([^a-z]|$)|(^|[^a-z])(bureau|plateau bureau)[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND url_l ~ '/(bureau|bureaux)(/|[-_])' THEN 'office'
      WHEN title_l ~ '^(local commercial|commerce|magasin)([^a-z]|$)|(^|[^a-z])(local commercial|commerce|magasin)[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND url_l ~ '/(local|locaux|commerce|commercial|magasin)(/|[-_])' THEN 'commercial'
      WHEN title_l ~ '^riad[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND url_l ~ '/(riad|riads)(/|[-_])' THEN 'riad'
      WHEN title_l ~ '^(appartement|appart)([^a-z]|$)|(^|[^a-z])(appartement|appart)[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND url_l ~ '/(appartement|appartements)(/|[-_])' THEN 'apartment'
      WHEN title_l ~ '^maison([^a-z]|$)|(^|[^a-z])maison[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND url_l ~ '/(maison|maisons)(/|[-_])' THEN 'house'
    END AS evidence_type
  FROM base
),
tx_candidates AS (
  SELECT *
  FROM evidence
  WHERE evidence_tx IS NOT NULL
    AND evidence_tx <> transaction_type
),
type_candidates AS (
  SELECT *
  FROM evidence
  WHERE evidence_type IS NOT NULL
    AND evidence_type <> property_type
    AND NOT (evidence_type='studio' AND property_type='apartment')
    AND NOT (evidence_type='villa' AND property_type='house')
    AND NOT (evidence_type='house' AND property_type='villa')
    AND NOT (evidence_type='riad' AND property_type IN ('house','villa'))
)
SELECT 'transaction' AS field,
       count(*) AS deterministic_candidates
FROM tx_candidates
UNION ALL
SELECT 'property_type' AS field,
       count(*) AS deterministic_candidates
FROM type_candidates;

-- Exact transaction candidates.
WITH base AS (
  SELECT p.id,p.title,p.transaction_type,s.source_name,s.listing_url,
         lower(coalesce(p.title,'')) title_l,
         lower(coalesce(s.listing_url,'')) url_l
  FROM property_listings p JOIN listing_sources s ON s.property_listing_id=p.id
)
SELECT
  id,source_name,title,transaction_type AS current_value,
  CASE
    WHEN title_l ~ '(à|a)[[:space:]]+vendre|vente|vendu'
     AND url_l ~ '/(vente|vendre|achat|buy)(/|[-_])' THEN 'sale'
    WHEN title_l ~ '(à|a)[[:space:]]+louer|location|loué|loue'
     AND url_l ~ '/(location|louer|rent)(/|[-_])' THEN 'rent'
  END AS proposed_value,
  listing_url
FROM base
WHERE (
  transaction_type='rent'
  AND title_l ~ '(à|a)[[:space:]]+vendre|vente|vendu'
  AND url_l ~ '/(vente|vendre|achat|buy)(/|[-_])'
) OR (
  transaction_type='sale'
  AND title_l ~ '(à|a)[[:space:]]+louer|location|loué|loue'
  AND url_l ~ '/(location|louer|rent)(/|[-_])'
)
ORDER BY source_name,id;
