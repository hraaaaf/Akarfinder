-- LOT A3 — freshness recovery pilot for DarAgadir and Promo Immo Marrakech.
-- Evidence comes only from already persisted public-sitemap observations.
-- No detail page is fetched, no content is copied, and no listing is reclassified or published.

create table if not exists public.odm_a3_freshness_recovery_audit_v1 (
  seed_id uuid primary key,
  source_domain text not null check (source_domain in ('daragadir.com','promoimmomarrakech.com')),
  canonical_url text not null unique,
  normalized_city text not null,
  normalized_property_type text not null,
  normalized_intent text not null,
  last_sitemap_observed_at timestamptz,
  evidence_observation_count integer not null default 0 check (evidence_observation_count >= 0),
  observation_age_days numeric(10,2),
  freshness_band text not null check (freshness_band in ('fresh','aging','stale','unmatched','invalid_future')),
  candidate_status text not null,
  evidence_provider text,
  evidence_policy text,
  evidence_detail_fetch boolean not null default false,
  evidence_content_reuse boolean not null default false,
  evidence_shadow_only boolean not null default true,
  evidence_public_activation boolean not null default false,
  freshness_qualified boolean not null default false,
  publication_eligible boolean not null default false,
  reclassification_eligible boolean not null default false,
  audit_version text not null default 'odm_a3_freshness_recovery_v1',
  audited_at timestamptz not null default now()
);

alter table public.odm_a3_freshness_recovery_audit_v1
  enable row level security;

revoke all on table public.odm_a3_freshness_recovery_audit_v1
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.odm_a3_freshness_recovery_audit_v1
  to service_role;

comment on table public.odm_a3_freshness_recovery_audit_v1 is
  'Internal A3 audit: persisted public-sitemap freshness evidence only. Never activates publication or reclassification.';

