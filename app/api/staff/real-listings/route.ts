// REAL-LISTINGS-ONLY-1
// Staff-only read model for inspecting observed real listing rows without
// granting any public publication right.

import { type NextRequest, NextResponse } from "next/server";
import { authenticateBearerRequest } from "@/lib/auth/server-auth";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function boundedInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: NextRequest) {
  const identity = await authenticateBearerRequest(request);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!identity.is_akarfinder_staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const limit = Math.max(1, boundedInt(request.nextUrl.searchParams.get("limit"), 100, 250));
  const offset = boundedInt(request.nextUrl.searchParams.get("offset"), 0, 1_000_000);
  const source = request.nextUrl.searchParams.get("source")?.trim().toLowerCase() || null;
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("listing_sources")
    .select(
      "source_name, listing_url, source_url, origin_type, compliance_status, is_active, property_listing_id, property_listings!inner(id,title,price_mad,city,district,property_type,transaction_type,surface_m2,images_count,thumbnail_url,updated_at)",
      { count: "exact" },
    )
    .eq("is_active", true)
    .order("property_listing_id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (source) query = query.ilike("source_name", source);

  const { data, error, count } = await query;
  if (error) {
    console.error("[staff/real-listings]", error);
    return NextResponse.json({ error: "reservoir_read_failed" }, { status: 500 });
  }

  return NextResponse.json({
    mode: "staff_read_only",
    public_authorization_granted: false,
    total: count ?? 0,
    limit,
    offset,
    results: data ?? [],
  });
}
