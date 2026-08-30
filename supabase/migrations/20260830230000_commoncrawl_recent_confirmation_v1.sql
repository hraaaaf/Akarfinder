-- COMMONCRAWL-RECENT-CONFIRMATION-V1
-- Reversible canonical-link-only activation for recent Common Crawl URL-index evidence.
-- No source detail fetch. No source content reuse. No fuzzy URL admission.

create table if not exists public.odm_commoncrawl_recent_confirmation_snapshot_v1 (
  batch_id uuid not null,
  seed_id uuid not null references public.source_offer_seeds(id) on delete restrict,
  source_domain text not null,
  canonical_url text not null,
  observed_at timestamptz not null,
  policy_hash text not null,
  original_freshness_status text not null,
  original_fresh_last_seen_at timestamptz,
  original_fresh_channels text[] not null default '{}'::text[],
  original_freshness_evidence jsonb,
  original_vertical_classification text,
  original_vertical_classification_reason text,
  original_vertical_classification_version text,
  original_document_kind text,
  original_document_kind_confidence text,
  original_document_kind_reason text,
  original_document_kind_version text,
  original_city text,
  original_property_type text,
  original_intent text,
  original_normalized_city text,
  original_normalized_property_type text,
  original_normalized_intent text,
  original_normalization_status text,
  original_normalization_version text,
  original_normalization_evidence jsonb,
  original_quality_tier text,
  original_quality_score smallint,
  original_display_eligibility text,
  original_display_eligibility_reason text,
  original_ranking_quality_boost real,
  original_ranking_policy_version text,
  original_document_updated_at timestamptz not null,
  batch_state text not null default 'prepared' check (batch_state in ('prepared','active','rolled_back')),
  prepared_at timestamptz not null default now(),
  activated_at timestamptz,
  rolled_back_at timestamptz,
  primary key (batch_id, seed_id)
);

create index if not exists odm_commoncrawl_recent_confirmation_snapshot_v1_state_idx
  on public.odm_commoncrawl_recent_confirmation_snapshot_v1(batch_state, batch_id);

alter table public.odm_commoncrawl_recent_confirmation_snapshot_v1 enable row level security;
revoke all on public.odm_commoncrawl_recent_confirmation_snapshot_v1 from anon, authenticated;
grant select on public.odm_commoncrawl_recent_confirmation_snapshot_v1 to service_role;

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
    public.odm04_normalize_city(public.odm03_recover_city(s.canonical_url)),
    public.odm_10e_type_from_url(s.canonical_url),
    public.odm_10e_intent_from_url(s.canonical_url)
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
    and public.odm04_normalize_city(public.odm03_recover_city(s.canonical_url)) is not null
    and public.odm_10e_type_from_url(s.canonical_url) is not null
    and public.odm_10e_intent_from_url(s.canonical_url) is not null
    and not exists (
      select 1
      from public.listing_sources ls
      where ls.listing_url = s.canonical_url
         or ls.source_url = s.canonical_url
    );
$function$;

create or replace function public.odm_commoncrawl_recent_external_minimal_count_v1()
returns integer
language sql
stable
security definer
set search_path to ''
as $function$
  select count(*)::integer
  from public.thin_index_search_documents d
  join public.source_policy_registry p
    on p.source_domain = d.source_domain
  where d.document_kind = 'LISTING'
    and d.display_eligibility in ('eligible_primary','eligible_secondary')
    and d.seed_provider in ('public_sitemap','commoncrawl_cdx','serper_search')
    and d.freshness_status = 'fresh_confirmed'
    and nullif(btrim(d.canonical_url), '') is not null
    and p.authorization_status <> 'prohibited'
    and p.display_policy = 'canonical_link_only'
    and p.machine_gate = 'canonical_link_only'
    and p.ingestion_gate = 'canonical_link_only'
    and p.display_gate = 'external_tail_link_only'
    and p.review_status in ('current','due_soon')
    and p.policy_effective_at is not null
    and p.policy_effective_at <= now()
    and p.policy_expires_at is not null
    and p.policy_expires_at > now()
    and p.no_bypass_required is true;
