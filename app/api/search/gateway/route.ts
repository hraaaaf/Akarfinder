// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// API route for multi-source Search Gateway
// SEARCH-GATEWAY-COVERAGE-EXPANSION-1 — parallel provider calls, num=10 per
// query, conditional intent-consistent backfill round, weak-page ordering.
// ODM-09C — the certified Thin Index is now traversed through the signed,
// lane-aware cursor contract instead of the legacy capped seed scan.

import { type NextRequest, NextResponse } from "next/server";
import { executeSearchGatewayWithCache } from "@/lib/search-gateway-cache/search-gateway-cache";
import {
  SEARCH_GATEWAY_CACHE_PROVIDER,
  type SearchGatewayProviderIssueClassification,
} from "@/lib/search-gateway-cache/types";
import { createSearchGatewayCacheStore } from "@/lib/search-gateway-cache/supabase-cache-store";
import { searchPublicRepresentations } from "@/lib/search-gateway/public-search-cursor";
import { runSearchGatewayProviderSearch } from "@/lib/search-gateway/search-gateway-runner";
import { getEnabledSearchGatewaySources } from "@/lib/search-gateway/search-gateway-sources";
import { appendSeedThinIndexResults } from "@/lib/search-gateway/seed-thin-index";
import type {
  SearchGatewayNormalizedResult,
  SearchGatewayRouteResponse,
} from "@/lib/search-gateway/search-gateway-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseStringParam(value: string | null): string | undefined {
  return value?.trim() || undefined;
}

function parsePositiveIntParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalNumber(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function mergeGatewayResults(
  liveResults: SearchGatewayNormalizedResult[],
  indexedResults: SearchGatewayNormalizedResult[],
): SearchGatewayNormalizedResult[] {
  const merged = new Map<string, SearchGatewayNormalizedResult>();
  for (const result of [...liveResults, ...indexedResults]) {
    const key = result.original_url || result.display_url || result.id;
    if (!merged.has(key)) merged.set(key, result);
  }
  return [...merged.values()];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;

  const query = parseStringParam(searchParams.get("q"));
  const city = parseStringParam(searchParams.get("city"));
  const district = parseStringParam(searchParams.get("district"));
  const propertyType = parseStringParam(searchParams.get("property_type"));
  const intent = parseStringParam(searchParams.get("intent"));
  const cursor = parseStringParam(searchParams.get("cursor"));
  const limit = parsePositiveIntParam(searchParams.get("limit"), 100);
  const minPrice = parseOptionalNumber(searchParams.get("min_price"));
  const maxPrice = parseOptionalNumber(searchParams.get("max_price"));
  const minSurface = parseOptionalNumber(searchParams.get("min_surface"));
  const maxSurface = parseOptionalNumber(searchParams.get("max_surface"));
  const page = parsePositiveIntParam(searchParams.get("page"), 1);
  const locale = parseStringParam(searchParams.get("locale")) ?? "fr-MA";
  const sourcesParam = parseStringParam(searchParams.get("sources"));
  const sources = sourcesParam?.split(",").map((source) => source.trim()) || undefined;

  // SEARCH-GEO-CONTRACT-P1A.2: this gateway combines external live providers
  // and the ODM thin index, neither of which currently carries an authoritative
  // district field. Never widen a structured neighborhood request to city-level
  // results. The canonical /api/search route owns district-capable Search today.
  if (district) {
    return NextResponse.json({
      ok: true,
      degraded: false,
      reason: "district_requires_structured_search",
      sources_queried: [],
      results_count: 0,
      total_count: 0,
      has_more: false,
      next_cursor: null,
      results: [],
    });
  }

  const publicSearchInput = {
    q: query,
    city,
    propertyType,
    intent,
    minPrice,
    maxPrice,
    minSurface,
    maxSurface,
    limit,
    cursor,
  };

  // Cursor pages must not replay live-provider calls. They continue only the
  // deterministic Thin Index traversal represented by the signed cursor.
  if (cursor) {
    try {
      const indexedPage = await searchPublicRepresentations(publicSearchInput);
      return NextResponse.json({
        ok: true,
        degraded: false,
        reason: null,
        sources_queried: ["thin_index"],
        ...indexedPage,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "public_search_unknown_error";
      const invalidCursor = message.startsWith("invalid_search_cursor");
      console.error("[api/search/gateway:cursor]", error);
      return NextResponse.json(
        {
          ok: false,
          degraded: false,
          reason: invalidCursor ? "invalid_cursor" : "public_search_unavailable",
          sources_queried: ["thin_index"],
          results_count: 0,
          total_count: 0,
          has_more: false,
          next_cursor: null,
          results: [],
        },
        { status: invalidCursor ? 400 : 503 },
      );
    }
  }

  const enabledSources = getEnabledSearchGatewaySources();
  const sourcesQueried = enabledSources.map((source) => source.source_id);
  const legacySeedInput = { q: query, city, propertyType, intent, maxResults: limit };
  const searchApiKey = process.env.SEARCH_API_KEY;
  const searchApiEndpoint = process.env.SEARCH_API_ENDPOINT || "https://api.search.com/query";
  const cacheStore = createSearchGatewayCacheStore();

  let gatewayResponse: SearchGatewayRouteResponse;

  if (!searchApiKey) {
    gatewayResponse = await executeSearchGatewayWithCache({
      cacheContext: {
        provider: SEARCH_GATEWAY_CACHE_PROVIDER,
        query,
        city,
        property_type: propertyType,
        transaction_type: intent,
        page,
        locale,
      },
      cacheStore,
      executeFresh: async () => ({
        response: {
          ok: false,
          degraded: true,
          reason: "provider_not_configured",
          sources_queried: sourcesQueried,
          results_count: 0,
          results: [],
        },
        provider_issue_classification: "provider_error",
      }),
    }) as SearchGatewayRouteResponse;
  } else {
    try {
      gatewayResponse = await executeSearchGatewayWithCache({
        cacheContext: {
          provider: SEARCH_GATEWAY_CACHE_PROVIDER,
          query,
          city,
          property_type: propertyType,
          transaction_type: intent,
          page,
          locale,
        },
        cacheStore,
        executeFresh: async () =>
          runSearchGatewayProviderSearch({
            query,
            city,
            propertyType,
            intent,
            sources,
            endpoint: searchApiEndpoint,
            apiKey: searchApiKey,
          }),
      }) as SearchGatewayRouteResponse;
    } catch (error) {
      console.error("[api/search/gateway] Error:", error);
      gatewayResponse = {
        ok: false,
        degraded: true,
        reason: "provider_error",
        sources_queried: sourcesQueried,
        results_count: 0,
        results: [],
        cache: {
          status: "error",
          provider: SEARCH_GATEWAY_CACHE_PROVIDER,
          provider_issue_classification: "provider_error" satisfies SearchGatewayProviderIssueClassification,
        },
      };
    }
  }

  try {
    const indexedPage = await searchPublicRepresentations(publicSearchInput);
    const results = mergeGatewayResults(gatewayResponse.results, indexedPage.results);
    return NextResponse.json({
      ...gatewayResponse,
      ok: results.length > 0 || gatewayResponse.ok,
      degraded: gatewayResponse.degraded,
      sources_queried: [...new Set([...gatewayResponse.sources_queried, "thin_index"])],
      results,
      results_count: results.length,
      total_count: indexedPage.total_count,
      has_more: indexedPage.has_more,
      next_cursor: indexedPage.next_cursor,
    });
  } catch (error) {
    console.error("[api/search/gateway:public-index]", error);
    // Temporary backward-compatible fallback while environments receive the
    // additive ODM-09B migration. This path remains capped and must disappear
    // once the canonical Supabase project is migrated and verified.
    const fallback = await appendSeedThinIndexResults(gatewayResponse, legacySeedInput);
    return NextResponse.json({
      ...fallback,
      total_count: fallback.results_count,
      has_more: false,
      next_cursor: null,
      public_index_degraded: true,
    });
  }
}
