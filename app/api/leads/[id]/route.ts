// P11D-D — PATCH /api/leads/[id]
// Internal CRM endpoint: status update, internal notes, follow-up date.
// Auth: LEADS_ADMIN_TOKEN via x-leads-admin-token header or ?token= query param.
// Server-side only. SUPABASE_SERVICE_ROLE_KEY is never exposed.

import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  validateLeadAdminToken,
  validateLeadStatusUpdate,
  validateVisitStatusUpdate,
  normalizeInternalNotes,
  normalizeFollowUpDate,
} from "@/lib/leads/lead-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Auth check: token from header or query param
  const headerToken = request.headers.get("x-leads-admin-token");
  const queryToken = request.nextUrl.searchParams.get("token");
  const token = headerToken ?? queryToken;

  if (!validateLeadAdminToken(token)) {
    return NextResponse.json(
      { ok: false, error: "Accès non autorisé." },
      { status: 401 }
    );
  }

  // 2. Resolve [id]
  const { id } = await params;
  if (!id || typeof id !== "string" || id.trim() === "") {
    return NextResponse.json(
      { ok: false, error: "Identifiant de lead manquant." },
      { status: 400 }
    );
  }

  // 3. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Corps de requête invalide." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "Corps de requête invalide." },
      { status: 400 }
    );
  }

  const source = body as Record<string, unknown>;

  // 4. Validate fields
  const update: Record<string, unknown> = {};
  const errors: string[] = [];

  if ("status" in source) {
    const status = validateLeadStatusUpdate(source.status);
    if (status === null) {
      errors.push("Statut lead invalide.");
    } else {
      update.status = status;
    }
  }

  if ("visit_status" in source) {
    const visitStatus = validateVisitStatusUpdate(source.visit_status);
    if (visitStatus === null) {
      errors.push("Statut visite invalide.");
    } else {
      update.visit_status = visitStatus;
    }
  }

  if ("internal_notes" in source) {
    // null explicitly allowed to clear notes
    update.internal_notes =
      source.internal_notes === null
        ? null
        : normalizeInternalNotes(source.internal_notes);
  }

  if ("next_follow_up_at" in source) {
    // null explicitly allowed to clear
    update.next_follow_up_at =
      source.next_follow_up_at === null
        ? null
        : normalizeFollowUpDate(source.next_follow_up_at);
    if (
      source.next_follow_up_at !== null &&
      update.next_follow_up_at === null
    ) {
      errors.push("Date de suivi invalide.");
    }
  }

  if (source.mark_contacted === true) {
    update.last_contacted_at = new Date().toISOString();
    // Only auto-set to 'contacted' if no explicit status was provided
    if (!("status" in source)) {
      update.status = "contacted";
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { ok: false, error: errors[0] },
      { status: 400 }
    );
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Aucune modification fournie." },
      { status: 400 }
    );
  }

  // updated_at is handled by DB trigger, but set it explicitly for immediate response accuracy
  update.updated_at = new Date().toISOString();

  // 5. Supabase update
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("buyer_leads")
      .update(update)
      .eq("id", id)
      .select(
        "id, status, visit_status, internal_notes, last_contacted_at, next_follow_up_at, updated_at"
      )
      .single();

    if (error) {
      console.error("[api/leads/[id]] update error:", error.message);
      return NextResponse.json(
        { ok: false, error: "Mise à jour impossible. Veuillez réessayer." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Lead introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, lead: data });
  } catch (err) {
    console.error("[api/leads/[id]] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Erreur inattendue. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
