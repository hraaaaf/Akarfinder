-- PRICE-COVERAGE-RECOVERY-1 — shadow price recovery governance V1
--
-- Contract:
--   * ODM price recovery V1 remains audit/shadow evidence only.
--   * A shadow candidate must never populate the public normalized_price_mad field.
--   * Existing V1 values are preserved only when independent Economic V2 evidence is
--     unique, exact, and intent-compatible; otherwise they fail closed to NULL.
--   * Ranking policy, source acquisition, and public eligibility are unchanged.

create or replace function public.odm_materialize_price_coverage_recovery_v1()
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_batch uuid := gen_random_uuid();
  v_audit integer := 0;
begin
  with parsed as (
    select
      d.seed_id,
      d.normalized_intent,
      public.odm_audit_economic_candidates_v2(
        coalesce(nullif(d.title,''),d.snippet),
        'thin_index',
        d.seed_id::text,
        d.updated_at,
        'thin_index.title_or_snippet'
      ) as candidates
    from public.thin_index_search_documents d
    where d.normalized_price_mad is null
      and d.normalized_intent in ('sale','rent')
      and d.freshness_status in ('seed_only','fresh_confirmed')
  ), expanded as (
    select p.seed_id,p.normalized_intent,e
    from parsed p
    cross join lateral jsonb_array_elements(p.candidates) e
    where e->>'rejection_reason' is null
      and e->>'economic_type' in (
        'sale_total','discounted_price','rent_monthly','rent_daily','rent_weekly'
      )
  ), eligible as (
    select
      seed_id,
      normalized_intent,
      min((e->>'value_mad')::numeric) as recovered_price_mad,
      min(e->>'economic_type') as economic_type,
      (jsonb_agg(e order by e->>'candidate_id')->0) as evidence
    from expanded
    group by seed_id,normalized_intent
    having count(*)=1
      and bool_and(
        (normalized_intent='sale' and e->>'economic_type' in ('sale_total','discounted_price'))
        or
        (normalized_intent='rent' and e->>'economic_type' in ('rent_monthly','rent_daily','rent_weekly'))
      )
  )
  insert into public.odm_price_coverage_recovery_audit_v1(
    batch_id,
    seed_id,
    previous_price_mad,
    recovered_price_mad,
    economic_type,
    normalized_intent,
    evidence
  )
  select
    v_batch,
    d.seed_id,
    d.normalized_price_mad,
    e.recovered_price_mad,
    e.economic_type,
    e.normalized_intent,
    e.evidence
  from eligible e
  join public.thin_index_search_documents d using(seed_id)
  where d.normalized_price_mad is null
    and not exists (
      select 1
      from public.odm_price_coverage_recovery_audit_v1 a
      where a.seed_id=e.seed_id
        and a.recovery_version='odm_price_coverage_recovery_v1'
        and a.recovered_price_mad=e.recovered_price_mad
        and a.economic_type=e.economic_type
        and a.normalized_intent=e.normalized_intent
        and a.evidence=e.evidence
    )
  on conflict do nothing;

  get diagnostics v_audit = row_count;

  return jsonb_build_object(
    'batch_id',v_batch,
    'audit_rows',v_audit,
    'updated_rows',0,
    'shadow_only',true,
    'publication_activated',false,
    'ranking_policy_changed',false,
    'recovery_version','odm_price_coverage_recovery_v1'
  );
end;
$$;

-- Reclassify an already-materialized V1 value only when independent Economic V2
-- state proves one exact, intent-compatible trusted value. This does not derive a
-- new price; it removes the stale shadow provenance from a value already backed by
-- trusted evidence.
with v1_materialized as (
  select distinct on (d.seed_id)
    d.seed_id,
    d.normalized_price_mad,
    d.normalized_intent
  from public.thin_index_search_documents d
  join public.odm_price_coverage_recovery_audit_v1 a
    on a.seed_id=d.seed_id
   and a.recovery_version='odm_price_coverage_recovery_v1'
   and a.recovered_price_mad=d.normalized_price_mad
  where d.normalization_evidence->>'price_recovery'='odm_price_coverage_recovery_v1'
  order by d.seed_id,a.recovered_at desc,a.id desc
), trusted_rollup as (
  select
    s.seed_id,
    count(distinct s.principal_value_mad) filter(
      where s.economic_status='trusted' and s.principal_value_mad is not null
    ) as trusted_value_count,
    min(s.principal_value_mad) filter(
      where s.economic_status='trusted' and s.principal_value_mad is not null
    ) as trusted_value_mad,
    count(distinct s.principal_economic_type) filter(
      where s.economic_status='trusted' and s.principal_value_mad is not null
    ) as trusted_type_count,
    min(s.principal_economic_type) filter(
      where s.economic_status='trusted' and s.principal_value_mad is not null
    ) as trusted_economic_type
  from public.odm_economic_observation_state_shadow_v1 s
  where s.parser_version='odm_economic_parser_v2'
  group by s.seed_id
), exact_trusted as (
  select v.seed_id
  from v1_materialized v
  join trusted_rollup t using(seed_id)
  where t.trusted_value_count=1
    and t.trusted_type_count=1
    and t.trusted_value_mad=v.normalized_price_mad
    and (
      (v.normalized_intent='sale' and t.trusted_economic_type in ('sale_total','discounted_price'))
      or
      (v.normalized_intent='rent' and t.trusted_economic_type in ('rent_monthly','rent_daily','rent_weekly'))
    )
)
update public.thin_index_search_documents d
set normalization_evidence=(coalesce(d.normalization_evidence,'{}'::jsonb)-'price_recovery')
      || jsonb_build_object(
        'price_governance','trusted_economic_v2_exact_match',
        'price_governance_version','price_coverage_recovery_governance_v1'
      ),
    recovery_confidence=case
      when d.recovery_confidence is null then 'trusted_economic_v2'
      else d.recovery_confidence
    end
