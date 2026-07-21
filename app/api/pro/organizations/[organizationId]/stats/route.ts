import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import { getProfessionalPrivateStats } from "@/lib/professional/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { organizationId } = await context.params;
    const stats = await getProfessionalPrivateStats(identity.user_id, organizationId);
    if (!stats) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("[api/pro/stats] failed", error);
    return NextResponse.json({ error: "STATS_UNAVAILABLE" }, { status: 503 });
  }
}
