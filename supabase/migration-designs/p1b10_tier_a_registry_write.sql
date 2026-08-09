-- P1B.10 — Tier A Registry Write Design
-- DESIGN ONLY. This file is deliberately outside supabase/migrations/.
-- P1B.10 MUST NOT be applied to production. Promotion belongs to a separate LOT.
-- Scope: exactly Agadir — Dakhla and Agadir — Hay Mohammadi.
-- Does NOT write geo_resolution_events and does NOT activate map/SEO eligibility.

begin;

-- Serialize Registry design application and fail closed on drift/collision.
lock table public.geo_entities in share row exclusive mode;
lock table public.geo_aliases in share row exclusive mode;

DO $p1b10$
DECLARE
  parent_ok integer;
  entity_collision_count integer;
  alias_collision_count integer;
BEGIN
  SELECT count(*) INTO parent_ok
  FROM public.geo_entities
  WHERE id = 'city_agadir'
    AND entity_type = 'city'
    AND validation_status = 'validated';

  IF parent_ok <> 1 THEN
    RAISE EXCEPTION 'P1B.10 fail-closed: city_agadir parent is missing or not validated';
  END IF;

  -- Collision scope is parent-aware. A legitimate namesake elsewhere in Morocco
  -- (for example the city of Dakhla) must not block an Agadir neighborhood.
  SELECT count(*) INTO entity_collision_count
  FROM public.geo_entities
  WHERE id IN ('district_agadir_dakhla', 'district_agadir_hay_mohammadi')
     OR (
       entity_type = 'neighborhood'
       AND parent_id = 'city_agadir'
       AND (
         slug IN ('dakhla', 'hay-mohammadi')
         OR normalized_name IN ('dakhla', 'hay mohammadi')
       )
     );

  IF entity_collision_count <> 0 THEN
    RAISE EXCEPTION 'P1B.10 fail-closed: Registry entity collision detected (%)', entity_collision_count;
  END IF;

  SELECT count(*) INTO alias_collision_count
  FROM public.geo_aliases AS ga
  JOIN public.geo_entities AS ge ON ge.id = ga.geo_entity_id
  WHERE ge.entity_type = 'neighborhood'
    AND ge.parent_id = 'city_agadir'
    AND ga.normalized_alias IN ('dakhla', 'hay mohammadi');

  IF alias_collision_count <> 0 THEN
    RAISE EXCEPTION 'P1B.10 fail-closed: parent-scoped Registry exact-alias collision detected (%)', alias_collision_count;
  END IF;
END
$p1b10$;

INSERT INTO public.geo_entities (
  id, entity_type, parent_id, slug, canonical_name, normalized_name,
  validation_status, seo_eligible, map_eligible, source_version, metadata
)
VALUES
  (
    'district_agadir_dakhla', 'neighborhood', 'city_agadir', 'dakhla',
    'Dakhla', 'dakhla', 'validated', false, false, 'registry_v1',
    '{"city_slug":"agadir","authority_domain":"agadir.ma","authority_url":"https://agadir.ma/fr/agadir-ville-durable/les-quartiers/","authority_review_lot":"P1B.8","candidate_review_lot":"P1B.9","registry_design_lot":"P1B.10"}'::jsonb
  ),
  (
    'district_agadir_hay_mohammadi', 'neighborhood', 'city_agadir', 'hay-mohammadi',
    'Hay Mohammadi', 'hay mohammadi', 'validated', false, false, 'registry_v1',
    '{"city_slug":"agadir","authority_domain":"agadir.ma","authority_url":"https://agadir.ma/fr/agadir-ville-durable/les-quartiers/","authority_review_lot":"P1B.8","candidate_review_lot":"P1B.9","registry_design_lot":"P1B.10"}'::jsonb
  );

INSERT INTO public.geo_aliases (
  id, geo_entity_id, alias, normalized_alias, locale, source, confidence
)
VALUES
  ('cc483a45-18f8-49a1-93ab-80adca136c16'::uuid, 'district_agadir_dakhla', 'Dakhla', 'dakhla', NULL, 'registry_v1', 1.0000),
  ('54fa7628-ef89-497e-b771-27a1cad97a86'::uuid, 'district_agadir_hay_mohammadi', 'Hay Mohammadi', 'hay mohammadi', NULL, 'registry_v1', 1.0000);

-- Fail closed if the exact design did not materialize as intended.
DO $p1b10_post$
DECLARE
  created_entities integer;
  created_aliases integer;
BEGIN
  SELECT count(*) INTO created_entities
  FROM public.geo_entities
  WHERE metadata ->> 'registry_design_lot' = 'P1B.10'
    AND id IN ('district_agadir_dakhla', 'district_agadir_hay_mohammadi')
    AND parent_id = 'city_agadir'
    AND entity_type = 'neighborhood'
    AND validation_status = 'validated'
    AND seo_eligible = false
    AND map_eligible = false;

  SELECT count(*) INTO created_aliases
  FROM public.geo_aliases
  WHERE (geo_entity_id, normalized_alias) IN (
    ('district_agadir_dakhla', 'dakhla'),
    ('district_agadir_hay_mohammadi', 'hay mohammadi')
  )
    AND confidence = 1.0000
    AND source = 'registry_v1';

  IF created_entities <> 2 OR created_aliases <> 2 THEN
    RAISE EXCEPTION 'P1B.10 postcondition failed: entities %, aliases %', created_entities, created_aliases;
  END IF;
END
$p1b10_post$;

commit;
