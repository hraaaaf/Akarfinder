-- ODM-08 end-to-end certification audit for ODM-03 -> ODM-07.

select
  count(*) as total_rows,
  count(*) filter (where normalized_city is not null) as normalized_city,
  count(*) filter (where normalized_property_type is not null) as normalized_property_type,
  count(*) filter (where normalized_intent is not null) as normalized_intent,
  count(*) filter (where normalized_price_mad is not null) as normalized_price,
  count(*) filter (where normalized_surface_m2 is not null) as normalized_surface,
  count(*) filter (where normalized_price_m2 is not null) as normalized_price_m2,
  count(*) filter (where quality_tier = 'Q0_link_only') as q0,
  count(*) filter (where quality_tier = 'Q1_contextual') as q1,
  count(*) filter (where quality_tier = 'Q2_comparable') as q2,
  count(*) filter (where quality_tier = 'Q3_intelligence_ready') as q3,
  count(*) filter (where display_eligibility = 'eligible_primary') as eligible_primary,
  count(*) filter (where display_eligibility = 'eligible_secondary') as eligible_secondary,
  count(*) filter (where display_eligibility = 'ineligible') as ineligible,
  count(*) filter (where ranking_quality_boost < 0 or ranking_quality_boost > 0.35) as invalid_boosts,
  count(*) filter (where seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search')) as unsupported_providers
from public.thin_index_search_documents;

select
  count(*) filter (where quality_tier is null) as missing_quality,
  count(*) filter (where display_eligibility is null) as missing_eligibility,
  count(*) filter (
    where display_eligibility = 'eligible_primary'
      and quality_tier not in ('Q2_comparable','Q3_intelligence_ready')
  ) as primary_lane_leaks,
  count(*) filter (
    where display_eligibility = 'eligible_secondary'
      and quality_tier not in ('Q0_link_only','Q1_contextual')
  ) as secondary_lane_leaks,
  count(*) filter (
    where normalized_price_m2 is distinct from price_per_m2_mad
  ) as price_m2_alias_mismatches
from public.thin_index_search_documents;

select count(*) - count(distinct canonical_url) as duplicate_canonical_urls
from public.thin_index_search_documents;

select count(*) as rpc_rows
from public.search_thin_index_v3(
  p_query => 'appartement',
  p_city => 'Casablanca',
  p_property_type => 'apartment',
  p_intent => 'sale',
  p_limit => 500
);
