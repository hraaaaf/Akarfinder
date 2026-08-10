-- P1C.1 — Offre quartier Shadow
-- Internal-only neighborhood offer metrics built exclusively from the certified P1B.3 Geo join.
-- No public activation, no ranking/display mutation, no geography inference.
-- Price metrics are segmented by transaction type; sale and rent are never mixed.

create or replace view public.odm_neighborhood_offer_shadow_listing_v1
with (security_invoker = true)
as
select
  j.seed_id,
  j.city_id,
  j.city_slug,
  j.city_name,
  j.neighborhood_id,
  j.neighborhood_slug,
  j.neighborhood_name,
  nullif(d.normalized_intent, '') as transaction_type,
  nullif(d.normalized_property_type, '') as property_type,
  case when d.normalized_price_mad > 0 then d.normalized_price_mad else null end as price_mad,
  case when d.normalized_surface_m2 > 0 then d.normalized_surface_m2 else null end as surface_m2,
  case
    when d.normalized_price_m2 > 0 then d.normalized_price_m2
    when d.normalized_price_mad > 0 and d.normalized_surface_m2 > 0
      then round(d.normalized_price_mad / d.normalized_surface_m2, 2)
    else null
  end as price_per_m2_mad,
  case
    when d.normalized_price_m2 > 0 then 'normalized_price_m2'
    when d.normalized_price_mad > 0 and d.normalized_surface_m2 > 0 then 'derived_exact_price_surface'
    else null
  end as price_per_m2_source,
  d.freshness_status,
  d.quality_score,
  d.quality_tier,
  d.display_eligibility,
  s.source_domain,
  s.last_observed_at,
  nullif(s.metadata->'coverage_bridge'->>'property_listing_id', '')::bigint as property_listing_id,
  j.resolver_version,
  j.resolved_at,
  'shadow'::text as metric_state,
  false as reliability_certified,
  false as public_activation,
  false as metric_layers_activated
from public.odm_territorial_metric_listing_join_v1 j
join public.thin_index_search_documents d
  on d.seed_id = j.seed_id
join public.source_offer_seeds s
  on s.id = j.seed_id;

revoke all on public.odm_neighborhood_offer_shadow_listing_v1 from public, anon, authenticated;
grant select on public.odm_neighborhood_offer_shadow_listing_v1 to service_role;

create or replace view public.odm_neighborhood_offer_shadow_segment_v1
with (security_invoker = true)
as
with base as (
  select *
  from public.odm_neighborhood_offer_shadow_listing_v1
), property_counts as (
  select
    city_id,
    neighborhood_id,
    coalesce(transaction_type, 'unknown') as transaction_type,
    property_type,
    count(*)::bigint as n
  from base
  where property_type is not null
  group by city_id, neighborhood_id, coalesce(transaction_type, 'unknown'), property_type
), property_breakdown as (
  select
    city_id,
    neighborhood_id,
    transaction_type,
    jsonb_object_agg(property_type, n order by property_type) as property_type_breakdown
  from property_counts
  group by city_id, neighborhood_id, transaction_type
), aggregated as (
  select
    b.city_id,
    b.city_slug,
    b.city_name,
    b.neighborhood_id,
    b.neighborhood_slug,
    b.neighborhood_name,
    coalesce(b.transaction_type, 'unknown') as transaction_type,
    count(*)::bigint as listing_count,
    count(b.price_mad)::bigint as price_sample_count,
    round((percentile_cont(0.5) within group (order by b.price_mad) filter (where b.price_mad is not null))::numeric, 2) as median_price_mad,
    count(b.surface_m2)::bigint as surface_sample_count,
    round((percentile_cont(0.5) within group (order by b.surface_m2) filter (where b.surface_m2 is not null))::numeric, 2) as median_surface_m2,
    count(b.price_per_m2_mad)::bigint as price_per_m2_sample_count,
    round((percentile_cont(0.5) within group (order by b.price_per_m2_mad) filter (where b.price_per_m2_mad is not null))::numeric, 2) as median_price_per_m2_mad,
    count(*) filter (where b.freshness_status = 'fresh_confirmed')::bigint as fresh_confirmed_count,
    count(*) filter (where b.freshness_status = 'seed_only')::bigint as seed_only_count,
    count(distinct b.source_domain)::bigint as source_domain_count,
    round(avg(b.quality_score)::numeric, 2) as average_quality_score,
    min(b.last_observed_at) as observed_from,
    max(b.last_observed_at) as observed_to,
    round((count(b.price_mad)::numeric / nullif(count(*)::numeric, 0)) * 100, 2) as price_coverage_percent,
    round((count(b.surface_m2)::numeric / nullif(count(*)::numeric, 0)) * 100, 2) as surface_coverage_percent,
    round((count(b.price_per_m2_mad)::numeric / nullif(count(*)::numeric, 0)) * 100, 2) as price_per_m2_coverage_percent
  from base b
  group by
    b.city_id, b.city_slug, b.city_name,
    b.neighborhood_id, b.neighborhood_slug, b.neighborhood_name,
    coalesce(b.transaction_type, 'unknown')
)
select
  a.*,
  coalesce(p.property_type_breakdown, '{}'::jsonb) as property_type_breakdown,
  'shadow'::text as metric_state,
  false as reliability_certified,
  false as public_activation,
  false as metric_layers_activated,
  true as sample_sizes_disclosed
