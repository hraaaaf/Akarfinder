import { buildExpansionQueries } from "./search-gateway-query-expansion";
import { buildSearchGatewayQueries } from "./search-gateway-query-builder";
import { normalizeSearchGatewayResult } from "./search-gateway-normalizer";
import { dedupeSearchGatewayResults } from "./search-gateway-dedupe";
import { rankSearchGatewayResults } from "./search-gateway-ranking";
import { orderGatewayResultsByPageQuality } from "./search-gateway-page-quality";
import {
  limitCategoryPagesPerSource,
  diversifySearchGatewayResults,
} from "./search-gateway-diversify";
import { analyzeGatewayQueryContext } from "./search-gateway-relevance-tuning";
import { getEnabledSearchGatewaySources } from "./search-gateway-sources";
import type {
  SearchGatewayNormalizedResult,
  SearchGatewayQuery,
  SearchGatewayRawResult,
  SearchGatewayRouteResponse,
} from "./search-gateway-types";
import type { SearchGatewayProviderIssueClassification } from "@/lib/search-gateway-cache/types";

const RESULTS_PER_QUERY = 10;
const MAX_FINAL_RESULTS = 50;
const EXPANSION_THRESHOLD = 30;
const MAX_CATEGORY_PAGES_PER_SOURCE = 3;
const PROVIDER_TIMEOUT_MS = 8000;

type RawProviderResult = SearchGatewayRawResult & { source_id: string };

export interface SearchGatewayRunInput {
  query?: string;
  city?: string;
  propertyType?: string;
  intent?: string;
  sources?: string[];
  endpoint: string;
  apiKey: string;
}

interface ProviderFetchSummary {
  raw_results: RawProviderResult[];
  ok_calls: number;
  failed_calls: number;
  non_ok_statuses: number[];
}

function normalizeRaw(raw: RawProviderResult[]): SearchGatewayNormalizedResult[] {
  return raw
    .map((item) => normalizeSearchGatewayResult(item, item.source_id || "unknown"))
    .filter((r): r is SearchGatewayNormalizedResult => r !== null);
}

async function fetchGatewayQueries(
  queries: SearchGatewayQuery[],
  endpoint: string,
  apiKey: string,
): Promise<ProviderFetchSummary> {
  const settled = await Promise.allSettled(
    queries.map(async (gatewayQuery) => {
      const response = await fetch(
        `${endpoint}?q=${encodeURIComponent(gatewayQuery.query)}&num=${gatewayQuery.max_results}`,
        {
          method: "GET",
          headers: {
            "X-API-KEY": apiKey,
            "User-Agent": "AkarFinder Search Gateway",
          },
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        },
      );

      if (!response.ok) {
        return {
          raw_results: [] as RawProviderResult[],
          ok: false,
          status: response.status,
        };
      }

      const data = await response.json();
      const raw_results = ((data.organic || data.results || []) as SearchGatewayRawResult[])
        .slice(0, gatewayQuery.max_results)
        .map((result) => ({ ...result, source_id: gatewayQuery.source_id }));

      return {
        raw_results,
        ok: true,
        status: response.status,
      };
    }),
  );

  const summary: ProviderFetchSummary = {
    raw_results: [],
    ok_calls: 0,
    failed_calls: 0,
    non_ok_statuses: [],
  };

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      if (outcome.value.ok) {
        summary.ok_calls += 1;
        summary.raw_results.push(...outcome.value.raw_results);
      } else {
        summary.failed_calls += 1;
        summary.non_ok_statuses.push(outcome.value.status);
      }
    } else {
      summary.failed_calls += 1;
      console.error("[search-gateway] provider call failed:", outcome.reason);
    }
  }

  return summary;
}

function classifyProviderIssue(
  summary: ProviderFetchSummary,
  normalizedCount: number,
  resultCount: number,
): SearchGatewayProviderIssueClassification | undefined {
  if (resultCount > 0) return undefined;
  if (summary.non_ok_statuses.some((status) => [401, 402, 403, 429].includes(status))) {
    return "quota_or_auth_possible";
  }
  if (summary.raw_results.length > 0 && normalizedCount === 0) return "parser_empty";
  if (summary.raw_results.length === 0 && summary.ok_calls > 0) return "zero_results";
  if (summary.failed_calls > 0) return "provider_error";
  return "unknown";
}