$function$;

create or replace function public.odm_prepare_commoncrawl_recent_confirmation_v1(
  p_limit_per_source integer default 10,
  p_require_balanced boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_batch uuid := gen_random_uuid();
  v_total integer := 0;
  v_agenz integer := 0;
  v_masaken integer := 0;
  v_kawtar integer := 0;
begin
  if p_limit_per_source < 1 or p_limit_per_source > 250 then
    raise exception 'limit_per_source must be between 1 and 250';
  end if;

  insert into public.odm_commoncrawl_recent_confirmation_snapshot_v1 (
    batch_id,seed_id,source_domain,canonical_url,observed_at,policy_hash,
    original_freshness_status,original_fresh_last_seen_at,original_fresh_channels,original_freshness_evidence,
    original_vertical_classification,original_vertical_classification_reason,original_vertical_classification_version,
    original_document_kind,original_document_kind_confidence,original_document_kind_reason,original_document_kind_version,
    original_city,original_property_type,original_intent,
    original_normalized_city,original_normalized_property_type,original_normalized_intent,
    original_normalization_status,original_normalization_version,original_normalization_evidence,
    original_quality_tier,original_quality_score,original_display_eligibility,original_display_eligibility_reason,
    original_ranking_quality_boost,original_ranking_policy_version,original_document_updated_at
  )
  with ranked as (
    select c.*,
      row_number() over (
        partition by c.source_domain
        order by c.observed_at desc, md5(c.seed_id::text), c.seed_id
      ) as source_row
    from public.odm_commoncrawl_recent_confirmation_candidates_v1(now()) c
  )
  select
    v_batch,r.seed_id,r.source_domain,r.canonical_url,r.observed_at,r.policy_hash,
    s.freshness_status,s.fresh_last_seen_at,coalesce(s.fresh_channels,'{}'::text[]),s.metadata -> 'freshness_evidence',
    d.vertical_classification,d.vertical_classification_reason,d.vertical_classification_version,
    d.document_kind,d.document_kind_confidence,d.document_kind_reason,d.document_kind_version,
    d.city,d.property_type,d.intent,
    d.normalized_city,d.normalized_property_type,d.normalized_intent,
    d.normalization_status,d.normalization_version,d.normalization_evidence,
    d.quality_tier,d.quality_score,d.display_eligibility,d.display_eligibility_reason,
    d.ranking_quality_boost,d.ranking_policy_version,d.updated_at
  from ranked r
  join public.source_offer_seeds s on s.id = r.seed_id
  join public.thin_index_search_documents d on d.seed_id = r.seed_id
  where r.source_row <= p_limit_per_source;

  select
    count(*)::integer,
    count(*) filter (where source_domain='agenz.ma')::integer,
    count(*) filter (where source_domain='masaken.ma')::integer,
    count(*) filter (where source_domain='kawtarimmobilier.com')::integer
  into v_total,v_agenz,v_masaken,v_kawtar
  from public.odm_commoncrawl_recent_confirmation_snapshot_v1
  where batch_id = v_batch;

  if v_total = 0 then
    raise exception 'no current Common Crawl confirmation candidates';
  end if;

  if p_require_balanced and (
    v_agenz <> p_limit_per_source
    or v_masaken <> p_limit_per_source
    or v_kawtar <> p_limit_per_source
  ) then
    raise exception 'balanced canary unavailable: agenz %, masaken %, kawtar %, expected % each',
      v_agenz,v_masaken,v_kawtar,p_limit_per_source;
  end if;

  return jsonb_build_object(
    'batch_id',v_batch,
    'prepared_rows',v_total,
    'sources',jsonb_build_object('agenz.ma',v_agenz,'masaken.ma',v_masaken,'kawtarimmobilier.com',v_kawtar),
    'balanced_required',p_require_balanced,
    'publication_activated',false,
    'network_access',false,
    'detail_fetch_performed',false,
    'content_reuse_performed',false,
    'rollback_available',true
  );
end;
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
        'activation_version','odm_commoncrawl_recent_confirmation_v1'
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
    vertical_classification_version = 'odm_commoncrawl_recent_confirmation_v1',
    city = coalesce(d.city, public.odm04_normalize_city(public.odm03_recover_city(d.canonical_url))),
    property_type = coalesce(d.property_type, public.odm_10e_type_from_url(d.canonical_url)),
    intent = coalesce(d.intent, public.odm_10e_intent_from_url(d.canonical_url)),
    normalized_city = public.odm04_normalize_city(public.odm03_recover_city(d.canonical_url)),
    normalized_property_type = public.odm_10e_type_from_url(d.canonical_url),
    normalized_intent = public.odm_10e_intent_from_url(d.canonical_url),
    normalization_status = 'normalized',
    normalization_version = 'odm_commoncrawl_recent_confirmation_v1',
    normalization_evidence = coalesce(d.normalization_evidence,'{}'::jsonb)
      || jsonb_build_object(
        'commoncrawl_recent_confirmation',
        jsonb_build_object('method','certified_url_pattern','batch_id',p_batch_id)
      ),
    document_kind = 'LISTING',
    document_kind_confidence = 'HIGH',
    document_kind_reason = 'certified_provider_detail_url_plus_recent_cdx_200_html',
    document_kind_version = 'odm_commoncrawl_recent_confirmation_v1',
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
    'rollback_available',true
  );
