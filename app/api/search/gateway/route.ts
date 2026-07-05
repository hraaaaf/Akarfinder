// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// API route for multi-source Search Gateway
// SEARCH-GATEWAY-COVERAGE-EXPANSION-1 — parallel provider calls, num=10 per
// query, conditional intent-consistent backfill round, weak-page ordering,
// hard cap raised to 50 displayable results. Doctrine unchanged: external
// results stay thin previews (no contact, no gallery, original source CTA).

import { type NextRequest, NextResponse } from "next/server";
import { buildSearchGatewayQueries } from "@/lib/search-gateway/search-gateway-query-builder";
import { buildExpansionQueries } from "@/lib/search-gateway/search-gateway-query-expansion";
import { normalizeSearchGatewayResult } from "@/lib/search-gateway/search-gateway-normalizer";
import { dedupeSearchGatewayResults } from "@/lib/search-gateway/search-gateway-dedupe";
import { rankSearchGatewayResults } from "@/lib/search-gateway/search-gateway-ranking";
import { orderGatewayResultsByPageQuality } from "@/lib/search-gateway/search-gateway-page-quality";
import {
  limitCategoryPagesPerSource,
  diversifySearchGatewayResults,
} from "@/lib/search-gateway/search-gateway-diversify";
import { parseRouteIntent } from "@/lib/search-gateway/search-gateway-intent";
import { getEnabledSearchGatewaySources } from "@/lib/search-gateway/search-gateway-sources";
import type {
  SearchGatewayRouteResponse,
  SearchGatewayNormalizedResult,
  SearchGatewayQuery,
  SearchGatewayRawResult,
} from "@/lib/search-gateway/search-gateway-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Coverage targets (SEARCH-GATEWAY-COVERAGE-EXPANSION-1)
const RESULTS_PER_QUERY = 10; // Serper num=10 costs the same credit as num=5
const MAX_FINAL_RESULTS = 50; // hard display cap
const EXPANSION_THRESHOLD = 30; // run the backfill round only below this
const MAX_CATEGORY_PAGES_PER_SOURCE = 3; // category pages are the volume backbone
const PROVIDER_TIMEOUT_MS = 8000;

function parseStringParam(value: string | null): string | undefined {
  return value?.trim() || undefined;
}

type RawProviderResult = SearchGatewayRawResult & { source_id: string };

async function fetchGatewayQueries(
  queries: SearchGatewayQuery[],
  endpoint: string,
  apiKey: string,
): Promise<RawProviderResult[]> {
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
      if (!response.ok) return [];
      const data = await response.json();
      return ((data.organic || data.results || []) as SearchGatewayRawResult[])
        .slice(0, gatewayQuery.max_results)
        .map((result) => ({ ...result, source_id: gatewayQuery.source_id }));
    }),
  );

  const all: RawProviderResult[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      all.push(...outcome.value);
    } else {
      console.error("[search-gateway] provider call failed:", outcome.reason);
    }
  }
  return all;
}

function normalizeRaw(raw: RawProviderResult[]): SearchGatewayNormalizedResult[] {
  return raw
    .map((item) => normalizeSearchGatewayResult(item, item.source_id || "unknown"))
    .filter((r): r is SearchGatewayNormalizedResult => r !== null);
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

  // Build primary queries
  const gatewayQueries = buildSearchGatewayQueries({
    q: query,
    city,
    property_type: propertyType,
    intent,
    sources,
    max_results_per_source: RESULTS_PER_QUERY,
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
    // Round 1 — primary queries, in parallel (fail-soft per call).
    const primaryRaw = await fetchGatewayQueries(gatewayQueries, searchApiEndpoint, searchApiKey);
    let deduped = dedupeSearchGatewayResults(normalizeRaw(primaryRaw));

    // Round 2 — intent-consistent backfill, only if coverage is short.
    if (query && deduped.length < EXPANSION_THRESHOLD) {
      const usedQueries = new Set(gatewayQueries.map((g) => g.query));
      const expansionQueries = buildExpansionQueries(
        query,
        enabledSources,
        usedQueries,
        RESULTS_PER_QUERY,
      );
      if (expansionQueries.length > 0) {
        const expansionRaw = await fetchGatewayQueries(
          expansionQueries,
          searchApiEndpoint,
          searchApiKey,
        );
        deduped = dedupeSearchGatewayResults([...deduped, ...normalizeRaw(expansionRaw)]);
      }
    }

    // Apply ranking (SEARCH-GATEWAY-MULTISOURCE-SERP-RANKING-1)
    // Route intent (buy/rent/new) — SEARCH-GATEWAY-INTENT-TEST-HARDENING-1 —
    // favors /acheter, /louer, /neuf signals without ever dropping results.
    const queryTerms = [query, city, propertyType].filter(Boolean) as string[];
    const routeIntent = parseRouteIntent(intent);
    const ranked = rankSearchGatewayResults(deduped, queryTerms, routeIntent);

    // SEARCH-GATEWAY-COVERAGE-EXPANSION-1 — drop rejected pages (staging,
    // portal homepages, blogs) and move price-reference pages to the end.
    const qualityOrdered = orderGatewayResultsByPageQuality(ranked);

    // SERP-RESULT-QUALITY-DEGROUPING-1 — limit repeated source category pages,
    // then interleave sources so the SERP never reads as "grouped by source".
    const categoryLimited = limitCategoryPagesPerSource(
      qualityOrdered,
      MAX_CATEGORY_PAGES_PER_SOURCE,
    );
    const diversified = diversifySearchGatewayResults(categoryLimited, 1).slice(
      0,
      MAX_FINAL_RESULTS,
    );

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
