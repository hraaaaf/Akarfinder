import { type NextRequest, NextResponse } from "next/server";

import { searchPublicRepresentations } from "@/lib/search-gateway/public-search-cursor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function optionalString(value: string | null): string | undefined {
  return value?.trim() || undefined;
}

function optionalNumber(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  try {
    const page = await searchPublicRepresentations({
      q: optionalString(params.get("q")),
      city: optionalString(params.get("city")),
      propertyType: optionalString(params.get("property_type")),
      intent: optionalString(params.get("intent")),
      minPrice: optionalNumber(params.get("min_price")),
      maxPrice: optionalNumber(params.get("max_price")),
      minSurface: optionalNumber(params.get("min_surface")),
      maxSurface: optionalNumber(params.get("max_surface")),
      limit: positiveInt(params.get("limit"), 50),
      cursor: optionalString(params.get("cursor")),
    });

    return NextResponse.json({
      ok: true,
      degraded: false,
      source: "public_search_representations_v1",
      ...page,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "public_search_unknown_error";
    const invalidCursor = message.startsWith("invalid_search_cursor");
    console.error("[api/search/public-index]", error);
    return NextResponse.json(
      {
        ok: false,
        degraded: false,
        reason: invalidCursor ? "invalid_cursor" : "public_search_unavailable",
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
