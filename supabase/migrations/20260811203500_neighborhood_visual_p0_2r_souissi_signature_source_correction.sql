-- NEIGHBORHOOD-VISUAL-P0.2R
-- Correct the Souissi/signature source after P0.6 physical ingestion exposed that
-- the previous -1.jpg master is portrait (1728x3072), not the certified 16:9 landscape.
-- This migration updates source metadata only. No transformed asset or storage path is activated.

DO $$
DECLARE
  target_count integer;
BEGIN
  SELECT count(*)
  INTO target_count
  FROM public.neighborhood_visual_assets a
  JOIN public.neighborhood_visual_collections c ON c.id = a.collection_id
  WHERE c.city_slug = 'rabat'
    AND c.neighborhood_slug = 'souissi'
    AND a.scene_role = 'signature'
    AND a.variant_index = 1;

  IF target_count <> 1 THEN
    RAISE EXCEPTION 'P0.2R expected exactly one Rabat/Souissi/signature v1 slot, found %', target_count;
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
  fidelity_notes = 'P0.2R corrected landscape master source: Avenue Mohammed VI, Souissi, Rabat. Commons original is 3072x1728, 1,338,653 bytes, SHA-1 d8e09bfdbad2fdef60f28840b90b79b45f77b8c6. This supersedes the portrait -1.jpg source exposed by P0.6 physical ingestion. Preserve road geometry, visible buildings/urban volumes, palms/characteristic vegetation, Moroccan flags and real street morphology. No transformed asset certified in this lot.',
  updated_at = now()
FROM public.neighborhood_visual_collections c
WHERE c.id = a.collection_id
  AND c.city_slug = 'rabat'
  AND c.neighborhood_slug = 'souissi'
  AND a.scene_role = 'signature'
  AND a.variant_index = 1;
