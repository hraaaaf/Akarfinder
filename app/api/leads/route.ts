import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { validateLeadPayload, extractLeadPayload, normalizePhone } from "@/lib/leads/validate";
import { computeLeadTemperature } from "@/lib/onboarding/lead-temperature";
import { prepareProfessionalActivationRequest } from "@/lib/professional/professional-activation-request";
import { prepareSellerPropertyDraft } from "@/lib/seller/seller-property-draft";
import { logConversionEvent } from "@/lib/tracking/log-event";
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
  const rawBody = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};

  // A seller submission must produce a minimally useful Property Schema V1 draft,
  // not only a contact lead. These values remain DECLARED and unverified.
  const sellerDraft = source_channel === "seller"
    ? prepareSellerPropertyDraft({
        city: profile.city,
        neighborhood: profile.neighborhood,
        propertyType: profile.propertyType,
        surface: profile.surface,
        price: profile.budgetTotal,
        bedrooms: profile.bedrooms,
        condition: profile.condition,
      })
    : null;

  if (sellerDraft && !sellerDraft.structurally_useful) {
    return NextResponse.json(
      { ok: false, error: "Ville, type de bien et surface sont requis pour créer le brouillon structuré du bien." },
      { status: 400 },
    );
  }

  // Public professional interest is an activation request, never an anonymous
  // professional_organization creation. Organizations require authenticated ownership,
  // validation and source-authorization gates.
  const professionalRequest = source_channel === "promoter"
    ? prepareProfessionalActivationRequest(
        rawBody.professional_request && typeof rawBody.professional_request === "object"
          ? rawBody.professional_request as Record<string, unknown>
          : {},
      )
    : null;

  if (source_channel === "promoter" && !professionalRequest) {
    return NextResponse.json(
      { ok: false, error: "Le type de professionnel et le nom de la société sont requis." },
      { status: 400 },
    );
  }

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

  const tempResult =
    source_channel === "visit_request"
      ? {
          temperature: "chaud" as const,
          reason: "Demande de visite directe sur la fiche annonce.",
        }
      : source_channel === "seller"
      ? {
          temperature: "tiède" as const,
          reason: "Demande d'accompagnement vendeur via /vendre/dossier.",
        }
      : source_channel === "promoter"
      ? {
          temperature: "tiède" as const,
          reason: "Demande d'activation AkarFinder Pro.",
        }
      : source_channel === "credit"
      ? {
          temperature: "tiède" as const,
          reason: "Demande de rappel financement via simulateur crédit.",
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
        { status: 500 },
      );
    }

    let sellerPropertyDraftId: string | null = null;
    if (sellerDraft) {
      const { data: draftData, error: draftError } = await supabase
        .from("seller_property_drafts")
        .insert({
          lead_id: data.id,
          schema_version: sellerDraft.schema_version,
          source_kind: "seller_declared",
          status: "submitted",
          declared_facts: sellerDraft.declared_facts,
          weighted_completeness: sellerDraft.weighted_completeness,
          required_missing: sellerDraft.required_missing,
          publication_eligible: false,
        })
        .select("id")
        .single();

      if (draftError || !draftData?.id) {
        console.error("[api/leads] seller property draft insert error:", draftError?.message ?? "missing id");
        await supabase.from("buyer_leads").delete().eq("id", data.id);
        return NextResponse.json(
          { ok: false, error: "Le brouillon structuré du bien n'a pas pu être enregistré. Veuillez réessayer." },
          { status: 500 },
        );
      }
      sellerPropertyDraftId = draftData.id;
    }

    let professionalActivationRequestId: string | null = null;
    if (professionalRequest) {
      const { data: activationData, error: activationError } = await supabase
        .from("professional_activation_requests")
        .insert({
          lead_id: data.id,
          requested_type: professionalRequest.requested_type,
          company_name: professionalRequest.company_name,
          city: professionalRequest.city,
          requested_addons: professionalRequest.requested_addons,
          status: "received",
        })
        .select("id")
        .single();

      if (activationError || !activationData?.id) {
        console.error("[api/leads] professional activation request insert error:", activationError?.message ?? "missing id");
        await supabase.from("buyer_leads").delete().eq("id", data.id);
        return NextResponse.json(
          { ok: false, error: "La demande d'activation Pro n'a pas pu être enregistrée. Veuillez réessayer." },
          { status: 500 },
        );
      }
      professionalActivationRequestId = activationData.id;
    }

    await logConversionEvent(
      {
        event_name: "lead_submit_success",
        source_page: source_page ?? null,
        source_channel: row.source_channel,
        intent: profile.project ?? null,
        listing_id: listing_id ?? null,
        lead_id: data.id,
      },
      userAgent,
    );
    if (row.source_channel === "credit") {
      await logConversionEvent(
        {
          event_name: "credit_lead_submit",
          source_page: source_page ?? null,
          source_channel: "credit",
          intent: "credit",
          listing_id: listing_id ?? null,
          lead_id: data.id,
        },
        userAgent,
      );
    }

    return NextResponse.json({
      ok: true,
      lead_id: data.id,
      seller_property_draft_id: sellerPropertyDraftId,
      professional_activation_request_id: professionalActivationRequestId,
      next: source_channel === "promoter" ? "/pro" : "/search",
    });
  } catch (err) {
    console.error("[api/leads] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Erreur inattendue. Veuillez réessayer." },
      { status: 500 },
    );
  }
}
