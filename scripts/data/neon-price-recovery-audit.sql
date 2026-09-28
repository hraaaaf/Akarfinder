-- NEON PRICE RECOVERY AUDIT — READ ONLY
-- Goal: classify property_listings.price_mad IS NULL without mutating Neon.
-- Output buckets:
--   recoverable_explicit
--   ambiguous_multiple_principal
--   evidence_but_rejected_or_wrong_intent
--   no_currency_amount_evidence
--
-- Parser is intentionally conservative and mirrors the existing ODM typed
-- economic parser doctrine: explicit MAD/DH/dirham evidence, intent consistency,
-- ancillary amounts rejected, no overwrite of existing prices.

WITH base AS (
  SELECT
    p.id,
    p.transaction_type,
    p.title,
    p.description_snippet,
    s.source_name,
    s.ingestion_run_id,
    concat_ws(' ', nullif(p.title,''), nullif(p.description_snippet,'')) AS txt
  FROM property_listings p
  JOIN listing_sources s ON s.property_listing_id = p.id
  WHERE p.price_mad IS NULL
),
matches AS (
  SELECT
    b.id,
    nullif(regexp_replace(m[3], '[^0-9]', '', 'g'), '')::numeric AS value_mad,
    lower(coalesce(m[2], '')) AS context_prefix,
    lower(coalesce(m[5], '')) AS cadence_token,
    b.transaction_type,
    b.txt
  FROM base b
  CROSS JOIN LATERAL regexp_matches(
    coalesce(b.txt, ''),
    '(([^0-9]{0,48})([0-9]{1,3}(?:[ .,''’][0-9]{3})+|[0-9]{3,10})[[:space:]]*(?:-[[:space:]]*)?(mad|dhs?|dh|dirham|dirhams)(?:[[:space:]]*(?:/|par)[[:space:]]*(m2|m²|mois|month|jour|day|semaine|week))?)',
    'gi'
  ) m
),
typed AS (
  SELECT
    *,
    CASE
      WHEN value_mad NOT BETWEEN 100 AND 1000000000 THEN 'out_of_range'
      WHEN cadence_token IN ('m2','m²') THEN 'price_per_m2'
      WHEN context_prefix ~ '(caution|d[ée]p[ôo]t[[:space:]]+de[[:space:]]+garantie|garantie)' THEN 'deposit'
      WHEN context_prefix ~ '(charges?|syndic|frais[[:space:]]+mensuels?)' THEN 'charges'
      WHEN context_prefix ~ '(frais[[:space:]]+d.agence|commission[[:space:]]+agence|honoraires)' THEN 'agency_fee'
      WHEN context_prefix ~ '(ancien[[:space:]]+prix|prix[[:space:]]+barr[ée]|au[[:space:]]+lieu[[:space:]]+de)' THEN 'old_price'
      WHEN context_prefix ~ '(à[[:space:]]+partir[[:space:]]+de|a[[:space:]]+partir[[:space:]]+de|dès)' THEN 'starting_price'
      WHEN cadence_token IN ('jour','day') THEN 'rent_daily'
      WHEN cadence_token IN ('semaine','week') THEN 'rent_weekly'
      WHEN cadence_token IN ('mois','month') THEN 'rent_monthly'
      WHEN lower(txt) ~ '(par[[:space:]]+jour|/jour|daily)' THEN 'rent_daily'
      WHEN lower(txt) ~ '(par[[:space:]]+semaine|/semaine|weekly)' THEN 'rent_weekly'
      WHEN lower(txt) ~ '(loyer|location|à[[:space:]]+louer|a[[:space:]]+louer)' THEN 'rent_monthly'
      WHEN lower(txt) ~ '(vente|à[[:space:]]+vendre|a[[:space:]]+vendre)' THEN 'sale_total'
      ELSE 'unknown_price'
    END AS economic_type
  FROM matches
),
assessed AS (
  SELECT
    b.id,
    b.source_name,
    b.ingestion_run_id,
    b.transaction_type,
    coalesce(btrim(b.description_snippet), '') = '' AS no_snippet,
    count(t.value_mad) AS candidate_count,
    count(DISTINCT t.value_mad) FILTER (
      WHERE (b.transaction_type='sale' AND t.economic_type='sale_total')
         OR (b.transaction_type='rent' AND t.economic_type IN ('rent_monthly','rent_daily','rent_weekly'))
    ) AS principal_distinct_count,
    min(t.value_mad) FILTER (
      WHERE (b.transaction_type='sale' AND t.economic_type='sale_total')
         OR (b.transaction_type='rent' AND t.economic_type IN ('rent_monthly','rent_daily','rent_weekly'))
    ) AS recoverable_value
  FROM base b
  LEFT JOIN typed t ON t.id = b.id
  GROUP BY
    b.id,
    b.source_name,
    b.ingestion_run_id,
    b.transaction_type,
    b.description_snippet
)
SELECT
  count(*) AS null_price_total,
  count(*) FILTER (WHERE principal_distinct_count=1) AS recoverable_explicit,
  count(*) FILTER (WHERE principal_distinct_count>1) AS ambiguous_multiple_principal,
  count(*) FILTER (WHERE principal_distinct_count=0 AND candidate_count>0) AS evidence_but_rejected_or_wrong_intent,
  count(*) FILTER (WHERE candidate_count=0) AS no_currency_amount_evidence,
  count(*) FILTER (WHERE no_snippet) AS no_snippet
FROM assessed;

-- Source breakdown.
WITH base AS (
  SELECT p.id,p.transaction_type,p.title,p.description_snippet,s.source_name,s.ingestion_run_id,
         concat_ws(' ',nullif(p.title,''),nullif(p.description_snippet,'')) txt
  FROM property_listings p
  JOIN listing_sources s ON s.property_listing_id=p.id
  WHERE p.price_mad IS NULL
)
SELECT
  source_name,
  count(*) AS null_price,
  count(*) FILTER (WHERE coalesce(btrim(description_snippet),'')='') AS no_snippet
FROM base
GROUP BY source_name
ORDER BY null_price DESC;

-- Ingestion-wave breakdown.
SELECT
  s.ingestion_run_id,
  count(*) FILTER (WHERE p.price_mad IS NULL) AS null_price,
  count(*) FILTER (
    WHERE p.price_mad IS NULL
      AND coalesce(btrim(p.description_snippet),'')=''
  ) AS no_snippet,
  count(*) FILTER (WHERE p.price_mad IS NOT NULL) AS priced
FROM property_listings p
JOIN listing_sources s ON s.property_listing_id=p.id
GROUP BY s.ingestion_run_id
ORDER BY null_price DESC;
