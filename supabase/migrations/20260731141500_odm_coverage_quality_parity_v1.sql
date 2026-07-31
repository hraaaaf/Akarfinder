-- ODM COVERAGE QUALITY PARITY V1
-- Strictly classifies already-bridged, structured real-estate evidence and recomputes quality.
-- No threshold relaxation, no public activation and no network access.

create or replace function public.refresh_odm_coverage_quality_parity_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  classified_rows integer := 0;
  quality_result jsonb;
begin
  update public.thin_index_search_documents d
  set
    vertical_classification = 'real_estate_likely',
    vertical_classification_reason = 'persisted_property_listing_with_structured_real_estate_dimensions',
    vertical_classification_version = 'odm_coverage_quality_parity_v1'
  from public.source_offer_seeds s
  where s.id = d.seed_id
    and s.metadata #>> '{coverage_bridge,version}' = 'odm_coverage_parity_v1'
    and s.source_domain in ('mubawab.ma','mouldar.com','marrakechrealty.com')
    and d.normalized_city is not null
    and d.normalized_property_type is not null
    and d.normalized_intent is not null
    and coalesce(d.vertical_classification, '') <> 'non_real_estate';

  get diagnostics classified_rows = row_count;

  select public.odm_10d_recompute_quality('odm_coverage_quality_parity_v1')
  into quality_result;

  return jsonb_build_object(
    'version', 'odm_coverage_quality_parity_v1',
    'classified_rows', classified_rows,
    'quality_result', quality_result,
    'thresholds_unchanged', true,
    'shadow_only', true,
    'public_activation', false
  );
end;
$$;

revoke all on function public.refresh_odm_coverage_quality_parity_v1() from public, anon, authenticated;
grant execute on function public.refresh_odm_coverage_quality_parity_v1() to service_role;

create or replace view public.odm_coverage_quality_parity_report_v1
with (security_invoker = true)
as
select
  s.source_domain,
  count(*)::bigint as bridged_rows,
  count(*) filter (where d.vertical_classification = 'real_estate_likely')::bigint as real_estate_rows,
  count(*) filter (where d.quality_tier in ('A','B','C','D','E'))::bigint as scored_rows,
  count(*) filter (where d.quality_tier = 'UNSCORED')::bigint as unscored_rows,
  count(*) filter (where d.display_eligibility in ('eligible_primary','eligible_secondary'))::bigint as searchable_rows,
  count(*) filter (where d.display_eligibility = 'ineligible')::bigint as ineligible_rows,
  count(*) filter (where d.vertical_classification = 'non_real_estate')::bigint as non_real_estate_rows
from public.source_offer_seeds s
join public.thin_index_search_documents d on d.seed_id = s.id
where s.metadata #>> '{coverage_bridge,version}' = 'odm_coverage_parity_v1'
group by s.source_domain;

revoke all on public.odm_coverage_quality_parity_report_v1 from public, anon, authenticated;
grant select on public.odm_coverage_quality_parity_report_v1 to service_role;

comment on function public.refresh_odm_coverage_quality_parity_v1() is
  'Strict service-role-only classification and quality recomputation for structured persisted coverage bridge rows; thresholds and public activation remain unchanged.';