function mapPublicResults(results: SearchGatewayNormalizedResult[]): SearchGatewayNormalizedResult[] {
  return results.map((result) => ({
    id: result.id,
    title: result.title,
    snippet: result.snippet,
    original_url: result.original_url,
    display_url: result.display_url,
    source_id: result.source_id,
    source_name: result.source_name,
    domain: result.domain,
    result_origin: result.result_origin,
    search_result_display_mode: result.search_result_display_mode,
    source_badge: result.source_badge,
    production_allowed: result.production_allowed,
    can_show_result: result.can_show_result,
    can_show_thumbnail: result.can_show_thumbnail,
    can_show_contact: result.can_show_contact,
    can_show_gallery: result.can_show_gallery,
    can_cache_thumbnail: result.can_cache_thumbnail,
    can_download_thumbnail: result.can_download_thumbnail,
    primary_cta: result.primary_cta,
    primary_cta_label: result.primary_cta_label,
    result_attribution_label: result.result_attribution_label,
    thumbnail_url: result.thumbnail_url,
    thumbnail_provider_name: result.thumbnail_provider_name,
    thumbnail_risk_accepted: result.thumbnail_risk_accepted,
  }));
}

export async function runSearchGatewayProviderSearch(
  input: SearchGatewayRunInput,
): Promise<{
  response: SearchGatewayRouteResponse;
  provider_issue_classification?: SearchGatewayProviderIssueClassification;
}> {
  const enabledSources = getEnabledSearchGatewaySources();
  const gatewayQueries = buildSearchGatewayQueries({
    q: input.query,
    city: input.city,
    property_type: input.propertyType,
    intent: input.intent,
    sources: input.sources,
    max_results_per_source: RESULTS_PER_QUERY,
  });

  const sourcesQueried = gatewayQueries.map((query) => query.source_id);
  if (gatewayQueries.length === 0) {
    return {
      response: {
        ok: true,
        degraded: false,
        provider: "serper",
        sources_queried: enabledSources.map((source) => source.source_id),
        results_count: 0,
        results: [],
      },
    };
  }

  const primarySummary = await fetchGatewayQueries(gatewayQueries, input.endpoint, input.apiKey);
  let rawResults = [...primarySummary.raw_results];
  let deduped = dedupeSearchGatewayResults(normalizeRaw(rawResults));

  if (input.query && deduped.length < EXPANSION_THRESHOLD) {
    const usedQueries = new Set(gatewayQueries.map((gatewayQuery) => gatewayQuery.query));
    const expansionQueries = buildExpansionQueries(
      input.query,
      enabledSources,
      usedQueries,
      RESULTS_PER_QUERY,
    );
    if (expansionQueries.length > 0) {
      const expansionSummary = await fetchGatewayQueries(expansionQueries, input.endpoint, input.apiKey);
      rawResults = [...rawResults, ...expansionSummary.raw_results];
      deduped = dedupeSearchGatewayResults(normalizeRaw(rawResults));
      primarySummary.ok_calls += expansionSummary.ok_calls;
      primarySummary.failed_calls += expansionSummary.failed_calls;
      primarySummary.non_ok_statuses.push(...expansionSummary.non_ok_statuses);
      primarySummary.raw_results = rawResults;
    }
  }

  const queryAnalysis = analyzeGatewayQueryContext({
    q: input.query,
    city: input.city,
    property_type: input.propertyType,
    intent: input.intent,
  });

  const ranked = rankSearchGatewayResults(deduped, {
    q: input.query,
    city: input.city,
    property_type: input.propertyType,
    intent: queryAnalysis.intent,
  });
  const qualityOrdered = orderGatewayResultsByPageQuality(ranked);
  const categoryLimited = limitCategoryPagesPerSource(
    qualityOrdered,
    MAX_CATEGORY_PAGES_PER_SOURCE,
  );
  const diversified = diversifySearchGatewayResults(categoryLimited, 1).slice(
    0,
    MAX_FINAL_RESULTS,
  );
  const results = mapPublicResults(diversified);
  const providerIssue = classifyProviderIssue(primarySummary, deduped.length, results.length);

  return {
    response: {
      ok: true,
      degraded: providerIssue !== undefined && providerIssue !== "zero_results",
      provider: "serper",
      sources_queried: sourcesQueried,
      results_count: results.length,
      results,
    },
    provider_issue_classification: providerIssue,
  };
}
