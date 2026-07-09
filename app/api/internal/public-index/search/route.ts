import { NextResponse, type NextRequest } from "next/server";
import { createPublicPropertyIndexStore, PUBLIC_PROPERTY_INDEX_FIXTURES } from "@/lib/public-property-index/index-store";
import type { PublicPropertyIndexSearchQuery, PublicPropertyIndexSearchResponse } from "@/lib/public-property-index/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseNumberParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseStringParam(value: string | null): string | undefined {
  return value?.trim() || undefined;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const query: PublicPropertyIndexSearchQuery = {
    q: parseStringParam(searchParams.get("q")),
    city: parseStringParam(searchParams.get("city")),
    neighborhood: parseStringParam(searchParams.get("neighborhood")),
    property_type: parseStringParam(searchParams.get("property_type")),
    transaction_type: parseStringParam(searchParams.get("transaction_type")),
    limit: parseNumberParam(searchParams.get("limit")),
  };

  const store = createPublicPropertyIndexStore({
    env: process.env,
    seedRecords: PUBLIC_PROPERTY_INDEX_FIXTURES,
  });
  const results = await store.search(query);

  const payload: PublicPropertyIndexSearchResponse = {
    ok: true,
    source: "public_property_index_poc",
    results_label: "Résultats publics observés",
    results,
  };

  return NextResponse.json(payload);
}
