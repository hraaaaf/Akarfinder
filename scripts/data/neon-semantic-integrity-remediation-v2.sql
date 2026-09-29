-- NEON SEMANTIC INTEGRITY REMEDIATION V2 — SOURCE-STRUCTURAL TX/TYPE
-- PREPARED ONLY. Requires explicit human production-DB write gate.
--
-- Required session gate:
-- SET akar.semantic_integrity_v2_write_confirmation = 'WRITE_SOURCE_STRUCTURAL_SEMANTICS_V2';
--
-- Eligibility:
-- transaction: unambiguous primary-title transaction == source-structural route,
--              and both disagree with stored transaction.
-- property type: title LEADS with the type == source-structural category,
--                and both disagree with stored type.
--
-- Current read-only baseline before execution:
--   transaction candidates: 136 (Agenz)
--   property_type candidates: 143 (Agenz 129, Mouldar 11, Avito 3)
-- Counts MUST be re-read immediately before any production execution.

BEGIN;

DO $$
BEGIN
  IF current_setting('akar.semantic_integrity_v2_write_confirmation', true)
     IS DISTINCT FROM 'WRITE_SOURCE_STRUCTURAL_SEMANTICS_V2'
  THEN
    RAISE EXCEPTION 'semantic V2 write blocked: exact human confirmation token missing';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS semantic_integrity_remediation_audit_v2 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  property_listing_id bigint NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  field_name text NOT NULL CHECK (field_name IN ('transaction_type','property_type')),
  previous_value text NOT NULL,
  new_value text NOT NULL,
  evidence jsonb NOT NULL,
  remediation_version text NOT NULL DEFAULT 'source_structural_semantics_v2',
  remediated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_listing_id, field_name, remediation_version)
);

WITH base AS (
 SELECT p.id,p.title,p.transaction_type,s.source_name,s.listing_url,
        lower(trim(coalesce(p.title,''))) t,lower(coalesce(s.listing_url,'')) u
 FROM property_listings p JOIN listing_sources s ON s.property_listing_id=p.id
), evidence AS (
 SELECT *,
 CASE
  WHEN source_name='agenz.ma' AND u ~ '/vente-' THEN 'sale'
  WHEN source_name='agenz.ma' AND u ~ '/location-' THEN 'rent'
  ELSE NULL
 END route_tx,
 CASE
  WHEN t ~ '(à|a)[[:space:]]+vendre|(^|[^a-z])vente([^a-z]|$)|vendu'
   AND t !~ '(à|a)[[:space:]]+louer|(^|[^a-z])location([^a-z]|$)|loué|loue' THEN 'sale'
  WHEN t ~ '(à|a)[[:space:]]+louer|(^|[^a-z])location([^a-z]|$)|loué|loue'
   AND t !~ '(à|a)[[:space:]]+vendre|(^|[^a-z])vente([^a-z]|$)|vendu' THEN 'rent'
 END title_tx
 FROM base
), eligible AS (
 SELECT id,source_name,listing_url,title,transaction_type previous_value,route_tx new_value
 FROM evidence
 WHERE route_tx IS NOT NULL AND title_tx=route_tx AND transaction_type<>route_tx
), audited AS (
 INSERT INTO semantic_integrity_remediation_audit_v2(
  property_listing_id,field_name,previous_value,new_value,evidence
 )
 SELECT id,'transaction_type',previous_value,new_value,
        jsonb_build_object('source_name',source_name,'title',title,'listing_url',listing_url,
                           'rule','unambiguous_title_plus_source_structural_route')
 FROM eligible
 ON CONFLICT DO NOTHING
 RETURNING property_listing_id,previous_value,new_value
)
UPDATE property_listings p
SET transaction_type=a.new_value,updated_at=now()
FROM audited a
WHERE p.id=a.property_listing_id AND p.transaction_type=a.previous_value;

