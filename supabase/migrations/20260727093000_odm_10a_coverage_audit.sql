-- ODM-10A — Internal coverage audit.
-- Read-only, service-role-only evidence over the canonical Thin Index and structured pipeline.

begin;

create or replace function public.odm_10a_coverage_audit(
  p_target_count integer default 100000,
  p_top_limit integer default 30
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with base as (
  select * from public.thin_index_search_documents
), eligible as (
  select * from base
  where display_eligibility in ('eligible_primary','eligible_secondary')
    and seed_provider in ('public_sitemap','commoncrawl_cdx','serper_search')
    and freshness_status in ('seed_only','fresh_confirmed')
    and nullif(btrim(canonical_url),'') is not null
), pipeline as (
  select jsonb_build_object(
    'source_offer_seeds', (select count(*) from public.source_offer_seeds),
    'thin_index_documents', (select count(*) from base),
    'eligible_public_representations', (select count(*) from eligible),
    'property_listings', (select count(*) from public.property_listings),
    'listing_sources', (select count(*) from public.listing_sources),
    'property_clusters', (select count(*) from public.property_clusters),
    'cluster_members', (select count(*) from public.property_cluster_members),
    'source_offer_observations', (select count(*) from public.source_offer_observations),
    'lifecycle_signals', (select count(*) from public.source_offer_lifecycle_signals)
  ) as value
), summary as (
  select jsonb_build_object(
    'target_count', greatest(coalesce(p_target_count,100000),1),
    'eligible_public', count(*),
    'gap_to_target', greatest(greatest(coalesce(p_target_count,100000),1) - count(*), 0),
    'city_coverage_pct', round(100.0 * count(*) filter (where normalized_city is not null) / nullif(count(*),0), 2),
    'property_type_coverage_pct', round(100.0 * count(*) filter (where normalized_property_type is not null) / nullif(count(*),0), 2),
    'intent_coverage_pct', round(100.0 * count(*) filter (where normalized_intent is not null) / nullif(count(*),0), 2),
    'price_coverage_pct', round(100.0 * count(*) filter (where normalized_price_mad is not null) / nullif(count(*),0), 2),
    'surface_coverage_pct', round(100.0 * count(*) filter (where normalized_surface_m2 is not null) / nullif(count(*),0), 2),
    'fresh_confirmed_pct', round(100.0 * count(*) filter (where freshness_status='fresh_confirmed') / nullif(count(*),0), 2),
    'primary_eligibility_pct', round(100.0 * count(*) filter (where display_eligibility='eligible_primary') / nullif(count(*),0), 2)
  ) as value from eligible
), sources as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.representation_count desc), '[]'::jsonb) as value
  from (
    select source_domain, seed_provider, count(*)::bigint as representation_count,
      round(100.0*count(*)/nullif((select count(*) from eligible),0),2) as share_pct
    from eligible
    group by source_domain, seed_provider
    order by count(*) desc
    limit least(greatest(coalesce(p_top_limit,30),1),100)
  ) x
), cities as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.representation_count desc), '[]'::jsonb) as value
  from (
    select coalesce(normalized_city,'unknown') as city, count(*)::bigint as representation_count,
      round(100.0*count(*)/nullif((select count(*) from eligible),0),2) as share_pct
    from eligible
    group by coalesce(normalized_city,'unknown')
    order by count(*) desc
    limit least(greatest(coalesce(p_top_limit,30),1),100)
  ) x
), property_types as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.representation_count desc), '[]'::jsonb) as value
  from (
    select coalesce(normalized_property_type,'unknown') as property_type, count(*)::bigint as representation_count
    from eligible group by coalesce(normalized_property_type,'unknown') order by count(*) desc
  ) x
), intents as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.representation_count desc), '[]'::jsonb) as value
  from (
    select coalesce(normalized_intent,'unknown') as intent, count(*)::bigint as representation_count
    from eligible group by coalesce(normalized_intent,'unknown') order by count(*) desc
  ) x
), freshness as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.representation_count desc), '[]'::jsonb) as value
  from (
    select freshness_status, count(*)::bigint as representation_count
    from eligible group by freshness_status order by count(*) desc
  ) x
), eligibility as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.representation_count desc), '[]'::jsonb) as value
  from (
    select display_eligibility, count(*)::bigint as representation_count
    from base group by display_eligibility order by count(*) desc
  ) x
)
select jsonb_build_object(
  'audit_version','odm_10a_v1',
  'generated_at',now(),
  'summary',(select value from summary),
  'pipeline',(select value from pipeline),
  'by_source',(select value from sources),
  'by_city',(select value from cities),
  'by_property_type',(select value from property_types),
  'by_intent',(select value from intents),
  'by_freshness',(select value from freshness),
  'by_eligibility',(select value from eligibility)
);
$$;

revoke all on function public.odm_10a_coverage_audit(integer,integer) from public, anon, authenticated;
grant execute on function public.odm_10a_coverage_audit(integer,integer) to service_role;

comment on function public.odm_10a_coverage_audit(integer,integer) is
  'Internal ODM-10A coverage evidence. Counts representations, not certified physical properties.';

commit;
