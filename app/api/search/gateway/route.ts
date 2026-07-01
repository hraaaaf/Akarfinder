// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// API route for multi-source Search Gateway

import { type NextRequest, NextResponse } from "next/server";
import { buildSearchGatewayQueries } from "@/lib/search-gateway/search-gateway-query-builder";
import { normalizeSearchGatewayResult } from "@/lib/search-gateway/search-gateway-normalizer";
import { dedupeSearchGatewayResults } from "@/lib/search-gateway/search-gateway-dedupe";
import { getEnabledSearchGatewaySources } from "@/lib/search-gateway/search-gateway-sources";
import type { SearchGatewayRouteResponse } from "@/lib/search-gateway/search-gateway-types";

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
    // Call Search API with gatewayQueries
    let allResults: Array<any> = [];

    for (const gatewayQuery of gatewayQueries) {
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
        const resultsFromSource = (searchData.organic || searchData.results || []).map(
          (result: any) => ({
            ...result,
            source_id: gatewayQuery.source_id,
          })
        );

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

    const response: SearchGatewayRouteResponse = {
      ok: true,
      degraded: false,
      provider: "serper",
      sources_queried: gatewayQueries.map((q) => q.source_id),
      results_count: deduped.length,
      results: deduped,
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
