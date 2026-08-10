-- P1B.13B — Oasis Registry rollback design (NON-DEPLOYABLE)
-- Fail closed if downstream dependencies exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM geo_resolution_events
    WHERE resolved_neighborhood_id = 'district_casablanca_oasis'
  ) THEN
    RAISE EXCEPTION 'P1B.13B rollback blocked: geo_resolution_events reference Oasis';
  END IF;

  IF EXISTS (
    SELECT 1 FROM geo_entities
    WHERE parent_id = 'district_casablanca_oasis'
  ) THEN
    RAISE EXCEPTION 'P1B.13B rollback blocked: child geo_entities reference Oasis';
  END IF;
END $$;

DELETE FROM geo_aliases
WHERE geo_entity_id = 'district_casablanca_oasis';

DELETE FROM geo_entities
WHERE id = 'district_casablanca_oasis'
  AND entity_type = 'neighborhood'
  AND parent_id = 'city_casablanca'
  AND slug = 'oasis'
  AND normalized_name = 'oasis'
  AND validation_status = 'validated'
  AND seo_eligible = false
  AND map_eligible = false;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM geo_entities WHERE id = 'district_casablanca_oasis') THEN
    RAISE EXCEPTION 'P1B.13B rollback failed to remove target entity';
  END IF;
END $$;
