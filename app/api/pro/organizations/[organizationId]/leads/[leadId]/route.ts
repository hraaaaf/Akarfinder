import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import { updateAssignedProfessionalLead } from "@/lib/professional/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ organizationId: string; leadId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { organizationId, leadId } = await context.params;
    const patch = await request.json().catch(() => null);
    if (!patch || typeof patch !== "object") {
      return NextResponse.json({ error: "INVALID_PATCH" }, { status: 400 });
    }

    const lead = await updateAssignedProfessionalLead(
      identity.user_id,
      organizationId,
      leadId,
      patch as { status?: unknown; internal_notes?: unknown },
    );
    if (!lead) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "LEAD_NOT_ASSIGNED") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "INVALID_LEAD_STATUS" || message === "EMPTY_LEAD_UPDATE") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/pro/leads/:leadId] failed", error);
    return NextResponse.json({ error: "LEAD_UPDATE_FAILED" }, { status: 503 });
  }
}
