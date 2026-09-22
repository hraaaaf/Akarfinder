// REAL-LISTINGS-ONLY-1
// Public Search Gateway serves only the canonical policy-gated Thin Index.
// Query-time providers remain intelligence inputs and never auto-publish.

import { type NextRequest, NextResponse } from "next/server";
import { searchPublicRepresentations } from "@/lib/search-gateway/public-search-cursor";

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

  try {
    const indexedPage = await searchPublicRepresentations({
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
    });

    return NextResponse.json({
      ok: true,
      degraded: false,
      reason: null,
      provider: "policy_safe_thin_index",
      sources_queried: ["thin_index"],
      ...indexedPage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "public_search_unknown_error";
    const invalidCursor = message.startsWith("invalid_search_cursor");
    console.error("[api/search/gateway:real-listings-only]", error);
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
