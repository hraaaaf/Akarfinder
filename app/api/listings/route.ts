import { type NextRequest, NextResponse } from "next/server";
import { isAvailable, queryListings, type DbListingsQuery } from "@/lib/db";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import { assignDuplicateGroups } from "@/lib/listings/duplicate";
import { getDbProvider } from "@/lib/db/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseNumberParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayload(query: Required<Pick<DbListingsQuery, "limit" | "offset">>) {
  return {
    listings: [] as ReturnType<typeof mapDbRowToListing>[],
    total: 0,
    limit: query.limit,
    offset: query.offset,
    source: getDbProvider(),
    generated_at: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = {
    city: searchParams.get("city") ?? undefined,
    property_type: searchParams.get("property_type") ?? undefined,
    transaction_type: searchParams.get("transaction_type") ?? undefined,
    min_price: parseNumberParam(searchParams.get("min_price")),
    max_price: parseNumberParam(searchParams.get("max_price")),
    min_surface: parseNumberParam(searchParams.get("min_surface")),
    max_surface: parseNumberParam(searchParams.get("max_surface")),
    bedrooms: parseNumberParam(searchParams.get("bedrooms")),
    limit: parseNumberParam(searchParams.get("limit")) ?? 50,
    offset: parseNumberParam(searchParams.get("offset")) ?? 0,
  };

  if (!isAvailable()) {
    return NextResponse.json(buildPayload(query), { status: 503 });
  }

  try {
    const result = await queryListings(query);

    // P6: if all rows have persisted P6 scores, skip batch computation.
    const allPersisted = result.listings.every(
      (r) => r.reliability_score != null && r.duplicate_score != null
    );

    let enrichedListings;
    if (allPersisted) {
      enrichedListings = result.listings.map((r) => mapDbRowToListing(r));
    } else {
      // Fallback: P5 two-pass on-the-fly computation for rows without persisted values.
      const partialListings = result.listings.map((r) => mapDbRowToListing(r));
      const dupMap = assignDuplicateGroups(partialListings);
      enrichedListings = result.listings.map((r) =>
        mapDbRowToListing(r, dupMap.get(String(r.id)))
      );
    }

    return NextResponse.json({
      listings: enrichedListings,
      total: result.total,
      limit: query.limit,
      offset: query.offset,
      source: getDbProvider(),
      generated_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(buildPayload(query), { status: 500 });
  }
}
