-- PRICE-COVERAGE-RECOVERY-1 — shadow governance hardening
--
-- Contract:
-- 1. ODM V1 price recovery remains an audit-only signal.
-- 2. A shadow candidate must never be written into the public Search price field.
-- 3. Historical V1 leaks are removed only when V1 shadow evidence is the sole
--    provenance of the currently materialized price.
-- 4. Raw/trusted prices, ranking and acquisition policy are untouched.

-- Remove only historical values whose current public price is exactly an old
-- V1 shadow candidate, whose projection explicitly says it came from that V1,
-- and for which there is neither a raw price nor a trusted reconciliation.
with shadow_only_leaks as (
  select distinct d.seed_id
  from public.thin_index_search_documents d
  join public.odm_price_coverage_recovery_audit_v1 a
    on a.seed_id = d.seed_id
   and a.recovered_price_mad = d.normalized_price_mad
  where d.normalization_evidence ->> 'price_recovery' = 'odm_price_coverage_recovery_v1'
    and coalesce(d.price_mad, 0) <= 0
    and not exists (
      select 1
      from public.odm_trusted_price_reconciliation_audit_v1 t
      where t.seed_id = d.seed_id
        and t.economic_status = 'trusted'
        and t.action = 'activate_price'
        and t.reconciled_price_mad = d.normalized_price_mad
    )
)
update public.thin_index_search_documents d
set normalized_price_mad = null,
    price_per_m2_mad = null,
    normalized_price_m2 = null,
    normalization_evidence = coalesce(d.normalization_evidence, '{}'::jsonb) - 'price_recovery'
from shadow_only_leaks s
where d.seed_id = s.seed_id;

-- V1 remains useful for discovering a single explicit, intent-compatible
-- economic candidate, but it is now strictly audit-only. Publication requires
-- a separate trusted reconciliation / activation path.
create or replace function public.odm_materialize_price_coverage_recovery_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
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
        coalesce(nullif(d.title, ''), d.snippet),
        'thin_index',
        d.seed_id::text,
        d.updated_at,
        'thin_index.title_or_snippet'
      ) as candidates
    from public.thin_index_search_documents d
    where d.normalized_price_mad is null
      and d.normalized_intent in ('sale', 'rent')
      and d.freshness_status in ('seed_only', 'fresh_confirmed')
  ), expanded as (
    select p.seed_id, p.normalized_intent, e
    from parsed p
    cross join lateral jsonb_array_elements(p.candidates) e
    where e ->> 'rejection_reason' is null
      and e ->> 'economic_type' in (
        'sale_total', 'discounted_price',
        'rent_monthly', 'rent_daily', 'rent_weekly'
      )
  ), eligible as (
    select
      seed_id,
      normalized_intent,
      min((e ->> 'value_mad')::numeric) as recovered_price_mad,
      min(e ->> 'economic_type') as economic_type,
      (jsonb_agg(e) -> 0) as evidence
    from expanded
    group by seed_id, normalized_intent
    having count(*) = 1
      and bool_and(
        (normalized_intent = 'sale' and e ->> 'economic_type' in ('sale_total', 'discounted_price'))
        or
        (normalized_intent = 'rent' and e ->> 'economic_type' in ('rent_monthly', 'rent_daily', 'rent_weekly'))
      )
  )
  insert into public.odm_price_coverage_recovery_audit_v1 (
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
  join public.thin_index_search_documents d using (seed_id)
  where d.normalized_price_mad is null
    and not exists (
      select 1
      from public.odm_price_coverage_recovery_audit_v1 prior
      where prior.seed_id = e.seed_id
        and prior.recovered_price_mad = e.recovered_price_mad
        and prior.economic_type = e.economic_type
        and prior.normalized_intent = e.normalized_intent
    )
  on conflict do nothing;

  get diagnostics v_audit = row_count;

  return jsonb_build_object(
    'batch_id', v_batch,
    'audit_rows', v_audit,
    'updated_rows', 0,
    'publication_activated', false,
    'ranking_policy_changed', false,
    'recovery_version', 'odm_price_coverage_recovery_v1',
    'mode', 'audit_only'
  );
end;
$$;

-- Keep the report truthful after the governance change: audited candidates are
-- expected to remain unapplied unless a separate trusted reconciliation exists.
create or replace function public.odm_price_coverage_recovery_report_v1()
returns jsonb
language sql
stable
set search_path = ''
as $$
with metrics as (
  select
    count(*) as audit_rows,
    count(*) filter (where a.normalized_intent = 'sale') as sale_prices,
    count(*) filter (where a.normalized_intent = 'rent') as rent_prices,
    count(*) filter (
      where exists (
        select 1
        from public.thin_index_search_documents d
        where d.seed_id = a.seed_id
          and d.normalized_price_mad = a.recovered_price_mad
          and d.normalization_evidence ->> 'price_recovery' = 'odm_price_coverage_recovery_v1'
          and coalesce(d.price_mad, 0) <= 0
          and not exists (
            select 1
            from public.odm_trusted_price_reconciliation_audit_v1 t
            where t.seed_id = d.seed_id
              and t.economic_status = 'trusted'
              and t.action = 'activate_price'
              and t.reconciled_price_mad = d.normalized_price_mad
          )
      )
    ) as shadow_public_leaks,
    count(*) filter (where a.publication_eligible) as publication_flags,
    count(*) filter (where a.ranking_activated) as ranking_flags
  from public.odm_price_coverage_recovery_audit_v1 a
)
select jsonb_build_object(
  'audit_version', 'odm_price_coverage_recovery_v1',
  'mode', 'audit_only',
  'metrics', jsonb_build_object(
    'audit_rows', audit_rows,
    'sale_prices', sale_prices,
    'rent_prices', rent_prices,
    'shadow_public_leaks', shadow_public_leaks
  ),
  'gates', jsonb_build_object(
    'shadow_is_non_public', shadow_public_leaks = 0,
    'publication_remains_disabled', publication_flags = 0,
    'ranking_policy_unchanged', ranking_flags = 0
  )
)
from metrics;
$$;

revoke all on function public.odm_materialize_price_coverage_recovery_v1() from public, anon, authenticated;
revoke all on function public.odm_price_coverage_recovery_report_v1() from public, anon, authenticated;
grant execute on function public.odm_materialize_price_coverage_recovery_v1() to service_role;
grant execute on function public.odm_price_coverage_recovery_report_v1() to service_role;
