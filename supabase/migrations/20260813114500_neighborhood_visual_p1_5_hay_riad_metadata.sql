-- NEIGHBORHOOD-VISUAL-P1.5 — reconcile Hay Riad rows only after physical Storage ingestion.
DO $$
DECLARE object_count integer; row_count integer;
BEGIN
  SELECT count(*) INTO object_count FROM storage.objects WHERE bucket_id='neighborhood-visuals' AND name IN (
    'rabat/hay-riad/signature/master.jpg','rabat/hay-riad/immobilier/master.jpg','rabat/hay-riad/lifestyle/master.jpg');
  IF object_count <> 3 THEN RAISE EXCEPTION 'P1.5 expected exactly 3 ingested Hay Riad visual objects, found %', object_count; END IF;
  SELECT count(*) INTO row_count FROM public.neighborhood_visual_assets a JOIN public.neighborhood_visual_collections c ON c.id=a.collection_id
  WHERE c.city_slug = 'rabat' AND c.neighborhood_slug = 'hay-riad' AND a.variant_index = 1 AND a.scene_role IN ('signature','immobilier','lifestyle');
  IF row_count <> 3 THEN RAISE EXCEPTION 'P1.5 expected exactly 3 Hay Riad visual rows, found %', row_count; END IF;
END $$;

UPDATE public.neighborhood_visual_assets a SET
 reference_query='Rabat hay ryad.jpg Wikimedia Commons', reference_url='https://commons.wikimedia.org/wiki/File:Rabat_hay_ryad.jpg',
 source_name='Wikimedia Commons', source_license='CC BY-SA 4.0', source_attribution='Mohammed.salhi — Rabat hay ryad.jpg — Wikimedia Commons — CC BY-SA 4.0',
 reference_status='verified', verified_location=true, image_storage_path='neighborhood-visuals/rabat/hay-riad/signature/master.jpg', transformed_asset_url=null,
 fidelity_notes='P1.5 exact source: 3251x4338, 6395398 bytes, SHA-1 f02d4795b4df3c7cd6608472b82f9fda1c5d4796, camera 33.952591,-6.871639. Neighborhood context only; never a listing-specific property.', updated_at=now()
FROM public.neighborhood_visual_collections c WHERE c.id=a.collection_id AND c.city_slug = 'rabat' AND c.neighborhood_slug = 'hay-riad' AND a.scene_role='signature' AND a.variant_index=1;

UPDATE public.neighborhood_visual_assets a SET
 reference_query='Hay Riad 335665610 Villa Narjis Wikimedia Commons', reference_url='https://commons.wikimedia.org/wiki/File:Hay_Riad_(335665610).jpg',
 source_name='Wikimedia Commons', source_license='CC BY 2.0', source_attribution='Ninara — Hay Riad (335665610).jpg — Wikimedia Commons — CC BY 2.0',
 reference_status='verified', verified_location=true, image_storage_path='neighborhood-visuals/rabat/hay-riad/immobilier/master.jpg', transformed_asset_url=null,
 fidelity_notes='P1.5 exact source: 3456x2304, 4353803 bytes, SHA-1 54c45f4914839a1a9ee3a65acf3d570f3450b653. Commons description: Villa Narjis in Hay Riad, Rabat, home 1989-1992. Historical morphology only; never current availability.', updated_at=now()
FROM public.neighborhood_visual_collections c WHERE c.id=a.collection_id AND c.city_slug = 'rabat' AND c.neighborhood_slug = 'hay-riad' AND a.scene_role='immobilier' AND a.variant_index=1;

UPDATE public.neighborhood_visual_assets a SET
 reference_query='Hay Riad 335665617 Wikimedia Commons', reference_url='https://commons.wikimedia.org/wiki/File:Hay_Riad_(335665617).jpg',
 source_name='Wikimedia Commons', source_license='CC BY 2.0', source_attribution='Ninara — Hay Riad (335665617).jpg — Wikimedia Commons — CC BY 2.0',
 reference_status='verified', verified_location=true, image_storage_path='neighborhood-visuals/rabat/hay-riad/lifestyle/master.jpg', transformed_asset_url=null,
 fidelity_notes='P1.5 exact source: 2800x1866, 921974 bytes, SHA-1 a91237d667511ed212e9c46b343d96cff5054c5f. Commons explicitly describes Hay Riad, Rabat. Public neighborhood atmosphere only.', updated_at=now()
FROM public.neighborhood_visual_collections c WHERE c.id=a.collection_id AND c.city_slug = 'rabat' AND c.neighborhood_slug = 'hay-riad' AND a.scene_role='lifestyle' AND a.variant_index=1;
