// P18A — Internal Pro alert inbox. Lists saved_alerts from Supabase.
// Access requires LEADS_ADMIN_TOKEN env var + ?token=<value> query param.
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import type { SavedAlertRow } from "@/lib/alerts/types";

export const metadata: Metadata = {
  title: "Alertes location — AkarFinder Pro (Interne)",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffdf8]">
      <div className="max-w-sm text-center">
        <p className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-gray-400">
          Accès restreint
        </p>
        <h1 className="mt-3 text-[1.6rem] font-extrabold text-deepblue">Zone interne</h1>
        <p className="mt-3 text-[13.5px] text-gray-500">
          Cette page n&apos;est accessible qu&apos;aux équipes internes.
        </p>
        <Link href="/pro" className="mt-6 inline-block text-[13px] font-bold text-bronze-700 hover:underline">
          ← Retour à AkarFinder Pro
        </Link>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBudget(v: number | null) {
  if (!v) return "—";
  return `${v.toLocaleString("fr-FR")} DH/mois`;
}

function statusBadge(status: string) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-600">
      Archivée
    </span>
  );
}

function AlertCard({ alert }: { alert: SavedAlertRow }) {
  return (
    <div className="rounded-[1.3rem] border border-[#eadfca] bg-white p-5 shadow-[0_2px_10px_rgba(7,27,51,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-bronze-100 px-2.5 py-0.5 text-[11px] font-extrabold text-bronze-800">
            {alert.transaction_type === "rent" ? "Location" : "Achat"}
          </span>
          {statusBadge(alert.status)}
          <span className="text-[12px] text-gray-400">{formatDate(alert.created_at)}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {alert.city ? (
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">Ville</p>
            <p className="text-[13px] font-bold text-deepblue">{alert.city}</p>
          </div>
        ) : null}
        {alert.property_type ? (
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">Type de bien</p>
            <p className="text-[13px] font-bold text-deepblue">{alert.property_type}</p>
          </div>
        ) : null}
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">Budget max</p>
          <p className="text-[13px] font-bold text-deepblue">{formatBudget(alert.budget_max)}</p>
        </div>
        {alert.phone_whatsapp ? (
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">Téléphone</p>
            <p className="text-[13px] font-bold text-deepblue">{alert.phone_whatsapp}</p>
          </div>
        ) : null}
        {alert.email ? (
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">Email</p>
            <p className="text-[13px] font-bold text-deepblue">{alert.email}</p>
          </div>
        ) : null}
      </div>

      {alert.phone_whatsapp ? (
        <div className="mt-4">
          <a
            href={`https://wa.me/${alert.phone_whatsapp.replace(/^\+/, "")}?text=${encodeURIComponent("Bonjour, votre alerte location AkarFinder a été enregistrée.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-extrabold text-white transition hover:bg-emerald-700"
          >
            WhatsApp {alert.phone_whatsapp}
          </a>
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  searchParams: Promise<{ token?: string; status?: string }>;
};

export default async function AlertsPage({ searchParams }: Props) {
  const { token, status: statusFilter } = await searchParams;

  const adminToken = process.env.LEADS_ADMIN_TOKEN;

  if (!adminToken || !token || token !== adminToken) {
    return <AccessDenied />;
  }

  let alerts: SavedAlertRow[] = [];
  let fetchError: string | null = null;
  let total = 0;

  try {
    const supabase = getSupabaseServerClient();
    let q = supabase
      .from("saved_alerts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(200);

    if (statusFilter === "active" || statusFilter === "archived") {
      q = q.eq("status", statusFilter);
    }

    const { data, count, error } = await q;
    if (error) {
      fetchError = error.message;
    } else {
      alerts = (data ?? []) as SavedAlertRow[];
      total = count ?? 0;
    }
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Erreur inconnue";
  }

  const activeCount = alerts.filter((a) => a.status === "active").length;
  const baseHref = `/pro/alerts?token=${encodeURIComponent(token)}`;

  return (
    <div className="min-h-screen bg-[#fffdf8]">
      <SiteHeader variant="light" />

      <Container className="py-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-800">
                Interne MVP — Auth requise en production
              </span>
            </div>
            <h1 className="mt-3 text-[1.8rem] font-extrabold tracking-[-0.04em] text-deepblue">
              Alertes location
            </h1>
            <p className="mt-1 text-[13.5px] text-gray-500">
              {total} alerte{total !== 1 ? "s" : ""} au total · {activeCount} active{activeCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/api/alerts/export?token=${encodeURIComponent(token)}`}
              download
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#d8c8a3] bg-white px-4 py-2.5 text-[13px] font-bold text-deepblue transition hover:bg-[#f7f3ea]"
            >
              Exporter CSV
            </a>
            <Link
              href={`/pro/leads?token=${encodeURIComponent(token)}`}
              className="text-[13px] font-bold text-bronze-700 hover:underline"
            >
              ← Leads
            </Link>
            <Link href="/pro" className="text-[13px] font-bold text-bronze-700 hover:underline">
              ← Pro
            </Link>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { label: "Toutes", value: "" },
            { label: "Actives", value: "active" },
            { label: "Archivées", value: "archived" },
          ].map(({ label, value }) => {
            const active = (statusFilter ?? "") === value;
            return (
              <Link
                key={value || "all"}
                href={value ? `${baseHref}&status=${value}` : baseHref}
                className={`rounded-xl px-4 py-2 text-[13px] font-bold transition ${
                  active
                    ? "bg-deepblue text-white"
                    : "border border-[#d8c8a3] bg-white text-deepblue hover:bg-[#f7f3ea]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-[13px] font-bold text-red-800">
              Erreur de chargement : {fetchError}
            </p>
            <p className="mt-1 text-[12px] text-red-600">
              Vérifiez que la table saved_alerts existe (npm run apply:alerts-migration ou SQL Editor Supabase).
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-[1.3rem] border border-[#eadfca] bg-white p-10 text-center">
            <p className="text-[14px] text-gray-400">
              Aucune alerte{statusFilter ? " pour ce filtre" : ""} pour l&apos;instant.
            </p>
            <p className="mt-2 text-[12.5px] text-gray-400">
              Les alertes location apparaîtront ici dès que des utilisateurs les créeront sur /louer.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-[12.5px] font-bold text-amber-800">⚠ MVP interne — Limitations actuelles</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] text-amber-700">
            <li>Aucune notification automatique — correspondance manuelle uniquement.</li>
            <li>Aucune authentification complète — accès par token URL uniquement.</li>
            <li>Archivage non disponible — suppression manuelle via Supabase Dashboard si nécessaire.</li>
          </ul>
        </div>
      </Container>
    </div>
  );
}
