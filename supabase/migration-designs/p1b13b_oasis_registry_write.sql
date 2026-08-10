-- P1B.13B — Oasis Registry Write Design (NON-DEPLOYABLE)
-- This file is intentionally outside supabase/migrations/.
-- P1B.13B authorizes no production write.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM geo_entities
    WHERE id = 'city_casablanca'
      AND entity_type = 'city'
      AND validation_status = 'validated'
  ) THEN
    RAISE EXCEPTION 'P1B.13B parent city_casablanca missing or not validated';
  END IF;

  IF EXISTS (SELECT 1 FROM geo_entities WHERE id = 'district_casablanca_oasis') THEN
    RAISE EXCEPTION 'P1B.13B target entity id already exists';
  END IF;

  IF EXISTS (
    SELECT 1 FROM geo_entities
    WHERE parent_id = 'city_casablanca'
      AND entity_type = 'neighborhood'
      AND (slug = 'oasis' OR normalized_name = 'oasis')
  ) THEN
    RAISE EXCEPTION 'P1B.13B Oasis collision under city_casablanca';
  END IF;

  IF EXISTS (SELECT 1 FROM geo_aliases WHERE normalized_alias = 'oasis') THEN
    RAISE EXCEPTION 'P1B.13B Oasis alias collision';
  END IF;
END $$;

INSERT INTO geo_entities (
  id, entity_type, parent_id, slug, canonical_name, normalized_name,
  validation_status, seo_eligible, map_eligible, source_version, metadata
) VALUES (
  'district_casablanca_oasis',
  'neighborhood',
  'city_casablanca',
  'oasis',
  'Oasis',
  'oasis',
  'validated',
  false,
  false,
  'registry_v1',
  jsonb_build_object(
    'city_slug', 'casablanca',
    'authority_domain', 'casablancacity.ma',
    'authority_url', 'https://www.casablancacity.ma/fr/actualite/978/mise-en-service-de-la-nouvelle-fourriere-communale-de-oulad-azzouz',
    'authority_review_lot', 'P1B.13',
    'candidate_review_lot', 'P1B.13A',
    'registry_design_lot', 'P1B.13B'
  )
);

INSERT INTO geo_aliases (geo_entity_id, alias, normalized_alias, locale, source, confidence)
VALUES ('district_casablanca_oasis', 'Oasis', 'oasis', NULL, 'registry_v1', 1);
