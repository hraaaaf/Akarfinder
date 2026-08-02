begin;

create table if not exists public.odm_trusted_price_reconciliation_audit_v1 (
  audit_id bigint generated always as identity primary key,
  batch_id uuid not null,
  seed_id uuid not null,
  economic_status text not null,
  principal_economic_type text,
  previous_price_mad numeric,
  reconciled_price_mad numeric,
  previous_price_per_m2_mad numeric,
  reconciled_price_per_m2_mad numeric,
  action text not null check (action in ('replace_with_trusted','suppress_untrusted')),
  evidence_observation_id text,
  reconciled_at timestamptz not null default now(),
  unique (batch_id, seed_id)
);

revoke all on public.odm_trusted_price_reconciliation_audit_v1 from anon, authenticated;

create or replace function public.odm_trusted_price_reconciliation_report_v1()
returns jsonb
language sql
stable
set search_path=''
as $function$
with authoritative as (
  select
    s.seed_id,
    max(s.principal_value_mad) as trusted_value_mad,
    max(s.principal_economic_type) as trusted_economic_type,
    count(*) as trusted_rows
  from public.odm_economic_observation_state_shadow_v1 s
  join public.thin_index_search_documents d on d.seed_id=s.seed_id
  where s.parser_version='odm_economic_parser_v2'
    and s.economic_status='trusted'
    and s.principal_value_mad is not null
    and (
      (d.normalized_intent='sale' and s.principal_economic_type in ('sale_total','discounted_price'))
      or
      (d.normalized_intent='rent' and s.principal_economic_type in ('rent_monthly','rent_daily','rent_weekly'))
    )
  group by s.seed_id
  having count(distinct s.principal_value_mad)=1
     and count(distinct s.principal_economic_type)=1
), state_rollup as (
  select
    s.seed_id,
    bool_or(s.economic_status='trusted') as has_trusted,
    bool_or(s.economic_status='ambiguous') as has_ambiguous,
    bool_or(s.economic_status not in ('trusted','ambiguous')) as has_other_untrusted
  from public.odm_economic_observation_state_shadow_v1 s
  where s.parser_version='odm_economic_parser_v2'
  group by s.seed_id
), metrics as (
  select
    count(*) filter (
      where a.seed_id is not null
        and d.normalized_price_mad is distinct from a.trusted_value_mad
    ) as trusted_mismatches,
    count(*) filter (
      where r.has_ambiguous
        and not r.has_trusted
        and d.normalized_price_mad is not null
    ) as ambiguous_with_price,
    count(*) filter (
      where r.has_other_untrusted
        and not r.has_trusted
        and d.normalized_price_mad is not null
    ) as untrusted_with_price,
    count(*) filter (
      where d.normalized_price_mad is not null
        and d.normalized_surface_m2 is not null
        and d.normalized_surface_m2 > 0
        and d.normalized_price_m2 is distinct from public.odm04_safe_price_per_m2(d.normalized_price_mad,d.normalized_surface_m2)
    ) as stale_price_per_m2,
    count(*) filter (
      where a.seed_id is not null
    ) as trusted_rows,
    count(*) filter (
      where r.seed_id is not null and not r.has_trusted
    ) as untrusted_rows
  from public.thin_index_search_documents d
  left join authoritative a on a.seed_id=d.seed_id
  left join state_rollup r on r.seed_id=d.seed_id
  where r.seed_id is not null
)
select jsonb_build_object(
  'audit_version','odm_trusted_economic_price_reconciliation_v1',
  'trusted_mismatches',trusted_mismatches,
  'ambiguous_with_price',ambiguous_with_price,
  'untrusted_with_price',untrusted_with_price,
  'stale_price_per_m2',stale_price_per_m2,
  'trusted_rows',trusted_rows,
  'untrusted_rows',untrusted_rows,
  'gates',jsonb_build_object(
    'trusted_mismatches_zero',trusted_mismatches=0,
    'ambiguous_with_price_zero',ambiguous_with_price=0,
    'untrusted_with_price_zero',untrusted_with_price=0,
    'price_per_m2_consistent',stale_price_per_m2=0
  )
)
from metrics;
$function$;

create or replace function public.odm_apply_trusted_price_reconciliation_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_batch uuid := gen_random_uuid();
  v_replaced integer := 0;
  v_suppressed integer := 0;
