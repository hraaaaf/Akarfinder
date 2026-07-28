import { after, type NextRequest, NextResponse } from "next/server";
import { searchListings, type SearchQuery, type SearchResult } from "@/lib/search";
import { runOdmDualReadShadow } from "@/lib/odm/odm-dual-read-runner";
import { shouldRunOdmDualRead } from "@/lib/odm/odm-dual-read-shadow";
import {
  mapOdmPageToSearchResult,
  shouldServeOdmPublicCanary,
} from "@/lib/odm/odm-public-canary";
import { searchPublicRepresentations } from "@/lib/search-gateway/public-search-cursor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The legacy search can consume most of the default serverless window before
// the non-blocking ODM shadow callback begins. Reserve enough execution time
// for the RPC, comparison and private telemetry write to complete.
export const maxDuration = 60;

function parseNumberParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stableSearchKey(query: SearchQuery): string {
  return JSON.stringify({
    q: query.q ?? null,
    city: query.city ?? null,
    property_type: query.property_type ?? null,
    transaction_type: query.transaction_type ?? null,
    min_price: query.min_price ?? null,
    max_price: query.max_price ?? null,
    min_surface: query.min_surface ?? null,
    max_surface: query.max_surface ?? null,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  });
}

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

function scheduleOdmDualReadShadow(query: SearchQuery, legacyResult: SearchResult): void {
  const stableKey = stableSearchKey(query);
  if (!shouldRunOdmDualRead(stableKey)) return;

  after(async () => {
    await runOdmDualReadShadow({
      stableKey,
      legacyResult,
      odmInput: odmInput(query),
    });
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query: SearchQuery = {
    q: searchParams.get("q") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    property_type: searchParams.get("property_type") ?? undefined,
    transaction_type: searchParams.get("transaction_type") ?? undefined,
    minReliabilityScore: parseNumberParam(searchParams.get("minReliabilityScore")),
    reliability_badge: searchParams.get("reliability_badge") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    limit: parseNumberParam(searchParams.get("limit")) ?? 50,
    offset: parseNumberParam(searchParams.get("offset")) ?? 0,
    cursor: parseNumberParam(searchParams.get("cursor")),
    min_price: parseNumberParam(searchParams.get("min_price")) ?? parseNumberParam(searchParams.get("budget_min")),
    max_price: parseNumberParam(searchParams.get("max_price")) ?? parseNumberParam(searchParams.get("budget_max")),
    min_surface: parseNumberParam(searchParams.get("min_surface")),
    max_surface: parseNumberParam(searchParams.get("max_surface")),
  };

  try {
    const legacyResult = await searchListings(query);
    const stableKey = stableSearchKey(query);

    if (shouldServeOdmPublicCanary(stableKey)) {
      try {
        const odmPage = await searchPublicRepresentations(odmInput(query));
        return NextResponse.json(mapOdmPageToSearchResult(odmPage, query));
      } catch (error) {
        console.warn("[odm-public-canary:fallback]", error);
        return NextResponse.json(legacyResult);
      }
    }

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