WITH base AS (
 SELECT p.id,p.title,p.property_type,s.source_name,s.listing_url,
        lower(trim(coalesce(p.title,''))) t,lower(coalesce(s.listing_url,'')) u
 FROM property_listings p JOIN listing_sources s ON s.property_listing_id=p.id
), evidence AS (
 SELECT *,
 CASE
  WHEN source_name='agenz.ma' AND u ~ '/(vente|location)-appartements/' THEN 'apartment'
  WHEN source_name='agenz.ma' AND u ~ '/(vente|location)-villas/' THEN 'villa'
  WHEN source_name='agenz.ma' AND u ~ '/(vente|location)-terrains/' THEN 'land'
  WHEN source_name='agenz.ma' AND u ~ '/(vente|location)-bureaux/' THEN 'office'
  WHEN source_name='agenz.ma' AND u ~ '/(vente|location)-locaux-magasins/' THEN 'commercial'
  WHEN source_name='agenz.ma' AND u ~ '/(vente|location)-maisons/' THEN 'house'
  WHEN source_name='agenz.ma' AND u ~ '/(vente|location)-riads/' THEN 'riad'
  WHEN source_name='mouldar.com' AND u ~ '/fr/(achat|location)/appartement/' THEN 'apartment'
  WHEN source_name='mouldar.com' AND u ~ '/fr/(achat|location)/studio/' THEN 'studio'
  WHEN source_name='mouldar.com' AND u ~ '/fr/(achat|location)/villa/' THEN 'villa'
  WHEN source_name='mouldar.com' AND u ~ '/fr/(achat|location)/maison/' THEN 'house'
  WHEN source_name='mouldar.com' AND u ~ '/fr/(achat|location)/terrain/' THEN 'land'
  WHEN source_name='mouldar.com' AND u ~ '/fr/(achat|location)/bureau/' THEN 'office'
  WHEN source_name='mouldar.com' AND u ~ '/fr/(achat|location)/(local|commerce)/' THEN 'commercial'
  WHEN source_name='avito.ma' AND u ~ '/appartements/' THEN 'apartment'
  WHEN source_name='avito.ma' AND u ~ '/maisons/' THEN 'house'
  WHEN source_name='avito.ma' AND u ~ '/villas_et_riads/' THEN 'villa'
  WHEN source_name='avito.ma' AND u ~ '/local/' THEN 'commercial'
 END route_type,
 CASE
  WHEN t ~ '^(terrain|lot de terrain|ferme)([^a-z]|$)' THEN 'land'
  WHEN t ~ '^villa([^a-z]|$)' THEN 'villa'
  WHEN t ~ '^studio([^a-z]|$)' THEN 'studio'
  WHEN t ~ '^(bureau|plateau bureau)([^a-z]|$)' THEN 'office'
  WHEN t ~ '^(local commercial|commerce|magasin)([^a-z]|$)' THEN 'commercial'
  WHEN t ~ '^riad([^a-z]|$)' THEN 'riad'
  WHEN t ~ '^(appartement|appart)([^a-z]|$)' THEN 'apartment'
  WHEN t ~ '^maison([^a-z]|$)' THEN 'house'
 END leading_type
 FROM base
), eligible AS (
 SELECT id,source_name,listing_url,title,property_type previous_value,route_type new_value
 FROM evidence
 WHERE route_type IS NOT NULL AND leading_type=route_type AND property_type<>route_type
   AND NOT(route_type='studio' AND property_type='apartment')
   AND NOT(route_type='apartment' AND property_type='studio')
   AND NOT(route_type='villa' AND property_type='house')
   AND NOT(route_type='house' AND property_type='villa')
   AND NOT(route_type='riad' AND property_type IN ('house','villa'))
), audited AS (
 INSERT INTO semantic_integrity_remediation_audit_v2(
  property_listing_id,field_name,previous_value,new_value,evidence
 )
 SELECT id,'property_type',previous_value,new_value,
        jsonb_build_object('source_name',source_name,'title',title,'listing_url',listing_url,
                           'rule','leading_title_type_plus_source_structural_category')
 FROM eligible
 ON CONFLICT DO NOTHING
 RETURNING property_listing_id,previous_value,new_value
)
UPDATE property_listings p
SET property_type=a.new_value,updated_at=now()
FROM audited a
WHERE p.id=a.property_listing_id AND p.property_type=a.previous_value;

SELECT field_name,count(*) changes
FROM semantic_integrity_remediation_audit_v2
WHERE remediation_version='source_structural_semantics_v2'
GROUP BY field_name ORDER BY field_name;

COMMIT;

-- Rollback:
-- BEGIN;
-- UPDATE property_listings p SET transaction_type=a.previous_value,updated_at=now()
-- FROM semantic_integrity_remediation_audit_v2 a
-- WHERE a.property_listing_id=p.id AND a.field_name='transaction_type'
--   AND a.remediation_version='source_structural_semantics_v2'
--   AND p.transaction_type=a.new_value;
-- UPDATE property_listings p SET property_type=a.previous_value,updated_at=now()
-- FROM semantic_integrity_remediation_audit_v2 a
-- WHERE a.property_listing_id=p.id AND a.field_name='property_type'
--   AND a.remediation_version='source_structural_semantics_v2'
--   AND p.property_type=a.new_value;
-- COMMIT;
