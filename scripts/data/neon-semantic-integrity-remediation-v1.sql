-- NEON SEMANTIC INTEGRITY REMEDIATION V1
-- PREPARED ONLY — DO NOT EXECUTE WITHOUT EXPLICIT HUMAN DB WRITE GATE.
--
-- Required session gate before execution:
--   SET akar.semantic_integrity_write_confirmation = 'WRITE_SEMANTIC_INTEGRITY_V1';
--
-- The script aborts before any mutation when the exact token is absent.
-- Scope:
--   1) deterministic transaction corrections (title + URL agree)
--   2) deterministic property_type corrections (title + URL agree)
--   3) validated city canonicalization using existing GEO_CITIES identities
--
-- Price/surface/room recovery is OUT OF SCOPE for this write because those
-- fields still require source-specific evidence recovery/certification.

BEGIN;

DO $$
BEGIN
  IF current_setting('akar.semantic_integrity_write_confirmation', true)
     IS DISTINCT FROM 'WRITE_SEMANTIC_INTEGRITY_V1'
  THEN
    RAISE EXCEPTION 'semantic integrity write blocked: exact human confirmation token missing';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS semantic_integrity_remediation_audit_v1 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  property_listing_id bigint NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  field_name text NOT NULL CHECK (field_name IN ('transaction_type','property_type','city')),
  previous_value text,
  new_value text NOT NULL,
  evidence jsonb NOT NULL,
  remediation_version text NOT NULL DEFAULT 'semantic_integrity_v1',
  remediated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_listing_id, field_name, remediation_version)
);

-- TRANSACTION: title + structural URL route must agree.
WITH candidates AS (
  SELECT
    p.id,
    p.transaction_type AS previous_value,
    CASE
      WHEN lower(coalesce(p.title,'')) ~ '(à|a)[[:space:]]+vendre|vente|vendu'
       AND lower(coalesce(s.listing_url,'')) ~ '/(vente|vendre|achat|buy)(/|[-_])'
      THEN 'sale'
      WHEN lower(coalesce(p.title,'')) ~ '(à|a)[[:space:]]+louer|location|loué|loue'
       AND lower(coalesce(s.listing_url,'')) ~ '/(location|louer|rent)(/|[-_])'
      THEN 'rent'
    END AS new_value,
    s.listing_url,
    p.title
  FROM property_listings p
  JOIN listing_sources s ON s.property_listing_id=p.id
),
eligible AS (
  SELECT * FROM candidates
  WHERE new_value IS NOT NULL
    AND previous_value <> new_value
),
audited AS (
  INSERT INTO semantic_integrity_remediation_audit_v1(
    property_listing_id,field_name,previous_value,new_value,evidence
  )
  SELECT
    id,'transaction_type',previous_value,new_value,
    jsonb_build_object('title',title,'listing_url',listing_url,'rule','title_plus_url_transaction')
  FROM eligible
  ON CONFLICT DO NOTHING
  RETURNING property_listing_id,previous_value,new_value
)
UPDATE property_listings p
SET transaction_type=a.new_value,
    updated_at=now()
FROM audited a
WHERE p.id=a.property_listing_id
  AND p.transaction_type=a.previous_value;

-- PROPERTY TYPE: title + structural URL category must agree.
WITH candidates AS (
  SELECT
    p.id,
    p.property_type AS previous_value,
    CASE
      WHEN lower(coalesce(p.title,'')) ~ '^(terrain|lot de terrain|ferme)([^a-z]|$)|(^|[^a-z])(terrain|lot de terrain|ferme)[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND lower(coalesce(s.listing_url,'')) ~ '(/|[-_])(terrain|terrains)(/|[-_])' THEN 'land'
      WHEN lower(coalesce(p.title,'')) ~ '^villa([^a-z]|$)|(^|[^a-z])villa[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND lower(coalesce(s.listing_url,'')) ~ '(/|[-_])(villa|villas)(/|[-_])' THEN 'villa'
      WHEN lower(coalesce(p.title,'')) ~ '^studio([^a-z]|$)|(^|[^a-z])studio[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND lower(coalesce(s.listing_url,'')) ~ '(/|[-_])(studio|studios)(/|[-_])' THEN 'studio'
      WHEN lower(coalesce(p.title,'')) ~ '^(bureau|plateau bureau)([^a-z]|$)|(^|[^a-z])(bureau|plateau bureau)[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND lower(coalesce(s.listing_url,'')) ~ '(/|[-_])(bureau|bureaux)(/|[-_])' THEN 'office'
      WHEN lower(coalesce(p.title,'')) ~ '^(local commercial|commerce|magasin)([^a-z]|$)|(^|[^a-z])(local commercial|commerce|magasin)[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND lower(coalesce(s.listing_url,'')) ~ '(/|[-_])(local|locaux|commerce|commercial|magasin)(/|[-_])' THEN 'commercial'
      WHEN lower(coalesce(p.title,'')) ~ '^riad[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND lower(coalesce(s.listing_url,'')) ~ '(/|[-_])(riad|riads)(/|[-_])' THEN 'riad'
      WHEN lower(coalesce(p.title,'')) ~ '^(appartement|appart)([^a-z]|$)|(^|[^a-z])(appartement|appart)[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND lower(coalesce(s.listing_url,'')) ~ '(/|[-_])(appartement|appartements)(/|[-_])' THEN 'apartment'
      WHEN lower(coalesce(p.title,'')) ~ '^maison([^a-z]|$)|(^|[^a-z])maison[[:space:]]+(à|a)[[:space:]]+(vendre|louer)([^a-z]|$)'
       AND lower(coalesce(s.listing_url,'')) ~ '(/|[-_])(maison|maisons)(/|[-_])' THEN 'house'
    END AS new_value,
    s.listing_url,
    p.title
  FROM property_listings p
  JOIN listing_sources s ON s.property_listing_id=p.id
),
eligible AS (
  SELECT * FROM candidates
  WHERE new_value IS NOT NULL
    AND previous_value <> new_value
    AND NOT (new_value='studio' AND previous_value='apartment')
    AND NOT (new_value='villa' AND previous_value='house')
    AND NOT (new_value='house' AND previous_value='villa')
    AND NOT (new_value='riad' AND previous_value IN ('house','villa'))
),
audited AS (
  INSERT INTO semantic_integrity_remediation_audit_v1(
    property_listing_id,field_name,previous_value,new_value,evidence
  )
  SELECT
    id,'property_type',previous_value,new_value,
    jsonb_build_object('title',title,'listing_url',listing_url,'rule','title_plus_url_property_type')
  FROM eligible
  ON CONFLICT DO NOTHING
  RETURNING property_listing_id,previous_value,new_value
)
UPDATE property_listings p
SET property_type=a.new_value,
    updated_at=now()
