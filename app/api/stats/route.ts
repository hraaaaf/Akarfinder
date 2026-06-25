import { NextResponse } from "next/server";
import { queryStats } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await queryStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(
      { total_listings: 0, avg_completeness: 0, duplicates_detected: 0, avg_reliability: 0 },
      { status: 503 }
    );
  }
}
