-- Align materialization with the certified Shadow recovery status vocabulary.

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
    batch_id, seed_id, previous_property_type, previous_intent,
    applied_property_type, applied_intent, recovery_version, materialization_version
  )
  select
    v_batch_id,
    d.seed_id,
    d.normalized_property_type,
    d.normalized_intent,
    case when d.normalized_property_type is null and r.property_type_status = 'recovered_single'
      then r.recovered_property_type else null end,
    case when d.normalized_intent is null and r.intent_status = 'recovered_single'
      then r.recovered_intent else null end,
    r.recovery_version,
    'odm_structured_field_materialization_v1'
  from public.thin_index_search_documents d
  join public.odm_structured_field_recovery_shadow_v1 r using (seed_id)
  where (d.normalized_property_type is null and r.property_type_status = 'recovered_single')
     or (d.normalized_intent is null and r.intent_status = 'recovered_single');

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

  select count(*) filter (where applied_property_type is not null),
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
