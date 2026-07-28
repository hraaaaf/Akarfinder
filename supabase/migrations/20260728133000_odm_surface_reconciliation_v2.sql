-- ODM-SURFACE-02 — precise-vs-advertised surface reconciliation.
-- Shadow-only. Generic but explicit listing surfaces become advertised_surface_m2;
-- more specific snippet evidence may override a generic title surface.

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
  select m[1] as raw_fragment,replace(m[2],',','.')::numeric as value_m2,lower(coalesce(m[1],'')) as normalized_fragment
  from regexp_matches(coalesce(p_text,''),'((?:surface|superficie|terrain|parcelle|lot|terrasse|jardin|mezzanine|local[[:space:]]+commercial|commerce|magasin|appartement|villa|maison|riad|bureau|studio)?[^0-9]{0,32}([0-9]{1,6}(?:[.,][0-9]+)?)[[:space:]]*(?:m2|m²))','gi') as m
), classified as (
  select *,case
    when normalized_fragment ~ '(surface|superficie)[[:space:]]+(habitable|de[[:space:]]+vie)' then 'living_surface_m2'
    when normalized_fragment ~ '(surface|superficie)[[:space:]]+(construite|bâtie|batisse|couverte)|construit[[:space:]]*:|couverte' then 'built_surface_m2'
    when normalized_fragment ~ '(terrain|parcelle|lot)' then 'plot_surface_m2'
    when normalized_fragment ~ 'terrasse' then 'terrace_surface_m2'
    when normalized_fragment ~ 'jardin' then 'garden_surface_m2'
    when normalized_fragment ~ 'mezzanine' then 'mezzanine_surface_m2'
    when normalized_fragment ~ '(surface|superficie)[[:space:]]+(commerciale|commercial)|local[[:space:]]+commercial|commerce|magasin' then 'commercial_surface_m2'
    when normalized_fragment ~ '(surface|superficie)[[:space:]]+utile' then 'usable_surface_m2'
    when normalized_fragment ~ '(surface|superficie)[[:space:]]+totale' then 'total_surface_m2'
    when normalized_fragment ~ '(appartement|villa|maison|riad|bureau|studio)' then 'advertised_surface_m2'
    when normalized_fragment ~ '(surface|superficie)' then 'advertised_surface_m2'
    else 'unknown_surface_m2' end as surface_type
  from matches where value_m2 between 9 and 100000
), annotated as (
  select *,case when surface_type='unknown_surface_m2' then 'surface_context_unconfirmed' end as rejection_reason,
    case when surface_type='unknown_surface_m2' then 0.45 when surface_type='advertised_surface_m2' then 0.78 else 0.94 end as confidence
  from classified
)
select coalesce(jsonb_agg(jsonb_build_object(
  'value_m2',value_m2,'surface_type',surface_type,'evidence_source',nullif(btrim(p_evidence_source),''),
  'observation_id',nullif(btrim(p_observation_id),''),'raw_fragment',raw_fragment,'normalized_fragment',normalized_fragment,
  'parser_version','odm_surface_parser_v2','confidence',confidence,'rejection_reason',rejection_reason
) order by value_m2,surface_type),'[]'::jsonb) from annotated;
$$;

drop function if exists public.odm_audit_surface_freshness_source_report_v1(integer,text);
drop view if exists public.odm_audit_typed_surface_freshness_v1;

