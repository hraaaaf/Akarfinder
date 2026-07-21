import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import { addProfessionalMember, listProfessionalMembers } from "@/lib/professional/repository";
import { parseAddProfessionalMemberInput } from "@/lib/professional/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { organizationId } = await context.params;
    const members = await listProfessionalMembers(identity.user_id, organizationId);
    if (!members) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ members });
  } catch (error) {
    console.error("[api/pro/members] GET failed", error);
    return NextResponse.json({ error: "MEMBERS_UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { organizationId } = await context.params;
    const input = parseAddProfessionalMemberInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ error: "INVALID_MEMBER_INPUT" }, { status: 400 });

    const member = await addProfessionalMember(identity.user_id, organizationId, input.user_id, input.role);
    if (!member) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "OWNER_ROLE_REQUIRES_OWNER") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api/pro/members] POST failed", error);
    return NextResponse.json({ error: "MEMBER_UPDATE_FAILED" }, { status: 503 });
  }
}
