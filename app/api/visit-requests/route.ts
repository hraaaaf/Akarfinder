import { type NextRequest, NextResponse } from "next/server";
import { getListingById } from "@/lib/listings/utils";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { queryListingById } from "@/lib/db/index";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import {
  buildVisitLeadInsert,
  normalizeVisitRequestPayload,
  validateVisitRequestPayload,
} from "@/lib/leads/visit-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Corps de requête invalide." },
      { status: 400 }
    );
  }

  const payload = normalizeVisitRequestPayload(body);
  const validation = validateVisitRequestPayload(payload);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Corps de requête invalide." }, { status: 400 });
  }

  const listingRow = await queryListingById(payload.listing_id);
  const listing = listingRow
    ? mapDbRowToListing(listingRow)
    : getListingById(payload.listing_id);

  if (!listing) {
    return NextResponse.json(
      { ok: false, error: "Annonce introuvable pour cette demande." },
      { status: 404 }
    );
  }

  const row = buildVisitLeadInsert(
    payload,
    listing,
    request.headers.get("user-agent") ?? undefined
  );

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("buyer_leads")
      .insert(row)
      .select("id, visit_status")
      .single();

    if (error) {
      console.error("[api/visit-requests] insert error:", error.message);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Impossible d’envoyer la demande pour le moment. Réessayez ou contactez-nous via WhatsApp.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      lead_id: data.id,
      status: "pending",
    });
  } catch (err) {
    console.error("[api/visit-requests] unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Impossible d’envoyer la demande pour le moment. Réessayez ou contactez-nous via WhatsApp.",
      },
      { status: 500 }
    );
  }
}
