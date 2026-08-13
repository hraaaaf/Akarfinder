-- NEIGHBORHOOD-VISUAL-P1.6 — reconcile Les Orangers rows only after physical Storage ingestion.
DO $$
DECLARE object_count integer; row_count integer;
BEGIN
  SELECT count(*) INTO object_count FROM storage.objects WHERE bucket_id = 'neighborhood-visuals' AND name IN (
    'rabat/les-orangers/signature/master.jpg','rabat/les-orangers/immobilier/master.jpg','rabat/les-orangers/lifestyle/master.jpg');
  IF object_count <> 3 THEN RAISE EXCEPTION 'P1.6 expected exactly 3 ingested Les Orangers visual objects, found %', object_count; END IF;
  SELECT count(*) INTO row_count FROM public.neighborhood_visual_assets a JOIN public.neighborhood_visual_collections c ON c.id = a.collection_id
  WHERE c.city_slug = 'rabat' AND c.neighborhood_slug = 'les-orangers' AND a.variant_index = 1 AND a.scene_role IN ('signature','immobilier','lifestyle');
  IF row_count <> 3 THEN RAISE EXCEPTION 'P1.6 expected exactly 3 Les Orangers visual rows, found %', row_count; END IF;
END $$;

UPDATE public.neighborhood_visual_assets a SET reference_query='Quartier Des Orangers Rabat Wikimedia Commons', reference_url='https://commons.wikimedia.org/wiki/File:Quartier_Des_Orangers,_Rabat,_Morocco_-_panoramio.jpg', source_name='Wikimedia Commons', source_license='CC BY-SA 3.0', source_attribution='Ben Bender — Quartier Des Orangers, Rabat, Morocco - panoramio.jpg — Wikimedia Commons — CC BY-SA 3.0', reference_status='verified', verified_location=true, image_storage_path='neighborhood-visuals/rabat/les-orangers/signature/master.jpg', transformed_asset_url=null, fidelity_notes='P1.6 exact source: 2048x1375, 732633 bytes, SHA-1 0770e25288f7ecd3841cd246587f1ad4f1cde18c, camera 34.016912,-6.836610.', updated_at=now()
FROM public.neighborhood_visual_collections c WHERE c.id = a.collection_id AND c.city_slug = 'rabat' AND c.neighborhood_slug = 'les-orangers' AND a.scene_role = 'signature' AND a.variant_index = 1;

UPDATE public.neighborhood_visual_assets a SET reference_query='KartaView 260179395 Les Orangers Rabat', reference_url='https://kartaview.org/', source_name='KartaView', source_license='CC BY-SA 4.0', source_attribution='© Grab and KartaView Contributors', reference_status='verified', verified_location=true, image_storage_path='neighborhood-visuals/rabat/les-orangers/immobilier/master.jpg', transformed_asset_url=null, fidelity_notes='P1.6 exact source: 1280x720, 183593 bytes, SHA-1 cb978ea2874cb2e171aee6363175c38cd08305aa, photo 260179395 at 34.016806,-6.839109.', updated_at=now()
FROM public.neighborhood_visual_collections c WHERE c.id = a.collection_id AND c.city_slug = 'rabat' AND c.neighborhood_slug = 'les-orangers' AND a.scene_role = 'immobilier' AND a.variant_index = 1;

UPDATE public.neighborhood_visual_assets a SET reference_query='KartaView 276946287 Les Orangers Rabat', reference_url='https://kartaview.org/', source_name='KartaView', source_license='CC BY-SA 4.0', source_attribution='© Grab and KartaView Contributors', reference_status='verified', verified_location=true, image_storage_path='neighborhood-visuals/rabat/les-orangers/lifestyle/master.jpg', transformed_asset_url=null, fidelity_notes='P1.6 exact source: 1280x720, 304750 bytes, SHA-1 f24100d91a8ccd20724ce9bb0a11e03c902d4adf, photo 276946287 at 34.016899,-6.834063.', updated_at=now()
FROM public.neighborhood_visual_collections c WHERE c.id = a.collection_id AND c.city_slug = 'rabat' AND c.neighborhood_slug = 'les-orangers' AND a.scene_role = 'lifestyle' AND a.variant_index = 1;
