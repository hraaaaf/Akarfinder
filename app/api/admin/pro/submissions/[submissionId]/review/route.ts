import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest, requireAkarFinderStaff } from "@/lib/professional/auth";
import { reviewPartnerPropertySubmissionByStaff } from "@/lib/professional/commercial-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ submissionId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!requireAkarFinderStaff(identity)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || (body.decision !== "approved" && body.decision !== "rejected")) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }
    const { submissionId } = await context.params;
    const submission = await reviewPartnerPropertySubmissionByStaff(
      identity!.user_id,
      submissionId,
      body.decision,
      typeof body.rejection_reason === "string" ? body.rejection_reason : null,
    );
    if (!submission) return NextResponse.json({ error: "NOT_FOUND_OR_NOT_IN_REVIEW" }, { status: 404 });
    return NextResponse.json({ submission });
  } catch (error) {
    console.error("[api/admin/pro/submission-review] failed", error);
    return NextResponse.json({ error: "REVIEW_FAILED" }, { status: 503 });
  }
}
