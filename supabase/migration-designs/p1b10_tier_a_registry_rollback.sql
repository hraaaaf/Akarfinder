-- P1B.10 — exact rollback design
-- DESIGN ONLY. Must not be run in production as part of P1B.10.
-- Refuses rollback if any external Registry dependency references either candidate.

begin;

lock table public.geo_entities in share row exclusive mode;
lock table public.geo_aliases in share row exclusive mode;
lock table public.geo_resolution_events in share mode;
lock table public.neighborhood_intelligence_profiles in share mode;
lock table public.price_m2_references in share mode;

DO $p1b10_rollback$
DECLARE
  entity_count integer;
  alias_count integer;
  resolution_refs integer;
  child_entity_refs integer;
  intelligence_refs integer;
  price_refs integer;
BEGIN
  SELECT count(*) INTO entity_count
  FROM public.geo_entities
  WHERE id IN ('district_agadir_dakhla', 'district_agadir_hay_mohammadi')
    AND metadata ->> 'registry_design_lot' = 'P1B.10'
    AND parent_id = 'city_agadir'
    AND entity_type = 'neighborhood';

  SELECT count(*) INTO alias_count
  FROM public.geo_aliases
  WHERE id IN (
    'cc483a45-18f8-49a1-93ab-80adca136c16'::uuid,
    '54fa7628-ef89-497e-b771-27a1cad97a86'::uuid
  )
    AND geo_entity_id IN ('district_agadir_dakhla', 'district_agadir_hay_mohammadi');

  SELECT count(*) INTO resolution_refs
  FROM public.geo_resolution_events
  WHERE resolved_neighborhood_id IN ('district_agadir_dakhla', 'district_agadir_hay_mohammadi')
     OR resolved_city_id IN ('district_agadir_dakhla', 'district_agadir_hay_mohammadi');

  SELECT count(*) INTO child_entity_refs
  FROM public.geo_entities
  WHERE parent_id IN ('district_agadir_dakhla', 'district_agadir_hay_mohammadi');

  SELECT count(*) INTO intelligence_refs
  FROM public.neighborhood_intelligence_profiles
  WHERE neighborhood_id IN ('district_agadir_dakhla', 'district_agadir_hay_mohammadi');

  SELECT count(*) INTO price_refs
  FROM public.price_m2_references
  WHERE geo_entity_id IN ('district_agadir_dakhla', 'district_agadir_hay_mohammadi');

  IF entity_count <> 2 OR alias_count <> 2 THEN
    RAISE EXCEPTION 'P1B.10 rollback refused: exact owned set not present (entities %, aliases %)', entity_count, alias_count;
  END IF;

  IF resolution_refs <> 0 OR child_entity_refs <> 0 OR intelligence_refs <> 0 OR price_refs <> 0 THEN
    RAISE EXCEPTION 'P1B.10 rollback refused: external dependencies exist (geo_resolution %, child_entities %, intelligence %, price_refs %)', resolution_refs, child_entity_refs, intelligence_refs, price_refs;
  END IF;
END
$p1b10_rollback$;

DELETE FROM public.geo_aliases
WHERE id IN (
  'cc483a45-18f8-49a1-93ab-80adca136c16'::uuid,
  '54fa7628-ef89-497e-b771-27a1cad97a86'::uuid
);

DELETE FROM public.geo_entities
WHERE id IN ('district_agadir_dakhla', 'district_agadir_hay_mohammadi')
  AND metadata ->> 'registry_design_lot' = 'P1B.10';

DO $p1b10_rollback_post$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.geo_entities
    WHERE id IN ('district_agadir_dakhla', 'district_agadir_hay_mohammadi')
  ) OR EXISTS (
    SELECT 1 FROM public.geo_aliases
    WHERE id IN (
      'cc483a45-18f8-49a1-93ab-80adca136c16'::uuid,
      '54fa7628-ef89-497e-b771-27a1cad97a86'::uuid
    )
  ) THEN
    RAISE EXCEPTION 'P1B.10 rollback postcondition failed';
  END IF;
END
$p1b10_rollback_post$;

commit;
