import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import { createPartnerMedia, listPartnerMedia } from "@/lib/professional/commercial-repository";
import { parsePartnerMediaInput } from "@/lib/professional/commercial-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ organizationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { organizationId } = await context.params;
    const media = await listPartnerMedia(identity.user_id, organizationId);
    if (!media) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ media });
  } catch (error) {
    console.error("[api/pro/media] list failed", error);
    return NextResponse.json({ error: "MEDIA_UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const input = parsePartnerMediaInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    const { organizationId } = await context.params;
    const media = await createPartnerMedia(identity.user_id, organizationId, input);
    if (!media) return NextResponse.json({ error: "FORBIDDEN_OR_NOT_ONBOARDING" }, { status: 403 });
    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    console.error("[api/pro/media] create failed", error);
    return NextResponse.json({ error: "MEDIA_CREATE_FAILED" }, { status: 503 });
  }
}
