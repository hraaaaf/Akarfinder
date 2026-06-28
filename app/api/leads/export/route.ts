// LEADS-MVP — GET /api/leads/export
// Exports buyer_leads as CSV. Requires LEADS_ADMIN_TOKEN via ?token= query param.
// Server-only. SUPABASE_SERVICE_ROLE_KEY never exposed.

import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validateToken(token: string | null): boolean {
  const adminToken = process.env.LEADS_ADMIN_TOKEN;
  if (!adminToken || !token) return false;
  return token === adminToken;
}

function cell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!validateToken(token)) {
    return NextResponse.json({ ok: false, error: "Accès non autorisé." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("buyer_leads")
      .select(
        "full_name, phone_whatsapp, city, budget_total, down_payment, currency, project_type, source_channel, source_page, lead_temperature, status, is_mre, timing, property_type, internal_notes, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const HEADERS = [
      "Nom",
      "Téléphone/WhatsApp",
      "Ville",
      "Budget",
      "Apport",
      "Devise",
      "Projet",
      "Canal",
      "Source",
      "Température",
      "Statut",
      "MRE",
      "Timing",
      "Type de bien",
      "Notes internes",
      "Date",
    ];

    const rows = (data ?? []).map((lead) => [
      cell(lead.full_name),
      cell(lead.phone_whatsapp),
      cell(lead.city),
      cell(lead.budget_total),
      cell(lead.down_payment),
      cell(lead.currency),
      cell(lead.project_type),
      cell(lead.source_channel),
      cell(lead.source_page),
      cell(lead.lead_temperature),
      cell(lead.status),
      cell(lead.is_mre ? "Oui" : "Non"),
      cell(lead.timing),
      cell(lead.property_type),
      cell(lead.internal_notes),
      cell(lead.created_at ? new Date(lead.created_at).toLocaleString("fr-FR") : ""),
    ]);

    const csv = [
      HEADERS.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\r\n");

    const filename = `leads-akarfinder-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Erreur inattendue." }, { status: 500 });
  }
}
