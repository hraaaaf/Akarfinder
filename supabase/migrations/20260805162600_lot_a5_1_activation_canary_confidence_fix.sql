-- A5.1 correction: document_kind_confidence enum values are uppercase.
create or replace function public.odm_activate_a5_1_canary_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prepared integer;
  v_updated integer;
  v_public_before integer;
  v_public_after integer;
begin
  select count(*) into v_prepared
  from public.odm_a5_1_activation_canary_snapshot_v1
  where canary_state = 'prepared';

  if v_prepared <> 200 then
    raise exception 'A5.1 activation requires exactly 200 prepared rows; got %', v_prepared;
  end if;

  select count(*) into v_public_before
  from public.thin_index_search_documents
  where document_kind='LISTING'
    and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary');

  update public.thin_index_search_documents d
  set
    title = s.canary_title,
    snippet = null,
    city = d.normalized_city,
    property_type = d.normalized_property_type,
    intent = d.normalized_intent,
    document_kind = 'LISTING',
    document_kind_confidence = 'HIGH',
    document_kind_reason = 'A5.1 reversible canonical-link-only canary; no source content reused',
    document_kind_version = 'odm_a5_1_activation_canary_v1',
    updated_at = now()
  from public.odm_a5_1_activation_canary_snapshot_v1 s
  where d.seed_id = s.seed_id
    and s.canary_state = 'prepared'
    and d.document_kind = 'AMBIGUOUS';

  get diagnostics v_updated = row_count;
  if v_updated <> 200 then
    raise exception 'A5.1 activation updated % rows instead of 200', v_updated;
  end if;

  update public.odm_a5_1_activation_canary_snapshot_v1
  set canary_state='active', activated_at=now()
  where canary_state='prepared';

  select count(*) into v_public_after
  from public.thin_index_search_documents
  where document_kind='LISTING'
    and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary');

  if v_public_after - v_public_before <> 200 then
    raise exception 'A5.1 visible depth delta must be 200; before %, after %', v_public_before, v_public_after;
  end if;

  return jsonb_build_object(
    'audit_version','odm_a5_1_activation_canary_v1',
    'activated_rows',v_updated,
    'eligible_public_before',v_public_before,
    'eligible_public_after',v_public_after,
    'eligible_public_delta',v_public_after-v_public_before,
    'rollback_available',true
  );
end;
$$;

revoke all on function public.odm_activate_a5_1_canary_v1() from public, anon, authenticated;
grant execute on function public.odm_activate_a5_1_canary_v1() to service_role;
