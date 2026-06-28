// OVERNIGHT-MVP-HARDENING-1 — Phase 3 : vue interne conversions.
// Accès : LEADS_ADMIN_TOKEN + ?token=. Tolère l'absence de conversion_events.
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

export const metadata: Metadata = {
  title: "Analytics conversions — AkarFinder Pro (Interne)",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffdf8]">
      <div className="max-w-sm text-center">
        <p className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Accès restreint</p>
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

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-[1.1rem] border border-[#eadfca] bg-white p-5 shadow-[0_2px_10px_rgba(7,27,51,0.05)]">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-gray-400">{label}</p>
      <p className="mt-1.5 text-[1.9rem] font-extrabold leading-none tracking-[-0.03em] text-deepblue">{value}</p>
      {hint ? <p className="mt-1 text-[11.5px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

type EventRow = {
  event_name: string;
  source_page: string | null;
  source_channel: string | null;
  created_at: string;
};

type Props = { searchParams: Promise<{ token?: string }> };

export default async function AnalyticsPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const adminToken = process.env.LEADS_ADMIN_TOKEN;
  if (!adminToken || !token || token !== adminToken) return <AccessDenied />;

  const supabase = getSupabaseServerClient();

  // ── Leads par canal (buyer_leads) ──────────────────────────────────────────
  let buyerRenter = 0, seller = 0, promoter = 0, credit = 0, leadsTotal = 0;
  try {
    const { data } = await supabase
      .from("buyer_leads")
      .select("source_channel")
      .limit(5000);
    for (const r of (data ?? []) as { source_channel: string | null }[]) {
      leadsTotal++;
      if (r.source_channel === "seller") seller++;
      else if (r.source_channel === "promoter") promoter++;
      else if (r.source_channel === "credit") credit++;
      else buyerRenter++;
    }
  } catch { /* ignore */ }

  // ── Alertes location ────────────────────────────────────────────────────────
  let alertsTotal = 0;
  try {
    const { count } = await supabase.from("saved_alerts").select("*", { count: "exact", head: true });
    alertsTotal = count ?? 0;
  } catch { /* table absente → 0 */ }

  // ── Conversion events ───────────────────────────────────────────────────────
  let events: EventRow[] = [];
  let eventsAvailable = true;
  try {
    const { data, error } = await supabase
      .from("conversion_events")
      .select("event_name, source_page, source_channel, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) eventsAvailable = false;
    else events = (data ?? []) as EventRow[];
  } catch { eventsAvailable = false; }

  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const events7d = events.filter((e) => new Date(e.created_at).getTime() >= since);
  const byEvent = new Map<string, number>();
  for (const e of events7d) byEvent.set(e.event_name, (byEvent.get(e.event_name) ?? 0) + 1);
  const eventCounts = [...byEvent.entries()].sort((a, b) => b[1] - a[1]);

  const bySource = new Map<string, number>();
  for (const e of events7d) {
    const k = e.source_page || "—";
    bySource.set(k, (bySource.get(k) ?? 0) + 1);
  }
  const topSources = [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const recent = events.slice(0, 20);

  return (
    <div className="min-h-screen bg-[#fffdf8]">
      <SiteHeader variant="light" />
      <Container className="py-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-800">
              Interne MVP — Auth requise en production
            </span>
            <h1 className="mt-3 text-[1.8rem] font-extrabold tracking-[-0.04em] text-deepblue">Analytics conversions</h1>
            <p className="mt-1 text-[13.5px] text-gray-500">Vue indicative — leads, alertes et évènements clés.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/pro/leads?token=${encodeURIComponent(token)}`} className="text-[13px] font-bold text-bronze-700 hover:underline">← Leads</Link>
            <Link href={`/pro/alerts?token=${encodeURIComponent(token)}`} className="text-[13px] font-bold text-bronze-700 hover:underline">Alertes</Link>
            <Link href="/pro" className="text-[13px] font-bold text-bronze-700 hover:underline">← Pro</Link>
          </div>
        </div>

        {/* Leads par canal */}
        <h2 className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.14em] text-gray-400">Leads par canal</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total leads" value={leadsTotal} />
          <StatCard label="Acheteur / Locataire" value={buyerRenter} />
          <StatCard label="Vendeurs" value={seller} />
          <StatCard label="Promoteurs" value={promoter} />
          <StatCard label="Crédit" value={credit} />
          <StatCard label="Alertes location" value={alertsTotal} />
        </div>

        {/* Events 7 jours */}
        <h2 className="mb-3 mt-9 text-[12px] font-extrabold uppercase tracking-[0.14em] text-gray-400">Évènements clés — 7 derniers jours</h2>
        {!eventsAvailable ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-[13px] font-bold text-amber-800">Table conversion_events absente.</p>
            <p className="mt-1 text-[12px] text-amber-700">
              Appliquer db/supabase-conversion-events-migration.sql (SQL Editor Supabase) pour activer le tracking.
              Les formulaires fonctionnent déjà sans cette table.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.1rem] border border-[#eadfca] bg-white p-5">
              <p className="text-[12px] font-extrabold text-deepblue">Par évènement</p>
              {eventCounts.length === 0 ? (
                <p className="mt-3 text-[13px] text-gray-400">Aucun évènement sur 7 jours.</p>
              ) : (
                <table className="mt-3 w-full text-[13px]">
                  <tbody>
                    {eventCounts.map(([name, n]) => (
                      <tr key={name} className="border-b border-[#f1ead9] last:border-0">
                        <td className="py-1.5 font-semibold text-gray-700">{name}</td>
                        <td className="py-1.5 text-right font-extrabold text-deepblue">{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="rounded-[1.1rem] border border-[#eadfca] bg-white p-5">
              <p className="text-[12px] font-extrabold text-deepblue">Top source_page</p>
              {topSources.length === 0 ? (
                <p className="mt-3 text-[13px] text-gray-400">Aucune donnée.</p>
              ) : (
                <table className="mt-3 w-full text-[13px]">
                  <tbody>
                    {topSources.map(([page, n]) => (
                      <tr key={page} className="border-b border-[#f1ead9] last:border-0">
                        <td className="py-1.5 font-semibold text-gray-700">{page}</td>
                        <td className="py-1.5 text-right font-extrabold text-deepblue">{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Derniers évènements */}
        {eventsAvailable && recent.length > 0 ? (
          <>
            <h2 className="mb-3 mt-9 text-[12px] font-extrabold uppercase tracking-[0.14em] text-gray-400">Derniers évènements</h2>
            <div className="overflow-hidden rounded-[1.1rem] border border-[#eadfca] bg-white">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-[#eadfca] bg-[#faf6ee] text-left text-[11px] uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-2.5 font-extrabold">Évènement</th>
                    <th className="px-4 py-2.5 font-extrabold">Source</th>
                    <th className="px-4 py-2.5 font-extrabold">Canal</th>
                    <th className="px-4 py-2.5 font-extrabold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e, i) => (
                    <tr key={i} className="border-b border-[#f1ead9] last:border-0">
                      <td className="px-4 py-2 font-semibold text-deepblue">{e.event_name}</td>
                      <td className="px-4 py-2 text-gray-600">{e.source_page ?? "—"}</td>
                      <td className="px-4 py-2 text-gray-600">{e.source_channel ?? "—"}</td>
                      <td className="px-4 py-2 text-gray-500">{formatDate(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <p className="mt-8 text-[11px] text-gray-400">
          Données indicatives à usage interne. Le tracking est best-effort et n&apos;affecte pas le fonctionnement des formulaires.
        </p>
      </Container>
    </div>
  );
}
