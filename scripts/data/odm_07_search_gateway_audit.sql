-- ODM-07 read-only certification

select
  count(*) as eligible_rows,
  count(*) filter (where display_eligibility = 'eligible_primary') as primary_rows,
  count(*) filter (where display_eligibility = 'eligible_secondary') as secondary_rows,
  count(*) filter (where display_eligibility = 'ineligible') as ineligible_leaks,
  count(*) filter (where ranking_quality_boost < 0 or ranking_quality_boost > 0.35) as invalid_boosts,
  count(*) filter (where display_eligibility = 'eligible_primary' and quality_tier not in ('Q2_comparable','Q3_intelligence_ready')) as unsafe_primary_rows,
  count(*) filter (where display_eligibility = 'eligible_secondary' and quality_tier not in ('Q0_link_only','Q1_contextual')) as unsafe_secondary_rows,
  count(*) filter (where seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search')) as unexpected_provider_rows,
  count(*) filter (where freshness_status not in ('seed_only','fresh_confirmed')) as unexpected_freshness_rows
from public.thin_index_display_eligible_v1;

select canonical_url, count(*) as duplicate_rows
from public.thin_index_display_eligible_v1
group by canonical_url
having count(*) > 1
order by duplicate_rows desc, canonical_url;

select
  display_eligibility,
  quality_tier,
  count(*) as rows,
  min(ranking_quality_boost) as min_boost,
  max(ranking_quality_boost) as max_boost
from public.thin_index_display_eligible_v1
group by display_eligibility, quality_tier
order by display_eligibility, quality_tier;

-- Smoke query: primary results must sort before secondary results for equal search context.
select seed_id, source_domain, quality_tier, display_eligibility, ranking_quality_boost, relevance_rank
from public.search_thin_index_v3(null, null, null, null, 50, null, null, null);
