import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import {
  requestApprovedPartnerPublication,
  savePartnerPropertySubmission,
  submitPartnerPropertyForReview,
} from "@/lib/professional/commercial-repository";
import { parseSavePartnerSubmission } from "@/lib/professional/commercial-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ organizationId: string; submissionId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { organizationId, submissionId } = await context.params;
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body.action !== "string") return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

    if (body.action === "save") {
      const input = parseSavePartnerSubmission(body);
      if (!input) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
      const submission = await savePartnerPropertySubmission(identity.user_id, organizationId, submissionId, input);
      if (!submission) return NextResponse.json({ error: "FORBIDDEN_OR_NOT_FOUND" }, { status: 403 });
      return NextResponse.json({ submission });
    }

    if (body.action === "submit_for_review") {
      const result = await submitPartnerPropertyForReview(identity.user_id, organizationId, submissionId);
      if (!result) return NextResponse.json({ error: "FORBIDDEN_OR_NOT_FOUND" }, { status: 403 });
      if (!result.ok) return NextResponse.json({ error: "INCOMPLETE_SUBMISSION", ...result }, { status: 422 });
      return NextResponse.json(result);
    }

    if (body.action === "request_publication") {
      const result = await requestApprovedPartnerPublication(identity.user_id, organizationId, submissionId);
      if (!result) return NextResponse.json({ error: "FORBIDDEN_OR_NOT_FOUND" }, { status: 403 });
      if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message === "SUBMISSION_NOT_EDITABLE" || message === "SUBMISSION_NOT_SUBMITTABLE") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error("[api/pro/submission] lifecycle failed", error);
    return NextResponse.json({ error: "SUBMISSION_UPDATE_FAILED" }, { status: 503 });
  }
}
