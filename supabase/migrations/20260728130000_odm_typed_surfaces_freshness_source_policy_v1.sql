-- ODM-SURFACE-FRESHNESS-SOURCE-01
-- Typed surfaces, source-aware freshness and canonical source-policy resolution.
-- Shadow-only and reversible. No public listing, ranking or SERP state is mutated.

create or replace function public.odm_audit_canonical_domain_v1(p_domain text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(btrim(coalesce(p_domain,''))), '^https?://', ''),
      '^www\.', ''
    ),
    ''
  );
$$;

create or replace view public.odm_audit_source_policy_resolution_v1 as
with candidates as (
  select
    d.seed_id,
    d.source_domain,
    public.odm_audit_canonical_domain_v1(d.source_domain) as canonical_source_domain,
    r.source_domain as registry_source_domain,
    r.discovery_policy,
    r.display_policy,
    r.no_bypass_required,
    case
      when lower(btrim(r.source_domain)) = lower(btrim(d.source_domain)) then 'exact_domain'
      when public.odm_audit_canonical_domain_v1(r.source_domain) = public.odm_audit_canonical_domain_v1(d.source_domain) then 'canonical_domain'
      else null
    end as policy_match_kind
  from public.thin_index_search_documents d
  left join public.source_policy_registry r
    on lower(btrim(r.source_domain)) = lower(btrim(d.source_domain))
    or public.odm_audit_canonical_domain_v1(r.source_domain) = public.odm_audit_canonical_domain_v1(d.source_domain)
), grouped as (
  select
    seed_id,
    source_domain,
    canonical_source_domain,
    count(*) filter(where registry_source_domain is not null) as matched_policy_count,
    min(registry_source_domain) filter(where registry_source_domain is not null) as resolved_registry_source_domain,
    min(discovery_policy) filter(where registry_source_domain is not null) as discovery_policy,
    min(display_policy) filter(where registry_source_domain is not null) as display_policy,
    bool_and(coalesce(no_bypass_required,true)) filter(where registry_source_domain is not null) as no_bypass_required,
    min(policy_match_kind) filter(where registry_source_domain is not null) as policy_match_kind
  from candidates
  group by seed_id,source_domain,canonical_source_domain
)
select
  *,
  case
    when matched_policy_count = 0 then 'missing_policy'
    when matched_policy_count > 1 then 'ambiguous_policy_alias'
    when coalesce(no_bypass_required,true) is not true then 'invalid_no_bypass_policy'
    else 'resolved_policy'
  end as policy_resolution_status
from grouped;

create or replace function public.odm_audit_surface_candidates_v1(
  p_text text,
  p_evidence_source text,
  p_observation_id text
) returns jsonb
language sql
immutable
set search_path = ''
as $$
with matches as (
  select
    m[1] as raw_fragment,
    replace(m[2],',','.')::numeric as value_m2,
    lower(coalesce(m[1],'')) as normalized_fragment
  from regexp_matches(
    coalesce(p_text,''),
    '((?:surface[[:space:]]+(?:habitable|construite|bâtie|batisse|utile|commerciale)|terrain|parcelle|lot|terrasse|jardin|local[[:space:]]+commercial)?[^0-9]{0,24}([0-9]{1,6}(?:[.,][0-9]+)?)[[:space:]]*(?:m2|m²))',
    'gi'
  ) as m
), classified as (
  select
    *,
    case
      when normalized_fragment ~ '(surface[[:space:]]+habitable|habitable)' then 'living_surface_m2'
      when normalized_fragment ~ '(surface[[:space:]]+(construite|bâtie|batisse)|construite|bâtie)' then 'built_surface_m2'
      when normalized_fragment ~ '(terrain|parcelle|lot)' then 'plot_surface_m2'
      when normalized_fragment ~ 'terrasse' then 'terrace_surface_m2'
      when normalized_fragment ~ 'jardin' then 'garden_surface_m2'
      when normalized_fragment ~ '(surface[[:space:]]+commerciale|local[[:space:]]+commercial)' then 'commercial_surface_m2'
      when normalized_fragment ~ '(surface[[:space:]]+utile|utile)' then 'usable_surface_m2'
      else 'unknown_surface_m2'
    end as surface_type
  from matches
  where value_m2 between 9 and 100000
), annotated as (
  select
    *,
    case when surface_type='unknown_surface_m2' then 'surface_context_unconfirmed' end as rejection_reason,
    case when surface_type='unknown_surface_m2' then 0.45 else 0.94 end as confidence
  from classified
)
select coalesce(jsonb_agg(jsonb_build_object(
  'value_m2',value_m2,
  'surface_type',surface_type,
  'evidence_source',nullif(btrim(p_evidence_source),''),
  'observation_id',nullif(btrim(p_observation_id),''),
  'raw_fragment',raw_fragment,
  'normalized_fragment',normalized_fragment,
  'parser_version','odm_surface_parser_v1',
  'confidence',confidence,
  'rejection_reason',rejection_reason
) order by value_m2,surface_type),'[]'::jsonb)
from annotated;
$$;

