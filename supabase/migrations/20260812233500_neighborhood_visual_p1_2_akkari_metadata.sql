-- NEIGHBORHOOD-VISUAL-P1.2 — reconcile the three Akkari rows only after physical Storage ingestion.

DO $$
DECLARE
  object_count integer;
  row_count integer;
BEGIN
  SELECT count(*) INTO object_count
  FROM storage.objects
  WHERE bucket_id = 'neighborhood-visuals'
    AND name IN (
      'rabat/akkari/signature/master.jpg',
      'rabat/akkari/immobilier/master.jpg',
      'rabat/akkari/lifestyle/master.jpg'
    );

  IF object_count <> 3 THEN
    RAISE EXCEPTION 'P1.2 expected exactly 3 ingested Akkari visual objects, found %', object_count;
  END IF;

  SELECT count(*) INTO row_count
  FROM public.neighborhood_visual_assets a
  JOIN public.neighborhood_visual_collections c ON c.id = a.collection_id
  WHERE c.city_slug = 'rabat'
    AND c.neighborhood_slug = 'akkari'
    AND a.variant_index = 1
    AND a.scene_role IN ('signature', 'immobilier', 'lifestyle');

  IF row_count <> 3 THEN
    RAISE EXCEPTION 'P1.2 expected exactly 3 Akkari visual rows, found %', row_count;
  END IF;
END $$;

UPDATE public.neighborhood_visual_assets a
SET
  reference_query = 'Haj Hassan Al Akkari Mosque - Rabat.jpg Wikimedia Commons',
  reference_url = 'https://commons.wikimedia.org/wiki/File:Haj_Hassan_Al_Akkari_Mosque_-_Rabat.jpg',
  source_name = 'Wikimedia Commons',
  source_license = 'CC BY-SA 4.0',
  source_attribution = 'RACHID BAYA — Haj Hassan Al Akkari Mosque - Rabat.jpg — Wikimedia Commons — CC BY-SA 4.0; modifications must be indicated and shared alike',
  reference_status = 'verified',
  verified_location = true,
  image_storage_path = 'neighborhood-visuals/rabat/akkari/signature/master.jpg',
  transformed_asset_url = null,
  fidelity_notes = 'P1.2 master stored unchanged. Commons source explicitly identifies Haj Hassan Al Akkari Mosque and geotags it at 34.01288605,-6.86349618. Source proof SHA-1 b81c1ec25a3de2b176911a8e6662ad8967d2c411, 2417308 bytes. Semantic boundary: public landmark only.',
  updated_at = now()
FROM public.neighborhood_visual_collections c
WHERE c.id = a.collection_id AND c.city_slug = 'rabat' AND c.neighborhood_slug = 'akkari' AND a.scene_role = 'signature' AND a.variant_index = 1;

UPDATE public.neighborhood_visual_assets a
SET
  reference_query = 'KartaView photo 260132875 Akkari Rabat',
  reference_url = 'https://api.openstreetcam.org/2.0/photo/?id=260132875',
  source_name = 'KartaView',
  source_license = 'CC BY-SA 4.0',
  source_attribution = '© Grab and KartaView Contributors — photo 260132875 — CC BY-SA 4.0',
  reference_status = 'verified',
  verified_location = true,
  image_storage_path = 'neighborhood-visuals/rabat/akkari/immobilier/master.jpg',
  transformed_asset_url = null,
  fidelity_notes = 'P1.2 exact KartaView fileurlLTh stored unchanged: 1280x720, 270159 bytes, SHA-1 2466f43109b1f2b0b5c55b4acca2a59585a7438e. Photo 260132875 / sequence 1224587 is geotagged at 34.008988,-6.862511, heading 140 degrees. Semantic boundary: representative residential street morphology only; never a property photo.',
  updated_at = now()
FROM public.neighborhood_visual_collections c
WHERE c.id = a.collection_id AND c.city_slug = 'rabat' AND c.neighborhood_slug = 'akkari' AND a.scene_role = 'immobilier' AND a.variant_index = 1;

UPDATE public.neighborhood_visual_assets a
SET
  reference_query = 'KartaView photo 260133961 Akkari Rabat',
  reference_url = 'https://api.openstreetcam.org/2.0/photo/?id=260133961',
  source_name = 'KartaView',
  source_license = 'CC BY-SA 4.0',
  source_attribution = '© Grab and KartaView Contributors — photo 260133961 — CC BY-SA 4.0',
  reference_status = 'verified',
  verified_location = true,
  image_storage_path = 'neighborhood-visuals/rabat/akkari/lifestyle/master.jpg',
  transformed_asset_url = null,
  fidelity_notes = 'P1.2 exact KartaView fileurlLTh stored unchanged: 1280x720, 251579 bytes, SHA-1 015123bef3d8a5c98d9f31ab3f3a581272a6ae4e. Photo 260133961 / sequence 1224599 is geotagged at 34.009151,-6.86069, heading 214 degrees. Semantic boundary: public street-life, mobility and commercial context only.',
  updated_at = now()
FROM public.neighborhood_visual_collections c
WHERE c.id = a.collection_id AND c.city_slug = 'rabat' AND c.neighborhood_slug = 'akkari' AND a.scene_role = 'lifestyle' AND a.variant_index = 1;
