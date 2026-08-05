-- Runtime compatibility fixes proven against Supabase production.
-- 1) required_missing is jsonb, not text[].
-- 2) pgcrypto is installed in the extensions schema.

create or replace function public.sync_owner_listing_representation_v1(p_draft_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.seller_property_drafts%rowtype;
  v_publication public.seller_listing_publications%rowtype;
  v_city text;
  v_neighborhood text;
  v_property_type text;
  v_price numeric;
  v_surface numeric;
  v_bedrooms integer;
  v_condition text;
  v_quality integer;
  v_eligibility text;
  v_reason text;
  v_fingerprint text;
  v_id uuid;
begin
  select * into v_draft from public.seller_property_drafts where id = p_draft_id;
  if not found then raise exception 'owner_draft_not_found'; end if;

  select * into v_publication from public.seller_listing_publications where draft_id = p_draft_id;
  if not found then
    delete from public.owner_listing_representations where draft_id = p_draft_id;
    return null;
  end if;

  v_city := nullif(trim(v_draft.declared_facts->>'location.city'), '');
  v_neighborhood := nullif(trim(v_draft.declared_facts->>'location.neighborhood'), '');
  v_property_type := nullif(trim(v_draft.declared_facts->>'classification.property_type'), '');
  v_price := nullif(v_draft.declared_facts->>'offer.price_amount', '')::numeric;
  v_surface := nullif(v_draft.declared_facts->>'surfaces.surface_total_m2', '')::numeric;
  v_bedrooms := nullif(v_draft.declared_facts->>'layout.bedrooms_count', '')::integer;
  v_condition := nullif(trim(v_draft.declared_facts->>'condition.condition'), '');

  v_quality := least(100, greatest(0,
    coalesce(v_draft.weighted_completeness, 0)
    + case when coalesce(v_draft.photo_count, 0) >= 6 then 10 when coalesce(v_draft.photo_count, 0) >= 1 then 5 else 0 end
  ));

  if v_publication.status = 'withdrawn' then
    v_eligibility := 'ineligible'; v_reason := 'owner_withdrawn';
  elsif v_publication.status = 'paused' then
    v_eligibility := 'ineligible'; v_reason := 'owner_paused';
  elsif v_draft.review_status <> 'approved' then
    v_eligibility := 'ineligible'; v_reason := 'review_not_approved';
  elsif jsonb_array_length(coalesce(v_draft.required_missing, '[]'::jsonb)) > 0 then
    v_eligibility := 'ineligible'; v_reason := 'required_information_missing';
  elsif coalesce(v_draft.photo_count, 0) < 1 then
    v_eligibility := 'ineligible'; v_reason := 'photo_required';
  elsif v_quality >= 85 then
    v_eligibility := 'eligible_primary'; v_reason := 'owner_listing_high_quality';
  else
    v_eligibility := 'eligible_secondary'; v_reason := 'owner_listing_eligible';
  end if;

  v_fingerprint := encode(
    extensions.digest(
      lower(concat_ws('|', v_city, v_neighborhood, v_property_type, round(coalesce(v_surface,0)), round(coalesce(v_price,0), -3))),
      'sha256'
    ),
    'hex'
  );

  insert into public.owner_listing_representations (
    draft_id, publication_id, normalized_city, normalized_neighborhood,
    normalized_property_type, normalized_price_mad, normalized_surface_m2,
    price_per_m2_mad, bedrooms_count, condition_label, photo_count,
    completeness_score, quality_score, quality_tier, dedupe_fingerprint,
    canonical_cluster_key, lifecycle_status, freshness_status,
    display_eligibility, display_eligibility_reason, ranking_quality_boost,
    published_at, last_owner_action_at, updated_at
  ) values (
    p_draft_id, v_publication.id, v_city, v_neighborhood, v_property_type,
    v_price, v_surface, case when v_price > 0 and v_surface > 0 then round(v_price / v_surface, 2) end,
    v_bedrooms, v_condition, coalesce(v_draft.photo_count,0),
    coalesce(v_draft.weighted_completeness,0), v_quality,
    case when v_quality >= 90 then 'Q3_intelligence_ready' when v_quality >= 75 then 'Q2_comparable' else 'Q1_contextual' end,
    v_fingerprint, v_fingerprint, v_publication.status,
    case when v_publication.status = 'withdrawn' then 'withdrawn' else 'fresh_confirmed' end,
    v_eligibility, v_reason,
    case when v_eligibility = 'eligible_primary' then 20 when v_eligibility = 'eligible_secondary' then 10 else 0 end,
    v_publication.published_at, v_publication.last_owner_action_at, now()
  )
  on conflict (draft_id) do update set
    publication_id = excluded.publication_id,
    normalized_city = excluded.normalized_city,
    normalized_neighborhood = excluded.normalized_neighborhood,
    normalized_property_type = excluded.normalized_property_type,
    normalized_price_mad = excluded.normalized_price_mad,
    normalized_surface_m2 = excluded.normalized_surface_m2,
    price_per_m2_mad = excluded.price_per_m2_mad,
    bedrooms_count = excluded.bedrooms_count,
    condition_label = excluded.condition_label,
    photo_count = excluded.photo_count,
    completeness_score = excluded.completeness_score,
    quality_score = excluded.quality_score,
    quality_tier = excluded.quality_tier,
    dedupe_fingerprint = excluded.dedupe_fingerprint,
    canonical_cluster_key = excluded.canonical_cluster_key,
    lifecycle_status = excluded.lifecycle_status,
    freshness_status = excluded.freshness_status,
    display_eligibility = excluded.display_eligibility,
    display_eligibility_reason = excluded.display_eligibility_reason,
    ranking_quality_boost = excluded.ranking_quality_boost,
    published_at = excluded.published_at,
    last_owner_action_at = excluded.last_owner_action_at,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;
