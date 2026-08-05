create table if not exists public.owner_listing_representations (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique references public.seller_property_drafts(id) on delete cascade,
  publication_id uuid not null unique references public.seller_listing_publications(id) on delete cascade,
  source_kind text not null default 'owner_declared' check (source_kind = 'owner_declared'),
  provenance_label text not null default 'Annonce publiée par son propriétaire',
  normalized_city text,
  normalized_neighborhood text,
  normalized_property_type text,
  normalized_intent text not null default 'sale' check (normalized_intent = 'sale'),
  normalized_price_mad numeric,
  normalized_surface_m2 numeric,
  price_per_m2_mad numeric,
  bedrooms_count integer,
  condition_label text,
  photo_count integer not null default 0,
  completeness_score integer not null default 0 check (completeness_score between 0 and 100),
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  quality_tier text not null default 'Q1_contextual',
  dedupe_fingerprint text not null,
  canonical_cluster_key text not null,
  lifecycle_status text not null check (lifecycle_status in ('live','paused','withdrawn')),
  freshness_status text not null default 'fresh_confirmed' check (freshness_status in ('fresh_confirmed','stale','withdrawn')),
  display_eligibility text not null default 'ineligible' check (display_eligibility in ('ineligible','eligible_secondary','eligible_primary')),
  display_eligibility_reason text,
  ranking_quality_boost numeric not null default 0,
  published_at timestamptz,
  last_owner_action_at timestamptz not null,
  projected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_listing_representations_search_idx
  on public.owner_listing_representations (display_eligibility, lifecycle_status, normalized_city, normalized_property_type, updated_at desc);
create index if not exists owner_listing_representations_dedupe_idx
  on public.owner_listing_representations (dedupe_fingerprint, canonical_cluster_key);

alter table public.owner_listing_representations enable row level security;
revoke all on table public.owner_listing_representations from anon, authenticated;
grant all on table public.owner_listing_representations to service_role;

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
  elsif cardinality(coalesce(v_draft.required_missing, array[]::text[])) > 0 then
    v_eligibility := 'ineligible'; v_reason := 'required_information_missing';
  elsif coalesce(v_draft.photo_count, 0) < 1 then
    v_eligibility := 'ineligible'; v_reason := 'photo_required';
  elsif v_quality >= 85 then
    v_eligibility := 'eligible_primary'; v_reason := 'owner_listing_high_quality';
  else
    v_eligibility := 'eligible_secondary'; v_reason := 'owner_listing_eligible';
  end if;

  v_fingerprint := encode(digest(lower(concat_ws('|', v_city, v_neighborhood, v_property_type, round(coalesce(v_surface,0)), round(coalesce(v_price,0), -3))), 'sha256'), 'hex');

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
    v_eligibility, v_reason, case when v_eligibility = 'eligible_primary' then 20 when v_eligibility = 'eligible_secondary' then 10 else 0 end,
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

revoke all on function public.sync_owner_listing_representation_v1(uuid) from public, anon, authenticated;
grant execute on function public.sync_owner_listing_representation_v1(uuid) to service_role;

create or replace function public.search_owner_public_representations_v1(
  p_query text default null,
  p_city text default null,
  p_property_type text default null,
  p_intent text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_surface numeric default null,
  p_max_surface numeric default null,
  p_limit integer default 50
)
returns table (
  representation_id uuid, title text, snippet text, normalized_city text,
  normalized_property_type text, normalized_intent text,
  normalized_price_mad numeric, normalized_surface_m2 numeric,
  price_per_m2_mad numeric, quality_tier text, quality_score integer,
  display_eligibility text, display_eligibility_reason text,
  ranking_quality_boost numeric, updated_at timestamptz, total_count bigint
)
language sql stable security definer set search_path = public
as $$
  with eligible as (
    select r.*
    from public.owner_listing_representations r
    where r.lifecycle_status = 'live'
      and r.freshness_status = 'fresh_confirmed'
      and r.display_eligibility in ('eligible_primary','eligible_secondary')
      and (p_city is null or lower(r.normalized_city) = lower(trim(p_city)))
      and (p_property_type is null or lower(r.normalized_property_type) = lower(trim(p_property_type)))
      and (p_intent is null or lower(r.normalized_intent) = lower(trim(p_intent)))
      and (p_min_price is null or r.normalized_price_mad >= p_min_price)
      and (p_max_price is null or r.normalized_price_mad <= p_max_price)
      and (p_min_surface is null or r.normalized_surface_m2 >= p_min_surface)
      and (p_max_surface is null or r.normalized_surface_m2 <= p_max_surface)
      and (p_query is null or concat_ws(' ', r.normalized_city, r.normalized_neighborhood, r.normalized_property_type, r.condition_label) ilike '%' || trim(p_query) || '%')
  )
  select e.id,
    concat_ws(' · ', initcap(coalesce(e.normalized_property_type, 'Bien')), coalesce(e.normalized_neighborhood, e.normalized_city)) as title,
    'Annonce structurée, vérifiée puis publiée par son propriétaire.'::text as snippet,
    e.normalized_city, e.normalized_property_type, e.normalized_intent,
    e.normalized_price_mad, e.normalized_surface_m2, e.price_per_m2_mad,
    e.quality_tier, e.quality_score, e.display_eligibility,
    e.display_eligibility_reason, e.ranking_quality_boost, e.updated_at,
    count(*) over() as total_count
  from eligible e
  order by case e.display_eligibility when 'eligible_primary' then 0 else 1 end,
    e.quality_score desc, e.updated_at desc, e.id
  limit greatest(1, least(coalesce(p_limit,50),100));
$$;

revoke all on function public.search_owner_public_representations_v1(text,text,text,text,numeric,numeric,numeric,numeric,integer) from public, anon, authenticated;
grant execute on function public.search_owner_public_representations_v1(text,text,text,text,numeric,numeric,numeric,numeric,integer) to service_role;