from aggregated a
left join property_breakdown p
  on p.city_id = a.city_id
 and p.neighborhood_id = a.neighborhood_id
 and p.transaction_type = a.transaction_type;

revoke all on public.odm_neighborhood_offer_shadow_segment_v1 from public, anon, authenticated;
grant select on public.odm_neighborhood_offer_shadow_segment_v1 to service_role;

create or replace view public.odm_neighborhood_offer_shadow_summary_v1
with (security_invoker = true)
as
with base as (
  select *
  from public.odm_neighborhood_offer_shadow_listing_v1
), transaction_counts as (
  select city_id, neighborhood_id, coalesce(transaction_type, 'unknown') as transaction_type, count(*)::bigint as n
  from base
  group by city_id, neighborhood_id, coalesce(transaction_type, 'unknown')
), transaction_breakdown as (
  select city_id, neighborhood_id, jsonb_object_agg(transaction_type, n order by transaction_type) as transaction_breakdown
  from transaction_counts
  group by city_id, neighborhood_id
), property_counts as (
  select city_id, neighborhood_id, property_type, count(*)::bigint as n
  from base
  where property_type is not null
  group by city_id, neighborhood_id, property_type
), property_breakdown as (
  select city_id, neighborhood_id, jsonb_object_agg(property_type, n order by property_type) as property_type_breakdown
  from property_counts
  group by city_id, neighborhood_id
), aggregated as (
  select
    city_id,
    city_slug,
    city_name,
    neighborhood_id,
    neighborhood_slug,
    neighborhood_name,
    count(*)::bigint as listing_count,
    count(price_mad)::bigint as rows_with_price,
    count(surface_m2)::bigint as rows_with_surface,
    count(price_per_m2_mad)::bigint as rows_with_price_per_m2,
    count(*) filter (where freshness_status = 'fresh_confirmed')::bigint as fresh_confirmed_count,
    count(*) filter (where freshness_status = 'seed_only')::bigint as seed_only_count,
    count(distinct source_domain)::bigint as source_domain_count,
    round(avg(quality_score)::numeric, 2) as average_quality_score,
    min(last_observed_at) as observed_from,
    max(last_observed_at) as observed_to,
    round((count(price_mad)::numeric / nullif(count(*)::numeric, 0)) * 100, 2) as price_coverage_percent,
    round((count(surface_m2)::numeric / nullif(count(*)::numeric, 0)) * 100, 2) as surface_coverage_percent,
    round((count(price_per_m2_mad)::numeric / nullif(count(*)::numeric, 0)) * 100, 2) as price_per_m2_coverage_percent
  from base
  group by city_id, city_slug, city_name, neighborhood_id, neighborhood_slug, neighborhood_name
)
select
  a.*,
  coalesce(t.transaction_breakdown, '{}'::jsonb) as transaction_breakdown,
  coalesce(p.property_type_breakdown, '{}'::jsonb) as property_type_breakdown,
  'shadow'::text as metric_state,
  false as reliability_certified,
  false as public_activation,
  false as metric_layers_activated,
  true as sample_sizes_disclosed
from aggregated a
left join transaction_breakdown t using (city_id, neighborhood_id)
left join property_breakdown p using (city_id, neighborhood_id);

