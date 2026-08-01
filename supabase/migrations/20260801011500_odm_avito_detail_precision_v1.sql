create or replace function public.refresh_odm_avito_detail_precision_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare promoted_rows integer := 0;
begin
  update public.thin_index_search_documents d
  set document_kind = 'LISTING',
      document_kind_confidence = 'HIGH',
      document_kind_reason = 'avito_whitelisted_real_estate_detail_url',
      document_kind_version = 'odm_avito_detail_precision_v1',
      display_eligibility = case when d.display_eligibility = 'ineligible' then 'eligible_secondary' else d.display_eligibility end,
      display_eligibility_reason = case when d.display_eligibility = 'ineligible' then 'provider_detail_listing' else d.display_eligibility_reason end,
      ranking_policy_version = 'odm_avito_detail_precision_v1'
  where d.source_domain = 'avito.ma'
    and d.vertical_classification = 'real_estate_likely'
    and d.document_kind = 'AMBIGUOUS'
    and d.normalized_city is not null
    and d.normalized_property_type is not null
    and d.normalized_intent is not null
    and d.canonical_url ~ '^https://avito\.ma/fr/[^/]+/(appartements|terrains_et_fermes|villas_et_riads|local|bureaux|maisons|maisons_et_villas|locations_de_vacances|autre_immobilier)/.+_[0-9]{7,10}\.htm/?$';
  get diagnostics promoted_rows = row_count;
  return jsonb_build_object('version','odm_avito_detail_precision_v1','promoted_rows',promoted_rows,'deleted_rows',0,'network_access',false);
end;
$$;
revoke all on function public.refresh_odm_avito_detail_precision_v1() from public, anon, authenticated;
grant execute on function public.refresh_odm_avito_detail_precision_v1() to service_role;
