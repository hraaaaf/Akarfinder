-- NEIGHBORHOOD-VISUAL-P0.2
-- Replace the Souissi/signature documentary reference with the verified CC BY-SA 4.0 master source.
-- This migration certifies source metadata only. It does not publish or activate a transformed visual.

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
    RAISE EXCEPTION 'P0.2 expected exactly one Rabat/Souissi/signature v1 slot, found %', target_count;
  END IF;
END $$;

UPDATE public.neighborhood_visual_assets a
SET
  reference_query = 'Avenue Mohamed VI Souissi Rabat -1.jpg Wikimedia Commons',
  reference_url = 'https://commons.wikimedia.org/wiki/File:Avenue_Mohamed_VI_Souissi_Rabat_-1.jpg',
  source_name = 'Wikimedia Commons',
  source_license = 'CC BY-SA 4.0',
  source_attribution = 'YousraElkh9 — Avenue Mohamed VI Souissi Rabat -1.jpg — Wikimedia Commons — CC BY-SA 4.0; modifications must be indicated and shared alike',
  reference_status = 'verified',
  verified_location = true,
  fidelity_notes = 'P0.2 verified master source: Avenue Mohammed VI, Souissi, Rabat. Material file verified as 3072x1728, 1,600,029 bytes, SHA-1 c801e690e27a571c38d68de199824b34b925b6e4. Preserve road geometry, visible buildings/urban volumes, palms/characteristic vegetation, Moroccan flags and real street morphology. No transformed asset certified in this lot.',
  updated_at = now()
FROM public.neighborhood_visual_collections c
WHERE c.id = a.collection_id
  AND c.city_slug = 'rabat'
  AND c.neighborhood_slug = 'souissi'
  AND a.scene_role = 'signature'
  AND a.variant_index = 1;