revoke all on public.odm_neighborhood_offer_shadow_summary_v1 from public, anon, authenticated;
grant select on public.odm_neighborhood_offer_shadow_summary_v1 to service_role;

create or replace function public.odm_neighborhood_offer_shadow_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with listing as (
  select
    count(*)::bigint as listing_rows,
    count(distinct seed_id)::bigint as distinct_seeds,
    count(distinct neighborhood_id)::bigint as neighborhoods,
    count(price_mad)::bigint as rows_with_price,
    count(surface_m2)::bigint as rows_with_surface,
    count(price_per_m2_mad)::bigint as rows_with_price_per_m2,
    count(*) filter (where freshness_status = 'fresh_confirmed')::bigint as fresh_confirmed_rows,
    count(*) filter (where freshness_status = 'seed_only')::bigint as seed_only_rows
  from public.odm_neighborhood_offer_shadow_listing_v1
), segments as (
  select count(*)::bigint as n from public.odm_neighborhood_offer_shadow_segment_v1
), summaries as (
  select count(*)::bigint as n from public.odm_neighborhood_offer_shadow_summary_v1
), geo as (
  select public.odm_territorial_metric_join_report_v1() as report
)
select jsonb_build_object(
  'contract_version', 'p1c1_neighborhood_offer_shadow_v1',
  'metric_state', 'shadow',
  'listing_rows', listing.listing_rows,
  'distinct_seeds', listing.distinct_seeds,
  'neighborhoods', listing.neighborhoods,
  'transaction_segments', segments.n,
  'summary_rows', summaries.n,
  'rows_with_price', listing.rows_with_price,
  'rows_with_surface', listing.rows_with_surface,
  'rows_with_price_per_m2', listing.rows_with_price_per_m2,
  'fresh_confirmed_rows', listing.fresh_confirmed_rows,
  'seed_only_rows', listing.seed_only_rows,
  'price_coverage_percent', case when listing.listing_rows = 0 then 0 else round((listing.rows_with_price::numeric / listing.listing_rows::numeric) * 100, 2) end,
  'surface_coverage_percent', case when listing.listing_rows = 0 then 0 else round((listing.rows_with_surface::numeric / listing.listing_rows::numeric) * 100, 2) end,
  'price_per_m2_coverage_percent', case when listing.listing_rows = 0 then 0 else round((listing.rows_with_price_per_m2::numeric / listing.listing_rows::numeric) * 100, 2) end,
  'geo_contract_version', geo.report->>'contract_version',
  'geo_latest_resolution_collisions', (geo.report->>'latest_resolution_collisions')::bigint,
  'geo_conflicting_resolution_history', (geo.report->>'conflicting_resolution_history')::bigint,
  'geo_missing_canonical_geo', (geo.report->>'missing_canonical_geo')::bigint,
  'reliability_certified', false,
  'public_activation', false,
  'metric_layers_activated', false,
  'sale_rent_price_medians_mixed', false,
  'fuzzy_geo_inference', false,
  'sample_sizes_disclosed', true,
  'next_boundary', 'P1C.2 Reliability Engine must define sample/freshness/dispersion gates before any public activation.'
)
from listing
cross join segments
cross join summaries
cross join geo;
$$;

revoke all on function public.odm_neighborhood_offer_shadow_report_v1() from public, anon, authenticated;
grant execute on function public.odm_neighborhood_offer_shadow_report_v1() to service_role;

comment on view public.odm_neighborhood_offer_shadow_listing_v1 is
  'P1C.1 internal-only listing-level neighborhood offer shadow. Geography comes only from P1B.3 latest-event-first validated Geo; no inferred neighborhood.';
comment on view public.odm_neighborhood_offer_shadow_segment_v1 is
  'P1C.1 internal-only neighborhood x transaction metrics. Sale and rent prices are never mixed. Raw medians remain non-public and reliability-uncertified.';
comment on view public.odm_neighborhood_offer_shadow_summary_v1 is
  'P1C.1 internal-only neighborhood volume/completeness/freshness/type summary. No public activation.';
comment on function public.odm_neighborhood_offer_shadow_report_v1() is
  'P1C.1 read-only shadow coverage report. P1C.2 reliability certification is required before public metric activation.';
