import { NextResponse, type NextRequest } from "next/server";
import { COMPANION_STATES, createCompanionSession, transitionCompanionSession, type CompanionEvent, type CompanionSession } from "@/lib/companion-v1/state-machine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function looksLikeSession(value: unknown): value is CompanionSession {
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  return raw.version === "1.0" && typeof raw.state === "string" && (COMPANION_STATES as readonly string[]).includes(raw.state) && typeof raw.revision === "number" && !!raw.profile && typeof raw.profile === "object";
}

function looksLikeEvent(value: unknown): value is CompanionEvent {
  return !!value && typeof value === "object" && typeof (value as Record<string, unknown>).type === "string";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || !looksLikeEvent(body.event)) return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
    const session = body.session == null ? createCompanionSession() : looksLikeSession(body.session) ? body.session : null;
    if (!session) return NextResponse.json({ error: "INVALID_SESSION" }, { status: 400 });
    const next = transitionCompanionSession(session, body.event);
    return NextResponse.json({ session: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "COMPANION_TRANSITION_FAILED";
    if (message.startsWith("COMPANION_INVALID_TRANSITION") || message.startsWith("COMPANION_PROFILE_NOT_READY") || message.startsWith("PROFILE_")) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    console.error("[api/companion/transition] failed", error);
    return NextResponse.json({ error: "COMPANION_TRANSITION_FAILED" }, { status: 500 });
  }
}
