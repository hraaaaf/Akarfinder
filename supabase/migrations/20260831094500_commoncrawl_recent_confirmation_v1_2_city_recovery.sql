-- COMMONCRAWL-RECENT-CONFIRMATION-V1.2
-- Isolated URL-only city recovery for recent Common Crawl confirmation.
-- No global city normalizer, freshness rule, policy gate, source allowlist,
-- exact-URL admission pattern, source content, or serving rule is widened.
-- M'diq-Fnideq stays fail-closed because that URL token denotes a broader zone/prefecture.

create or replace function public.odm_commoncrawl_recent_city_v1(
  p_source_domain text,
  p_url text
)
returns text
language sql
immutable strict
set search_path to ''
as $function$
  select case
    when p_source_domain = 'agenz.ma'
      and lower(p_url) ~ '^https://agenz\.ma/(fr|en)/annonces/immo-dar-bouazza/'
      then 'Dar Bouazza'
    when p_source_domain = 'agenz.ma'
      and lower(p_url) ~ '^https://agenz\.ma/(fr|en)/annonces/immo-benslimane/'
      then 'Benslimane'
    when p_source_domain = 'masaken.ma'
      and lower(p_url) ~ '^https://masaken\.ma/(fr/immobilier-maroc/(vente|location)|en/immobilier-maroc/(sale|rental))-[a-z0-9-]+-bouznika/[0-9]+/?$'
      then 'Bouznika'
    else public.odm04_normalize_city(public.odm03_recover_city(p_url))
  end;
$function$;

create or replace function public.odm_commoncrawl_recent_confirmation_candidates_v1(
  p_now timestamptz default now()
)
returns table(
  seed_id uuid,
  source_domain text,
  canonical_url text,
  observed_at timestamptz,
  policy_hash text,
  normalized_city text,
  normalized_property_type text,
  normalized_intent text
)
language sql
stable
security definer
set search_path to ''
as $function$
  select
    s.id,
    s.source_domain,
    s.canonical_url,
    s.last_observed_at,
    p.policy_hash,
    public.odm_commoncrawl_recent_city_v1(s.source_domain,s.canonical_url),
    public.odm04_normalize_property_type(public.odm_10e_type_from_url(s.canonical_url)),
    public.odm04_normalize_intent(public.odm_10e_intent_from_url(s.canonical_url))
  from public.source_offer_seeds s
  join public.source_policy_registry p
    on p.source_domain = s.source_domain
  join public.thin_index_search_documents d
    on d.seed_id = s.id
  where s.seed_provider = 'commoncrawl_cdx'
    and s.freshness_status = 'seed_only'
    and s.source_domain in ('agenz.ma','masaken.ma','kawtarimmobilier.com')
    and p.no_bypass_required is true
    and nullif(btrim(p.policy_hash), '') is not null
    and 'commoncrawl' = any(p.allowed_discovery_channels)
    and p.review_status in ('current','due_soon')
    and p.next_review_at is not null
    and p.next_review_at > p_now
    and p.policy_effective_at is not null
    and p.policy_effective_at <= p_now
    and p.policy_expires_at is not null
    and p.policy_expires_at > p_now
    and p.authorization_status = 'unverified'
    and p.acquisition_mode = 'public_index_internal_only'
    and p.discovery_policy = 'public_index_only'
    and p.display_policy = 'canonical_link_only'
    and p.machine_gate = 'canonical_link_only'
    and p.ingestion_gate = 'canonical_link_only'
    and p.display_gate = 'external_tail_link_only'
    and p.max_revalidation_interval_days is not null
    and s.last_observed_at is not null
    and s.last_observed_at <= p_now + interval '5 minutes'
    and s.last_observed_at >= p_now - make_interval(days => p.max_revalidation_interval_days)
    and s.metadata -> 'status_codes_observed' ? '200'
    and exists (
      select 1
      from jsonb_array_elements_text(coalesce(s.metadata -> 'mime_observed', '[]'::jsonb)) mime(value)
      where mime.value ilike 'text/html%'
    )
    and d.vertical_classification is null
    and d.document_kind is null
    and d.display_eligibility = 'ineligible'
    and d.display_eligibility_reason = 'vertical_not_real_estate'
    and d.title is null
    and d.snippet is null
    and d.normalized_price_mad is null
    and d.normalized_surface_m2 is null
    and (
      (s.source_domain = 'agenz.ma'
        and s.canonical_url ~ '^https://agenz\.ma/(fr|en)/annonces/.+/[0-9]+/?$')
      or
      (s.source_domain = 'masaken.ma'
        and s.canonical_url ~ '^https://masaken\.ma/(fr/immobilier-maroc/(vente|location)|en/immobilier-maroc/(sale|rental))-[a-z0-9-]+/[0-9]+/?$')
      or
      (s.source_domain = 'kawtarimmobilier.com'
        and s.canonical_url ~ '^https://kawtarimmobilier\.com/[^/]+/(vente|location)/[^/]+/.+-ref-[0-9]+\.html/?$')
    )
    and public.odm_commoncrawl_recent_city_v1(s.source_domain,s.canonical_url) is not null
    and public.odm04_normalize_property_type(public.odm_10e_type_from_url(s.canonical_url)) is not null
    and public.odm04_normalize_intent(public.odm_10e_intent_from_url(s.canonical_url)) is not null
    and not exists (
      select 1
      from public.listing_sources ls
      where ls.listing_url = s.canonical_url
         or ls.source_url = s.canonical_url
    );
