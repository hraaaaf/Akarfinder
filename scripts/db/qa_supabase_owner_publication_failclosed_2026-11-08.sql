-- Only for an explicitly approved, EMPTY, isolated Akarfinder Supabase.
-- Single DO statement, atomic: no user data, no URL, and cascading cleanup.
-- This script adds a stricter empty-database preflight than the SQL tested
-- through Supabase on 2026-11-08; this exact file was replayed successfully
-- on 2026-11-08 against empty AkarfFnder, with independent zero-row readback.
DO $qa$
DECLARE
  v_lead uuid; v_draft uuid; v_pub uuid;
  v_status text; v_reason text; v_city text; v_neighborhood text;
  v_err text; v_public_count bigint;
BEGIN
  IF EXISTS(SELECT 1 FROM public.buyer_leads)
    OR EXISTS(SELECT 1 FROM public.seller_property_drafts)
    OR EXISTS(SELECT 1 FROM public.seller_listing_publications)
    OR EXISTS(SELECT 1 FROM public.owner_listing_representations)
    OR EXISTS(SELECT 1 FROM public.property_listings)
  THEN RAISE EXCEPTION 'qa_requires_an_empty_isolated_database'; END IF;

  INSERT INTO public.buyer_leads(source_channel,phone_whatsapp,consent_contact,consent_indicative,full_name)
    VALUES('qa_fixture_akarfinder_20261108','00000000',false,false,'[TEST FICTIF – AUCUN CLIENT]')
    RETURNING id INTO v_lead;

  INSERT INTO public.seller_property_drafts(
    lead_id,status,review_status,photo_count,declared_facts,weighted_completeness,required_missing
  ) VALUES(
    v_lead,'submitted','ready_for_review',0,
    '{"location.city":"Casablanca","location.neighborhood":"Maarif","classification.property_type":"apartment","offer.price_amount":"1000000","surfaces.surface_total_m2":"80"}'::jsonb,
    90,'[]'::jsonb
  ) RETURNING id INTO v_draft;

  BEGIN
    INSERT INTO public.seller_listing_publications(draft_id,status,published_at,last_owner_action_at)
      VALUES(v_draft,'live',now(),now());
    RAISE EXCEPTION 'qa_guard_bypassed';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err <> 'Seller draft must be approved before publication' THEN
      RAISE EXCEPTION 'qa_unexpected_guard_error: %',v_err;
    END IF;
  END;

  UPDATE public.seller_property_drafts SET review_status='approved' WHERE id=v_draft;
  INSERT INTO public.seller_listing_publications(draft_id,status,published_at,last_owner_action_at)
    VALUES(v_draft,'live',now(),now()) RETURNING id INTO v_pub;

  SELECT r.lifecycle_status,r.display_eligibility_reason,r.normalized_city,r.normalized_neighborhood
    INTO v_status,v_reason,v_city,v_neighborhood
    FROM public.owner_listing_representations r WHERE r.draft_id=v_draft;
  IF v_status IS DISTINCT FROM 'live' OR v_reason IS DISTINCT FROM 'photo_required'
     OR v_city IS DISTINCT FROM 'Casablanca' OR v_neighborhood IS DISTINCT FROM 'Maarif'
  THEN RAISE EXCEPTION 'qa_unexpected_projection'; END IF;

  SELECT count(*) INTO v_public_count
    FROM public.search_owner_public_representations_v1(null,'Casablanca',null,null,null,null,null,null,20)
    WHERE representation_id IN(SELECT id FROM public.owner_listing_representations WHERE draft_id=v_draft);
  IF v_public_count<>0 THEN RAISE EXCEPTION 'qa_unpublished_listing_visible'; END IF;

  DELETE FROM public.buyer_leads WHERE id=v_lead;
  IF EXISTS(SELECT 1 FROM public.seller_property_drafts WHERE id=v_draft)
    OR EXISTS(SELECT 1 FROM public.seller_listing_publications WHERE id=v_pub)
    OR EXISTS(SELECT 1 FROM public.owner_listing_representations WHERE draft_id=v_draft)
  THEN RAISE EXCEPTION 'qa_cleanup_failed'; END IF;
END $qa$;
