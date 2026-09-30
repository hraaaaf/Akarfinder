-- NEON SEMANTIC REMEDIATION DRY-RUN V2 — READ ONLY
-- No writes.
-- Auto-fix candidates require TWO independent signals:
--   1) unambiguous title evidence;
--   2) a source-STRUCTURAL route/category (never a title-derived slug).
--
-- Rows where title and source structure disagree are quarantine candidates,
-- never auto-fixes.

WITH base AS (
  SELECT
    p.id,p.title,p.city,p.property_type,p.transaction_type,
    s.source_name,s.listing_url,
    lower(trim(coalesce(p.title,''))) AS title_l,
    lower(coalesce(s.listing_url,'')) AS url_l
  FROM property_listings p
  JOIN listing_sources s ON s.property_listing_id=p.id
),
evidence AS (
  SELECT *,
    CASE
      WHEN source_name='agenz.ma' AND url_l ~ '/vente-' THEN 'sale'
      WHEN source_name='agenz.ma' AND url_l ~ '/location-' THEN 'rent'
      WHEN source_name='marocimmo.com' AND url_l ~ '/fr/vente/' THEN 'sale'
      WHEN source_name='marocimmo.com' AND url_l ~ '/fr/location/' THEN 'rent'
      WHEN source_name='domio.ma' AND url_l ~ '/[^/]+/vendre/' THEN 'sale'
      WHEN source_name='domio.ma' AND url_l ~ '/[^/]+/louer/' THEN 'rent'
      WHEN source_name='mouldar.com' AND url_l ~ '/fr/achat/' THEN 'sale'
      WHEN source_name='mouldar.com' AND url_l ~ '/fr/(location|rent)/' THEN 'rent'
      WHEN source_name='masaken.ma' AND url_l ~ '/immobilier-maroc/vente-' THEN 'sale'
      WHEN source_name='masaken.ma' AND url_l ~ '/immobilier-maroc/location-' THEN 'rent'
      WHEN source_name='sarouty.ma' AND url_l ~ '/plp/acheter/' THEN 'sale'
      WHEN source_name='sarouty.ma' AND url_l ~ '/plp/louer/' THEN 'rent'
    END AS route_tx,

    CASE
      WHEN source_name='agenz.ma' AND url_l ~ '/(vente|location)-appartements/' THEN 'apartment'
      WHEN source_name='agenz.ma' AND url_l ~ '/(vente|location)-villas/' THEN 'villa'
      WHEN source_name='agenz.ma' AND url_l ~ '/(vente|location)-terrains/' THEN 'land'
      WHEN source_name='agenz.ma' AND url_l ~ '/(vente|location)-bureaux/' THEN 'office'
      WHEN source_name='agenz.ma' AND url_l ~ '/(vente|location)-locaux-magasins/' THEN 'commercial'
      WHEN source_name='agenz.ma' AND url_l ~ '/(vente|location)-maisons/' THEN 'house'
      WHEN source_name='agenz.ma' AND url_l ~ '/(vente|location)-riads/' THEN 'riad'

      WHEN source_name='mouldar.com' AND url_l ~ '/fr/(achat|location)/appartement/' THEN 'apartment'
      WHEN source_name='mouldar.com' AND url_l ~ '/fr/(achat|location)/studio/' THEN 'studio'
      WHEN source_name='mouldar.com' AND url_l ~ '/fr/(achat|location)/villa/' THEN 'villa'
      WHEN source_name='mouldar.com' AND url_l ~ '/fr/(achat|location)/maison/' THEN 'house'
      WHEN source_name='mouldar.com' AND url_l ~ '/fr/(achat|location)/terrain/' THEN 'land'
      WHEN source_name='mouldar.com' AND url_l ~ '/fr/(achat|location)/bureau/' THEN 'office'
      WHEN source_name='mouldar.com' AND url_l ~ '/fr/(achat|location)/(local|commerce)/' THEN 'commercial'

      WHEN source_name='avito.ma' AND url_l ~ '/appartements/' THEN 'apartment'
      WHEN source_name='avito.ma' AND url_l ~ '/maisons/' THEN 'house'
      WHEN source_name='avito.ma' AND url_l ~ '/villas_et_riads/' THEN 'villa'
      WHEN source_name='avito.ma' AND url_l ~ '/local/' THEN 'commercial'
    END AS route_type,

    CASE
      WHEN title_l ~ '(à|a)[[:space:]]+vendre|(^|[^a-z])vente([^a-z]|$)|vendu'
       AND title_l !~ '(à|a)[[:space:]]+louer|(^|[^a-z])location([^a-z]|$)|loué|loue'
      THEN 'sale'
      WHEN title_l ~ '(à|a)[[:space:]]+louer|(^|[^a-z])location([^a-z]|$)|loué|loue'
       AND title_l !~ '(à|a)[[:space:]]+vendre|(^|[^a-z])vente([^a-z]|$)|vendu'
      THEN 'rent'
    END AS title_tx,

    CASE
      WHEN title_l ~ '^(terrain|lot de terrain|ferme)([^a-z]|$)' THEN 'land'
      WHEN title_l ~ '^villa([^a-z]|$)' THEN 'villa'
      WHEN title_l ~ '^studio([^a-z]|$)' THEN 'studio'
      WHEN title_l ~ '^(bureau|plateau bureau)([^a-z]|$)' THEN 'office'
      WHEN title_l ~ '^(local commercial|commerce|magasin)([^a-z]|$)' THEN 'commercial'
      WHEN title_l ~ '^riad([^a-z]|$)' THEN 'riad'
      WHEN title_l ~ '^(appartement|appart)([^a-z]|$)' THEN 'apartment'
      WHEN title_l ~ '^maison([^a-z]|$)' THEN 'house'
    END AS leading_type
  FROM base
),
classified AS (
  SELECT *,
    (
      route_tx IS NOT NULL
      AND title_tx=route_tx
      AND transaction_type<>route_tx
    ) AS safe_tx_fix,
    (
      route_type IS NOT NULL
      AND leading_type=route_type
      AND property_type<>route_type
      AND NOT(route_type='studio' AND property_type='apartment')
      AND NOT(route_type='apartment' AND property_type='studio')
      AND NOT(route_type='villa' AND property_type='house')
      AND NOT(route_type='house' AND property_type='villa')
      AND NOT(route_type='riad' AND property_type IN ('house','villa'))
    ) AS safe_type_fix,
    (
      route_tx IS NOT NULL AND title_tx IS NOT NULL AND route_tx<>title_tx
    ) AS tx_evidence_conflict,
    (
      route_type IS NOT NULL AND leading_type IS NOT NULL AND route_type<>leading_type
    ) AS type_evidence_conflict
  FROM evidence
)
SELECT
  source_name,
  count(*) FILTER(WHERE safe_tx_fix) AS safe_transaction_fixes,
  count(*) FILTER(WHERE safe_type_fix) AS safe_property_type_fixes,
  count(*) FILTER(WHERE tx_evidence_conflict) AS transaction_evidence_conflicts,
  count(*) FILTER(WHERE type_evidence_conflict) AS property_type_evidence_conflicts
FROM classified
GROUP BY source_name
HAVING count(*) FILTER(WHERE safe_tx_fix OR safe_type_fix OR tx_evidence_conflict OR type_evidence_conflict)>0
ORDER BY safe_transaction_fixes DESC,safe_property_type_fixes DESC,source_name;

-- Current expected auto-fix baseline at 2026-09-29:
-- transaction: 136 (Agenz only)
-- property_type: 143 (Agenz 129, Mouldar 11, Avito 3)
-- Any count drift must be reviewed before preparing/executing a write.

-- Exact safe candidates for evidence review.
SELECT
  id,source_name,title,listing_url,
  transaction_type,route_tx,title_tx,
  property_type,route_type,leading_type,
  safe_tx_fix,safe_type_fix
FROM classified
WHERE safe_tx_fix OR safe_type_fix
ORDER BY source_name,id;
