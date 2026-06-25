import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { validateLeadPayload, extractLeadPayload, normalizePhone } from "@/lib/leads/validate";
import { computeLeadTemperature } from "@/lib/onboarding/lead-temperature";
import type { BuyerProfile } from "@/lib/onboarding/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Corps de requête invalide." }, { status: 400 });
  }

  const validation = validateLeadPayload(body);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const payload = extractLeadPayload(body);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Payload invalide." }, { status: 400 });
  }

  const { profile, source_channel, source_page, listing_id } = payload;

  // Re-compute temperature server-side (do not trust client-supplied value)
  const buyerProfile: BuyerProfile = {
    project: profile.project as BuyerProfile["project"],
    city: profile.city,
    neighborhood: profile.neighborhood,
    acceptedZones: profile.acceptedZones,
    budgetTotal: profile.budgetTotal,
    apport: profile.apport,
    needsCredit: profile.needsCredit,
    monthlyCible: profile.monthlyCible,
    currency: profile.currency as BuyerProfile["currency"],
    propertyType: profile.propertyType as BuyerProfile["propertyType"],
    surface: profile.surface,
    bedrooms: profile.bedrooms,
    condition: profile.condition as BuyerProfile["condition"],
    timing: profile.timing as BuyerProfile["timing"],
    name: profile.name,
    phone: profile.phone,
    country: profile.country,
    message: profile.message,
    consentContact: profile.consentContact,
    consentIndicatif: profile.consentIndicatif,
  };

  // Visit requests are always "chaud" — explicit intent to physically visit.
  const tempResult =
    source_channel === "visit_request"
      ? {
          temperature: "chaud" as const,
          label: "Demande de visite",
          reason: "Demande de visite directe sur la fiche annonce.",
          color: "emerald",
        }
      : computeLeadTemperature(buyerProfile);

  const userAgent = request.headers.get("user-agent") ?? undefined;

  const row = {
    source_channel: source_channel || "onboarding",
    source_page: source_page ?? null,
    listing_id: listing_id ?? null,
    project_type: profile.project ?? null,
    city: profile.city?.trim() ?? null,
    neighborhood: profile.neighborhood?.trim() ?? null,
    zones_accepted: profile.acceptedZones?.trim() ?? null,
    budget_total: profile.budgetTotal ?? null,
    down_payment: profile.apport ?? null,
    needs_credit: profile.needsCredit ?? null,
    target_monthly_payment: profile.monthlyCible ?? null,
    currency: profile.currency ?? "MAD",
    property_type: profile.propertyType ?? null,
    desired_surface_m2: profile.surface ?? null,
    bedrooms: profile.bedrooms ?? null,
    condition_preference: profile.condition ?? null,
    timing: profile.timing ?? null,
    is_mre: profile.project === "mre",
    residence_country: profile.country?.trim() ?? null,
    full_name: profile.name?.trim() ?? null,
    phone_whatsapp: normalizePhone(profile.phone!),
    message: profile.message?.trim() ?? null,
    consent_contact: true,
    consent_indicative: true,
    lead_temperature: tempResult.temperature,
    lead_reasons: [tempResult.reason],
    status: "new",
    user_agent: userAgent ?? null,
  };

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("buyer_leads")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      console.error("[api/leads] insert error:", error.message);
      return NextResponse.json(
        { ok: false, error: "Enregistrement impossible. Veuillez réessayer." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      lead_id: data.id,
      next: "/search",
    });
  } catch (err) {
    console.error("[api/leads] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Erreur inattendue. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
