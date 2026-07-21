import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import { listProfessionalContextsForUser } from "@/lib/professional/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const contexts = await listProfessionalContextsForUser(identity.user_id);
    return NextResponse.json({
      user: { id: identity.user_id, email: identity.email },
      organizations: contexts.map((context) => ({
        organization: context.organization,
        role: context.membership.role,
        membership_status: context.membership.status,
        permissions: context.permissions,
      })),
    });
  } catch (error) {
    console.error("[api/pro/me] failed", error);
    return NextResponse.json({ error: "PROFESSIONAL_CONTEXT_UNAVAILABLE" }, { status: 503 });
  }
}
