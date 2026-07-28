import { after, type NextRequest, NextResponse } from "next/server";
import { searchListings, type SearchQuery, type SearchResult } from "@/lib/search";
import { searchPublicRepresentations } from "@/lib/search-gateway/public-search-cursor";
import {
  compareLegacyAndOdm,
  emitOdmDualReadMetric,
  shouldRunOdmDualRead,
} from "@/lib/odm/odm-dual-read-shadow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseNumberParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dualReadStableKey(query: SearchQuery): string {
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

function scheduleOdmDualReadShadow(query: SearchQuery, legacyResult: SearchResult): void {
  const stableKey = dualReadStableKey(query);
  if (!shouldRunOdmDualRead(stableKey)) return;

  after(async () => {
    try {
      const odmPage = await searchPublicRepresentations({
        q: query.q,
        city: query.city,
        propertyType: query.property_type,
        intent: query.transaction_type,
        minPrice: query.min_price,
        maxPrice: query.max_price,
        minSurface: query.min_surface,
        maxSurface: query.max_surface,
        limit: Math.min(query.limit ?? 50, 100),
      });
      emitOdmDualReadMetric(compareLegacyAndOdm(stableKey, legacyResult, odmPage));
    } catch (error) {
      const message = error instanceof Error ? error.message : "odm_dual_read_unknown_error";
      console.warn("[odm-dual-read-shadow:error]", JSON.stringify({
        version: "odm_dual_read_v1",
        error: message,
      }));
    }
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
    scheduleOdmDualReadShadow(query, legacyResult);
    return NextResponse.json(legacyResult);
  } catch (error) {
    console.error("[api/search] Search failed:", error);
    return NextResponse.json(
      {
        listings: [],
        total: 0,
        limit: query.limit,
        offset: query.offset,
        next_cursor: null,
        has_more: false,
        source: "database_fallback",
        generated_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
