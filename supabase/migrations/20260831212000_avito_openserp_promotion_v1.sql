-- AVITO-OPENSERP-PROMOTION-V1
-- Promote recent public-index observations into canonical-link-only seeds.
-- No direct Avito fetch. No title/snippet/price/surface reuse. Reversible.

create table if not exists public.odm_avito_openserp_promotion_snapshot_v1 (
  batch_id uuid not null,
  discovery_candidate_id uuid not null references public.discovery_candidates(id) on delete restrict,
  canonical_url text not null,
  observed_at timestamptz not null,
  policy_hash text not null,
  normalized_city text not null,
  normalized_property_type text not null,
  normalized_intent text,
  created_seed_id uuid references public.source_offer_seeds(id) on delete set null,
  batch_state text not null default 'prepared' check (batch_state in ('prepared','active','rolled_back')),
  prepared_at timestamptz not null default now(),
  activated_at timestamptz,
  rolled_back_at timestamptz,
  primary key (batch_id, discovery_candidate_id)
);

alter table public.odm_avito_openserp_promotion_snapshot_v1 enable row level security;
revoke all on public.odm_avito_openserp_promotion_snapshot_v1 from anon, authenticated;
grant select on public.odm_avito_openserp_promotion_snapshot_v1 to service_role;

create or replace function public.odm_avito_openserp_city_v1(p_url text)
returns text language sql immutable set search_path to '' as $function$
  select case split_part(regexp_replace(p_url,'^https://avito\\.ma/',''), '/', 2)
    when 'fnideq' then 'Fnideq'
    when 'inzegan' then 'Inezgane'
    when 'b%C3%A9ni_mellal' then 'Béni Mellal'
    when 'berrechid' then 'Berrechid'
    when 'bouskoura_centre' then 'Bouskoura'
    when 'chefchaouen' then 'Chefchaouen'
    when 'dar_bouazza' then 'Dar Bouazza'
    when 'errachidia' then 'Errachidia'
    when 'guelmim' then 'Guelmim'
    when 'had_soualem' then 'Had Soualem'
    when 'ksar_el_kebir' then 'Ksar El Kebir'
    when 'larache' then 'Larache'
    when 'martil' then 'Martil'
    when 'ouarzazate' then 'Ouarzazate'
    when 'settat' then 'Settat'
    when 'sidi_kacem' then 'Sidi Kacem'
    when 'sidi_slimane' then 'Sidi Slimane'
    when 'taza' then 'Taza'
    when 'tit_mellil' then 'Tit Mellil'
    when 'tiznit' then 'Tiznit'
    when 'youssoufia' then 'Youssoufia'
    else null end;
$function$;

create or replace function public.odm_avito_openserp_candidates_v1(p_now timestamptz default now())
returns table(discovery_candidate_id uuid, canonical_url text, observed_at timestamptz, policy_hash text,
              normalized_city text, normalized_property_type text, normalized_intent text)
