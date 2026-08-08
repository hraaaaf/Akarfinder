-- P1B.3 — Territorial Metric Join Contract V1
-- Read-only foundation for truthful neighborhood metrics.
-- No geography is inferred from titles, URLs, coordinates or city-level data.
-- Only explicit resolved geo events linked to public displayable LISTING seeds qualify.
-- This migration does not change Search, ranking, display eligibility, publication or geometry status.

create or replace view public.odm_territorial_metric_listing_join_v1
with (security_invoker = true)
as
with latest_resolved as (
  select distinct on (e.source_record_id)
    e.source_record_id,
    e.resolved_city_id,
    e.resolved_neighborhood_id,
    e.resolver_version,
    e.created_at as resolved_at
  from public.geo_resolution_events e
  where e.resolution_status = 'resolved'
    and e.resolved_neighborhood_id is not null
    and e.source_record_type = 'source_offer_seed'
    and e.source_record_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  order by e.source_record_id, e.created_at desc, e.id desc
)
select
  d.seed_id,
  d.normalized_city,
  city.id as city_id,
  city.slug as city_slug,
  city.canonical_name as city_name,
  neighborhood.id as neighborhood_id,
  neighborhood.slug as neighborhood_slug,
  neighborhood.canonical_name as neighborhood_name,
  d.freshness_status,
  d.quality_score,
  d.quality_tier,
  d.display_eligibility,
  r.resolver_version,
  r.resolved_at
from public.thin_index_search_documents d
join latest_resolved r
  on r.source_record_id::uuid = d.seed_id
join public.geo_entities neighborhood
  on neighborhood.id = r.resolved_neighborhood_id
 and neighborhood.entity_type = 'neighborhood'
 and neighborhood.validation_status = 'validated'
join public.geo_entities city
  on city.id = neighborhood.parent_id
 and city.entity_type = 'city'
 and city.validation_status = 'validated'
where d.vertical_classification = 'real_estate_likely'
  and d.document_kind = 'LISTING'
  and d.display_eligibility in ('eligible_primary', 'eligible_secondary')
  and (r.resolved_city_id is null or r.resolved_city_id = city.id);

revoke all on public.odm_territorial_metric_listing_join_v1 from public, anon, authenticated;
grant select on public.odm_territorial_metric_listing_join_v1 to service_role;

create or replace function public.odm_territorial_metric_join_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with eligible as (
  select count(*)::bigint as n
  from public.thin_index_search_documents d
  where d.vertical_classification = 'real_estate_likely'
    and d.document_kind = 'LISTING'
    and d.display_eligibility in ('eligible_primary', 'eligible_secondary')
), joined as (
  select
    count(*)::bigint as n,
    count(distinct seed_id)::bigint as distinct_seeds,
    count(*) filter (where neighborhood_slug is null or city_slug is null)::bigint as missing_canonical_geo
  from public.odm_territorial_metric_listing_join_v1
), duplicates as (
  select count(*)::bigint as n
  from (
    select seed_id
    from public.odm_territorial_metric_listing_join_v1
    group by seed_id
    having count(*) > 1
  ) x
)
select jsonb_build_object(
  'contract_version', 'p1b3_territorial_metric_join_v1',
  'eligible_public_listings', eligible.n,
  'resolved_neighborhood_listings', joined.distinct_seeds,
  'coverage_percent', case
    when eligible.n = 0 then 0
    else round((joined.distinct_seeds::numeric / eligible.n::numeric) * 100, 2)
  end,
  'missing_canonical_geo', joined.missing_canonical_geo,
  'duplicate_seed_assignments', duplicates.n,
  'metric_layers_activated', false,
  'gates', jsonb_build_object(
    'only_explicit_resolved_events', true,
    'only_validated_neighborhoods', joined.missing_canonical_geo = 0,
    'one_assignment_per_seed', duplicates.n = 0,
    'no_inferred_neighborhoods', true,
    'no_search_or_display_policy_change', true
  )
)
from eligible cross join joined cross join duplicates;
$$;

revoke all on function public.odm_territorial_metric_join_report_v1() from public, anon, authenticated;
grant execute on function public.odm_territorial_metric_join_report_v1() to service_role;

comment on view public.odm_territorial_metric_listing_join_v1 is
  'P1B.3 fail-closed listing→neighborhood contract. Only explicit resolved source_offer_seed events, validated canonical geography and currently displayable real-estate LISTING rows are admitted.';

comment on function public.odm_territorial_metric_join_report_v1() is
  'P1B.3 read-only coverage report. A low/zero coverage result blocks territorial metric activation rather than inferring missing neighborhoods.';
