create or replace function public.refresh_odm_mubawab_detail_geo_precision_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare quarantined_city_rows integer := 0; promoted_rows integer := 0;
begin
  update public.thin_index_search_documents d
  set normalized_city = null,
      normalization_version = 'odm_mubawab_detail_geo_precision_v1',
      normalization_evidence = coalesce(d.normalization_evidence,'{}'::jsonb) || jsonb_build_object('city_quarantined_reason','english_sale_token_false_city')
  where d.source_domain = 'mubawab.ma'
    and d.canonical_url ~ '^https://mubawab\.ma/en/a/[0-9]+/'
    and d.normalized_city = 'Salé'
    and d.normalization_evidence ->> 'method' = 'canonical_url_token_match'
    and d.canonical_url ~ '(^|[-/])sale($|[-/])';
  get diagnostics quarantined_city_rows = row_count;

  update public.thin_index_search_documents d
  set document_kind = 'LISTING',
      document_kind_confidence = 'HIGH',
      document_kind_reason = 'mubawab_explicit_listing_detail_url',
      document_kind_version = 'odm_mubawab_detail_geo_precision_v1',
      display_eligibility = case when d.display_eligibility = 'ineligible' then 'eligible_secondary' else d.display_eligibility end,
      display_eligibility_reason = case when d.display_eligibility = 'ineligible' then 'provider_detail_listing' else d.display_eligibility_reason end,
      ranking_policy_version = 'odm_mubawab_detail_geo_precision_v1'
  where d.source_domain = 'mubawab.ma'
    and d.vertical_classification = 'real_estate_likely'
    and d.document_kind = 'AMBIGUOUS'
    and d.normalized_city is not null
    and d.normalized_property_type is not null
    and d.normalized_intent is not null
    and d.canonical_url ~ '^https://mubawab\.ma/(fr|en)/a/[0-9]+/';
  get diagnostics promoted_rows = row_count;

  return jsonb_build_object('version','odm_mubawab_detail_geo_precision_v1','quarantined_city_rows',quarantined_city_rows,'promoted_rows',promoted_rows,'deleted_rows',0,'network_access',false);
end;
$$;
revoke all on function public.refresh_odm_mubawab_detail_geo_precision_v1() from public, anon, authenticated;
grant execute on function public.refresh_odm_mubawab_detail_geo_precision_v1() to service_role;