language sql stable security definer set search_path to '' as $function$
  with latest as (
    select distinct on (d.canonical_url)
      d.id,d.canonical_url,d.last_seen_at,d.metadata
    from public.discovery_candidates d
    where d.source_domain='avito.ma'
      and d.provider='openserp'
      and d.canonical_url is not null
    order by d.canonical_url,d.last_seen_at desc,d.id
  )
  select l.id,l.canonical_url,l.last_seen_at,p.policy_hash,
         public.odm_avito_openserp_city_v1(l.canonical_url),
         public.odm_10e_type_from_url(l.canonical_url),
         public.odm_10e_intent_from_url(l.canonical_url)
  from latest l
  join public.source_policy_registry p on p.source_domain='avito.ma'
  where p.authorization_status='unverified'
    and p.acquisition_mode='public_index_internal_only'
    and p.discovery_policy='public_index_only'
    and p.display_policy='canonical_link_only'
    and p.machine_gate='canonical_link_only'
    and p.ingestion_gate='canonical_link_only'
    and p.display_gate='external_tail_link_only'
    and p.no_bypass_required is true
    and 'public_index'=any(p.allowed_discovery_channels)
    and p.review_status in ('current','due_soon')
    and p.next_review_at > p_now
    and p.policy_effective_at <= p_now
    and p.policy_expires_at > p_now
    and nullif(btrim(p.policy_hash),'') is not null
    and p.max_revalidation_interval_days is not null
    and l.last_seen_at <= p_now + interval '5 minutes'
    and l.last_seen_at >= p_now - make_interval(days => p.max_revalidation_interval_days)
    and coalesce(l.metadata->>'domain_status','')='approved_discovery'
    and coalesce(l.metadata->>'admission_confidence','')='high'
    and coalesce(l.metadata->'admission_reasons','[]'::jsonb) ? 'strong_individual_path'
    and not (coalesce(l.metadata->'admission_reasons','[]'::jsonb) ?| array[
      'classification_lane_quarantine','classification_lane_reject_out_of_scope',
      'classification_lane_discovery_page','transaction_type_inconsistent'])
    and l.canonical_url ~ '^https://avito\\.ma/(fr|ar)/[^/]+/[^/]+/.+_[0-9]+\\.htm$'
    and public.odm_avito_openserp_city_v1(l.canonical_url) is not null
    and public.odm_10e_type_from_url(l.canonical_url) is not null
    and not exists (select 1 from public.source_offer_seeds s where s.canonical_url=l.canonical_url)
    and not exists (select 1 from public.listing_sources ls where ls.listing_url=l.canonical_url or ls.source_url=l.canonical_url);
$function$;

create or replace function public.odm_avito_openserp_served_count_v1()
returns integer language sql stable security definer set search_path to '' as $function$
  select count(*)::integer
  from public.thin_index_search_documents d
  join public.source_policy_registry p on p.source_domain=d.source_domain
  where d.source_domain='avito.ma' and d.seed_provider='openserp'
    and d.document_kind='LISTING'
    and d.display_eligibility in ('eligible_primary','eligible_secondary')
    and d.freshness_status='fresh_confirmed'
    and nullif(btrim(d.canonical_url),'') is not null
    and p.authorization_status <> 'prohibited'
    and p.display_policy='canonical_link_only'
    and p.machine_gate='canonical_link_only'
    and p.ingestion_gate='canonical_link_only'
    and p.display_gate='external_tail_link_only'
    and p.review_status in ('current','due_soon')
    and p.policy_effective_at <= now() and p.policy_expires_at > now()
    and p.no_bypass_required is true;
$function$;