create or replace function public.odm_audit_freshness_assessment_v2(
  p_observed_at timestamptz,
  p_seed_provider text,
  p_observation_source text,
  p_freshness_status text,
  p_now timestamptz default now()
) returns jsonb
language sql
stable
set search_path = ''
as $$
with params as (
  select case
    when p_seed_provider in ('direct_feed','partner_feed') then 7
    when p_observation_source in ('public_index_result','serper_search') then 21
    when p_seed_provider='commoncrawl_cdx' then 45
    else 30
  end::numeric as expected_days
), assessed as (
  select
    expected_days,
    case when p_observed_at is null then null else greatest(0,extract(epoch from (p_now-p_observed_at))/86400.0) end as age_days
  from params
)
select jsonb_build_object(
  'expected_revisit_days',expected_days,
  'age_days',round(age_days,2),
  'freshness_status_v2',case
    when p_observed_at is null then 'unconfirmed_timestamp'
    when p_seed_provider='commoncrawl_cdx' and p_freshness_status<>'fresh_confirmed' then 'archive_unconfirmed'
    when age_days <= expected_days then 'fresh'
    when age_days <= expected_days*2 then 'aging'
    else 'stale'
  end,
  'freshness_confidence',case
    when p_observed_at is null then 0.0
    when p_seed_provider='commoncrawl_cdx' and p_freshness_status<>'fresh_confirmed' then 0.1
    when age_days <= expected_days then round(greatest(0.70,1.0-(age_days/expected_days)*0.30),3)
    when age_days <= expected_days*2 then round(greatest(0.30,0.70-((age_days-expected_days)/expected_days)*0.40),3)
    else 0.10
  end
)
from assessed;
$$;

create or replace view public.odm_audit_typed_surface_freshness_v1 as
with candidates as (
  select
    a.*,
    p.resolved_registry_source_domain,
    p.policy_match_kind,
    p.policy_resolution_status,
    p.discovery_policy as resolved_discovery_policy,
    p.display_policy as resolved_display_policy,
    p.no_bypass_required as resolved_no_bypass_required,
    public.odm_audit_surface_candidates_v1(a.observation_title,'title',a.observation_id) as title_surface_candidates_v1,
    public.odm_audit_surface_candidates_v1(a.observation_snippet,'snippet',a.observation_id) as snippet_surface_candidates_v1,
    public.odm_audit_freshness_assessment_v2(a.observation_observed_at,a.seed_provider,a.observation_source,a.freshness_status) as freshness_assessment_v2
  from public.odm_audit_atomic_observation_v1 a
  left join public.odm_audit_source_policy_resolution_v1 p on p.seed_id=a.seed_id
), selected as (
  select
    c.*,
    case when jsonb_array_length(title_surface_candidates_v1)>0 then title_surface_candidates_v1 else snippet_surface_candidates_v1 end as selected_surface_candidates_v1,
    case when jsonb_array_length(title_surface_candidates_v1)>0 then 'title' when jsonb_array_length(snippet_surface_candidates_v1)>0 then 'snippet' end as selected_surface_evidence_source
  from candidates c
)
select
  s.*,
  case
    when policy_resolution_status<>'resolved_policy' then 'blocked_source_policy'
    when jsonb_array_length(selected_surface_candidates_v1)=0 then 'missing'
    when jsonb_array_length(selected_surface_candidates_v1)>1 then 'ambiguous'
    when selected_surface_candidates_v1#>>'{0,rejection_reason}' is not null then 'rejected'
    when freshness_assessment_v2#>>'{freshness_status_v2}' not in ('fresh','aging') then 'untrusted_freshness'
    else 'trusted_typed_surface'
  end as typed_surface_status,
  case
    when policy_resolution_status='resolved_policy'
      and jsonb_array_length(selected_surface_candidates_v1)=1
      and selected_surface_candidates_v1#>>'{0,rejection_reason}' is null
      and freshness_assessment_v2#>>'{freshness_status_v2}' in ('fresh','aging')
    then selected_surface_candidates_v1->0
  end as shadow_selected_surface_candidate
