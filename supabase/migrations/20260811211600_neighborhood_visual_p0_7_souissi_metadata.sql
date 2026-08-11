-- NEIGHBORHOOD-VISUAL-P0.7 — reconcile the three Souissi rows after physical Storage ingestion.
-- This migration is applied only after the three exact master objects are verified in storage.objects.

DO $$
DECLARE
  object_count integer;
  row_count integer;
BEGIN
  SELECT count(*) INTO object_count
  FROM storage.objects
  WHERE bucket_id = 'neighborhood-visuals'
    AND name IN (
      'rabat/souissi/signature/master.jpg',
      'rabat/souissi/immobilier/master.jpg',
      'rabat/souissi/lifestyle/master.jpg'
    );

  IF object_count <> 3 THEN
    RAISE EXCEPTION 'P0.7 expected exactly 3 ingested Souissi master objects, found %', object_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.neighborhood_visual_assets a
  JOIN public.neighborhood_visual_collections c ON c.id = a.collection_id
  WHERE c.city_slug = 'rabat'
    AND c.neighborhood_slug = 'souissi'
    AND a.variant_index = 1
    AND a.scene_role IN ('signature', 'immobilier', 'lifestyle');

  IF row_count <> 3 THEN
    RAISE EXCEPTION 'P0.7 expected exactly 3 Souissi visual rows, found %', row_count;
  END IF;
END $$;

UPDATE public.neighborhood_visual_assets a
SET
  reference_query = 'Avenue Mohamed VI Souissi Rabat.jpg Wikimedia Commons',
  reference_url = 'https://commons.wikimedia.org/wiki/File:Avenue_Mohamed_VI_Souissi_Rabat.jpg',
  source_name = 'Wikimedia Commons',
  source_license = 'CC BY-SA 4.0',
  source_attribution = 'YousraElkh9 — Avenue Mohamed VI Souissi Rabat.jpg — Wikimedia Commons — CC BY-SA 4.0; modifications must be indicated and shared alike',
  reference_status = 'verified',
  verified_location = true,
  image_storage_path = 'neighborhood-visuals/rabat/souissi/signature/master.jpg',
  transformed_asset_url = null,
  fidelity_notes = 'P0.7 master stored unchanged. Source: 3072x1728 landscape, SHA-1 d8e09bfdbad2fdef60f28840b90b79b45f77b8c6. AkarFinder identity remains CSS-only; no transformed bitmap exists.',
  updated_at = now()
FROM public.neighborhood_visual_collections c
WHERE c.id = a.collection_id
  AND c.city_slug = 'rabat'
  AND c.neighborhood_slug = 'souissi'
  AND a.scene_role = 'signature'
  AND a.variant_index = 1;

UPDATE public.neighborhood_visual_assets a
SET
  reference_query = 'Rabat,Souissi1.jpg Wikimedia Commons',
  reference_url = 'https://commons.wikimedia.org/wiki/File:Rabat,Souissi1.jpg',
  source_name = 'Wikimedia Commons',
  source_license = 'CC BY-SA 3.0',
  source_attribution = 'Bertramz — Rabat,Souissi1.jpg — Wikimedia Commons — CC BY-SA 3.0; modifications must be indicated and shared alike',
  reference_status = 'verified',
  verified_location = true,
  image_storage_path = 'neighborhood-visuals/rabat/souissi/immobilier/master.jpg',
  transformed_asset_url = null,
  fidelity_notes = 'P0.7 master stored unchanged. Commons description identifies Rabat, Souissi embassy quarter; 1440x964. Semantic boundary: representative built morphology only, never a property photo.',
  updated_at = now()
FROM public.neighborhood_visual_collections c
WHERE c.id = a.collection_id
  AND c.city_slug = 'rabat'
  AND c.neighborhood_slug = 'souissi'
  AND a.scene_role = 'immobilier'
  AND a.variant_index = 1;

UPDATE public.neighborhood_visual_assets a
SET
  reference_query = 'Hassan II Park Rabat Souissi November 2024 Wikimedia Commons',
  reference_url = 'https://commons.wikimedia.org/wiki/File:Hassan_II_Park_-_Rabat_-_November_2024_-_1.jpg',
  source_name = 'Wikimedia Commons',
  source_license = 'CC BY-SA 4.0',
  source_attribution = 'Anass Sedrati — Hassan II Park - Rabat - November 2024 - 1.jpg — Wikimedia Commons — CC BY-SA 4.0; modifications must be indicated and shared alike',
  reference_status = 'verified',
  verified_location = true,
  image_storage_path = 'neighborhood-visuals/rabat/souissi/lifestyle/master.jpg',
  transformed_asset_url = null,
  fidelity_notes = 'P0.7 master stored unchanged. Source 4032x3024 with GPS 34.000481,-6.831461 and Rabat-Souissi project evidence. Semantic boundary: public green-space lifestyle context only, never a private amenity.',
  updated_at = now()
FROM public.neighborhood_visual_collections c
WHERE c.id = a.collection_id
  AND c.city_slug = 'rabat'
  AND c.neighborhood_slug = 'souissi'
  AND a.scene_role = 'lifestyle'
  AND a.variant_index = 1;
