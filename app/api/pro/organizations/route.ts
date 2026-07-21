import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import {
  createProfessionalOrganizationWithOwner,
  listProfessionalContextsForUser,
} from "@/lib/professional/repository";
import { parseCreateProfessionalOrganizationInput } from "@/lib/professional/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const contexts = await listProfessionalContextsForUser(identity.user_id);
    return NextResponse.json({
      organizations: contexts.map((context) => ({
        organization: context.organization,
        role: context.membership.role,
        permissions: context.permissions,
      })),
    });
  } catch (error) {
    console.error("[api/pro/organizations] GET failed", error);
    return NextResponse.json({ error: "PROFESSIONAL_CONTEXT_UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const parsed = parseCreateProfessionalOrganizationInput(await request.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const context = await createProfessionalOrganizationWithOwner(identity.user_id, parsed.value);
    return NextResponse.json({
      organization: context.organization,
      role: context.membership.role,
      permissions: context.permissions,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api/pro/organizations] POST failed", error);
    if (/duplicate|unique|slug/i.test(message)) {
      return NextResponse.json({ error: "SLUG_ALREADY_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ error: "ORGANIZATION_CREATE_FAILED" }, { status: 503 });
  }
}
