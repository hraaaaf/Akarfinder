-- NEIGHBORHOOD-VISUAL-P1.1 — reconcile the three Agdal rows only after physical Storage ingestion.

DO $$
DECLARE
  object_count integer;
  row_count integer;
BEGIN
  SELECT count(*) INTO object_count
  FROM storage.objects
  WHERE bucket_id = 'neighborhood-visuals'
    AND name IN (
      'rabat/agdal/signature/master.jpg',
      'rabat/agdal/immobilier/search.jpg',
      'rabat/agdal/lifestyle/master.jpg'
    );

  IF object_count <> 3 THEN
    RAISE EXCEPTION 'P1.1 expected exactly 3 ingested Agdal visual objects, found %', object_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.neighborhood_visual_assets a
  JOIN public.neighborhood_visual_collections c ON c.id = a.collection_id
  WHERE c.city_slug = 'rabat'
    AND c.neighborhood_slug = 'agdal'
    AND a.variant_index = 1
    AND a.scene_role IN ('signature', 'immobilier', 'lifestyle');

  IF row_count <> 3 THEN
    RAISE EXCEPTION 'P1.1 expected exactly 3 Agdal visual rows, found %', row_count;
  END IF;
END $$;

UPDATE public.neighborhood_visual_assets a
SET
  reference_query = 'Al Boraq Railway station Rabat Agdal.jpg Wikimedia Commons',
  reference_url = 'https://commons.wikimedia.org/wiki/File:Al_Boraq_Railway_station_Rabat_Agdal.jpg',
  source_name = 'Wikimedia Commons',
  source_license = 'CC BY-SA 4.0',
  source_attribution = 'SpreeTom — Al Boraq Railway station Rabat Agdal.jpg — Wikimedia Commons — CC BY-SA 4.0; modifications must be indicated and shared alike',
  reference_status = 'verified',
  verified_location = true,
  image_storage_path = 'neighborhood-visuals/rabat/agdal/signature/master.jpg',
  transformed_asset_url = null,
  fidelity_notes = 'P1.1 master stored unchanged. Commons description identifies Rabat Agdal station; 4160x2340, SHA-1 6cded8a860ea6b7517e81c432c1bf858ccf6b52e. Semantic boundary: public mobility landmark only.',
  updated_at = now()
FROM public.neighborhood_visual_collections c
WHERE c.id = a.collection_id
  AND c.city_slug = 'rabat'
  AND c.neighborhood_slug = 'agdal'
  AND a.scene_role = 'signature'
  AND a.variant_index = 1;

UPDATE public.neighborhood_visual_assets a
SET
  reference_query = 'Avenue Fal Ould Oumeir Agdal — source projet AkarFinder',
  reference_url = null,
  source_name = 'AkarFinder project-supplied source',
  source_license = 'Direct AkarFinder project authorization',
  source_attribution = 'Avenue Fal Ould Oumeir — source supplied directly for AkarFinder use; direct_project_authorization; photographer not asserted; no Creative Commons status asserted',
  reference_status = 'verified',
  verified_location = true,
  image_storage_path = 'neighborhood-visuals/rabat/agdal/immobilier/search.jpg',
  transformed_asset_url = null,
  fidelity_notes = 'P1.1 canonical private source: 1024x1024, 330658 bytes, SHA-1 6adb3fffe36a6ace60ef9aee4907920e031abbd7. Product asset is a deterministic non-generative center crop y=224..800 then resize to 320x180; 11487 bytes, SHA-1 dd4eaab40b68090dcba6f85c58f1365213e0177f. Avenue Fal Ould Oumeir is independently identified by Visit Rabat as being in Agdal. Semantic boundary: representative street-front built morphology only; never a property photo.',
  updated_at = now()
FROM public.neighborhood_visual_collections c
WHERE c.id = a.collection_id
  AND c.city_slug = 'rabat'
  AND c.neighborhood_slug = 'agdal'
  AND a.scene_role = 'immobilier'
  AND a.variant_index = 1;

UPDATE public.neighborhood_visual_assets a
SET
  reference_query = 'Jardin d''essai botanique, Rabat.jpg Wikimedia Commons Agdal',
  reference_url = 'https://commons.wikimedia.org/wiki/File:Jardin_d%27essai_botanique,_Rabat.jpg',
  source_name = 'Wikimedia Commons',
  source_license = 'CC BY-SA 4.0',
  source_attribution = 'Ideophagous — Jardin d''essai botanique, Rabat.jpg — Wikimedia Commons — CC BY-SA 4.0; modifications must be indicated and shared alike',
  reference_status = 'verified',
  verified_location = true,
  image_storage_path = 'neighborhood-visuals/rabat/agdal/lifestyle/master.jpg',
  transformed_asset_url = null,
  fidelity_notes = 'P1.1 master stored unchanged. GPS 34.007681,-6.845169; Commons category identifies the Botanical Garden of Rabat also as Jardin d''essai de l''Agdal. 4080x3060, SHA-1 73da97f09b0dc9cf796a9bac8a210f78525667ff. Public green-space context only.',
  updated_at = now()
FROM public.neighborhood_visual_collections c
WHERE c.id = a.collection_id
  AND c.city_slug = 'rabat'
  AND c.neighborhood_slug = 'agdal'
  AND a.scene_role = 'lifestyle'
  AND a.variant_index = 1;
