// SEO-5B CERTIFIED MARKET METRIC READ MODEL
// Server-only by contract: uses the Supabase service-role client. Never import from client components.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  evaluateMarketMetricPublication,
  type MarketMetricPublicationDecision,
} from "@/lib/seo/market-metric-publication";

const MARKET_METRIC_VIEW = "odm_neighborhood_offer_reliability_metric_v1";

type MarketMetricScope = {
  citySlug?: string;
  transactionType?: string;
  metricName?: "price_per_m2_mad" | "price_mad" | "surface_m2";
};

type MarketMetricRow = {
  city_slug: string | null;
  city_name: string | null;
  neighborhood_slug: string | null;
  neighborhood_name: string | null;
  transaction_type: string | null;
  metric_name: string | null;
  sample_count: number | string | null;
  source_domain_count: number | string | null;
  median: number | string | null;
  q1: number | string | null;
  q3: number | string | null;
  fresh_sample_percent: number | string | null;
  field_coverage_percent: number | string | null;
  reliability_level: string | null;
  market_representativeness_certified: boolean | null;
  public_activation: boolean | null;
  metric_state: string | null;
  reliability_policy_version: string | null;
};

export type PublishedMarketMetric = {
  citySlug: string;
  cityName: string;
  neighborhoodSlug: string;
  neighborhoodName: string;
  transactionType: string;
  metricName: string;
  sampleCount: number;
  sourceDomainCount: number;
  median: number;
  q1: number | null;
  q3: number | null;
  freshSamplePercent: number | null;
  fieldCoveragePercent: number | null;
  reliabilityLevel: string;
  reliabilityPolicyVersion: string | null;
};

function finiteNumber(value: number | string | null): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function evaluateMarketMetricRowPublication(
  row: MarketMetricRow,
): MarketMetricPublicationDecision {
  return evaluateMarketMetricPublication({
    reliabilityLevel: row.reliability_level,
    marketRepresentativenessCertified: row.market_representativeness_certified === true,
    publicActivation: row.public_activation === true,
    metricState: row.metric_state,
    median: finiteNumber(row.median),
  });
}

export function toPublishedMarketMetric(row: MarketMetricRow): PublishedMarketMetric | null {
  const decision = evaluateMarketMetricRowPublication(row);
  if (!decision.publishable) return null;

  const median = finiteNumber(row.median);
  const sampleCount = finiteNumber(row.sample_count);
  const sourceDomainCount = finiteNumber(row.source_domain_count);
  if (
    median == null ||
    median <= 0 ||
    sampleCount == null ||
    sampleCount < 0 ||
    sourceDomainCount == null ||
    sourceDomainCount < 0 ||
    !row.city_slug ||
    !row.city_name ||
    !row.neighborhood_slug ||
    !row.neighborhood_name ||
    !row.transaction_type ||
    !row.metric_name ||
    !row.reliability_level
  ) {
    return null;
  }

  return {
    citySlug: row.city_slug,
    cityName: row.city_name,
    neighborhoodSlug: row.neighborhood_slug,
    neighborhoodName: row.neighborhood_name,
    transactionType: row.transaction_type,
    metricName: row.metric_name,
    sampleCount,
    sourceDomainCount,
    median,
    q1: finiteNumber(row.q1),
    q3: finiteNumber(row.q3),
    freshSamplePercent: finiteNumber(row.fresh_sample_percent),
    fieldCoveragePercent: finiteNumber(row.field_coverage_percent),
    reliabilityLevel: row.reliability_level,
    reliabilityPolicyVersion: row.reliability_policy_version,
  };
}

/**
 * Returns only metrics explicitly certified and activated by the upstream ODM
 * reliability model. Current production state is expected to return [] until
 * market representativeness and public activation are actually enabled.
 */
export async function getPublishedMarketMetrics(
  scope: MarketMetricScope = {},
): Promise<PublishedMarketMetric[]> {
  try {
    const supabase = getSupabaseServerClient();
    let query = supabase
      .from(MARKET_METRIC_VIEW)
      .select(
        "city_slug,city_name,neighborhood_slug,neighborhood_name,transaction_type,metric_name,sample_count,source_domain_count,median,q1,q3,fresh_sample_percent,field_coverage_percent,reliability_level,market_representativeness_certified,public_activation,metric_state,reliability_policy_version",
      )
      .in("reliability_level", ["moderate", "strong"])
      .eq("market_representativeness_certified", true)
      .eq("public_activation", true)
      .neq("metric_state", "shadow")
      .order("city_slug", { ascending: true })
      .order("neighborhood_slug", { ascending: true });

    if (scope.citySlug) query = query.eq("city_slug", scope.citySlug);
    if (scope.transactionType) query = query.eq("transaction_type", scope.transactionType);
    if (scope.metricName) query = query.eq("metric_name", scope.metricName);

    const { data, error } = await query;
    if (error) throw error;

    return ((data ?? []) as MarketMetricRow[])
      .map(toPublishedMarketMetric)
      .filter((metric): metric is PublishedMarketMetric => metric !== null);
  } catch (error) {
    console.error("[seo-market-metric] certified market metrics unavailable", {
      scope,
      error,
    });
    return [];
  }
}
