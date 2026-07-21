import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest, requireAkarFinderStaff } from "@/lib/professional/auth";
import { setProfessionalActivationByStaff } from "@/lib/professional/commercial-repository";
import { parseStaffActivationInput } from "@/lib/professional/commercial-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ organizationId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!requireAkarFinderStaff(identity)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    const input = parseStaffActivationInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    const { organizationId } = await context.params;
    const organization = await setProfessionalActivationByStaff(identity!.user_id, organizationId, input);
    if (!organization) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ organization });
  } catch (error) {
    console.error("[api/admin/pro/activation] failed", error);
    return NextResponse.json({ error: "ACTIVATION_UPDATE_FAILED" }, { status: 503 });
  }
}