from exact_trusted t
where d.seed_id=t.seed_id;

-- Any remaining V1 materialization has no independent exact trusted proof.
-- Remove the public value and any derived price/m2 value, while retaining the
-- original candidate forever in odm_price_coverage_recovery_audit_v1.
with v1_untrusted as (
  select distinct d.seed_id
  from public.thin_index_search_documents d
  join public.odm_price_coverage_recovery_audit_v1 a
    on a.seed_id=d.seed_id
   and a.recovery_version='odm_price_coverage_recovery_v1'
   and a.recovered_price_mad=d.normalized_price_mad
  where d.normalization_evidence->>'price_recovery'='odm_price_coverage_recovery_v1'
    and d.price_mad is null
    and coalesce(d.recovery_confidence,'')<>'trusted_economic_v2'
)
update public.thin_index_search_documents d
set normalized_price_mad=null,
    price_per_m2_mad=null,
    normalized_price_m2=null,
    normalization_evidence=((coalesce(d.normalization_evidence,'{}'::jsonb)
      -'price_recovery')-'price')-'price_per_m2'
      || jsonb_build_object(
        'price_governance','shadow_v1_fail_closed',
        'price_governance_version','price_coverage_recovery_governance_v1'
      )
from v1_untrusted u
where d.seed_id=u.seed_id;

create or replace function public.price_coverage_recovery_governance_report_v1()
returns jsonb
language sql
stable
set search_path=''
as $$
with metrics as (
  select
    (select count(*) from public.odm_price_coverage_recovery_audit_v1
      where recovery_version='odm_price_coverage_recovery_v1') as v1_audit_rows,
    (select count(*) from public.odm_price_coverage_recovery_audit_v1
      where recovery_version='odm_price_coverage_recovery_v1' and publication_eligible) as publication_enabled_rows,
    (select count(*) from public.odm_price_coverage_recovery_audit_v1
      where recovery_version='odm_price_coverage_recovery_v1' and ranking_activated) as ranking_enabled_rows,
    (select count(*) from public.thin_index_search_documents
      where normalization_evidence->>'price_recovery'='odm_price_coverage_recovery_v1') as v1_materialized_rows,
    (select count(*) from public.thin_index_search_documents
      where normalization_evidence->>'price_governance'='trusted_economic_v2_exact_match') as trusted_exact_preserved_rows,
    (select count(*) from public.thin_index_search_documents
      where normalization_evidence->>'price_governance'='shadow_v1_fail_closed'
        and normalized_price_mad is not null) as fail_closed_price_leaks
)
select jsonb_build_object(
  'governance_version','price_coverage_recovery_governance_v1',
  'metrics',jsonb_build_object(
    'v1_audit_rows',v1_audit_rows,
    'v1_materialized_rows',v1_materialized_rows,
    'trusted_exact_preserved_rows',trusted_exact_preserved_rows,
    'publication_enabled_rows',publication_enabled_rows,
    'ranking_enabled_rows',ranking_enabled_rows,
    'fail_closed_price_leaks',fail_closed_price_leaks
  ),
  'gates',jsonb_build_object(
    'shadow_recovery_audit_only',v1_materialized_rows=0,
    'publication_remains_disabled',publication_enabled_rows=0,
    'ranking_policy_unchanged',ranking_enabled_rows=0,
    'fail_closed_rows_have_no_public_price',fail_closed_price_leaks=0
  ),
  'release_ready',(
    v1_materialized_rows=0
    and publication_enabled_rows=0
    and ranking_enabled_rows=0
    and fail_closed_price_leaks=0
  )
) from metrics;
$$;

revoke all on function public.odm_materialize_price_coverage_recovery_v1() from public,anon,authenticated;
revoke all on function public.price_coverage_recovery_governance_report_v1() from public,anon,authenticated;
grant execute on function public.odm_materialize_price_coverage_recovery_v1() to service_role;
grant execute on function public.price_coverage_recovery_governance_report_v1() to service_role;
