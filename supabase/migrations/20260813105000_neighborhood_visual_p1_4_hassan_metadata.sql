-- NEIGHBORHOOD-VISUAL-P1.4 — reconcile Hassan rows only after physical Storage ingestion.
DO $$
DECLARE object_count integer; row_count integer;
BEGIN
  SELECT count(*) INTO object_count FROM storage.objects
  WHERE bucket_id = 'neighborhood-visuals' AND name IN (
    'rabat/hassan/signature/master.jpg',
    'rabat/hassan/immobilier/master.jpg',
    'rabat/hassan/lifestyle/master.jpg'
  );
  IF object_count <> 3 THEN RAISE EXCEPTION 'P1.4 expected exactly 3 ingested Hassan visual objects, found %', object_count; END IF;

  SELECT count(*) INTO row_count
  FROM public.neighborhood_visual_assets a
  JOIN public.neighborhood_visual_collections c ON c.id = a.collection_id
  WHERE c.city_slug = 'rabat' AND c.neighborhood_slug = 'hassan' AND a.variant_index = 1
    AND a.scene_role IN ('signature','immobilier','lifestyle');
  IF row_count <> 3 THEN RAISE EXCEPTION 'P1.4 expected exactly 3 Hassan visual rows, found %', row_count; END IF;
END $$;

UPDATE public.neighborhood_visual_assets a SET
  reference_query='نافورة صومعة حسان.jpg Wikimedia Commons',
  reference_url='https://commons.wikimedia.org/wiki/File:%D9%86%D8%A7%D9%81%D9%88%D8%B1%D8%A9_%D8%B5%D9%88%D9%85%D8%B9%D8%A9_%D8%AD%D8%B3%D8%A7%D9%86.jpg',
  source_name='Wikimedia Commons', source_license='CC BY-SA 4.0',
  source_attribution='Hossam.essaadi.1 — نافورة صومعة حسان.jpg — Wikimedia Commons — CC BY-SA 4.0',
  reference_status='verified', verified_location=true,
  image_storage_path='neighborhood-visuals/rabat/hassan/signature/master.jpg', transformed_asset_url=null,
  fidelity_notes='P1.4 exact source: 5184x3456, 8754722 bytes, SHA-1 6522403ac6ec1bf56276a8aa5794693a66aa7c08. Commons object location 34.023864,-6.822656 on Hassan Tower plaza. Public landmark context only.',
  updated_at=now()
FROM public.neighborhood_visual_collections c
WHERE c.id=a.collection_id AND c.city_slug='rabat' AND c.neighborhood_slug='hassan' AND a.scene_role='signature' AND a.variant_index=1;

UPDATE public.neighborhood_visual_assets a SET
  reference_query='View-of-Rabat-from-Hassan-Tower.jpg Wikimedia Commons',
  reference_url='https://commons.wikimedia.org/wiki/File:View-of-Rabat-from-Hassan-Tower.jpg',
  source_name='Wikimedia Commons', source_license='CC BY-SA 4.0',
  source_attribution='Steven C. Price — View-of-Rabat-from-Hassan-Tower.jpg — Wikimedia Commons — CC BY-SA 4.0',
  reference_status='verified', verified_location=true,
  image_storage_path='neighborhood-visuals/rabat/hassan/immobilier/master.jpg', transformed_asset_url=null,
  fidelity_notes='P1.4 exact source: 3456x2304, 2877341 bytes, SHA-1 ffc30f2a48e055403880d933e29e16a853986e3e. Source description: view of Rabat from Hassan Tower plaza. Used only for urban morphology; never a specific property claim.',
  updated_at=now()
FROM public.neighborhood_visual_collections c
WHERE c.id=a.collection_id AND c.city_slug='rabat' AND c.neighborhood_slug='hassan' AND a.scene_role='immobilier' AND a.variant_index=1;

UPDATE public.neighborhood_visual_assets a SET
  reference_query='Quartier Hassan, Rabat, Morocco - panoramio (1).jpg Wikimedia Commons',
  reference_url='https://commons.wikimedia.org/wiki/File:Quartier_Hassan,_Rabat,_Morocco_-_panoramio_(1).jpg',
  source_name='Wikimedia Commons', source_license='CC BY-SA 3.0',
  source_attribution='Ben Bender — Quartier Hassan, Rabat, Morocco - panoramio (1).jpg — Wikimedia Commons — CC BY-SA 3.0',
  reference_status='verified', verified_location=true,
  image_storage_path='neighborhood-visuals/rabat/hassan/lifestyle/master.jpg', transformed_asset_url=null,
  fidelity_notes='P1.4 exact source: 1375x2048, 365717 bytes, SHA-1 fe36362031f75d1835931f46e15f8e43dccc4a7c. Source title explicitly names Quartier Hassan and camera location is 34.021671,-6.822780. Public lifestyle context only.',
  updated_at=now()
FROM public.neighborhood_visual_collections c
WHERE c.id=a.collection_id AND c.city_slug='rabat' AND c.neighborhood_slug='hassan' AND a.scene_role='lifestyle' AND a.variant_index=1;