FROM audited a
WHERE p.id=a.property_listing_id
  AND p.property_type=a.previous_value;

-- CITY: only validated canonical identities already defined in GEO_CITIES.
WITH city_map(raw_key,canonical) AS (VALUES
 ('casablanca','Casablanca'),('casa','Casablanca'),
 ('rabat','Rabat'),
 ('marrakech','Marrakech'),('marrakesh','Marrakech'),
 ('tanger','Tanger'),('tangier','Tanger'),
 ('agadir','Agadir'),
 ('fès','Fès'),('fes','Fès'),
 ('kénitra','Kénitra'),('kenitra','Kénitra'),
 ('mohammedia','Mohammedia'),
 ('salé','Salé'),('sale','Salé'),
 ('témara','Témara'),('temara','Témara'),
 ('meknès','Meknès'),('meknes','Meknès'),
 ('tétouan','Tétouan'),('tetouan','Tétouan'),
 ('oujda','Oujda'),
 ('el jadida','El Jadida'),('el-jadida','El Jadida'),
 ('nador','Nador'),('essaouira','Essaouira'),('bouskoura','Bouskoura'),
 ('bouznika','Bouznika'),('azrou','Azrou')
),
eligible AS (
 SELECT p.id,p.city previous_value,m.canonical new_value
 FROM property_listings p
 JOIN city_map m ON lower(trim(p.city))=m.raw_key
 WHERE p.city<>m.canonical
),
audited AS (
 INSERT INTO semantic_integrity_remediation_audit_v1(
   property_listing_id,field_name,previous_value,new_value,evidence
 )
 SELECT id,'city',previous_value,new_value,
        jsonb_build_object('rule','validated_geo_registry_alias')
 FROM eligible
 ON CONFLICT DO NOTHING
 RETURNING property_listing_id,previous_value,new_value
)
UPDATE property_listings p
SET city=a.new_value,
    updated_at=now()
FROM audited a
WHERE p.id=a.property_listing_id
  AND p.city=a.previous_value;

SELECT field_name,count(*) AS audited_changes
FROM semantic_integrity_remediation_audit_v1
WHERE remediation_version='semantic_integrity_v1'
GROUP BY field_name
ORDER BY field_name;

COMMIT;

-- ROLLBACK REHEARSAL (run separately, only if required):
-- BEGIN;
-- UPDATE property_listings p
-- SET transaction_type=a.previous_value,updated_at=now()
-- FROM semantic_integrity_remediation_audit_v1 a
-- WHERE a.property_listing_id=p.id
--   AND a.field_name='transaction_type'
--   AND a.remediation_version='semantic_integrity_v1'
--   AND p.transaction_type=a.new_value;
--
-- UPDATE property_listings p
-- SET property_type=a.previous_value,updated_at=now()
-- FROM semantic_integrity_remediation_audit_v1 a
-- WHERE a.property_listing_id=p.id
--   AND a.field_name='property_type'
--   AND a.remediation_version='semantic_integrity_v1'
--   AND p.property_type=a.new_value;
--
-- UPDATE property_listings p
-- SET city=a.previous_value,updated_at=now()
-- FROM semantic_integrity_remediation_audit_v1 a
-- WHERE a.property_listing_id=p.id
--   AND a.field_name='city'
--   AND a.remediation_version='semantic_integrity_v1'
--   AND p.city=a.new_value;
-- COMMIT;
