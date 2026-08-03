import { after, type NextRequest, NextResponse } from "next/server";
import { searchListings, type SearchQuery, type SearchResult } from "@/lib/search";
import { runOdmDualReadShadow } from "@/lib/odm/odm-dual-read-runner";
import {
  shouldRunOdmDualRead,
  type OdmShadowSearchContext,
} from "@/lib/odm/odm-dual-read-shadow";
import {
  mapOdmPageToSearchResult,
  shouldServeOdmPublicCanary,
} from "@/lib/odm/odm-public-canary";
import { searchPublicRepresentations } from "@/lib/search-gateway/public-search-cursor";
import {
  buildSearchRequestQuery,
  buildSearchStableKey,
} from "@/lib/search/search-request-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The legacy search can consume most of the default serverless window before
// the non-blocking ODM shadow callback begins. Reserve enough execution time
// for the RPC, comparison and private telemetry write to complete.
export const maxDuration = 60;

function odmInput(query: SearchQuery) {
  return {
    q: query.q,
    city: query.city,
    propertyType: query.property_type,
    intent: query.transaction_type,
    minPrice: query.min_price,
    maxPrice: query.max_price,
    minSurface: query.min_surface,
    maxSurface: query.max_surface,
    limit: Math.min(query.limit ?? 50, 100),
  };
}

function shadowContext(query: SearchQuery): OdmShadowSearchContext {
  const offset = query.offset ?? 0;
  return {
    city: query.city?.trim() || null,
    property_type: query.property_type?.trim() || null,
    transaction_type: query.transaction_type?.trim() || null,
    has_text_query: Boolean(query.q?.trim()),
    has_price_filter: query.min_price !== undefined || query.max_price !== undefined,
    has_surface_filter: query.min_surface !== undefined || query.max_surface !== undefined,
    limit: query.limit ?? null,
    offset,
    is_paginated: offset > 0 || query.cursor !== undefined,
  };
}

function scheduleOdmDualReadShadow(query: SearchQuery, legacyResult: SearchResult): void {
  const stableKey = buildSearchStableKey(query);
  if (!shouldRunOdmDualRead(stableKey)) return;

  after(async () => {
    await runOdmDualReadShadow({
      stableKey,
      legacyResult,
      odmInput: odmInput(query),
      context: shadowContext(query),
    });
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = buildSearchRequestQuery(
    (name) => searchParams.get(name) ?? undefined,
  );
  const stableKey = buildSearchStableKey(query);

  try {
    if (shouldServeOdmPublicCanary(stableKey)) {
      try {
        const odmPage = await searchPublicRepresentations(odmInput(query));
        return NextResponse.json(mapOdmPageToSearchResult(odmPage, query));
      } catch (error) {
        console.warn("[odm-public-canary:fallback]", error);
        const legacyFallback = await searchListings(query);
        return NextResponse.json(legacyFallback);
      }
    }

    const legacyResult = await searchListings(query);
    scheduleOdmDualReadShadow(query, legacyResult);
    return NextResponse.json(legacyResult);
  } catch (error) {
    console.error("[api/search] Search failed:", error);
    return NextResponse.json({
      listings: [], total: 0, limit: query.limit, offset: query.offset,
      next_cursor: null, has_more: false, source: "database_fallback",
      generated_at: new Date().toISOString(),
    }, { status: 500 });
  }
}