create or replace function public.odm_a3_freshness_recovery_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with baseline as (
  select
    count(*) filter (
      where document_kind = 'LISTING'
        and vertical_classification = 'real_estate_likely'
        and display_eligibility in ('eligible_primary','eligible_secondary')
    )::integer as public_listings,
    count(*) filter (
      where document_kind = 'AMBIGUOUS'
        and vertical_classification = 'real_estate_likely'
        and display_eligibility in ('eligible_primary','eligible_secondary')
    )::integer as public_ambiguous
  from public.thin_index_search_documents
), summary as (
  select
    count(*)::integer as pilot_total_candidates,
    count(*) filter (where last_sitemap_observed_at is not null)::integer as matched_sitemap_candidates,
    count(*) filter (where freshness_band = 'fresh')::integer as freshness_confirmed_candidates,
    count(*) filter (where freshness_band = 'aging')::integer as aging_candidates,
    count(*) filter (where freshness_band = 'stale')::integer as stale_candidates,
    count(*) filter (where freshness_band = 'unmatched')::integer as unmatched_candidates,
    count(*) filter (where freshness_band = 'invalid_future')::integer as invalid_future_candidates,
    count(*) filter (where freshness_qualified)::integer as freshness_qualified_candidates,
    count(*) filter (where evidence_provider <> 'public_sitemap')::integer as wrong_provider_rows,
    count(*) filter (where evidence_policy <> 'canonical_link_only')::integer as wrong_policy_rows,
    count(*) filter (where evidence_detail_fetch)::integer as detail_fetch_rows,
    count(*) filter (where evidence_content_reuse)::integer as content_reuse_rows,
    count(*) filter (where not evidence_shadow_only)::integer as non_shadow_rows,
    count(*) filter (where evidence_public_activation)::integer as public_activation_rows,
    count(*) filter (where publication_eligible)::integer as publication_rows,
    count(*) filter (where reclassification_eligible)::integer as reclassification_rows,
    count(distinct canonical_url)::integer as distinct_candidate_urls,
    min(last_sitemap_observed_at) as oldest_matching_observation,
    max(last_sitemap_observed_at) as newest_matching_observation,
    max(audited_at) as audited_at
  from public.odm_a3_freshness_recovery_audit_v1
), policy as (
  select
    count(*)::integer as policy_rows,
    count(*) filter (
      where discovery_policy = 'public_sitemap_only'
        and display_policy = 'canonical_link_only'
        and no_bypass_required is true
    )::integer as valid_policy_rows
  from public.source_policy_registry
  where source_domain in ('daragadir.com','promoimmomarrakech.com')
), per_source as (
  select
    source_domain,
    count(*)::integer as pilot_candidates,
    count(*) filter (where last_sitemap_observed_at is not null)::integer as matched_sitemap_candidates,
    count(*) filter (where freshness_band = 'fresh')::integer as freshness_confirmed_candidates,
    count(*) filter (where freshness_band = 'aging')::integer as aging_candidates,
    count(*) filter (where freshness_band = 'stale')::integer as stale_candidates,
    count(*) filter (where freshness_band = 'unmatched')::integer as unmatched_candidates,
    min(last_sitemap_observed_at) as oldest_matching_observation,
    max(last_sitemap_observed_at) as newest_matching_observation
  from public.odm_a3_freshness_recovery_audit_v1
  group by source_domain
)
select jsonb_build_object(
  'audit_version','odm_a3_freshness_recovery_v1',
  'evidence_mode','persisted_public_sitemap_observation',
  'fresh_window_days',14,
  'aging_window_days',30,
  'baseline_public_listings',b.public_listings,
  'baseline_public_ambiguous',b.public_ambiguous,
  'pilot_total_candidates',s.pilot_total_candidates,
  'matched_sitemap_candidates',s.matched_sitemap_candidates,
  'freshness_confirmed_candidates',s.freshness_confirmed_candidates,
  'aging_candidates',s.aging_candidates,
  'stale_candidates',s.stale_candidates,
  'unmatched_candidates',s.unmatched_candidates,
  'invalid_future_candidates',s.invalid_future_candidates,
  'freshness_qualified_candidates',s.freshness_qualified_candidates,
  'projected_depth_after_freshness_validation',b.public_listings + s.freshness_confirmed_candidates,
  'projected_gap_to_40k_after_freshness_validation',greatest(0,40000 - (b.public_listings + s.freshness_confirmed_candidates)),
  'oldest_matching_observation',s.oldest_matching_observation,
  'newest_matching_observation',s.newest_matching_observation,
  'audited_at',s.audited_at,
  'sources',coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'source_domain',p.source_domain,
        'pilot_candidates',p.pilot_candidates,
        'matched_sitemap_candidates',p.matched_sitemap_candidates,
        'freshness_confirmed_candidates',p.freshness_confirmed_candidates,
        'aging_candidates',p.aging_candidates,
        'stale_candidates',p.stale_candidates,
        'unmatched_candidates',p.unmatched_candidates,
        'oldest_matching_observation',p.oldest_matching_observation,
        'newest_matching_observation',p.newest_matching_observation,
        'next_action',case
          when p.unmatched_candidates > 0 then 'refresh_public_sitemap_when_network_available'
          else 'manual_reclassification_review_in_separate_lot'
        end
      ) order by p.freshness_confirmed_candidates desc,p.source_domain
    )
    from per_source p
  ),'[]'::jsonb),
  'gates',jsonb_build_object(
    'pilot_sources_only',s.pilot_total_candidates = (
      select count(*) from public.odm_a3_freshness_recovery_audit_v1
      where source_domain in ('daragadir.com','promoimmomarrakech.com')
    ),
    'all_candidate_urls_distinct',s.pilot_total_candidates = s.distinct_candidate_urls,
    'source_policy_complete',p.policy_rows = 2 and p.valid_policy_rows = 2,
    'public_sitemap_only',s.wrong_provider_rows = 0,
    'canonical_link_policy_only',s.wrong_policy_rows = 0,
    'no_detail_fetch',s.detail_fetch_rows = 0,
    'no_content_reuse',s.content_reuse_rows = 0,
    'all_rows_shadow_only',s.non_shadow_rows = 0,
    'public_activation_disabled',s.public_activation_rows = 0,
    'publication_unchanged',s.publication_rows = 0,
    'no_automatic_reclassification',s.reclassification_rows = 0,
    'no_future_observation',s.invalid_future_candidates = 0,
    'network_access_during_materialization',false,
    'candidate_depth_is_not_certified_inventory',true
  )
)
from baseline b cross join summary s cross join policy p;
$$;

revoke all on function public.odm_a3_freshness_recovery_report_v1()
  from public, anon, authenticated;

grant execute on function public.odm_a3_freshness_recovery_report_v1()
  to service_role;