from selected s;

create or replace function public.odm_audit_surface_freshness_source_report_v1(
  p_sample_size integer default 240,
  p_sample_salt text default 'odm-surface-freshness-source-01'
) returns jsonb
language sql
stable
set search_path = ''
as $$
with sampled as (
  select * from public.odm_audit_typed_surface_freshness_v1
  order by md5(seed_id::text||coalesce(p_sample_salt,''))
  limit least(greatest(coalesce(p_sample_size,240),1),2000)
)
select jsonb_build_object(
  'audit_version','odm_surface_freshness_source_v1',
  'sample_size',count(*),
  'trusted_typed_surfaces',count(*) filter(where typed_surface_status='trusted_typed_surface'),
  'ambiguous_surfaces',count(*) filter(where typed_surface_status='ambiguous'),
  'rejected_surfaces',count(*) filter(where typed_surface_status='rejected'),
  'resolved_source_policies',count(*) filter(where policy_resolution_status='resolved_policy'),
  'missing_source_policies',count(*) filter(where policy_resolution_status='missing_policy'),
  'ambiguous_source_policies',count(*) filter(where policy_resolution_status='ambiguous_policy_alias'),
  'fresh_observations',count(*) filter(where freshness_assessment_v2#>>'{freshness_status_v2}'='fresh'),
  'aging_observations',count(*) filter(where freshness_assessment_v2#>>'{freshness_status_v2}'='aging'),
  'stale_or_unconfirmed_observations',count(*) filter(where freshness_assessment_v2#>>'{freshness_status_v2}' in ('stale','archive_unconfirmed','unconfirmed_timestamp')),
  'gates',jsonb_build_object(
    'no_unknown_surface_publication',count(*) filter(where shadow_selected_surface_candidate#>>'{surface_type}'='unknown_surface_m2')=0,
    'no_rejected_surface_publication',count(*) filter(where shadow_selected_surface_candidate#>>'{rejection_reason}' is not null)=0,
    'no_ambiguous_policy_publication',count(*) filter(where policy_resolution_status='ambiguous_policy_alias' and shadow_selected_surface_candidate is not null)=0,
    'no_missing_policy_publication',count(*) filter(where policy_resolution_status='missing_policy' and shadow_selected_surface_candidate is not null)=0,
    'no_untrusted_freshness_publication',count(*) filter(where freshness_assessment_v2#>>'{freshness_status_v2}' not in ('fresh','aging') and shadow_selected_surface_candidate is not null)=0,
    'all_surface_candidates_are_provenanced',count(*) filter(where shadow_selected_surface_candidate is not null and shadow_selected_surface_candidate#>>'{observation_id}' is null)=0
  )
)
from sampled;
$$;

revoke all on function public.odm_audit_canonical_domain_v1(text) from public,anon,authenticated;
revoke all on function public.odm_audit_surface_candidates_v1(text,text,text) from public,anon,authenticated;
revoke all on function public.odm_audit_freshness_assessment_v2(timestamptz,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.odm_audit_surface_freshness_source_report_v1(integer,text) from public,anon,authenticated;
revoke all on public.odm_audit_source_policy_resolution_v1 from public,anon,authenticated;
revoke all on public.odm_audit_typed_surface_freshness_v1 from public,anon,authenticated;
grant execute on function public.odm_audit_surface_freshness_source_report_v1(integer,text) to service_role;
grant select on public.odm_audit_source_policy_resolution_v1 to service_role;
grant select on public.odm_audit_typed_surface_freshness_v1 to service_role;

comment on view public.odm_audit_source_policy_resolution_v1 is 'Shadow-only canonical source-domain policy resolution. Missing or ambiguous matches fail closed.';
comment on view public.odm_audit_typed_surface_freshness_v1 is 'Shadow-only typed surface selection with source-aware freshness and resolved source policy.';
