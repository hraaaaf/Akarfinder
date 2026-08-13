-- NEIGHBORHOOD-VISUAL-P1.3 — reconcile Aviation context rows only after physical Storage ingestion.
DO $$
DECLARE object_count integer; row_count integer;
BEGIN
  SELECT count(*) INTO object_count FROM storage.objects
  WHERE bucket_id = 'neighborhood-visuals' AND name IN (
    'rabat/aviation/signature/master.jpg',
    'rabat/aviation/immobilier/master.jpg',
    'rabat/aviation/lifestyle/master.jpg'
  );
  IF object_count <> 3 THEN RAISE EXCEPTION 'P1.3 expected exactly 3 ingested Aviation visual objects, found %', object_count; END IF;

  SELECT count(*) INTO row_count
  FROM public.neighborhood_visual_assets a
  JOIN public.neighborhood_visual_collections c ON c.id = a.collection_id
  WHERE c.city_slug = 'rabat' AND c.neighborhood_slug = 'aviation' AND a.variant_index = 1
    AND a.scene_role IN ('signature','immobilier','lifestyle');
  IF row_count <> 3 THEN RAISE EXCEPTION 'P1.3 expected exactly 3 Aviation visual rows, found %', row_count; END IF;
END $$;

UPDATE public.neighborhood_visual_assets a SET
  reference_query='Hassan II Park - Rabat - November 2024 - 1.jpg Wikimedia Commons',
  reference_url='https://commons.wikimedia.org/wiki/File:Hassan_II_Park_-_Rabat_-_November_2024_-_1.jpg',
  source_name='Wikimedia Commons', source_license='CC BY-SA 4.0',
  source_attribution='Anass Sedrati — Hassan II Park - Rabat - November 2024 - 1.jpg — Wikimedia Commons — CC BY-SA 4.0',
  reference_status='verified', verified_location=true,
  image_storage_path='neighborhood-visuals/rabat/aviation/signature/master.jpg', transformed_asset_url=null,
  fidelity_notes='P1.3 exact source: 4032x3024, 3222903 bytes, SHA-1 93cbebc360cb7424cfb554896b968fd917d43511, Commons geotag 34.000481,-6.831461. relationship=nearby_context. Nearby green public-space context only; never represented as being inside Aviation or as a listing-specific property.',
  updated_at=now()
FROM public.neighborhood_visual_collections c
WHERE c.id=a.collection_id AND c.city_slug='rabat' AND c.neighborhood_slug='aviation' AND a.scene_role='signature' AND a.variant_index=1;

UPDATE public.neighborhood_visual_assets a SET
  reference_query='Avenue Mohamed VI Souissi Rabat.jpg Wikimedia Commons',
  reference_url='https://commons.wikimedia.org/wiki/File:Avenue_Mohamed_VI_Souissi_Rabat.jpg',
  source_name='Wikimedia Commons', source_license='CC BY-SA 4.0',
  source_attribution='YousraElkh9 — Avenue Mohamed VI Souissi Rabat.jpg — Wikimedia Commons — CC BY-SA 4.0',
  reference_status='verified', verified_location=true,
  image_storage_path='neighborhood-visuals/rabat/aviation/immobilier/master.jpg', transformed_asset_url=null,
  fidelity_notes='P1.3 exact source: 3072x1728, 1338653 bytes, SHA-1 d8e09bfdbad2fdef60f28840b90b79b45f77b8c6. relationship=edge_context. Used strictly for the shared green boulevard morphology on the Aviation/Souissi edge; never as an inside-Aviation address or property claim.',
  updated_at=now()
FROM public.neighborhood_visual_collections c
WHERE c.id=a.collection_id AND c.city_slug='rabat' AND c.neighborhood_slug='aviation' AND a.scene_role='immobilier' AND a.variant_index=1;

UPDATE public.neighborhood_visual_assets a SET
  reference_query='Hassan II Park - Rabat - November 2024 - 2.jpg Wikimedia Commons',
  reference_url='https://commons.wikimedia.org/wiki/File:Hassan_II_Park_-_Rabat_-_November_2024_-_2.jpg',
  source_name='Wikimedia Commons', source_license='CC BY-SA 4.0',
  source_attribution='Anass Sedrati — Hassan II Park - Rabat - November 2024 - 2.jpg — Wikimedia Commons — CC BY-SA 4.0',
  reference_status='verified', verified_location=true,
  image_storage_path='neighborhood-visuals/rabat/aviation/lifestyle/master.jpg', transformed_asset_url=null,
  fidelity_notes='P1.3 exact source: 4032x3024, 3502946 bytes, SHA-1 88d981adf174f55cdd77a5ad7518891dd1ec951d, Commons geotag 34.000528,-6.831544. relationship=nearby_context. Nearby public leisure context only; never represented as an Aviation street or private amenity.',
  updated_at=now()
FROM public.neighborhood_visual_collections c
WHERE c.id=a.collection_id AND c.city_slug='rabat' AND c.neighborhood_slug='aviation' AND a.scene_role='lifestyle' AND a.variant_index=1;
