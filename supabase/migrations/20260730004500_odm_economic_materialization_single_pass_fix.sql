-- ODM-ECONOMIC-MATERIALIZATION-SINGLE-PASS-FIX
-- Avoids recomputing Typed Economic Candidates V2 twice over the full Shadow corpus.

create or replace function public.refresh_odm_economic_evidence_materialization_v1()
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_candidate_rows bigint;
  v_state_rows bigint;
begin
  delete from public.odm_economic_candidate_evidence_shadow_v1
  where parser_version='odm_economic_parser_v2';

  delete from public.odm_economic_observation_state_shadow_v1
  where parser_version='odm_economic_parser_v2';

  insert into public.odm_economic_candidate_evidence_shadow_v1 (
    candidate_id,parser_version,observation_id,seed_id,source_domain,seed_provider,
    evidence_source,field_path,observed_at,economic_type,value_mad,currency,
    raw_fragment,normalized_fragment,confidence,rejection_reason,range_context,
    publication_eligible,ranking_eligible,materialized_at
  )
  select
    e->>'candidate_id',e->>'parser_version',v.observation_id,v.seed_id,v.source_domain,v.seed_provider,
    e->>'evidence_source',e->>'field_path',nullif(e->>'observed_at','')::timestamptz,
    e->>'economic_type',(e->>'value_mad')::numeric,e->>'currency',e->>'raw_fragment',
    e->>'normalized_fragment',(e->>'confidence')::numeric,nullif(e->>'rejection_reason',''),
    coalesce((e->>'range_context')::boolean,false),false,false,now()
  from public.odm_audit_economic_validation_v2 v
  cross join lateral jsonb_array_elements(v.selected_economic_candidates_v2) e;

  get diagnostics v_candidate_rows = row_count;

  with candidate_rollup as (
    select
      observation_id,
      count(*)::integer as candidate_count,
      count(*) filter(where rejection_reason is null)::integer as publicable_candidate_count,
      count(*) filter(where rejection_reason is null and economic_type in ('sale_total','rent_monthly','rent_daily','rent_weekly','discounted_price'))::integer as principal_candidate_count,
      (array_agg(candidate_id order by candidate_id) filter(where rejection_reason is null and economic_type in ('sale_total','rent_monthly','rent_daily','rent_weekly','discounted_price')))[1] as principal_candidate_id,
      (array_agg(economic_type order by candidate_id) filter(where rejection_reason is null and economic_type in ('sale_total','rent_monthly','rent_daily','rent_weekly','discounted_price')))[1] as principal_economic_type,
      (array_agg(value_mad order by candidate_id) filter(where rejection_reason is null and economic_type in ('sale_total','rent_monthly','rent_daily','rent_weekly','discounted_price')))[1] as principal_value_mad
    from public.odm_economic_candidate_evidence_shadow_v1
    where parser_version='odm_economic_parser_v2'
    group by observation_id
  )
  insert into public.odm_economic_observation_state_shadow_v1 (
    observation_id,parser_version,seed_id,source_domain,seed_provider,
    normalized_city,normalized_property_type,normalized_intent,
    observation_source,observed_at,economic_status,candidate_count,
    principal_candidate_count,principal_candidate_id,principal_economic_type,
    principal_value_mad,publication_eligible,ranking_eligible,materialized_at
  )
  select
    a.observation_id,'odm_economic_parser_v2',a.seed_id,a.source_domain,a.seed_provider,
    d.normalized_city,d.normalized_property_type,d.normalized_intent,
    a.observation_source,a.observation_observed_at,
    case
      when a.no_bypass_required is not true or a.display_policy is null then 'policy_blocked'
      when a.observation_observed_at is null then 'stale'
      when a.seed_provider='commoncrawl_cdx' and a.freshness_status<>'fresh_confirmed' then 'stale'
      when coalesce(c.candidate_count,0)=0 then 'missing'
      when coalesce(c.publicable_candidate_count,0)=0 then 'rejected'
      when coalesce(c.principal_candidate_count,0)<>1 then 'ambiguous'
      else 'trusted'
    end,
    coalesce(c.candidate_count,0),coalesce(c.principal_candidate_count,0),
    case when coalesce(c.principal_candidate_count,0)=1 then c.principal_candidate_id end,
    case when coalesce(c.principal_candidate_count,0)=1 then c.principal_economic_type end,
    case when coalesce(c.principal_candidate_count,0)=1 then c.principal_value_mad end,
    false,false,now()
  from public.odm_audit_atomic_observation_v1 a
  join public.thin_index_search_documents d on d.seed_id=a.seed_id
  left join candidate_rollup c on c.observation_id=a.observation_id;

  get diagnostics v_state_rows = row_count;

  return jsonb_build_object(
    'materialization_version','odm_economic_evidence_materialization_v1_1_single_pass',
    'parser_version','odm_economic_parser_v2',
    'candidate_rows',v_candidate_rows,
    'observation_state_rows',v_state_rows,
    'publication_activated',false,
    'ranking_activated',false
  );
end;
$$;

comment on function public.refresh_odm_economic_evidence_materialization_v1() is 'Single-pass Shadow materialization: parse candidates once, then derive observation states from persisted evidence.';
