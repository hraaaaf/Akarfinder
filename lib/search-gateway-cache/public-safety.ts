import type { SearchGatewayNormalizedResult, SearchGatewayRouteResponse } from "@/lib/search-gateway/search-gateway-types";
import { analyzeGatewayQueryContext } from "@/lib/search-gateway/search-gateway-relevance-tuning";
import type {
  SearchGatewayCachedResponse,
  SearchGatewayCachedResult,
  SearchGatewayCacheMetadata,
  SearchGatewayProviderIssueClassification,
} from "./types";

const MAX_SNIPPET_LENGTH = 280;

function trimSnippet(snippet: string | undefined): string | undefined {
  const value = snippet?.trim();
  if (!value) return undefined;
  if (value.length <= MAX_SNIPPET_LENGTH) return value;
  return `${value.slice(0, MAX_SNIPPET_LENGTH - 1).trimEnd()}…`;
}

function sanitizeCachedResult(result: SearchGatewayNormalizedResult): SearchGatewayCachedResult {
  const queryAnalysis = analyzeGatewayQueryContext({
    q: `${result.title} ${result.snippet ?? ""}`,
  });

  return {
    id: result.id,
    title: result.title,
    snippet: trimSnippet(result.snippet),
    original_url: result.original_url,
    display_url: result.display_url,
    source_id: result.source_id,
    source_name: result.source_name,
    source_host: result.domain,
    domain: result.domain,
    result_origin: result.result_origin,
    search_result_display_mode: result.search_result_display_mode,
    source_badge: result.source_badge,
    production_allowed: result.production_allowed,
    can_show_result: result.can_show_result,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: result.primary_cta,
    primary_cta_label: result.primary_cta_label,
    result_attribution_label: result.result_attribution_label,
    thumbnail_risk_accepted: false,
    normalized_city: queryAnalysis.city,
    normalized_property_type: queryAnalysis.property_type,
    normalized_transaction_type: queryAnalysis.intent,
  };
}

export function sanitizeSearchGatewayResponseForCache(
  response: SearchGatewayRouteResponse,
): SearchGatewayCachedResponse {
  return {
    ok: response.ok,
    degraded: response.degraded,
    reason: response.reason,
    provider: response.provider,
    sources_queried: [...response.sources_queried],
    results_count: response.results_count,
    results: response.results.map(sanitizeCachedResult),
  };
}

export function attachSearchGatewayCacheMetadata(
  response: SearchGatewayRouteResponse,
  cache: SearchGatewayCacheMetadata,
): SearchGatewayRouteResponse {
  return {
    ...response,
    cache,
  };
}

export function buildStaleGatewayResponse(
  cached: SearchGatewayCachedResponse,
  providerIssue: SearchGatewayProviderIssueClassification | undefined,
): SearchGatewayRouteResponse {
  return {
    ...cached,
    ok: true,
    degraded: true,
    reason: providerIssue ?? cached.reason ?? "provider_error",
    results: cached.results,
  };
}
