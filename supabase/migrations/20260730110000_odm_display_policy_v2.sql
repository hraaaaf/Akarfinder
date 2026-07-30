-- ODM-DISPLAY-POLICY-V2
-- Maximum coverage with explicit confidence tiers.
-- Shadow-only: no mutation of Thin Index display eligibility, ranking, publication or SERP.
-- Rollback: drop function public.odm_display_policy_report_v2(); drop view public.odm_display_policy_shadow_v2;

create or replace view public.odm_display_policy_shadow_v2
with (security_invoker = true)
as
with base as (
  select
    a.observation_id,
    a.seed_id,
    a.canonical_url,
    a.source_domain,
    a.seed_provider,
    a.vertical_classification,
    a.quality_tier,
    a.quality_score,
    a.observation_title,
    a.observation_snippet,
    a.observation_observed_at,
    d.normalized_city,
    d.normalized_property_type,
    d.normalized_intent,
    d.normalized_price_mad,
    d.normalized_surface_m2,
    p.policy_resolution_status,
    p.resolved_registry_source_domain,
    p.display_policy as resolved_display_policy,
    p.no_bypass_required as resolved_no_bypass_required,
    coalesce(f.freshness_assessment_v2 #>> '{freshness_status_v2}', 'unknown') as freshness_status_v2,
    e.economic_status,
    e.principal_value_mad,
    r.recovery_status,
    r.recovered_value_mad,
    r.recovered_economic_type
  from public.odm_audit_atomic_observation_v1 a
  join public.thin_index_search_documents d on d.seed_id = a.seed_id
  left join public.odm_audit_source_policy_resolution_v1 p on p.seed_id = a.seed_id
  left join public.odm_audit_typed_surface_freshness_v1 f on f.observation_id = a.observation_id
  left join public.odm_economic_observation_state_shadow_v1 e
    on e.observation_id = a.observation_id
   and e.parser_version = 'odm_economic_parser_v2'
  left join public.odm_economic_recovery_candidate_shadow_v1 r
    on r.observation_id = a.observation_id
), assessed as (
  select
    b.*,
    (nullif(btrim(b.canonical_url), '') is not null
      and (nullif(btrim(b.observation_title), '') is not null
        or nullif(btrim(b.observation_snippet), '') is not null)) as has_exploitable_evidence,
    case
      when b.policy_resolution_status <> 'resolved_policy' then 'blocked'
      when coalesce(b.resolved_no_bypass_required, true) is not true then 'blocked'
      when b.resolved_display_policy in ('internal_signal_only','blocked') then 'blocked'
      when b.resolved_display_policy not in ('canonical_link_only','partner_content') then 'blocked'
      when b.vertical_classification <> 'real_estate_likely' then 'blocked'
      when nullif(btrim(b.canonical_url), '') is null then 'blocked'
      when nullif(btrim(b.observation_title), '') is null
       and nullif(btrim(b.observation_snippet), '') is null then 'blocked'
      when coalesce(b.quality_tier, 'UNSCORED') in ('D','E','REJECTED','UNSCORED') then 'displayable_degraded'
      when coalesce(b.freshness_status_v2, 'unknown') not in ('fresh','aging') then 'displayable_degraded'
      when coalesce(b.economic_status, 'missing') in ('ambiguous','rejected','stale','policy_blocked') then 'displayable_degraded'
      when b.recovery_status = 'eligible_shadow' then 'displayable_degraded'
      when b.normalized_city is null
        or b.normalized_property_type is null
        or b.normalized_intent is null then 'displayable_degraded'
      else 'displayable_ranked'
    end as display_tier_v2
  from base b
), explained as (
  select
    a.*,
    array_remove(array[
      case when a.policy_resolution_status <> 'resolved_policy' then 'source_policy_unresolved' end,
      case when coalesce(a.resolved_no_bypass_required, true) is not true then 'no_bypass_policy_invalid' end,
      case when a.resolved_display_policy = 'internal_signal_only' then 'source_internal_signal_only' end,
      case when a.resolved_display_policy = 'blocked' then 'source_display_blocked' end,
      case when a.resolved_display_policy not in ('canonical_link_only','partner_content','internal_signal_only','blocked') then 'source_display_policy_unsupported' end,
      case when a.vertical_classification <> 'real_estate_likely' then 'outside_real_estate_scope' end,
      case when nullif(btrim(a.canonical_url), '') is null then 'canonical_url_missing' end,
      case when nullif(btrim(a.observation_title), '') is null and nullif(btrim(a.observation_snippet), '') is null then 'exploitable_evidence_missing' end,
      case when coalesce(a.quality_tier, 'UNSCORED') in ('D','E','REJECTED','UNSCORED') then 'low_or_unscored_quality' end,
      case when coalesce(a.freshness_status_v2, 'unknown') not in ('fresh','aging') then 'freshness_uncertain_or_old' end,
      case when a.economic_status = 'ambiguous' then 'price_ambiguous' end,
      case when a.economic_status = 'rejected' then 'price_rejected' end,
      case when a.economic_status = 'stale' then 'price_stale' end,
      case when a.economic_status = 'policy_blocked' then 'economic_policy_blocked' end,
      case when a.recovery_status = 'eligible_shadow' then 'economic_recovery_shadow' end,
      case when a.normalized_city is null then 'city_missing' end,
      case when a.normalized_property_type is null then 'property_type_missing' end,
      case when a.normalized_intent is null then 'intent_missing' end
    ], null) as decision_reasons_v2
  from assessed a
)
select
  observation_id,
  seed_id,
  canonical_url,
  source_domain,
  seed_provider,
  vertical_classification,
  quality_tier,
  quality_score,
  observation_title,
  observation_snippet,
  observation_observed_at,
  normalized_city,
  normalized_property_type,
  normalized_intent,
  normalized_price_mad,
  normalized_surface_m2,
  policy_resolution_status,
  resolved_registry_source_domain,
  resolved_display_policy,
  resolved_no_bypass_required,
  freshness_status_v2,
  economic_status,
  principal_value_mad,
  recovery_status,
  recovered_value_mad,
  recovered_economic_type,
  has_exploitable_evidence,
  display_tier_v2,
  decision_reasons_v2,
  false::boolean as publication_eligible,
  false::boolean as ranking_eligible,
  'odm_display_policy_v2'::text as display_policy_version
from explained;

create or replace function public.odm_display_policy_report_v2()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with v as (
  select * from public.odm_display_policy_shadow_v2
), distribution as (
  select coalesce(jsonb_object_agg(display_tier_v2, n), '{}'::jsonb) value
  from (select display_tier_v2, count(*)::bigint n from v group by display_tier_v2) x
), by_source as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.total desc, x.source_domain), '[]'::jsonb) value
  from (
    select source_domain,
      count(*)::bigint total,
      count(*) filter(where display_tier_v2='displayable_ranked')::bigint ranked,
      count(*) filter(where display_tier_v2='displayable_degraded')::bigint degraded,
      count(*) filter(where display_tier_v2='blocked')::bigint blocked
    from v group by source_domain
  ) x
), by_city as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.total desc, x.city), '[]'::jsonb) value
  from (
    select coalesce(normalized_city,'<missing>') city,
      count(*)::bigint total,
      count(*) filter(where display_tier_v2='displayable_ranked')::bigint ranked,
      count(*) filter(where display_tier_v2='displayable_degraded')::bigint degraded,
      count(*) filter(where display_tier_v2='blocked')::bigint blocked
    from v group by coalesce(normalized_city,'<missing>')
  ) x
), by_property_type as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.total desc, x.property_type), '[]'::jsonb) value
  from (
    select coalesce(normalized_property_type,'<missing>') property_type,
      count(*)::bigint total,
      count(*) filter(where display_tier_v2='displayable_ranked')::bigint ranked,
      count(*) filter(where display_tier_v2='displayable_degraded')::bigint degraded,
      count(*) filter(where display_tier_v2='blocked')::bigint blocked
    from v group by coalesce(normalized_property_type,'<missing>')
  ) x
), by_intent as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.total desc, x.intent), '[]'::jsonb) value
  from (
    select coalesce(normalized_intent,'<missing>') intent,
      count(*)::bigint total,
      count(*) filter(where display_tier_v2='displayable_ranked')::bigint ranked,
      count(*) filter(where display_tier_v2='displayable_degraded')::bigint degraded,
      count(*) filter(where display_tier_v2='blocked')::bigint blocked
    from v group by coalesce(normalized_intent,'<missing>')
  ) x
), reasons as (
  select coalesce(jsonb_object_agg(reason,n), '{}'::jsonb) value
  from (
    select reason,count(*)::bigint n
    from v cross join lateral unnest(decision_reasons_v2) reason
    group by reason
  ) x
), gates as (
  select jsonb_build_object(
    'no_forbidden_source_displayable', count(*) filter(where display_tier_v2<>'blocked' and resolved_display_policy in ('internal_signal_only','blocked'))=0,
    'no_non_real_estate_displayable', count(*) filter(where display_tier_v2<>'blocked' and vertical_classification<>'real_estate_likely')=0,
    'no_low_quality_blocked_only_for_score', count(*) filter(where display_tier_v2='blocked' and decision_reasons_v2 <@ array['low_or_unscored_quality']::text[])=0,
    'all_degraded_have_reason', count(*) filter(where display_tier_v2='displayable_degraded' and cardinality(decision_reasons_v2)=0)=0,
    'publication_remains_disabled', count(*) filter(where publication_eligible)=0,
    'ranking_remains_disabled', count(*) filter(where ranking_eligible)=0,
    'no_serp_or_thin_index_mutation', true
  ) value
  from v
)
select jsonb_build_object(
  'audit_version','odm_display_policy_v2',
  'generated_at',now(),
  'total_rows',(select count(*) from v),
  'distribution',(select value from distribution),
  'reason_counts',(select value from reasons),
  'by_source',(select value from by_source),
  'by_city',(select value from by_city),
  'by_property_type',(select value from by_property_type),
  'by_intent',(select value from by_intent),
  'gates',(select value from gates),
  'publication_activated',false,
  'ranking_activated',false,
  'serp_changed',false
);
$$;

revoke all on public.odm_display_policy_shadow_v2 from public, anon, authenticated;
revoke all on function public.odm_display_policy_report_v2() from public, anon, authenticated;
grant select on public.odm_display_policy_shadow_v2 to service_role;
grant execute on function public.odm_display_policy_report_v2() to service_role;

comment on view public.odm_display_policy_shadow_v2 is 'Shadow-only Display Policy V2. Low quality, incomplete, stale and uncertain rows degrade instead of being blocked when source policy and evidence permit display.';
comment on function public.odm_display_policy_report_v2() is 'Service-role-only distribution and gate report for Display Policy V2.';
