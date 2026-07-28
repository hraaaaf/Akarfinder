-- ODM-AUDIT-PILOT-01 v1.2 — title-first economic signal precedence.
-- The current title is the primary public evidence. A contradictory snippet is
-- preserved as a history/conflict signal, but does not suppress a unique title value.
-- Shadow-only: no indexed row, ranking, or display state is mutated.

drop function if exists public.odm_audit_pilot_report_v1(integer,text);
drop view if exists public.odm_audit_signal_validation_v1;

create view public.odm_audit_signal_validation_v1 as
with evidence as (
  select
    d.seed_id,d.canonical_url,d.source_domain,d.seed_provider,d.freshness_status,
    d.quality_tier,d.quality_score,d.vertical_classification,
    d.title as indexed_title,d.snippet as indexed_snippet,
    d.normalized_price_mad as persisted_price_mad,
    d.normalized_surface_m2 as persisted_surface_m2,
    r.discovery_policy,r.display_policy,r.no_bypass_required,
    coalesce(nullif(btrim(s.metadata#>>'{public_index_result,title}'),''),nullif(btrim(s.metadata#>>'{serper_search,title}'),''),nullif(btrim(d.title),'')) as evidence_title,
    coalesce(nullif(btrim(s.metadata#>>'{public_index_result,snippet}'),''),nullif(btrim(s.metadata#>>'{serper_search,snippet}'),''),nullif(btrim(d.snippet),'')) as evidence_snippet,
    coalesce(public.odm_audit_safe_timestamptz(s.metadata#>>'{public_index_result,observed_at}'),public.odm_audit_safe_timestamptz(s.metadata#>>'{serper_search,observed_at}'),s.fresh_last_seen_at,s.last_observed_at) as evidence_observed_at
  from public.thin_index_search_documents d
  join public.source_offer_seeds s on s.id=d.seed_id
  left join public.source_policy_registry r on r.source_domain=d.source_domain
  where d.vertical_classification='real_estate_likely'
), candidates as (
  select e.*,
    public.odm_audit_numeric_candidates_v2(e.evidence_title,'price') as title_price_candidates,
    public.odm_audit_numeric_candidates_v2(e.evidence_snippet,'price') as snippet_price_candidates,
    public.odm_audit_numeric_candidates_v2(e.evidence_title,'surface') as title_surface_candidates,
    public.odm_audit_numeric_candidates_v2(e.evidence_snippet,'surface') as snippet_surface_candidates
  from evidence e
), evaluated as (
  select c.*,
    case
      when cardinality(c.title_price_candidates)>1 then 'ambiguous_title'
      when cardinality(c.title_price_candidates)=1 then public.odm_audit_signal_status_v1(c.title_price_candidates,c.evidence_observed_at,c.seed_provider,c.freshness_status)
      else public.odm_audit_signal_status_v1(c.snippet_price_candidates,c.evidence_observed_at,c.seed_provider,c.freshness_status)
    end as price_status,
    case
      when cardinality(c.title_surface_candidates)>1 then 'ambiguous_title'
      when cardinality(c.title_surface_candidates)=1 then public.odm_audit_signal_status_v1(c.title_surface_candidates,c.evidence_observed_at,c.seed_provider,c.freshness_status)
      else public.odm_audit_signal_status_v1(c.snippet_surface_candidates,c.evidence_observed_at,c.seed_provider,c.freshness_status)
    end as surface_status,
    case when cardinality(c.title_price_candidates)=1 then c.title_price_candidates[1]
         when cardinality(c.title_price_candidates)=0 and cardinality(c.snippet_price_candidates)=1 then c.snippet_price_candidates[1] end as candidate_price_mad,
    case when cardinality(c.title_surface_candidates)=1 then c.title_surface_candidates[1]
         when cardinality(c.title_surface_candidates)=0 and cardinality(c.snippet_surface_candidates)=1 then c.snippet_surface_candidates[1] end as candidate_surface_m2,
    case when cardinality(c.title_price_candidates)=1 and cardinality(c.snippet_price_candidates)>=1 and not (c.title_price_candidates[1]=any(c.snippet_price_candidates)) then true else false end as snippet_price_history_conflict,
    case when cardinality(c.title_surface_candidates)=1 and cardinality(c.snippet_surface_candidates)>=1 and not (c.title_surface_candidates[1]=any(c.snippet_surface_candidates)) then true else false end as snippet_surface_history_conflict,
    case when cardinality(c.title_price_candidates)=1 then 'title' when cardinality(c.title_price_candidates)=0 and cardinality(c.snippet_price_candidates)=1 then 'snippet' end as price_evidence_source,
    case when cardinality(c.title_surface_candidates)=1 then 'title' when cardinality(c.title_surface_candidates)=0 and cardinality(c.snippet_surface_candidates)=1 then 'snippet' end as surface_evidence_source
  from candidates c
), decided as (
  select e.*,
    case when e.display_policy is null then 'blocked_missing_policy'
         when e.display_policy='internal_signal_only' then 'blocked_internal_signal_only'
         when coalesce(e.no_bypass_required,true) is not true then 'blocked_invalid_policy'
         when e.quality_tier in ('D','E','REJECTED','UNSCORED') then 'blocked_quality'
         when e.display_policy='canonical_link_only' then 'candidate_canonical_link'
         else 'blocked_unsupported_display_policy' end as shadow_display_decision
  from evaluated e
)
select d.*,
  case when d.shadow_display_decision='candidate_canonical_link' and d.price_status='trusted_candidate' then d.candidate_price_mad end as shadow_public_price_mad,
  case when d.shadow_display_decision='candidate_canonical_link' and d.surface_status='trusted_candidate' then d.candidate_surface_m2 end as shadow_public_surface_m2,
  case when d.price_status='trusted_candidate' and d.candidate_price_mad is not null and d.persisted_price_mad is distinct from d.candidate_price_mad then true else false end as persisted_price_conflict,
  case when d.surface_status='trusted_candidate' and d.candidate_surface_m2 is not null and d.persisted_surface_m2 is distinct from d.candidate_surface_m2 then true else false end as persisted_surface_conflict
from decided d;

create function public.odm_audit_pilot_report_v1(p_sample_size integer default 240,p_sample_salt text default 'odm-audit-pilot-01')
returns jsonb language sql stable set search_path='' as $$
with ranked as (
 select v.*,row_number() over(partition by v.source_domain,v.quality_tier,v.seed_provider order by md5(v.seed_id::text||coalesce(p_sample_salt,''))) stratum_rank
 from public.odm_audit_signal_validation_v1 v
), sampled as (
 select * from ranked order by case quality_tier when 'A' then 1 when 'B' then 2 when 'C' then 3 else 4 end,stratum_rank,md5(seed_id::text||coalesce(p_sample_salt,''))
 limit least(greatest(coalesce(p_sample_size,240),1),2000)
), summary as (
 select jsonb_build_object(
  'sample_size',count(*),'title_price_values',count(*) filter(where price_evidence_source='title'),
  'snippet_price_fallbacks',count(*) filter(where price_evidence_source='snippet'),
  'title_surface_values',count(*) filter(where surface_evidence_source='title'),
  'snippet_surface_fallbacks',count(*) filter(where surface_evidence_source='snippet'),
  'snippet_price_history_conflicts',count(*) filter(where snippet_price_history_conflict),
  'snippet_surface_history_conflicts',count(*) filter(where snippet_surface_history_conflict),
  'ambiguous_title_prices',count(*) filter(where price_status='ambiguous_title'),
  'ambiguous_title_surfaces',count(*) filter(where surface_status='ambiguous_title'),
  'shadow_public_prices',count(*) filter(where shadow_public_price_mad is not null),
  'shadow_public_surfaces',count(*) filter(where shadow_public_surface_m2 is not null),
  'persisted_price_conflicts',count(*) filter(where persisted_price_conflict),
  'persisted_surface_conflicts',count(*) filter(where persisted_surface_conflict)
 ) value from sampled
), decisions as (
 select coalesce(jsonb_object_agg(shadow_display_decision,n),'{}'::jsonb) value from (select shadow_display_decision,count(*)::integer n from sampled group by shadow_display_decision)x
), gates as (
 select jsonb_build_object(
  'no_public_policy_bypass',count(*) filter(where display_policy='internal_signal_only' and shadow_display_decision<>'blocked_internal_signal_only')=0,
  'no_quality_d_admission',count(*) filter(where quality_tier in('D','E','REJECTED','UNSCORED') and shadow_display_decision like 'candidate%')=0,
  'ambiguous_title_price_suppressed',count(*) filter(where price_status='ambiguous_title' and shadow_public_price_mad is not null)=0,
  'ambiguous_title_surface_suppressed',count(*) filter(where surface_status='ambiguous_title' and shadow_public_surface_m2 is not null)=0,
  'title_price_wins_over_snippet',count(*) filter(where snippet_price_history_conflict and price_evidence_source<>'title')=0,
  'title_surface_wins_over_snippet',count(*) filter(where snippet_surface_history_conflict and surface_evidence_source<>'title')=0,
  'untrusted_price_suppressed',count(*) filter(where price_status<>'trusted_candidate' and shadow_public_price_mad is not null)=0,
  'untrusted_surface_suppressed',count(*) filter(where surface_status<>'trusted_candidate' and shadow_public_surface_m2 is not null)=0
 ) value from sampled
)
select jsonb_build_object('audit_version','odm_audit_pilot_v1_2_title_first','generated_at',now(),'summary',(select value from summary),'shadow_decisions',(select value from decisions),'gates',(select value from gates));
$$;

revoke all on function public.odm_audit_pilot_report_v1(integer,text) from public,anon,authenticated;
revoke all on public.odm_audit_signal_validation_v1 from public,anon,authenticated;
grant execute on function public.odm_audit_pilot_report_v1(integer,text) to service_role;
grant select on public.odm_audit_signal_validation_v1 to service_role;
comment on view public.odm_audit_signal_validation_v1 is 'Shadow-only title-first validation. Unique current-title economics take precedence; contradictory snippets are retained as history signals.';