$function$;

create or replace function public.odm_activate_commoncrawl_recent_confirmation_v1(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_prepared integer := 0;
  v_still_eligible integer := 0;
  v_seed_updated integer := 0;
  v_doc_updated integer := 0;
  v_leaks integer := 0;
  v_before integer := 0;
  v_after integer := 0;
begin
  select count(*)::integer into v_prepared
  from public.odm_commoncrawl_recent_confirmation_snapshot_v1
  where batch_id = p_batch_id and batch_state = 'prepared';

  if v_prepared = 0 then
    raise exception 'batch has no prepared rows: %',p_batch_id;
  end if;

  select count(*)::integer into v_still_eligible
  from public.odm_commoncrawl_recent_confirmation_snapshot_v1 x
  join public.odm_commoncrawl_recent_confirmation_candidates_v1(now()) c
    on c.seed_id = x.seed_id
   and c.canonical_url = x.canonical_url
   and c.policy_hash = x.policy_hash
  where x.batch_id = p_batch_id and x.batch_state = 'prepared';

  if v_still_eligible <> v_prepared then
    raise exception 'fail-closed eligibility drift for batch %: prepared %, current %',p_batch_id,v_prepared,v_still_eligible;
  end if;

  v_before := public.odm_commoncrawl_recent_external_minimal_count_v1();

  update public.source_offer_seeds s
  set
    freshness_status = 'fresh_confirmed',
    fresh_last_seen_at = s.last_observed_at,
    fresh_channels = (
      select array_agg(distinct channel order by channel)
      from unnest(coalesce(s.fresh_channels,'{}'::text[]) || array['commoncrawl_recent_cdx']::text[]) channel
    ),
    metadata = jsonb_set(
      coalesce(s.metadata,'{}'::jsonb),
      '{freshness_evidence}',
      jsonb_build_object(
        'provider','commoncrawl_cdx',
        'method','recent_cdx_200_html',
        'observed_at',s.last_observed_at,
        'batch_id',p_batch_id,
        'policy_hash',x.policy_hash,
        'no_detail_fetch',true,
        'content_reuse',false,
        'activation_version','odm_commoncrawl_recent_confirmation_v1_2'
      ),
      true
    ),
    updated_at = now()
  from public.odm_commoncrawl_recent_confirmation_snapshot_v1 x
  where x.batch_id = p_batch_id
    and x.batch_state = 'prepared'
    and x.seed_id = s.id;
  get diagnostics v_seed_updated = row_count;

  if v_seed_updated <> v_prepared then
    raise exception 'seed update mismatch: expected %, updated %',v_prepared,v_seed_updated;
  end if;

  update public.thin_index_search_documents d
  set
    vertical_classification = 'real_estate_likely',
    vertical_classification_reason = 'certified_detail_pattern_recent_cdx_200_html',
    vertical_classification_version = 'odm_commoncrawl_recent_confirmation_v1_2',
    city = coalesce(d.city, public.odm_commoncrawl_recent_city_v1(d.source_domain,d.canonical_url)),
    property_type = coalesce(d.property_type, public.odm_10e_type_from_url(d.canonical_url)),
    intent = coalesce(d.intent, public.odm_10e_intent_from_url(d.canonical_url)),
    normalized_city = public.odm_commoncrawl_recent_city_v1(d.source_domain,d.canonical_url),
    normalized_property_type = public.odm04_normalize_property_type(public.odm_10e_type_from_url(d.canonical_url)),
    normalized_intent = public.odm04_normalize_intent(public.odm_10e_intent_from_url(d.canonical_url)),
    normalization_status = 'normalized',
    normalization_version = 'odm_commoncrawl_recent_confirmation_v1_2',
    normalization_evidence = coalesce(d.normalization_evidence,'{}'::jsonb)
      || jsonb_build_object(
        'commoncrawl_recent_confirmation',
        jsonb_build_object('method','certified_url_pattern','batch_id',p_batch_id,'canonical_dimensions',true,'city_recovery_version','v1_2')
      ),
    document_kind = 'LISTING',
    document_kind_confidence = 'HIGH',
    document_kind_reason = 'certified_provider_detail_url_plus_recent_cdx_200_html',
    document_kind_version = 'odm_commoncrawl_recent_confirmation_v1_2',
    updated_at = now()
  from public.odm_commoncrawl_recent_confirmation_snapshot_v1 x
  where x.batch_id = p_batch_id
    and x.batch_state = 'prepared'
    and x.seed_id = d.seed_id;
  get diagnostics v_doc_updated = row_count;

  if v_doc_updated <> v_prepared then
    raise exception 'document update mismatch: expected %, updated %',v_prepared,v_doc_updated;
  end if;

  select count(*)::integer into v_leaks
  from public.odm_commoncrawl_recent_confirmation_snapshot_v1 x
  join public.thin_index_search_documents d on d.seed_id = x.seed_id
  where x.batch_id = p_batch_id
    and (
      d.title is not null
      or d.snippet is not null
      or d.normalized_price_mad is not null
      or d.normalized_surface_m2 is not null
      or d.vertical_classification <> 'real_estate_likely'
      or d.document_kind <> 'LISTING'
      or d.document_kind_confidence <> 'HIGH'
      or d.display_eligibility not in ('eligible_primary','eligible_secondary')
      or d.freshness_status <> 'fresh_confirmed'
      or d.normalized_city is distinct from public.odm_commoncrawl_recent_city_v1(d.source_domain,d.canonical_url)
      or d.normalized_property_type is distinct from public.odm04_normalize_property_type(public.odm_10e_type_from_url(d.canonical_url))
      or d.normalized_intent is distinct from public.odm04_normalize_intent(public.odm_10e_intent_from_url(d.canonical_url))
    );

  if v_leaks <> 0 then
    raise exception 'activation safety gate failed for % rows',v_leaks;
  end if;

  v_after := public.odm_commoncrawl_recent_external_minimal_count_v1();
  if v_after <> v_before + v_prepared then
    raise exception 'strict serving delta mismatch: before %, prepared %, after %',v_before,v_prepared,v_after;
  end if;

  update public.odm_commoncrawl_recent_confirmation_snapshot_v1
  set batch_state='active',activated_at=now()
  where batch_id=p_batch_id and batch_state='prepared';

  return jsonb_build_object(
    'batch_id',p_batch_id,
    'activated_rows',v_prepared,
    'strict_served_before',v_before,
    'strict_served_after',v_after,
    'strict_served_delta',v_after-v_before,
    'content_rows_exposed',0,
    'network_access',false,
    'detail_fetch_performed',false,
    'content_reuse_performed',false,
    'canonical_dimensions',true,
    'city_recovery_version','v1_2',
    'rollback_available',true
  );
end;
$function$;

revoke all on function public.odm_commoncrawl_recent_city_v1(text,text) from public, anon, authenticated;
revoke all on function public.odm_commoncrawl_recent_confirmation_candidates_v1(timestamptz) from public, anon, authenticated;
revoke all on function public.odm_activate_commoncrawl_recent_confirmation_v1(uuid) from public, anon, authenticated;
grant execute on function public.odm_commoncrawl_recent_city_v1(text,text) to service_role;
grant execute on function public.odm_commoncrawl_recent_confirmation_candidates_v1(timestamptz) to service_role;
grant execute on function public.odm_activate_commoncrawl_recent_confirmation_v1(uuid) to service_role;
