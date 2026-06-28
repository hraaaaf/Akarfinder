// P18A — POST /api/alerts
// Saves a rent/buy alert to the saved_alerts Supabase table.
// Requires: phone OR email + consent. Server-side only (service role key).

import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { logConversionEvent } from "@/lib/tracking/log-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s\-().]/g, "");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Corps de requête invalide." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Payload invalide." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const rawPhone = typeof b.phone === "string" ? b.phone.trim() : "";
  const rawEmail = typeof b.email === "string" ? b.email.trim() : "";

  const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : "";
  const hasPhone = normalizedPhone.length >= 8;
  const hasEmail = rawEmail.includes("@") && rawEmail.includes(".");

  if (!hasPhone && !hasEmail) {
    return NextResponse.json(
      { ok: false, error: "Téléphone ou email requis." },
      { status: 400 }
    );
  }

  if (rawPhone && !hasPhone) {
    return NextResponse.json(
      { ok: false, error: "Numéro de téléphone invalide (8 caractères minimum)." },
      { status: 400 }
    );
  }

  if (b.consent !== true) {
    return NextResponse.json(
      { ok: false, error: "Consentement requis." },
      { status: 400 }
    );
  }

  const budgetMax = typeof b.budget_max === "number" && b.budget_max > 0 ? b.budget_max : null;
  const budgetMin = typeof b.budget_min === "number" && b.budget_min > 0 ? b.budget_min : null;

  const row = {
    transaction_type: typeof b.transaction_type === "string" && b.transaction_type ? b.transaction_type : "rent",
    city: typeof b.city === "string" && b.city.trim() ? b.city.trim() : null,
    budget_min: budgetMin,
    budget_max: budgetMax,
    property_type: typeof b.property_type === "string" && b.property_type ? b.property_type : null,
    phone_whatsapp: hasPhone ? normalizedPhone : null,
    email: hasEmail ? rawEmail : null,
    consent: true,
    status: "active",
  };

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("saved_alerts")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      console.error("[api/alerts] insert error:", error.message);
      return NextResponse.json(
        { ok: false, error: "Enregistrement impossible. Veuillez réessayer." },
        { status: 500 }
      );
    }

    // OVERNIGHT P2 — tracking conversion (best-effort)
    await logConversionEvent(
      {
        event_name: "alert_submit",
        source_page: "/louer",
        source_channel: "alert",
        intent: row.transaction_type,
        metadata: { city: row.city, budget_max: row.budget_max, property_type: row.property_type },
      },
      request.headers.get("user-agent")
    );

    return NextResponse.json({ ok: true, alert_id: data.id });
  } catch (err) {
    console.error("[api/alerts] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Erreur inattendue. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
