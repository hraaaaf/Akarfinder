-- NEIGHBORHOOD-VISUAL-P1.3 — reconcile the three Aviation rows only after physical Storage ingestion.
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
  reference_query='Sofitel Rabat.jpg Wikimedia Commons',
  reference_url='https://commons.wikimedia.org/wiki/File:Sofitel_Rabat.jpg',
  source_name='Wikimedia Commons', source_license='CC BY-SA 4.0',
  source_attribution='Zainabade — Sofitel Rabat.jpg — Wikimedia Commons — CC BY-SA 4.0',
  reference_status='verified', verified_location=true,
  image_storage_path='neighborhood-visuals/rabat/aviation/signature/master.jpg', transformed_asset_url=null,
  fidelity_notes='P1.3 exact source pinned unchanged: 2560x1440, 621270 bytes, SHA-1 9301a9696cbe7a420951f7179d12c755a6492610. Sofitel Rabat Jardin des Roses is used only as a Quartier Aviation landmark; never as a listing-specific property.',
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
  fidelity_notes='P1.3 exact source pinned unchanged: 3072x1728, 1338653 bytes, SHA-1 d8e09bfdbad2fdef60f28840b90b79b45f77b8c6. Used only for the shared green Mohammed VI boulevard morphology on the Aviation/Souissi edge; never as a specific property or interior-Aviation address claim.',
  updated_at=now()
FROM public.neighborhood_visual_collections c
WHERE c.id=a.collection_id AND c.city_slug='rabat' AND c.neighborhood_slug='aviation' AND a.scene_role='immobilier' AND a.variant_index=1;

UPDATE public.neighborhood_visual_assets a SET
  reference_query='KartaView photo 260184419 Aviation Rabat',
  reference_url='https://api.openstreetcam.org/2.0/photo/?id=260184419',
  source_name='KartaView', source_license='CC BY-SA 4.0',
  source_attribution='© Grab and KartaView Contributors — photo 260184419 — CC BY-SA 4.0',
  reference_status='verified', verified_location=true,
  image_storage_path='neighborhood-visuals/rabat/aviation/lifestyle/master.jpg', transformed_asset_url=null,
  fidelity_notes='P1.3 exact KartaView frame pinned unchanged: 1280x720, 292304 bytes, SHA-1 3bfd758bb1bc62a0b9598de68f5940932a898eb7. Photo 260184419 / sequence 1224667 geotagged at 34.020405,-6.834417 heading 235 degrees. Public street-life context only.',
  updated_at=now()
FROM public.neighborhood_visual_collections c
WHERE c.id=a.collection_id AND c.city_slug='rabat' AND c.neighborhood_slug='aviation' AND a.scene_role='lifestyle' AND a.variant_index=1;
