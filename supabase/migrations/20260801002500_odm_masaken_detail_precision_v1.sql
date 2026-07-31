-- ODM MASAKEN DETAIL PRECISION V1
-- Recover normalized intent/property type from explicit Masaken detail URLs,
-- then promote only fully structured detail rows from AMBIGUOUS to LISTING.

create or replace function public.refresh_odm_masaken_detail_precision_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_rows integer := 0;
  promoted_rows integer := 0;
begin
  update public.thin_index_search_documents d
  set
    normalized_intent = coalesce(
      d.normalized_intent,
      case
        when d.canonical_url ~ '^https://masaken\.ma/fr/immobilier-maroc/vente-' then 'sale'
        when d.canonical_url ~ '^https://masaken\.ma/fr/immobilier-maroc/location-' then 'rent'
        else null
      end
    ),
    normalized_property_type = coalesce(
      d.normalized_property_type,
      case
        when d.canonical_url ~ '^https://masaken\.ma/fr/immobilier-maroc/(vente|location)-appartement-' then 'apartment'
        when d.canonical_url ~ '^https://masaken\.ma/fr/immobilier-maroc/(vente|location)-terrain-' then 'land'
        when d.canonical_url ~ '^https://masaken\.ma/fr/immobilier-maroc/(vente|location)-maison-' then 'house'
        when d.canonical_url ~ '^https://masaken\.ma/fr/immobilier-maroc/(vente|location)-villa-' then 'villa'
        when d.canonical_url ~ '^https://masaken\.ma/fr/immobilier-maroc/(vente|location)-bureau-' then 'office'
        when d.canonical_url ~ '^https://masaken\.ma/fr/immobilier-maroc/(vente|location)-(local|magasin|commerce|local-commercial)-' then 'commercial'
        else null
      end
    ),
    normalization_version = 'odm_masaken_detail_precision_v1',
    normalization_evidence = coalesce(d.normalization_evidence, '{}'::jsonb)
      || jsonb_build_object('masaken_url_dimensions_recovered', true)
  where d.source_domain = 'masaken.ma'
    and d.vertical_classification = 'real_estate_likely'
    and d.document_kind = 'AMBIGUOUS'
    and d.canonical_url ~ '^https://masaken\.ma/fr/immobilier-maroc/(vente|location)-[a-z0-9-]+/[0-9]+/?$'
    and (d.normalized_intent is null or d.normalized_property_type is null);

  get diagnostics normalized_rows = row_count;

  update public.thin_index_search_documents d
  set
    document_kind = 'LISTING',
    document_kind_confidence = 'HIGH',
    document_kind_reason = 'masaken_explicit_listing_detail_url',
    document_kind_version = 'odm_masaken_detail_precision_v1',
    display_eligibility = case
      when d.display_eligibility = 'ineligible' then 'eligible_secondary'
      else d.display_eligibility
    end,
    display_eligibility_reason = case
      when d.display_eligibility = 'ineligible' then 'provider_detail_listing'
      else d.display_eligibility_reason
    end,
    ranking_policy_version = 'odm_masaken_detail_precision_v1'
  where d.source_domain = 'masaken.ma'
    and d.vertical_classification = 'real_estate_likely'
    and d.document_kind = 'AMBIGUOUS'
    and d.normalized_city is not null
    and d.normalized_property_type is not null
    and d.normalized_intent is not null
    and d.canonical_url ~ '^https://masaken\.ma/fr/immobilier-maroc/(vente|location)-[a-z0-9-]+/[0-9]+/?$';

  get diagnostics promoted_rows = row_count;

  return jsonb_build_object(
    'version', 'odm_masaken_detail_precision_v1',
    'normalized_rows', normalized_rows,
    'promoted_rows', promoted_rows,
    'deleted_rows', 0,
    'network_access', false
  );
end;
$$;

revoke all on function public.refresh_odm_masaken_detail_precision_v1() from public, anon, authenticated;
grant execute on function public.refresh_odm_masaken_detail_precision_v1() to service_role;

create or replace view public.odm_masaken_detail_precision_report_v1
with (security_invoker = true)
as
select
  count(*) filter (where document_kind = 'LISTING')::bigint as listing_rows,
  count(*) filter (where document_kind = 'AMBIGUOUS')::bigint as ambiguous_rows,
  count(*) filter (where document_kind = 'CATEGORY')::bigint as category_rows,
  count(*) filter (where display_eligibility = 'eligible_primary')::bigint as primary_rows,
  count(*) filter (where display_eligibility = 'eligible_secondary')::bigint as secondary_rows,
  count(*) filter (where display_eligibility = 'ineligible')::bigint as ineligible_rows,
  count(*) filter (where normalized_city is null)::bigint as missing_city_rows,
  count(*) filter (where normalized_property_type is null)::bigint as missing_property_type_rows,
  count(*) filter (where normalized_intent is null)::bigint as missing_intent_rows
from public.thin_index_search_documents
where source_domain = 'masaken.ma'
  and vertical_classification = 'real_estate_likely';

revoke all on public.odm_masaken_detail_precision_report_v1 from public, anon, authenticated;
grant select on public.odm_masaken_detail_precision_report_v1 to service_role;
