// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// API route for multi-source Search Gateway
// SEARCH-GATEWAY-COVERAGE-EXPANSION-1 — parallel provider calls, num=10 per
// query, conditional intent-consistent backfill round, weak-page ordering,
// hard cap raised to 50 displayable results. Doctrine unchanged: external
// results stay thin previews (no contact, no gallery, original source CTA).

import { type NextRequest, NextResponse } from "next/server";
import { executeSearchGatewayWithCache } from "@/lib/search-gateway-cache/search-gateway-cache";
import {
  SEARCH_GATEWAY_CACHE_PROVIDER,
  type SearchGatewayProviderIssueClassification,
} from "@/lib/search-gateway-cache/types";
import { createSearchGatewayCacheStore } from "@/lib/search-gateway-cache/supabase-cache-store";
import { runSearchGatewayProviderSearch } from "@/lib/search-gateway/search-gateway-runner";
import { getEnabledSearchGatewaySources } from "@/lib/search-gateway/search-gateway-sources";
import type {
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;

  const query = parseStringParam(searchParams.get("q"));
  const city = parseStringParam(searchParams.get("city"));
  const propertyType = parseStringParam(searchParams.get("property_type"));
  const intent = parseStringParam(searchParams.get("intent"));
  const page = parsePositiveIntParam(searchParams.get("page"), 1);
  const locale = parseStringParam(searchParams.get("locale")) ?? "fr-MA";
  const sourcesParam = parseStringParam(searchParams.get("sources"));
  const sources = sourcesParam?.split(",").map((s) => s.trim()) || undefined;

  const enabledSources = getEnabledSearchGatewaySources();
  const sourcesQueried = enabledSources.map((s) => s.source_id);

  // Check if provider is configured
  const searchApiKey = process.env.SEARCH_API_KEY;
  const searchApiEndpoint = process.env.SEARCH_API_ENDPOINT || "https://api.search.com/query";
  const cacheStore = createSearchGatewayCacheStore();

  if (!searchApiKey) {
    const response = await executeSearchGatewayWithCache({
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
    });
    return NextResponse.json(response);
  }

  try {
    const response = await executeSearchGatewayWithCache({
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
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/search/gateway] Error:", error);
    const response: SearchGatewayRouteResponse = {
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
    return NextResponse.json(response);
  }
}
