-- ODM-06 read-only certification audit

select
  count(*) as total_rows,
  count(*) filter (where display_eligibility = 'eligible_primary') as eligible_primary,
  count(*) filter (where display_eligibility = 'eligible_secondary') as eligible_secondary,
  count(*) filter (where display_eligibility = 'ineligible') as ineligible,
  count(*) filter (where ranking_quality_boost is null) as missing_ranking_boost,
  count(*) filter (where ranking_policy_version <> 'odm06-v1') as wrong_policy_version
from public.thin_index_search_documents;

select
  count(*) filter (
    where display_eligibility = 'eligible_primary'
      and quality_tier not in ('Q2_comparable','Q3_intelligence_ready')
  ) as unsafe_primary_rows,
  count(*) filter (
    where display_eligibility = 'eligible_secondary'
      and quality_tier not in ('Q0_link_only','Q1_contextual')
  ) as unsafe_secondary_rows,
  count(*) filter (
    where display_eligibility <> 'ineligible'
      and seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search')
  ) as unexpected_provider_rows,
  count(*) filter (
    where display_eligibility <> 'ineligible'
      and freshness_status not in ('seed_only','fresh_confirmed')
  ) as unsupported_freshness_rows,
  count(*) filter (
    where ranking_quality_boost < 0 or ranking_quality_boost > 0.35
  ) as invalid_boost_rows
from public.thin_index_search_documents;

select quality_tier, display_eligibility,
  count(*) as rows,
  min(ranking_quality_boost) as min_boost,
  max(ranking_quality_boost) as max_boost,
  avg(ranking_quality_boost) as avg_boost
from public.thin_index_search_documents
group by quality_tier, display_eligibility
order by quality_tier, display_eligibility;

select canonical_url, count(*) as duplicate_rows
from public.thin_index_search_documents
group by canonical_url
having count(*) > 1
order by duplicate_rows desc, canonical_url;
