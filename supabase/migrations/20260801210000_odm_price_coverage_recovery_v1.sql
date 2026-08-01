-- DATA V2 LOT 3 — ODM PRICE COVERAGE RECOVERY V1
-- Recover only one explicit, intent-consistent total/rent price from current evidence.
-- Ambiguous, rejected, stale-only and intent-conflicting candidates remain untouched.

create table if not exists public.odm_price_coverage_recovery_audit_v1 (
  id bigint generated always as identity primary key,
  batch_id uuid not null,
  seed_id uuid not null references public.thin_index_search_documents(seed_id),
  previous_price_mad numeric,
  recovered_price_mad numeric not null,
  economic_type text not null,
  normalized_intent text not null,
  evidence jsonb not null,
  recovery_version text not null default 'odm_price_coverage_recovery_v1',
  publication_eligible boolean not null default false check (publication_eligible = false),
  ranking_activated boolean not null default false check (ranking_activated = false),
  recovered_at timestamptz not null default now(),
  unique (batch_id, seed_id)
);

alter table public.odm_price_coverage_recovery_audit_v1 enable row level security;
revoke all on public.odm_price_coverage_recovery_audit_v1 from public, anon, authenticated;
grant select on public.odm_price_coverage_recovery_audit_v1 to service_role;

create or replace function public.odm_materialize_price_coverage_recovery_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch uuid := gen_random_uuid();
  v_audit integer := 0;
  v_updated integer := 0;
begin
  with parsed as (
    select d.seed_id, d.normalized_intent,
      public.odm_audit_economic_candidates_v2(
        coalesce(nullif(d.title,''),d.snippet),
        'thin_index', d.seed_id::text, d.updated_at, 'thin_index.title_or_snippet'
      ) as candidates
    from public.thin_index_search_documents d
    where d.normalized_price_mad is null
      and d.normalized_intent in ('sale','rent')
      and d.freshness_status in ('seed_only','fresh_confirmed')
  ), expanded as (
    select p.seed_id,p.normalized_intent,e
    from parsed p cross join lateral jsonb_array_elements(p.candidates) e
    where e->>'rejection_reason' is null
      and e->>'economic_type' in ('sale_total','discounted_price','rent_monthly','rent_daily','rent_weekly')
  ), eligible as (
    select seed_id, normalized_intent,
      min((e->>'value_mad')::numeric) as recovered_price_mad,
      min(e->>'economic_type') as economic_type,
      min(e) as evidence
    from expanded
    group by seed_id, normalized_intent
    having count(*) = 1
      and bool_and(
        (normalized_intent='sale' and e->>'economic_type' in ('sale_total','discounted_price'))
        or (normalized_intent='rent' and e->>'economic_type' in ('rent_monthly','rent_daily','rent_weekly'))
      )
  ), audited as (
    insert into public.odm_price_coverage_recovery_audit_v1(
      batch_id,seed_id,previous_price_mad,recovered_price_mad,economic_type,normalized_intent,evidence
    )
    select v_batch,d.seed_id,d.normalized_price_mad,e.recovered_price_mad,e.economic_type,e.normalized_intent,e.evidence
    from eligible e join public.thin_index_search_documents d using(seed_id)
    where d.normalized_price_mad is null
    on conflict do nothing
    returning seed_id,recovered_price_mad
  )
  update public.thin_index_search_documents d
  set normalized_price_mad=a.recovered_price_mad,
      normalization_evidence=coalesce(d.normalization_evidence,'{}'::jsonb)||jsonb_build_object('price_recovery','odm_price_coverage_recovery_v1')
  from audited a where d.seed_id=a.seed_id and d.normalized_price_mad is null;
  get diagnostics v_updated = row_count;
  select count(*) into v_audit from public.odm_price_coverage_recovery_audit_v1 where batch_id=v_batch;
  return jsonb_build_object('batch_id',v_batch,'audit_rows',v_audit,'updated_rows',v_updated,
    'publication_activated',false,'ranking_policy_changed',false,'recovery_version','odm_price_coverage_recovery_v1');
end;
$$;

create or replace function public.odm_price_coverage_recovery_report_v1()
returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object(
  'audit_version','odm_price_coverage_recovery_v1',
  'metrics',jsonb_build_object(
    'audit_rows',count(*),
    'sale_prices',count(*) filter(where normalized_intent='sale'),
    'rent_prices',count(*) filter(where normalized_intent='rent'),
    'unapplied_values',count(*) filter(where not exists(select 1 from public.thin_index_search_documents d where d.seed_id=a.seed_id and d.normalized_price_mad=a.recovered_price_mad))
  ),
  'gates',jsonb_build_object(
    'all_values_audited',count(*)>0,
    'all_audited_values_applied',count(*) filter(where not exists(select 1 from public.thin_index_search_documents d where d.seed_id=a.seed_id and d.normalized_price_mad=a.recovered_price_mad))=0,
    'no_ambiguous_candidates',count(*) filter(where evidence->>'rejection_reason' is not null)=0,
    'publication_remains_disabled',count(*) filter(where publication_eligible)=0,
    'ranking_policy_unchanged',count(*) filter(where ranking_activated)=0
  )
) from public.odm_price_coverage_recovery_audit_v1 a;
$$;

revoke all on function public.odm_materialize_price_coverage_recovery_v1() from public,anon,authenticated;
revoke all on function public.odm_price_coverage_recovery_report_v1() from public,anon,authenticated;
grant execute on function public.odm_materialize_price_coverage_recovery_v1() to service_role;
grant execute on function public.odm_price_coverage_recovery_report_v1() to service_role;