create view public.odm_audit_typed_surface_freshness_v1 as
with candidates as (
  select a.*,p.resolved_registry_source_domain,p.policy_match_kind,p.policy_resolution_status,
    p.discovery_policy as resolved_discovery_policy,p.display_policy as resolved_display_policy,
    p.no_bypass_required as resolved_no_bypass_required,
    public.odm_audit_surface_candidates_v1(a.observation_title,'title',a.observation_id) as title_surface_candidates_v1,
    public.odm_audit_surface_candidates_v1(a.observation_snippet,'snippet',a.observation_id) as snippet_surface_candidates_v1,
    public.odm_audit_freshness_assessment_v2(a.observation_observed_at,a.seed_provider,a.observation_source,a.freshness_status) as freshness_assessment_v2
  from public.odm_audit_atomic_observation_v1 a
  left join public.odm_audit_source_policy_resolution_v1 p on p.seed_id=a.seed_id
), pools as (
  select c.*,
    coalesce((select jsonb_agg(x) from jsonb_array_elements(c.title_surface_candidates_v1) x where x#>>'{rejection_reason}' is null and x#>>'{surface_type}'<>'advertised_surface_m2'),'[]'::jsonb) as title_specific,
    coalesce((select jsonb_agg(x) from jsonb_array_elements(c.snippet_surface_candidates_v1) x where x#>>'{rejection_reason}' is null and x#>>'{surface_type}'<>'advertised_surface_m2'),'[]'::jsonb) as snippet_specific,
    coalesce((select jsonb_agg(x) from jsonb_array_elements(c.title_surface_candidates_v1) x where x#>>'{rejection_reason}' is null),'[]'::jsonb) as title_publishable,
    coalesce((select jsonb_agg(x) from jsonb_array_elements(c.snippet_surface_candidates_v1) x where x#>>'{rejection_reason}' is null),'[]'::jsonb) as snippet_publishable
  from candidates c
), selected as (
  select p.*,
    case when jsonb_array_length(title_specific)>0 then title_specific
      when jsonb_array_length(snippet_specific)>0 then snippet_specific
      when jsonb_array_length(title_publishable)>0 then title_publishable else snippet_publishable end as selected_surface_candidates_v1,
    case when jsonb_array_length(title_specific)>0 then 'title_specific'
      when jsonb_array_length(snippet_specific)>0 then 'snippet_specific'
      when jsonb_array_length(title_publishable)>0 then 'title_advertised'
      when jsonb_array_length(snippet_publishable)>0 then 'snippet_advertised' end as selected_surface_evidence_source
  from pools p
)
select s.*,
  case when policy_resolution_status<>'resolved_policy' then 'blocked_source_policy'
    when jsonb_array_length(selected_surface_candidates_v1)=0 then 'missing_or_rejected'
    when jsonb_array_length(selected_surface_candidates_v1)>1 then 'ambiguous'
    when freshness_assessment_v2#>>'{freshness_status_v2}' not in ('fresh','aging') then 'untrusted_freshness'
    else 'trusted_typed_surface' end as typed_surface_status,
  case when policy_resolution_status='resolved_policy'
    and jsonb_array_length(selected_surface_candidates_v1)=1
    and freshness_assessment_v2#>>'{freshness_status_v2}' in ('fresh','aging')
    then selected_surface_candidates_v1->0 end as shadow_selected_surface_candidate
from selected s;

create function public.odm_audit_surface_freshness_source_report_v1(
  p_sample_size integer default 240,p_sample_salt text default 'odm-surface-freshness-source-01'
) returns jsonb language sql stable set search_path='' as $$
with sampled as (
 select * from public.odm_audit_typed_surface_freshness_v1
 order by md5(seed_id::text||coalesce(p_sample_salt,''))
 limit least(greatest(coalesce(p_sample_size,240),1),2000)
)
select jsonb_build_object(
 'audit_version','odm_surface_freshness_source_v2','sample_size',count(*),
 'trusted_typed_surfaces',count(*) filter(where typed_surface_status='trusted_typed_surface'),
 'ambiguous_surfaces',count(*) filter(where typed_surface_status='ambiguous'),
 'missing_or_rejected_surfaces',count(*) filter(where typed_surface_status='missing_or_rejected'),
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
 )) from sampled;
$$;

revoke all on function public.odm_audit_surface_candidates_v1(text,text,text) from public,anon,authenticated;
revoke all on function public.odm_audit_surface_freshness_source_report_v1(integer,text) from public,anon,authenticated;
revoke all on public.odm_audit_typed_surface_freshness_v1 from public,anon,authenticated;
grant execute on function public.odm_audit_surface_freshness_source_report_v1(integer,text) to service_role;
grant select on public.odm_audit_typed_surface_freshness_v1 to service_role;
