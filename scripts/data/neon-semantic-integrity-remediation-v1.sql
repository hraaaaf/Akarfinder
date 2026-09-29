-- NEON SEMANTIC INTEGRITY REMEDIATION V1 — CITY ONLY
-- PREPARED ONLY. Requires explicit human production-DB write gate.
--
-- Required session gate:
-- SET akar.semantic_integrity_city_write_confirmation = 'WRITE_CITY_CANONICALIZATION_V1';

BEGIN;

DO $$
BEGIN
  IF current_setting('akar.semantic_integrity_city_write_confirmation', true)
     IS DISTINCT FROM 'WRITE_CITY_CANONICALIZATION_V1'
  THEN
    RAISE EXCEPTION 'city canonicalization write blocked: exact human confirmation token missing';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS semantic_integrity_remediation_audit_v1 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  property_listing_id bigint NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  field_name text NOT NULL CHECK (field_name='city'),
  previous_value text,
  new_value text NOT NULL,
  evidence jsonb NOT NULL,
  remediation_version text NOT NULL DEFAULT 'city_canonicalization_v1',
  remediated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_listing_id, field_name, remediation_version)
);

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
), eligible AS (
 SELECT p.id,p.city previous_value,m.canonical new_value
 FROM property_listings p
 JOIN city_map m ON lower(trim(p.city))=m.raw_key
 WHERE p.city<>m.canonical
), audited AS (
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
SET city=a.new_value,updated_at=now()
FROM audited a
WHERE p.id=a.property_listing_id
  AND p.city=a.previous_value;

SELECT count(*) AS city_changes
FROM semantic_integrity_remediation_audit_v1
WHERE remediation_version='city_canonicalization_v1';

COMMIT;

-- Rollback:
-- BEGIN;
-- UPDATE property_listings p
-- SET city=a.previous_value,updated_at=now()
-- FROM semantic_integrity_remediation_audit_v1 a
-- WHERE a.property_listing_id=p.id
--   AND a.remediation_version='city_canonicalization_v1'
--   AND p.city=a.new_value;
-- COMMIT;