begin
  with authoritative as (
    select
      s.seed_id,
      max(s.principal_value_mad) as trusted_value_mad,
      max(s.principal_economic_type) as trusted_economic_type,
      min(s.observation_id) as evidence_observation_id
    from public.odm_economic_observation_state_shadow_v1 s
    join public.thin_index_search_documents d on d.seed_id=s.seed_id
    where s.parser_version='odm_economic_parser_v2'
      and s.economic_status='trusted'
      and s.principal_value_mad is not null
      and (
        (d.normalized_intent='sale' and s.principal_economic_type in ('sale_total','discounted_price'))
        or
        (d.normalized_intent='rent' and s.principal_economic_type in ('rent_monthly','rent_daily','rent_weekly'))
      )
    group by s.seed_id
    having count(distinct s.principal_value_mad)=1
       and count(distinct s.principal_economic_type)=1
  ), candidates as (
    select
      d.seed_id,
      d.normalized_price_mad as previous_price_mad,
      d.normalized_price_m2 as previous_price_per_m2_mad,
      d.normalized_surface_m2,
      a.trusted_value_mad,
      a.trusted_economic_type,
      a.evidence_observation_id
    from public.thin_index_search_documents d
    join authoritative a on a.seed_id=d.seed_id
    where d.normalized_price_mad is distinct from a.trusted_value_mad
  ), audited as (
    insert into public.odm_trusted_price_reconciliation_audit_v1 (
      batch_id,seed_id,economic_status,principal_economic_type,
      previous_price_mad,reconciled_price_mad,
      previous_price_per_m2_mad,reconciled_price_per_m2_mad,
      action,evidence_observation_id
    )
    select
      v_batch,c.seed_id,'trusted',c.trusted_economic_type,
      c.previous_price_mad,c.trusted_value_mad,
      c.previous_price_per_m2_mad,
      public.odm04_safe_price_per_m2(c.trusted_value_mad,c.normalized_surface_m2),
      'replace_with_trusted',c.evidence_observation_id
    from candidates c
    returning seed_id,reconciled_price_mad,reconciled_price_per_m2_mad,evidence_observation_id
  )
  update public.thin_index_search_documents d
  set
    price_mad=a.reconciled_price_mad,
    normalized_price_mad=a.reconciled_price_mad,
    price_per_m2_mad=a.reconciled_price_per_m2_mad,
    normalized_price_m2=a.reconciled_price_per_m2_mad,
    recovery_confidence='trusted_economic_v2',
    recovery_evidence=coalesce(d.recovery_evidence,'{}'::jsonb)||jsonb_build_object(
      'price','trusted_economic_v2',
      'observation_id',a.evidence_observation_id,
      'batch_id',v_batch
    ),
    normalization_evidence=coalesce(d.normalization_evidence,'{}'::jsonb)||jsonb_build_object(
      'price_reconciliation','odm_trusted_economic_price_reconciliation_v1',
      'batch_id',v_batch
    ),
    updated_at=now()
  from audited a
  where d.seed_id=a.seed_id;
  get diagnostics v_replaced=row_count;

  with state_rollup as (
    select
      s.seed_id,
      bool_or(s.economic_status='trusted') as has_trusted,
      bool_or(s.economic_status='ambiguous') as has_ambiguous,
      min(s.observation_id) as evidence_observation_id
    from public.odm_economic_observation_state_shadow_v1 s
    where s.parser_version='odm_economic_parser_v2'
    group by s.seed_id
  ), candidates as (
    select
      d.seed_id,d.normalized_price_mad,d.normalized_price_m2,
      case when r.has_ambiguous then 'ambiguous' else 'untrusted' end economic_status,
      r.evidence_observation_id
    from public.thin_index_search_documents d
    join state_rollup r on r.seed_id=d.seed_id
    where not r.has_trusted
      and d.normalized_price_mad is not null
  ), audited as (
    insert into public.odm_trusted_price_reconciliation_audit_v1 (
      batch_id,seed_id,economic_status,principal_economic_type,
      previous_price_mad,reconciled_price_mad,
      previous_price_per_m2_mad,reconciled_price_per_m2_mad,
      action,evidence_observation_id
    )
    select
      v_batch,c.seed_id,c.economic_status,null,
      c.normalized_price_mad,null,c.normalized_price_m2,null,
      'suppress_untrusted',c.evidence_observation_id
    from candidates c
    returning seed_id,evidence_observation_id
  )
  update public.thin_index_search_documents d
  set
    price_mad=null,
    normalized_price_mad=null,
    price_per_m2_mad=null,
    normalized_price_m2=null,
    recovery_confidence='economic_v2_untrusted',
    recovery_evidence=coalesce(d.recovery_evidence,'{}'::jsonb)||jsonb_build_object(
      'price','suppressed_untrusted_economic_v2',
      'observation_id',a.evidence_observation_id,
      'batch_id',v_batch
    ),
    normalization_evidence=coalesce(d.normalization_evidence,'{}'::jsonb)||jsonb_build_object(
      'price_reconciliation','odm_trusted_economic_price_reconciliation_v1',
      'price_suppressed',true,
      'batch_id',v_batch
    ),
    updated_at=now()
  from audited a
  where d.seed_id=a.seed_id;
  get diagnostics v_suppressed=row_count;

  return jsonb_build_object(
    'batch_id',v_batch,
    'replaced_with_trusted',v_replaced,
    'suppressed_untrusted',v_suppressed,
    'report',public.odm_trusted_price_reconciliation_report_v1()
  );
end;
$function$;

revoke all on function public.odm_apply_trusted_price_reconciliation_v1() from public, anon, authenticated;
revoke all on function public.odm_trusted_price_reconciliation_report_v1() from anon, authenticated;

do $$
declare v_result jsonb;
begin
  v_result := public.odm_apply_trusted_price_reconciliation_v1();
  if not coalesce((v_result#>>'{report,gates,trusted_mismatches_zero}')::boolean,false)
     or not coalesce((v_result#>>'{report,gates,ambiguous_with_price_zero}')::boolean,false)
     or not coalesce((v_result#>>'{report,gates,untrusted_with_price_zero}')::boolean,false)
     or not coalesce((v_result#>>'{report,gates,price_per_m2_consistent}')::boolean,false)
  then
    raise exception 'ODM trusted economic price reconciliation gates failed: %',v_result;
  end if;
end $$;

commit;
