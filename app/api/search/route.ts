import { type NextRequest, NextResponse } from "next/server";
import { searchListings, type SearchQuery } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseNumberParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
    return NextResponse.json(await searchListings(query));
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
