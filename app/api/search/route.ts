import { after, type NextRequest, NextResponse } from "next/server";
import type { SearchQuery, SearchResult } from "@/lib/search";
import { runOdmDualReadShadow } from "@/lib/odm/odm-dual-read-runner";
import {
  shouldRunOdmDualRead,
  type OdmShadowSearchContext,
} from "@/lib/odm/odm-dual-read-shadow";
import {
  buildOdmPublicSearchInput,
  routePublicSearch,
} from "@/lib/odm/odm-public-routing";
import { searchPublicRepresentationsWithOwner } from "@/lib/search-gateway/public-search-with-owner";
import {
  buildSearchRequestQuery,
  buildSearchStableKey,
} from "@/lib/search/search-request-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
      odmInput: buildOdmPublicSearchInput(query),
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
    const routed = await routePublicSearch({
      stableKey,
      publicQuery: query,
      surface: "api_search",
    }, {
      searchOdm: searchPublicRepresentationsWithOwner,
    });

    if (routed.lane === "legacy_primary") {
      scheduleOdmDualReadShadow(query, routed.result);
    }

    return NextResponse.json(routed.result);
  } catch (error) {
    console.error("[api/search] Search failed:", error);
    return NextResponse.json({
      listings: [], total: 0, limit: query.limit, offset: query.offset,
      next_cursor: null, has_more: false, source: "database_fallback",
      generated_at: new Date().toISOString(),
    }, { status: 500 });
  }
}
