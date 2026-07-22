import { NextResponse, type NextRequest } from "next/server";
import { authenticateConsumerRequest } from "@/lib/auth/session-cookies";
import { executeContinuityAction, parseContinuityAction, readContinuityState } from "@/lib/user-continuity/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await authenticateConsumerRequest(request);
  if (!identity) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const state = await readContinuityState(identity.user_id);
    return NextResponse.json({ user: { id: identity.user_id, email: identity.email }, ...state });
  } catch (error) {
    console.error("[api/me/continuity] read failed", error);
    return NextResponse.json({ error: "CONTINUITY_READ_FAILED" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const identity = await authenticateConsumerRequest(request);
  if (!identity) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const action = parseContinuityAction(body);
  if (!action) return NextResponse.json({ error: "INVALID_CONTINUITY_ACTION" }, { status: 400 });

  try {
    const result = await executeContinuityAction(identity.user_id, action);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CONTINUITY_WRITE_FAILED";
    if (message === "PROJECT_NOT_OWNED") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[api/me/continuity] write failed", error);
    return NextResponse.json({ error: "CONTINUITY_WRITE_FAILED" }, { status: 500 });
  }
}
