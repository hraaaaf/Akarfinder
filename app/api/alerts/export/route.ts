// P18A — GET /api/alerts/export
// Exports saved_alerts as CSV. Requires LEADS_ADMIN_TOKEN via ?token= query param.

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
      .from("saved_alerts")
      .select("created_at, transaction_type, city, budget_min, budget_max, property_type, phone_whatsapp, email, status")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const HEADERS = [
      "Date",
      "Type",
      "Ville",
      "Budget min",
      "Budget max",
      "Type de bien",
      "Téléphone/WhatsApp",
      "Email",
      "Statut",
    ];

    const rows = (data ?? []).map((alert) => [
      cell(alert.created_at ? new Date(alert.created_at).toLocaleString("fr-FR") : ""),
      cell(alert.transaction_type === "rent" ? "Location" : "Achat"),
      cell(alert.city),
      cell(alert.budget_min),
      cell(alert.budget_max),
      cell(alert.property_type),
      cell(alert.phone_whatsapp),
      cell(alert.email),
      cell(alert.status),
    ]);

    const csv = [
      HEADERS.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\r\n");

    const filename = `alertes-akarfinder-${new Date().toISOString().slice(0, 10)}.csv`;

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
