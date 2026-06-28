// OVERNIGHT-MVP-HARDENING-1 — Phase 2 : POST /api/track.
// Reçoit un évènement de conversion depuis le client et l'enregistre (best-effort).
// Ne renvoie jamais d'erreur bloquante : { ok: true } même si l'insert est ignoré.

import { type NextRequest, NextResponse } from "next/server";
import { logConversionEvent } from "@/lib/tracking/log-event";
import { isConversionEvent } from "@/lib/tracking/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampStr(v: unknown, max = 240): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  if (!isConversionEvent(b.event_name)) {
    // Évènement inconnu : on ignore silencieusement (pas d'erreur bloquante).
    return NextResponse.json({ ok: true });
  }

  let metadata: Record<string, unknown> | null = null;
  if (b.metadata && typeof b.metadata === "object" && !Array.isArray(b.metadata)) {
    metadata = b.metadata as Record<string, unknown>;
  }

  await logConversionEvent(
    {
      event_name: b.event_name,
      source_page: clampStr(b.source_page),
      source_channel: clampStr(b.source_channel),
      intent: clampStr(b.intent),
      listing_id: clampStr(b.listing_id),
      lead_id: clampStr(b.lead_id),
      metadata,
    },
    request.headers.get("user-agent")
  );

  return NextResponse.json({ ok: true });
}