end;
$function$;

create or replace function public.odm_rollback_commoncrawl_recent_confirmation_v1(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_active integer := 0;
  v_seed_restored integer := 0;
  v_doc_restored integer := 0;
  v_before integer := 0;
  v_after integer := 0;
begin
  select count(*)::integer into v_active
  from public.odm_commoncrawl_recent_confirmation_snapshot_v1
  where batch_id=p_batch_id and batch_state='active';

  if v_active = 0 then
    return jsonb_build_object('batch_id',p_batch_id,'restored_rows',0,'already_inactive',true);
  end if;

  v_before := public.odm_commoncrawl_recent_external_minimal_count_v1();

  update public.source_offer_seeds s
  set
    freshness_status = x.original_freshness_status,
    fresh_last_seen_at = x.original_fresh_last_seen_at,
    fresh_channels = x.original_fresh_channels,
    metadata = case
      when x.original_freshness_evidence is null then coalesce(s.metadata,'{}'::jsonb) - 'freshness_evidence'
      else jsonb_set(coalesce(s.metadata,'{}'::jsonb),'{freshness_evidence}',x.original_freshness_evidence,true)
    end,
    updated_at = now()
  from public.odm_commoncrawl_recent_confirmation_snapshot_v1 x
  where x.batch_id=p_batch_id and x.batch_state='active' and x.seed_id=s.id;
  get diagnostics v_seed_restored = row_count;

  update public.thin_index_search_documents d
  set
    vertical_classification=x.original_vertical_classification,
    vertical_classification_reason=x.original_vertical_classification_reason,
    vertical_classification_version=x.original_vertical_classification_version,
    document_kind=x.original_document_kind,
    document_kind_confidence=x.original_document_kind_confidence,
    document_kind_reason=x.original_document_kind_reason,
    document_kind_version=x.original_document_kind_version,
    city=x.original_city,
    property_type=x.original_property_type,
    intent=x.original_intent,
    normalized_city=x.original_normalized_city,
    normalized_property_type=x.original_normalized_property_type,
    normalized_intent=x.original_normalized_intent,
    normalization_status=x.original_normalization_status,
    normalization_version=x.original_normalization_version,
    normalization_evidence=x.original_normalization_evidence,
    updated_at=x.original_document_updated_at
  from public.odm_commoncrawl_recent_confirmation_snapshot_v1 x
  where x.batch_id=p_batch_id and x.batch_state='active' and x.seed_id=d.seed_id;
  get diagnostics v_doc_restored = row_count;

  if v_seed_restored <> v_active or v_doc_restored <> v_active then
    raise exception 'rollback mismatch: active %, seeds %, documents %',v_active,v_seed_restored,v_doc_restored;
  end if;

  update public.odm_commoncrawl_recent_confirmation_snapshot_v1
  set batch_state='rolled_back',rolled_back_at=now()
  where batch_id=p_batch_id and batch_state='active';

  v_after := public.odm_commoncrawl_recent_external_minimal_count_v1();

  return jsonb_build_object(
    'batch_id',p_batch_id,
    'restored_rows',v_active,
    'strict_served_before',v_before,
    'strict_served_after',v_after,
    'strict_served_delta',v_after-v_before,
    'canary_active',false
  );
end;
$function$;

create or replace function public.odm_commoncrawl_recent_confirmation_report_v1()
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
  with candidates as (
    select source_domain,count(*)::integer n
    from public.odm_commoncrawl_recent_confirmation_candidates_v1(now())
    group by source_domain
  ), active as (
    select
      count(*)::integer active_rows,
      count(*) filter (
        where d.title is not null or d.snippet is not null
           or d.normalized_price_mad is not null or d.normalized_surface_m2 is not null
      )::integer content_or_economic_leaks,
      count(*) filter (
        where d.vertical_classification <> 'real_estate_likely'
           or d.document_kind <> 'LISTING'
           or d.display_eligibility not in ('eligible_primary','eligible_secondary')
           or d.freshness_status <> 'fresh_confirmed'
      )::integer state_violations
    from public.odm_commoncrawl_recent_confirmation_snapshot_v1 x
    join public.thin_index_search_documents d on d.seed_id=x.seed_id
    where x.batch_state='active'
  )
  select jsonb_build_object(
    'version','odm_commoncrawl_recent_confirmation_v1',
    'remaining_candidates',coalesce((select jsonb_object_agg(source_domain,n) from candidates),'{}'::jsonb),
    'active_rows',active.active_rows,
    'strict_served_rows',public.odm_commoncrawl_recent_external_minimal_count_v1(),
    'gates',jsonb_build_object(
      'content_or_economic_leaks_zero',active.content_or_economic_leaks=0,
      'active_state_violations_zero',active.state_violations=0,
      'network_access',false,
      'detail_fetch_performed',false,
      'content_reuse_performed',false,
      'rollback_available',true
    )
  )
  from active;
$function$;

revoke all on function public.odm_commoncrawl_recent_confirmation_candidates_v1(timestamptz) from public, anon, authenticated;
revoke all on function public.odm_commoncrawl_recent_external_minimal_count_v1() from public, anon, authenticated;
revoke all on function public.odm_prepare_commoncrawl_recent_confirmation_v1(integer,boolean) from public, anon, authenticated;
revoke all on function public.odm_activate_commoncrawl_recent_confirmation_v1(uuid) from public, anon, authenticated;
revoke all on function public.odm_rollback_commoncrawl_recent_confirmation_v1(uuid) from public, anon, authenticated;
revoke all on function public.odm_commoncrawl_recent_confirmation_report_v1() from public, anon, authenticated;

grant execute on function public.odm_commoncrawl_recent_confirmation_candidates_v1(timestamptz) to service_role;
grant execute on function public.odm_commoncrawl_recent_external_minimal_count_v1() to service_role;
grant execute on function public.odm_prepare_commoncrawl_recent_confirmation_v1(integer,boolean) to service_role;
grant execute on function public.odm_activate_commoncrawl_recent_confirmation_v1(uuid) to service_role;
grant execute on function public.odm_rollback_commoncrawl_recent_confirmation_v1(uuid) to service_role;
grant execute on function public.odm_commoncrawl_recent_confirmation_report_v1() to service_role;
