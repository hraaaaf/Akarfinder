-- ODM DOCUMENT KIND CLASSIFICATION V1
-- Conservative, deterministic classification of searchable documents.
-- Preserves indexed coverage while excluding strong category/search pages from listing cards.

alter table public.thin_index_search_documents
  add column if not exists document_kind text,
  add column if not exists document_kind_confidence text,
  add column if not exists document_kind_reason text,
  add column if not exists document_kind_version text;

alter table public.thin_index_search_documents
  drop constraint if exists thin_index_search_documents_document_kind_check;

alter table public.thin_index_search_documents
  add constraint thin_index_search_documents_document_kind_check
  check (document_kind is null or document_kind in ('LISTING','CATEGORY','AMBIGUOUS','UNKNOWN'));

alter table public.thin_index_search_documents
  drop constraint if exists thin_index_search_documents_document_kind_confidence_check;

alter table public.thin_index_search_documents
  add constraint thin_index_search_documents_document_kind_confidence_check
  check (document_kind_confidence is null or document_kind_confidence in ('HIGH','MEDIUM','LOW'));

create or replace function public.refresh_odm_document_kind_classification_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  category_rows integer := 0;
  listing_rows integer := 0;
  ambiguous_rows integer := 0;
begin
  -- Strong category/search pages: explicit collection language or empty faceted URLs.
  update public.thin_index_search_documents d
  set
    document_kind = 'CATEGORY',
    document_kind_confidence = 'HIGH',
    document_kind_reason = case
      when lower(coalesce(d.snippet, '')) like '%plus de 120.000 annonces%'
        or lower(coalesce(d.snippet, '')) like '%nous vous aidons à trouver%'
        then 'collection_copy_detected'
      else 'faceted_category_url_without_listing_evidence'
    end,
    document_kind_version = 'odm_document_kind_v1',
    display_eligibility = 'ineligible',
    display_eligibility_reason = 'category_page_not_listing',
    ranking_quality_boost = 0,
    ranking_policy_version = 'odm_document_kind_v1'
  where d.vertical_classification = 'real_estate_likely'
    and (
      (
        lower(coalesce(d.snippet, '')) like '%plus de 120.000 annonces%'
        or lower(coalesce(d.snippet, '')) like '%nous vous aidons à trouver%'
      )
      or (
        d.source_domain = 'mubawab.ma'
        and d.canonical_url like '%/fr/is/%'
        and nullif(trim(coalesce(d.title, '')), '') is null
        and nullif(trim(coalesce(d.snippet, '')), '') is null
        and d.normalized_price_mad is null
        and d.normalized_surface_m2 is null
      )
    );
  get diagnostics category_rows = row_count;

  -- Strong listing evidence: structured dimensions plus at least one economic/physical fact
  -- and meaningful descriptive content.
  update public.thin_index_search_documents d
  set
    document_kind = 'LISTING',
    document_kind_confidence = 'HIGH',
    document_kind_reason = 'structured_listing_evidence',
    document_kind_version = 'odm_document_kind_v1'
  where d.vertical_classification = 'real_estate_likely'
    and coalesce(d.document_kind, '') <> 'CATEGORY'
    and d.normalized_city is not null
    and d.normalized_property_type is not null
    and d.normalized_intent is not null
    and (d.normalized_price_mad is not null or d.normalized_surface_m2 is not null)
    and length(trim(coalesce(d.title, '') || ' ' || coalesce(d.snippet, ''))) >= 80;
  get diagnostics listing_rows = row_count;

  -- Remaining structured real-estate documents stay searchable only as secondary results.
  update public.thin_index_search_documents d
  set
    document_kind = 'AMBIGUOUS',
    document_kind_confidence = 'MEDIUM',
    document_kind_reason = 'structured_real_estate_without_sufficient_listing_evidence',
    document_kind_version = 'odm_document_kind_v1',
    display_eligibility = case
      when d.display_eligibility = 'ineligible' then 'ineligible'
      else 'eligible_secondary'
    end,
    display_eligibility_reason = case
      when d.display_eligibility = 'ineligible' then d.display_eligibility_reason
      else 'ambiguous_property_result'
    end,
    ranking_quality_boost = case
      when d.display_eligibility = 'ineligible' then d.ranking_quality_boost
      else least(coalesce(d.ranking_quality_boost, 0), 0.05)
    end,
    ranking_policy_version = 'odm_document_kind_v1'
  where d.vertical_classification = 'real_estate_likely'
    and coalesce(d.document_kind, '') not in ('CATEGORY','LISTING');
  get diagnostics ambiguous_rows = row_count;

  return jsonb_build_object(
    'version', 'odm_document_kind_v1',
    'category_rows', category_rows,
    'listing_rows', listing_rows,
    'ambiguous_rows', ambiguous_rows,
    'indexed_rows_deleted', 0,
    'network_access', false
  );
end;
$$;

revoke all on function public.refresh_odm_document_kind_classification_v1() from public, anon, authenticated;
grant execute on function public.refresh_odm_document_kind_classification_v1() to service_role;

create or replace view public.odm_document_kind_report_v1
with (security_invoker = true)
as
select
  source_domain,
  coalesce(document_kind, 'UNKNOWN') as document_kind,
  coalesce(document_kind_confidence, 'LOW') as confidence,
  count(*)::bigint as rows,
  count(*) filter (where display_eligibility = 'eligible_primary')::bigint as primary_rows,
  count(*) filter (where display_eligibility = 'eligible_secondary')::bigint as secondary_rows,
  count(*) filter (where display_eligibility = 'ineligible')::bigint as ineligible_rows
from public.thin_index_search_documents
where vertical_classification = 'real_estate_likely'
group by source_domain, coalesce(document_kind, 'UNKNOWN'), coalesce(document_kind_confidence, 'LOW');

revoke all on public.odm_document_kind_report_v1 from public, anon, authenticated;
grant select on public.odm_document_kind_report_v1 to service_role;

comment on function public.refresh_odm_document_kind_classification_v1() is
  'Conservative listing/category classification preserving index coverage while removing strong category pages from listing-card eligibility.';
