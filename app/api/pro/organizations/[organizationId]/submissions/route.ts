import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import { createPartnerPropertySubmission, listPartnerPropertySubmissions } from "@/lib/professional/commercial-repository";
import { parseCreatePartnerSubmission } from "@/lib/professional/commercial-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ organizationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { organizationId } = await context.params;
    const submissions = await listPartnerPropertySubmissions(identity.user_id, organizationId);
    if (!submissions) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("[api/pro/submissions] list failed", error);
    return NextResponse.json({ error: "SUBMISSIONS_UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const input = parseCreatePartnerSubmission(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    const { organizationId } = await context.params;
    const submission = await createPartnerPropertySubmission(identity.user_id, organizationId, input);
    if (!submission) return NextResponse.json({ error: "FORBIDDEN_OR_NOT_ONBOARDING" }, { status: 403 });
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("[api/pro/submissions] create failed", error);
    return NextResponse.json({ error: "SUBMISSION_CREATE_FAILED" }, { status: 503 });
  }
}
