import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import { requireProfessionalPermission } from "@/lib/professional/repository";
import { updateProfessionalOrganizationProfile } from "@/lib/professional/profile-service";
import { parseUpdateProfessionalProfileInput } from "@/lib/professional/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { organizationId } = await context.params;
    const professionalContext = await requireProfessionalPermission(identity.user_id, organizationId, "organization.read");
    if (!professionalContext) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({
      organization: professionalContext.organization,
      role: professionalContext.membership.role,
      permissions: professionalContext.permissions,
    });
  } catch (error) {
    console.error("[api/pro/organizations/:id] GET failed", error);
    return NextResponse.json({ error: "ORGANIZATION_UNAVAILABLE" }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { organizationId } = await context.params;
    const input = parseUpdateProfessionalProfileInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ error: "INVALID_PROFILE_UPDATE" }, { status: 400 });

    const organization = await updateProfessionalOrganizationProfile(identity.user_id, organizationId, input);
    if (!organization) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ organization });
  } catch (error) {
    console.error("[api/pro/organizations/:id] PATCH failed", error);
    return NextResponse.json({ error: "PROFILE_UPDATE_FAILED" }, { status: 503 });
  }
}
