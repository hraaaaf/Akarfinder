-- PostgreSQL requires an explicit view rebuild when adding projection columns.
-- Only shadow objects are dropped/recreated; no indexed data is mutated.

drop function if exists public.odm_audit_pilot_report_v1(integer,text);
drop view if exists public.odm_audit_signal_validation_v1;

create view public.odm_audit_signal_validation_v1 as
with evidence as (
  select
    d.seed_id,
    d.canonical_url,
    d.source_domain,
    d.seed_provider,
    d.freshness_status,
    d.quality_tier,
    d.quality_score,
    d.vertical_classification,
    d.title as indexed_title,
    d.snippet as indexed_snippet,
    d.normalized_price_mad as persisted_price_mad,
    d.normalized_surface_m2 as persisted_surface_m2,
    r.discovery_policy,
    r.display_policy,
    r.no_bypass_required,
    coalesce(
      nullif(btrim(s.metadata #>> '{public_index_result,title}'), ''),
      nullif(btrim(s.metadata #>> '{serper_search,title}'), ''),
      nullif(btrim(d.title), '')
    ) as evidence_title,
    coalesce(
      nullif(btrim(s.metadata #>> '{public_index_result,snippet}'), ''),
      nullif(btrim(s.metadata #>> '{serper_search,snippet}'), ''),
      nullif(btrim(d.snippet), '')
    ) as evidence_snippet,
    coalesce(
      public.odm_audit_safe_timestamptz(s.metadata #>> '{public_index_result,observed_at}'),
      public.odm_audit_safe_timestamptz(s.metadata #>> '{serper_search,observed_at}'),
      s.fresh_last_seen_at,
      s.last_observed_at
    ) as evidence_observed_at
  from public.thin_index_search_documents d
  join public.source_offer_seeds s on s.id = d.seed_id
  left join public.source_policy_registry r on r.source_domain = d.source_domain
  where d.vertical_classification = 'real_estate_likely'
), candidates as (
  select
    e.*,
    public.odm_audit_merge_numeric_candidates(
      public.odm_audit_numeric_candidates_v2(e.evidence_title, 'price'),
      public.odm_audit_numeric_candidates_v2(e.evidence_snippet, 'price')
    ) as price_candidates,
    public.odm_audit_merge_numeric_candidates(
      public.odm_audit_numeric_candidates_v2(e.evidence_title, 'surface'),
      public.odm_audit_numeric_candidates_v2(e.evidence_snippet, 'surface')
    ) as surface_candidates
  from evidence e
), evaluated as (
  select
    c.*,
    public.odm_audit_signal_status_v1(
      c.price_candidates, c.evidence_observed_at,
      c.seed_provider, c.freshness_status
    ) as price_status,
    public.odm_audit_signal_status_v1(
      c.surface_candidates, c.evidence_observed_at,
      c.seed_provider, c.freshness_status
    ) as surface_status
  from candidates c
), decided as (
  select
    e.*,
    case
      when e.display_policy is null then 'blocked_missing_policy'
      when e.display_policy = 'internal_signal_only' then 'blocked_internal_signal_only'
      when coalesce(e.no_bypass_required, true) is not true then 'blocked_invalid_policy'
      when e.quality_tier in ('D', 'E', 'REJECTED', 'UNSCORED') then 'blocked_quality'
      when e.display_policy = 'canonical_link_only' then 'candidate_canonical_link'
      else 'blocked_unsupported_display_policy'
    end as shadow_display_decision
  from evaluated e
)
select
  d.*,
  case when cardinality(d.price_candidates) = 1 then d.price_candidates[1] end as candidate_price_mad,
  case when cardinality(d.surface_candidates) = 1 then d.surface_candidates[1] end as candidate_surface_m2,
  case
    when d.shadow_display_decision = 'candidate_canonical_link'
      and d.price_status = 'trusted_candidate'
      and cardinality(d.price_candidates) = 1
    then d.price_candidates[1]
  end as shadow_public_price_mad,
  case
    when d.shadow_display_decision = 'candidate_canonical_link'
      and d.surface_status = 'trusted_candidate'
      and cardinality(d.surface_candidates) = 1
    then d.surface_candidates[1]
  end as shadow_public_surface_m2,
  case
    when d.price_status = 'trusted_candidate'
      and cardinality(d.price_candidates) = 1
      and d.persisted_price_mad is distinct from d.price_candidates[1]
    then true else false
  end as persisted_price_conflict,
  case
    when d.surface_status = 'trusted_candidate'
      and cardinality(d.surface_candidates) = 1
      and d.persisted_surface_m2 is distinct from d.surface_candidates[1]
    then true else false
  end as persisted_surface_conflict
from decided d;

create function public.odm_audit_pilot_report_v1(
  p_sample_size integer default 240,
  p_sample_salt text default 'odm-audit-pilot-01'
) returns jsonb
language sql
stable
set search_path = ''
as $$
with ranked as (
  select
    v.*,
    row_number() over (
      partition by v.source_domain, v.quality_tier, v.seed_provider
      order by md5(v.seed_id::text || coalesce(p_sample_salt, ''))
    ) as stratum_rank
  from public.odm_audit_signal_validation_v1 v
), sampled as (
  select *
  from ranked
  order by
    case quality_tier when 'A' then 1 when 'B' then 2 when 'C' then 3 else 4 end,
    stratum_rank,
    md5(seed_id::text || coalesce(p_sample_salt, ''))
  limit least(greatest(coalesce(p_sample_size, 240), 1), 2000)
), summary as (
  select jsonb_build_object(
    'sample_size', count(*),
    'with_persisted_price', count(*) filter (where persisted_price_mad is not null),
    'with_persisted_surface', count(*) filter (where persisted_surface_m2 is not null),
    'trusted_price_candidates', count(*) filter (where price_status = 'trusted_candidate'),
    'trusted_surface_candidates', count(*) filter (where surface_status = 'trusted_candidate'),
    'ambiguous_prices', count(*) filter (where price_status = 'ambiguous'),
    'ambiguous_surfaces', count(*) filter (where surface_status = 'ambiguous'),
    'shadow_public_prices', count(*) filter (where shadow_public_price_mad is not null),
    'shadow_public_surfaces', count(*) filter (where shadow_public_surface_m2 is not null),
    'persisted_price_conflicts', count(*) filter (where persisted_price_conflict),
    'persisted_surface_conflicts', count(*) filter (where persisted_surface_conflict)
  ) as value
  from sampled
), decisions as (
  select coalesce(jsonb_object_agg(shadow_display_decision, n), '{}'::jsonb) as value
  from (
    select shadow_display_decision, count(*)::integer n
    from sampled group by shadow_display_decision
  ) x
), statuses as (
  select jsonb_build_object(
    'price', coalesce((select jsonb_object_agg(price_status, n) from (
      select price_status, count(*)::integer n from sampled group by price_status
    ) p), '{}'::jsonb),
    'surface', coalesce((select jsonb_object_agg(surface_status, n) from (
      select surface_status, count(*)::integer n from sampled group by surface_status
    ) s), '{}'::jsonb)
  ) as value
), gates as (
  select jsonb_build_object(
    'no_public_policy_bypass', count(*) filter (
      where display_policy = 'internal_signal_only'
        and shadow_display_decision <> 'blocked_internal_signal_only'
    ) = 0,
    'no_quality_d_admission', count(*) filter (
      where quality_tier in ('D','E','REJECTED','UNSCORED')
        and shadow_display_decision like 'candidate%'
    ) = 0,
    'ambiguous_price_suppressed', count(*) filter (
      where price_status = 'ambiguous' and shadow_public_price_mad is not null
    ) = 0,
    'ambiguous_surface_suppressed', count(*) filter (
      where surface_status = 'ambiguous' and shadow_public_surface_m2 is not null
    ) = 0,
    'untrusted_price_suppressed', count(*) filter (
      where price_status <> 'trusted_candidate' and shadow_public_price_mad is not null
    ) = 0,
    'untrusted_surface_suppressed', count(*) filter (
      where surface_status <> 'trusted_candidate' and shadow_public_surface_m2 is not null
    ) = 0
  ) as value
  from sampled
)
select jsonb_build_object(
  'audit_version','odm_audit_pilot_v1_1',
  'generated_at',now(),
  'summary',(select value from summary),
  'shadow_decisions',(select value from decisions),
  'signal_statuses',(select value from statuses),
  'gates',(select value from gates)
);
$$;

revoke all on function public.odm_audit_pilot_report_v1(integer,text) from public,anon,authenticated;
revoke all on public.odm_audit_signal_validation_v1 from public,anon,authenticated;
grant execute on function public.odm_audit_pilot_report_v1(integer,text) to service_role;
grant select on public.odm_audit_signal_validation_v1 to service_role;

comment on view public.odm_audit_signal_validation_v1 is
  'Shadow-only validation. Canonical-link eligibility is independent from structured-field publication; ambiguous or unconfirmed economics are suppressed.';
