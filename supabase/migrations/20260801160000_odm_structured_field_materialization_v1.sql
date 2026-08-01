-- DATA V2 LOT 2 — ODM Structured Field Materialization V1
-- Materializes only unambiguous Shadow recovery candidates into missing normalized fields.
-- Existing normalized values are never overwritten. Public activation remains unchanged.

create table if not exists public.odm_structured_field_materialization_audit_v1 (
  batch_id uuid not null,
  seed_id uuid not null,
  previous_property_type text,
  previous_intent text,
  applied_property_type text,
  applied_intent text,
  recovery_version text not null,
  materialization_version text not null,
  materialized_at timestamptz not null default now(),
  publication_eligible boolean not null default false check (publication_eligible = false),
  ranking_activated boolean not null default false check (ranking_activated = false),
  primary key (batch_id, seed_id)
);

alter table public.odm_structured_field_materialization_audit_v1 enable row level security;
revoke all on public.odm_structured_field_materialization_audit_v1 from public, anon, authenticated;
grant select on public.odm_structured_field_materialization_audit_v1 to service_role;

create or replace function public.odm_materialize_structured_fields_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch_id uuid := gen_random_uuid();
  v_audit_rows integer := 0;
  v_updated_rows integer := 0;
  v_type_rows integer := 0;
  v_intent_rows integer := 0;
begin
  insert into public.odm_structured_field_materialization_audit_v1 (
    batch_id,
    seed_id,
    previous_property_type,
    previous_intent,
    applied_property_type,
    applied_intent,
    recovery_version,
    materialization_version
  )
  select
    v_batch_id,
    d.seed_id,
    d.normalized_property_type,
    d.normalized_intent,
    case
      when d.normalized_property_type is null
       and r.property_type_status = 'recovered'
      then r.recovered_property_type
      else null
    end,
    case
      when d.normalized_intent is null
       and r.intent_status = 'recovered'
      then r.recovered_intent
      else null
    end,
    r.recovery_version,
    'odm_structured_field_materialization_v1'
  from public.thin_index_search_documents d
  join public.odm_structured_field_recovery_shadow_v1 r using (seed_id)
  where (d.normalized_property_type is null and r.property_type_status = 'recovered')
     or (d.normalized_intent is null and r.intent_status = 'recovered');

  get diagnostics v_audit_rows = row_count;

  update public.thin_index_search_documents d
  set
    normalized_property_type = coalesce(d.normalized_property_type, a.applied_property_type),
    normalized_intent = coalesce(d.normalized_intent, a.applied_intent),
    normalization_status = case
      when coalesce(d.normalized_city, d.city, d.recovered_city) is not null
       and coalesce(d.normalized_property_type, a.applied_property_type) is not null
       and coalesce(d.normalized_intent, a.applied_intent) is not null
      then 'normalized'
      else coalesce(d.normalization_status, 'partial')
    end,
    normalization_version = 'odm_structured_field_materialization_v1',
    normalization_evidence = coalesce(d.normalization_evidence, '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
        'property_type_recovery', case when a.applied_property_type is not null then 'single_lexical_signal_v1' end,
        'intent_recovery', case when a.applied_intent is not null then 'single_lexical_signal_v1' end,
        'materialization_batch_id', a.batch_id::text
      ))
  from public.odm_structured_field_materialization_audit_v1 a
  where a.batch_id = v_batch_id
    and a.seed_id = d.seed_id
    and ((d.normalized_property_type is null and a.applied_property_type is not null)
      or (d.normalized_intent is null and a.applied_intent is not null));

  get diagnostics v_updated_rows = row_count;

  select
    count(*) filter (where applied_property_type is not null),
    count(*) filter (where applied_intent is not null)
  into v_type_rows, v_intent_rows
  from public.odm_structured_field_materialization_audit_v1
  where batch_id = v_batch_id;

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'audit_rows', v_audit_rows,
    'updated_rows', v_updated_rows,
    'property_type_materialized', v_type_rows,
    'intent_materialized', v_intent_rows,
    'materialization_version', 'odm_structured_field_materialization_v1',
    'publication_activated', false,
    'public_search_changed', false
  );
end;
$$;

create or replace function public.odm_structured_field_materialization_report_v1()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with latest_batch as (
    select batch_id
    from public.odm_structured_field_materialization_audit_v1
    order by materialized_at desc
    limit 1
  ), metrics as (
    select
      count(*)::integer as audit_rows,
      count(*) filter (where a.applied_property_type is not null)::integer as property_type_materialized,
      count(*) filter (where a.applied_intent is not null)::integer as intent_materialized,
      count(*) filter (
        where d.normalized_city is not null
          and d.normalized_property_type is not null
          and d.normalized_intent is not null
      )::integer as fully_structured_after,
      count(*) filter (
        where (a.previous_property_type is not null and d.normalized_property_type is distinct from a.previous_property_type)
           or (a.previous_intent is not null and d.normalized_intent is distinct from a.previous_intent)
      )::integer as overwritten_existing_values,
      count(*) filter (
        where (a.applied_property_type is not null and d.normalized_property_type is distinct from a.applied_property_type)
           or (a.applied_intent is not null and d.normalized_intent is distinct from a.applied_intent)
      )::integer as unapplied_audit_values
    from public.odm_structured_field_materialization_audit_v1 a
    join latest_batch b using (batch_id)
    join public.thin_index_search_documents d using (seed_id)
  )
  select jsonb_build_object(
    'audit_version', 'odm_structured_field_materialization_v1',
    'generated_at', now(),
    'metrics', to_jsonb(metrics),
    'gates', jsonb_build_object(
      'no_existing_value_overwritten', overwritten_existing_values = 0,
      'all_audited_values_applied', unapplied_audit_values = 0,
      'publication_remains_disabled', true,
      'public_search_unchanged', true,
      'materialization_is_audited', audit_rows > 0
    )
  )
  from metrics;
$$;

revoke all on function public.odm_materialize_structured_fields_v1() from public, anon, authenticated;
revoke all on function public.odm_structured_field_materialization_report_v1() from public, anon, authenticated;
grant execute on function public.odm_materialize_structured_fields_v1() to service_role;
grant execute on function public.odm_structured_field_materialization_report_v1() to service_role;

comment on table public.odm_structured_field_materialization_audit_v1 is
  'Reversible audit trail for deterministic property_type and intent materialization. Never public or ranking activation evidence.';
