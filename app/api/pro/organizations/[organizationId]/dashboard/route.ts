import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import { getProfessionalCommercialDashboard } from "@/lib/professional/commercial-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ organizationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { organizationId } = await context.params;
    const dashboard = await getProfessionalCommercialDashboard(identity.user_id, organizationId);
    if (!dashboard) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error("[api/pro/dashboard] failed", error);
    return NextResponse.json({ error: "DASHBOARD_UNAVAILABLE" }, { status: 503 });
  }
}