create or replace function public.odm_refresh_a3_freshness_recovery_pilot_v1(
  p_now timestamptz default now(),
  p_fresh_days integer default 14,
  p_aging_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer := 0;
  v_listings_before integer := 0;
  v_listings_after integer := 0;
  v_ambiguous_before integer := 0;
  v_ambiguous_after integer := 0;
begin
  if p_fresh_days < 1 or p_fresh_days > 30 then
    raise exception 'fresh window must be between 1 and 30 days';
  end if;
  if p_aging_days < p_fresh_days or p_aging_days > 90 then
    raise exception 'aging window must be between fresh window and 90 days';
  end if;

  select
    count(*) filter (
      where document_kind = 'LISTING'
        and vertical_classification = 'real_estate_likely'
        and display_eligibility in ('eligible_primary','eligible_secondary')
    )::integer,
    count(*) filter (
      where document_kind = 'AMBIGUOUS'
        and vertical_classification = 'real_estate_likely'
        and display_eligibility in ('eligible_primary','eligible_secondary')
    )::integer
  into v_listings_before,v_ambiguous_before
  from public.thin_index_search_documents;

  delete from public.odm_a3_freshness_recovery_audit_v1;

  insert into public.odm_a3_freshness_recovery_audit_v1 (
    seed_id,source_domain,canonical_url,normalized_city,normalized_property_type,normalized_intent,
    last_sitemap_observed_at,evidence_observation_count,observation_age_days,freshness_band,candidate_status,
    evidence_provider,evidence_policy,evidence_detail_fetch,evidence_content_reuse,evidence_shadow_only,
    evidence_public_activation,freshness_qualified,publication_eligible,reclassification_eligible,
    audit_version,audited_at
  )
  with candidates as (
    select
      d.seed_id,d.source_domain,d.canonical_url,d.normalized_city,d.normalized_property_type,d.normalized_intent
    from public.thin_index_search_documents d
    where d.document_kind = 'AMBIGUOUS'
      and d.vertical_classification = 'real_estate_likely'
      and d.display_eligibility in ('eligible_primary','eligible_secondary')
      and d.source_domain in ('daragadir.com','promoimmomarrakech.com')
      and d.normalized_city is not null
      and d.normalized_property_type is not null
      and d.normalized_intent is not null
      and (
        (
          d.source_domain = 'daragadir.com'
          and d.canonical_url ~ '^https://daragadir\.com/annonces/annonces-immobilieres/.+\.html/?$'
        )
        or
        (
          d.source_domain = 'promoimmomarrakech.com'
          and d.canonical_url ~ '^https://promoimmomarrakech\.com/produit/[^/]+/.+\.html/?$'
        )
      )
  ), observations as (
    select
      dc.source_domain,
      dc.canonical_url,
      max(dc.discovered_at) as last_sitemap_observed_at,
      count(*)::integer as evidence_observation_count
    from public.discovery_candidates dc
    where dc.provider = 'public_sitemap'
      and dc.compliance_status = 'canonical_link_only'
      and dc.source_domain in ('daragadir.com','promoimmomarrakech.com')
      and dc.title is null
      and dc.snippet is null
      and dc.metadata #>> '{detail_fetch}' = 'false'
      and dc.metadata #>> '{content_reuse}' = 'false'
      and dc.metadata #>> '{shadow_only}' = 'true'
      and dc.metadata #>> '{public_activation}' = 'false'
    group by dc.source_domain,dc.canonical_url
  )
  select
    c.seed_id,c.source_domain,c.canonical_url,c.normalized_city,c.normalized_property_type,c.normalized_intent,
    o.last_sitemap_observed_at,
    coalesce(o.evidence_observation_count,0),
    case
      when o.last_sitemap_observed_at is null then null
      else round((extract(epoch from (p_now - o.last_sitemap_observed_at)) / 86400.0)::numeric,2)
    end,
    case
      when o.last_sitemap_observed_at is null then 'unmatched'
      when o.last_sitemap_observed_at > p_now + interval '5 minutes' then 'invalid_future'
      when o.last_sitemap_observed_at >= p_now - make_interval(days => p_fresh_days) then 'fresh'
      when o.last_sitemap_observed_at >= p_now - make_interval(days => p_aging_days) then 'aging'
      else 'stale'
    end,
    case
      when o.last_sitemap_observed_at is null then 'blocked_no_matching_sitemap_observation'
      when o.last_sitemap_observed_at > p_now + interval '5 minutes' then 'blocked_invalid_future_observation'
      when o.last_sitemap_observed_at >= p_now - make_interval(days => p_fresh_days) then 'freshness_confirmed'
      when o.last_sitemap_observed_at >= p_now - make_interval(days => p_aging_days) then 'aging_requires_refresh'
      else 'blocked_stale_sitemap_observation'
    end,
    case when o.last_sitemap_observed_at is null then null else 'public_sitemap' end,
    case when o.last_sitemap_observed_at is null then null else 'canonical_link_only' end,
    false,false,true,false,
    coalesce(
      o.last_sitemap_observed_at <= p_now + interval '5 minutes'
      and o.last_sitemap_observed_at >= p_now - make_interval(days => p_fresh_days),
      false
    ),
    false,false,'odm_a3_freshness_recovery_v1',p_now
  from candidates c
  left join observations o using (source_domain,canonical_url);

  get diagnostics v_inserted = row_count;

  select
    count(*) filter (
      where document_kind = 'LISTING'
        and vertical_classification = 'real_estate_likely'
        and display_eligibility in ('eligible_primary','eligible_secondary')
    )::integer,
    count(*) filter (
      where document_kind = 'AMBIGUOUS'
        and vertical_classification = 'real_estate_likely'
        and display_eligibility in ('eligible_primary','eligible_secondary')
    )::integer
  into v_listings_after,v_ambiguous_after
  from public.thin_index_search_documents;

  if v_listings_before <> v_listings_after or v_ambiguous_before <> v_ambiguous_after then
    raise exception 'A3 modified listing classification counts';
  end if;

  return public.odm_a3_freshness_recovery_report_v1()
    || jsonb_build_object(
      'refresh',jsonb_build_object(
        'inserted_audit_rows',v_inserted,
        'public_listings_before',v_listings_before,
        'public_listings_after',v_listings_after,
        'public_ambiguous_before',v_ambiguous_before,
        'public_ambiguous_after',v_ambiguous_after,
        'listing_counts_unchanged',v_listings_before = v_listings_after,
        'ambiguous_counts_unchanged',v_ambiguous_before = v_ambiguous_after
      )
    );
end;
$$;

revoke all on function public.odm_refresh_a3_freshness_recovery_pilot_v1(timestamptz,integer,integer)
  from public, anon, authenticated;

grant execute on function public.odm_refresh_a3_freshness_recovery_pilot_v1(timestamptz,integer,integer)
  to service_role;

comment on function public.odm_refresh_a3_freshness_recovery_pilot_v1(timestamptz,integer,integer) is
  'Materializes A3 freshness evidence from persisted public-sitemap observations only. Does not fetch, publish, rank or reclassify listings.';

create or replace function public.odm_a2_recoverable_listing_depth_report_v2()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with a2 as (
  select public.odm_a2_recoverable_listing_depth_report_v1() as report
), a3 as (
  select public.odm_a3_freshness_recovery_report_v1() as report
)
select a2.report || jsonb_build_object(
  'audit_version','odm_a2_recoverable_listing_depth_v2',
  'freshness_contract','odm_a3_persisted_public_sitemap_v1',
  'validated_freshness_candidates',coalesce((a3.report ->> 'freshness_confirmed_candidates')::integer,0),
  'public_recoverable_now',coalesce((a3.report ->> 'freshness_confirmed_candidates')::integer,0),
  'projected_depth_after_current_freshness_pilot',
    coalesce((a3.report ->> 'baseline_public_listings')::integer,0)
    + coalesce((a3.report ->> 'freshness_confirmed_candidates')::integer,0),
  'projected_gap_to_40k_after_current_freshness_pilot',greatest(
    0,
    40000 - (
      coalesce((a3.report ->> 'baseline_public_listings')::integer,0)
      + coalesce((a3.report ->> 'freshness_confirmed_candidates')::integer,0)
    )
  ),
  'freshness_pilot_sources',jsonb_build_array('daragadir.com','promoimmomarrakech.com'),
  'legacy_v1_freshness_vocabulary_deprecated',true,
  'publication_activated',false,
  'reclassification_activated',false
)
from a2 cross join a3;
$$;

revoke all on function public.odm_a2_recoverable_listing_depth_report_v2()
  from public, anon, authenticated;

grant execute on function public.odm_a2_recoverable_listing_depth_report_v2()
  to service_role;

comment on function public.odm_a2_recoverable_listing_depth_report_v2() is
  'Canonical A2 report after A3. Uses persisted sitemap freshness evidence instead of incompatible fresh/aging comparisons on the seed-status vocabulary.';
