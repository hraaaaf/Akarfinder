// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// API route for multi-source Search Gateway

import { type NextRequest, NextResponse } from "next/server";
import { buildSearchGatewayQueries } from "@/lib/search-gateway/search-gateway-query-builder";
import { normalizeSearchGatewayResult } from "@/lib/search-gateway/search-gateway-normalizer";
import { dedupeSearchGatewayResults } from "@/lib/search-gateway/search-gateway-dedupe";
import { rankSearchGatewayResults } from "@/lib/search-gateway/search-gateway-ranking";
import {
  limitCategoryPagesPerSource,
  diversifySearchGatewayResults,
} from "@/lib/search-gateway/search-gateway-diversify";
import { getEnabledSearchGatewaySources } from "@/lib/search-gateway/search-gateway-sources";
import type { SearchGatewayRouteResponse, SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseStringParam(value: string | null): string | undefined {
  return value?.trim() || undefined;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;

  const query = parseStringParam(searchParams.get("q"));
  const city = parseStringParam(searchParams.get("city"));
  const propertyType = parseStringParam(searchParams.get("property_type"));
  const intent = parseStringParam(searchParams.get("intent"));
  const sourcesParam = parseStringParam(searchParams.get("sources"));
  const sources = sourcesParam?.split(",").map((s) => s.trim()) || undefined;

  const enabledSources = getEnabledSearchGatewaySources();
  const sourcesQueried = enabledSources.map((s) => s.source_id);

  // Build queries
  const gatewayQueries = buildSearchGatewayQueries({
    q: query,
    city,
    property_type: propertyType,
    intent,
    sources,
  });

  // Check if provider is configured
  const searchApiKey = process.env.SEARCH_API_KEY;
  const searchApiEndpoint = process.env.SEARCH_API_ENDPOINT || "https://api.search.com/query";

  if (!searchApiKey) {
    const response: SearchGatewayRouteResponse = {
      ok: false,
      degraded: true,
      reason: "provider_not_configured",
      sources_queried: sourcesQueried,
      results_count: 0,
      results: [],
    };
    return NextResponse.json(response);
  }

  // If no queries to run, return empty results
  if (gatewayQueries.length === 0) {
    const response: SearchGatewayRouteResponse = {
      ok: true,
      degraded: false,
      provider: "serper",
      sources_queried: sourcesQueried,
      results_count: 0,
      results: [],
    };
    return NextResponse.json(response);
  }

  try {
    // Call Search API with gatewayQueries (SEARCH-GATEWAY-QUERY-TUNING-1)
    let allResults: Array<any> = [];
    const maxFinalResults = 30; // Limit total results to keep responses reasonable

    for (const gatewayQuery of gatewayQueries) {
      if (allResults.length >= maxFinalResults) break; // Stop if we have enough results

      try {
        const searchApiResponse = await fetch(
          `${searchApiEndpoint}?q=${encodeURIComponent(gatewayQuery.query)}&num=${gatewayQuery.max_results}`,
          {
            method: "GET",
            headers: {
              "X-API-KEY": searchApiKey,
              "User-Agent": "AkarFinder Search Gateway",
            },
          }
        );

        if (!searchApiResponse.ok) {
          continue; // Skip this source on error
        }

        const searchData = await searchApiResponse.json();
        const resultsFromSource = (searchData.organic || searchData.results || [])
          .slice(0, gatewayQuery.max_results) // Respect max_results per query
          .map((result: any) => ({
            ...result,
            source_id: gatewayQuery.source_id,
          }));

        allResults = allResults.concat(resultsFromSource);
      } catch (err) {
        // Log error but continue with other sources
        console.error(`[search-gateway] Error fetching from ${gatewayQuery.source_id}:`, err);
      }
    }

    // Normalize results
    const normalized = allResults
      .map((raw) => {
        const sourceId = raw.source_id || "unknown";
        return normalizeSearchGatewayResult(raw, sourceId);
      })
      .filter((r) => r !== null);

    // Dedupe
    const deduped = dedupeSearchGatewayResults(normalized);

    // Apply ranking (SEARCH-GATEWAY-MULTISOURCE-SERP-RANKING-1)
    const queryTerms = [query, city, propertyType].filter(Boolean) as string[];
    const ranked = rankSearchGatewayResults(deduped, queryTerms);

    // SERP-RESULT-QUALITY-DEGROUPING-1 — limit repeated source category pages,
    // then interleave sources so the SERP never reads as "grouped by source".
    const categoryLimited = limitCategoryPagesPerSource(ranked, 1);
    const diversified = diversifySearchGatewayResults(categoryLimited, 1);

    const results: SearchGatewayNormalizedResult[] = diversified.map((result) => ({
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

    const response: SearchGatewayRouteResponse = {
      ok: true,
      degraded: false,
      provider: "serper",
      sources_queried: gatewayQueries.map((q) => q.source_id),
      results_count: results.length,
      results: results,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/search/gateway] Error:", error);
    const response: SearchGatewayRouteResponse = {
      ok: false,
      degraded: true,
      reason: "provider_error",
      sources_queried: gatewayQueries.map((q) => q.source_id),
      results_count: 0,
      results: [],
    };
    return NextResponse.json(response, { status: 500 });
  }
}
