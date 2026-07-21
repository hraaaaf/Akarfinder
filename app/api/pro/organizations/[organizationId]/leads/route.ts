import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import { listAssignedProfessionalLeads } from "@/lib/professional/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { organizationId } = await context.params;
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
    const leads = await listAssignedProfessionalLeads(identity.user_id, organizationId, limit);
    if (!leads) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ leads });
  } catch (error) {
    console.error("[api/pro/leads] failed", error);
    return NextResponse.json({ error: "LEADS_UNAVAILABLE" }, { status: 503 });
  }
}
