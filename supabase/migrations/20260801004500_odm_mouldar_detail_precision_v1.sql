-- ODM MOULDAR DETAIL PRECISION V1
-- Promote only explicit Mouldar detail URLs ending in an 8-char hexadecimal source id.

create or replace function public.refresh_odm_mouldar_detail_precision_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  promoted_rows integer := 0;
begin
  update public.thin_index_search_documents d
  set
    document_kind = 'LISTING',
    document_kind_confidence = 'HIGH',
    document_kind_reason = 'mouldar_explicit_listing_detail_url',
    document_kind_version = 'odm_mouldar_detail_precision_v1',
    display_eligibility = case
      when d.display_eligibility = 'ineligible' then 'eligible_secondary'
      else d.display_eligibility
    end,
    display_eligibility_reason = case
      when d.display_eligibility = 'ineligible' then 'provider_detail_listing'
      else d.display_eligibility_reason
    end,
    ranking_policy_version = 'odm_mouldar_detail_precision_v1'
  where d.source_domain = 'mouldar.com'
    and d.vertical_classification = 'real_estate_likely'
    and d.document_kind = 'AMBIGUOUS'
    and d.normalized_city is not null
    and d.normalized_property_type is not null
    and d.normalized_intent is not null
    and d.canonical_url ~ '^https://mouldar\.com/(fr|en)/.+/[0-9a-f]{8}/?$';

  get diagnostics promoted_rows = row_count;

  return jsonb_build_object(
    'version', 'odm_mouldar_detail_precision_v1',
    'promoted_rows', promoted_rows,
    'deleted_rows', 0,
    'network_access', false
  );
end;
$$;

revoke all on function public.refresh_odm_mouldar_detail_precision_v1() from public, anon, authenticated;
grant execute on function public.refresh_odm_mouldar_detail_precision_v1() to service_role;

create or replace view public.odm_mouldar_detail_precision_report_v1
with (security_invoker = true)
as
select
  count(*) filter (where document_kind = 'LISTING')::bigint as listing_rows,
  count(*) filter (where document_kind = 'AMBIGUOUS')::bigint as ambiguous_rows,
  count(*) filter (where document_kind = 'CATEGORY')::bigint as category_rows,
  count(*) filter (where display_eligibility = 'eligible_primary')::bigint as primary_rows,
  count(*) filter (where display_eligibility = 'eligible_secondary')::bigint as secondary_rows,
  count(*) filter (where display_eligibility = 'ineligible')::bigint as ineligible_rows
from public.thin_index_search_documents
where source_domain = 'mouldar.com'
  and vertical_classification = 'real_estate_likely';

revoke all on public.odm_mouldar_detail_precision_report_v1 from public, anon, authenticated;
grant select on public.odm_mouldar_detail_precision_report_v1 to service_role;
