import { NextResponse, type NextRequest } from "next/server";
import { resolveProfessionalServerContext } from "@/lib/professional/server-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const preferredOrganizationId = request.nextUrl.searchParams.get("organization_id");
    const serverContext = await resolveProfessionalServerContext(request, preferredOrganizationId);
    if (!serverContext) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { identity, resolution } = serverContext;
    return NextResponse.json({
      user: { id: identity.user_id, email: identity.email },
      active_organization_id: resolution.active_context?.organization.id ?? null,
      selection_source: resolution.selection_source,
      organizations: resolution.available_contexts.map((context) => ({
        organization: context.organization,
        role: context.membership.role,
        membership_status: context.membership.status,
        workspace_status: context.workspace_status,
        has_active_owner: context.has_active_owner,
        permissions: context.permissions,
        capabilities: context.capabilities,
        is_active: context.organization.id === resolution.active_context?.organization.id,
      })),
    });
  } catch (error) {
    console.error("[api/pro/me] failed", error);
    return NextResponse.json({ error: "PROFESSIONAL_CONTEXT_UNAVAILABLE" }, { status: 503 });
  }
}