create or replace function public.odm_prepare_avito_openserp_promotion_v1(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_batch uuid:=gen_random_uuid(); v_total integer:=0;
begin
  if p_limit < 1 or p_limit > 250 then raise exception 'limit must be between 1 and 250'; end if;
  insert into public.odm_avito_openserp_promotion_snapshot_v1(
    batch_id,discovery_candidate_id,canonical_url,observed_at,policy_hash,
    normalized_city,normalized_property_type,normalized_intent)
  select v_batch,c.discovery_candidate_id,c.canonical_url,c.observed_at,c.policy_hash,
         c.normalized_city,c.normalized_property_type,c.normalized_intent
  from public.odm_avito_openserp_candidates_v1(now()) c
  order by c.observed_at desc,md5(c.discovery_candidate_id::text),c.discovery_candidate_id
  limit p_limit;
  get diagnostics v_total=row_count;
  if v_total=0 then raise exception 'no current Avito OpenSERP promotion candidates'; end if;
  return jsonb_build_object('batch_id',v_batch,'prepared_rows',v_total,'publication_activated',false,
    'network_access',false,'direct_source_fetch',false,'content_reuse',false,'rollback_available',true);
end;$function$;

create or replace function public.odm_activate_avito_openserp_promotion_v1(p_batch_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_prepared integer; v_current integer; v_inserted integer; v_docs integer; v_before integer; v_after integer; v_leaks integer;
begin
  select count(*)::integer into v_prepared from public.odm_avito_openserp_promotion_snapshot_v1
   where batch_id=p_batch_id and batch_state='prepared';
  if v_prepared=0 then raise exception 'batch has no prepared rows: %',p_batch_id; end if;

  select count(*)::integer into v_current
  from public.odm_avito_openserp_promotion_snapshot_v1 x
  join public.odm_avito_openserp_candidates_v1(now()) c
    on c.discovery_candidate_id=x.discovery_candidate_id and c.canonical_url=x.canonical_url
   and c.observed_at=x.observed_at and c.policy_hash=x.policy_hash
   and c.normalized_city=x.normalized_city and c.normalized_property_type=x.normalized_property_type
   and c.normalized_intent is not distinct from x.normalized_intent
  where x.batch_id=p_batch_id and x.batch_state='prepared';
  if v_current<>v_prepared then raise exception 'fail-closed eligibility drift: prepared %, current %',v_prepared,v_current; end if;

  v_before:=public.odm_avito_openserp_served_count_v1();

  with ins as (
    insert into public.source_offer_seeds(
      canonical_url,source_domain,seed_provider,first_observed_at,last_observed_at,observation_count,
      metadata,freshness_status,fresh_last_seen_at,fresh_channels,updated_at)
    select x.canonical_url,'avito.ma','openserp',x.observed_at,x.observed_at,1,
      jsonb_build_object(
        'external_index',jsonb_strip_nulls(jsonb_build_object(
          'promotion_version','MASS_INDEX_M2_V1','page_kind','LIKELY_LISTING_DETAIL','geography_scope','MOROCCO_LIKELY',
          'city',x.normalized_city,'property_type',x.normalized_property_type,'intent',x.normalized_intent)),
        'freshness_evidence',jsonb_build_object(
          'provider','openserp','method','recent_public_index_observation','observed_at',x.observed_at,
          'batch_id',p_batch_id,'policy_hash',x.policy_hash,'direct_source_fetch',false,
          'no_detail_fetch',true,'content_reuse',false,'activation_version','odm_avito_openserp_promotion_v1')),
      'fresh_confirmed',x.observed_at,array['public_index_openserp']::text[],now()
    from public.odm_avito_openserp_promotion_snapshot_v1 x
    where x.batch_id=p_batch_id and x.batch_state='prepared'
    returning id,canonical_url
  )
  update public.odm_avito_openserp_promotion_snapshot_v1 x
     set created_seed_id=ins.id
    from ins
   where x.batch_id=p_batch_id and x.canonical_url=ins.canonical_url;
  get diagnostics v_inserted=row_count;
  if v_inserted<>v_prepared then raise exception 'seed insert mismatch: expected %, inserted %',v_prepared,v_inserted; end if;

  update public.thin_index_search_documents d set
    title=null,snippet=null,price_mad=null,surface_m2=null,
    vertical_classification='real_estate_likely',
    vertical_classification_reason='strict_avito_public_index_detail_url',
    vertical_classification_version='odm_avito_openserp_promotion_v1',
    city=x.normalized_city, property_type=x.normalized_property_type, intent=x.normalized_intent,
    normalized_city=x.normalized_city, normalized_property_type=x.normalized_property_type, normalized_intent=x.normalized_intent,
    normalized_price_mad=null,normalized_surface_m2=null,normalized_price_m2=null,price_per_m2_mad=null,
    normalization_status='normalized',normalization_version='odm_avito_openserp_promotion_v1',
    normalization_evidence=jsonb_build_object('avito_public_index',jsonb_build_object('method','url_path_only','batch_id',p_batch_id)),
    document_kind='LISTING',document_kind_confidence='HIGH',
    document_kind_reason='strict_avito_detail_url_plus_recent_public_index_observation',
    document_kind_version='odm_avito_detail_precision_v1',updated_at=now()
  from public.odm_avito_openserp_promotion_snapshot_v1 x
  where x.batch_id=p_batch_id and x.created_seed_id=d.seed_id;
  get diagnostics v_docs=row_count;
  if v_docs<>v_prepared then raise exception 'document update mismatch: expected %, updated %',v_prepared,v_docs; end if;

  select count(*)::integer into v_leaks
  from public.odm_avito_openserp_promotion_snapshot_v1 x
  join public.thin_index_search_documents d on d.seed_id=x.created_seed_id
  where x.batch_id=p_batch_id and (d.title is not null or d.snippet is not null or d.normalized_price_mad is not null or d.normalized_surface_m2 is not null);
  if v_leaks<>0 then raise exception 'content/market-fact leak detected: %',v_leaks; end if;

  update public.odm_avito_openserp_promotion_snapshot_v1 set batch_state='active',activated_at=now()
   where batch_id=p_batch_id and batch_state='prepared';

  v_after:=public.odm_avito_openserp_served_count_v1();
  if v_after<>v_before+v_prepared then raise exception 'strict serving delta mismatch: before %, prepared %, after %',v_before,v_prepared,v_after; end if;

  return jsonb_build_object('batch_id',p_batch_id,'before',v_before,'activated',v_prepared,'after',v_after,'delta',v_after-v_before,
    'content_exposed',v_leaks,'network_access',false,'direct_source_fetch',false,'content_reuse',false,
    'canonical_dimensions',true,'rollback_available',true);
end;$function$;

create or replace function public.odm_rollback_avito_openserp_promotion_v1(p_batch_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_active integer; v_deleted integer; v_remaining integer;
begin
  select count(*)::integer into v_active from public.odm_avito_openserp_promotion_snapshot_v1 where batch_id=p_batch_id and batch_state='active';
  if v_active=0 then raise exception 'batch has no active rows: %',p_batch_id; end if;
  delete from public.source_offer_seeds s using public.odm_avito_openserp_promotion_snapshot_v1 x
   where x.batch_id=p_batch_id and x.batch_state='active' and x.created_seed_id=s.id
     and s.seed_provider='openserp' and s.source_domain='avito.ma'
     and s.metadata #>> '{freshness_evidence,activation_version}'='odm_avito_openserp_promotion_v1'
     and s.metadata #>> '{freshness_evidence,batch_id}'=p_batch_id::text;
  get diagnostics v_deleted=row_count;
  if v_deleted<>v_active then raise exception 'rollback delete mismatch: expected %, deleted %',v_active,v_deleted; end if;
  update public.odm_avito_openserp_promotion_snapshot_v1 set batch_state='rolled_back',rolled_back_at=now()
   where batch_id=p_batch_id and batch_state='active';
  select count(*)::integer into v_remaining from public.source_offer_seeds s join public.odm_avito_openserp_promotion_snapshot_v1 x on x.created_seed_id=s.id where x.batch_id=p_batch_id;
  if v_remaining<>0 then raise exception 'rollback residual seeds: %',v_remaining; end if;
  return jsonb_build_object('batch_id',p_batch_id,'rolled_back_rows',v_deleted,'remaining_seed_rows',v_remaining);
end;$function$;

revoke all on function public.odm_avito_openserp_city_v1(text) from public,anon,authenticated;
revoke all on function public.odm_avito_openserp_candidates_v1(timestamptz) from public,anon,authenticated;
revoke all on function public.odm_avito_openserp_served_count_v1() from public,anon,authenticated;
revoke all on function public.odm_prepare_avito_openserp_promotion_v1(integer) from public,anon,authenticated;
revoke all on function public.odm_activate_avito_openserp_promotion_v1(uuid) from public,anon,authenticated;
revoke all on function public.odm_rollback_avito_openserp_promotion_v1(uuid) from public,anon,authenticated;
grant execute on function public.odm_avito_openserp_city_v1(text) to service_role;
grant execute on function public.odm_avito_openserp_candidates_v1(timestamptz) to service_role;
grant execute on function public.odm_avito_openserp_served_count_v1() to service_role;
grant execute on function public.odm_prepare_avito_openserp_promotion_v1(integer) to service_role;
grant execute on function public.odm_activate_avito_openserp_promotion_v1(uuid) to service_role;
grant execute on function public.odm_rollback_avito_openserp_promotion_v1(uuid) to service_role;
