// P11D/P11D-C/P11D-D — Internal Pro lead inbox. MVP without full auth.
// Access requires LEADS_ADMIN_TOKEN env var + ?token=<value> query param.
// Full authentication must be added before any public production access.
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import type {
  BuyerLeadRow,
  LeadTemperature,
  LeadType,
  VisitStatus,
} from "@/lib/leads/types";
import {
  buildVisitWhatsAppMessage,
  formatVisitSlot,
} from "@/lib/leads/visit-request";
import { LeadCrmCard } from "@/components/leads/LeadCrmCard";

export const metadata: Metadata = {
  title: "Boîte réception leads — AkarFinder Pro (Interne)",
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
        <h1 className="mt-3 text-[1.6rem] font-extrabold text-deepblue">
          Zone interne
        </h1>
        <p className="mt-3 text-[13.5px] text-gray-500">
          Cette page n&apos;est accessible qu&apos;aux équipes internes.
          Authentification complète à venir.
        </p>
        <Link
          href="/pro"
          className="mt-6 inline-block text-[13px] font-bold text-bronze-700 hover:underline"
        >
          ← Retour à AkarFinder Pro
        </Link>
      </div>
    </div>
  );
}

function tempBadge(temp: LeadTemperature) {
  switch (temp) {
    case "chaud":
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
          Chaud
        </span>
      );
    case "tiède":
      return (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
          Tiède
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700">
          Froid
        </span>
      );
  }
}

function leadTypeBadge(leadType?: LeadType | null) {
  if (leadType === "visit_request") {
    return (
      <span className="inline-flex items-center rounded-full bg-bronze-100 px-2.5 py-0.5 text-[11px] font-extrabold text-bronze-800">
        Demande de visite
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-[#eef4ff] px-2.5 py-0.5 text-[11px] font-extrabold text-[#1a4a8a]">
      Dossier acheteur
    </span>
  );
}

function visitStatusBadge(visitStatus?: VisitStatus | null) {
  if (!visitStatus) return null;

  const styles: Record<VisitStatus, string> = {
    pending: "bg-amber-100 text-amber-800",
    contacted: "bg-blue-100 text-blue-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    reschedule_requested: "bg-orange-100 text-orange-800",
    cancelled: "bg-rose-100 text-rose-800",
    archived: "bg-slate-100 text-slate-700",
  };
  const labels: Record<VisitStatus, string> = {
    pending: "En attente",
    contacted: "Contacté",
    confirmed: "Confirmé",
    reschedule_requested: "Créneau à modifier",
    cancelled: "Annulé",
    archived: "Archivé",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${styles[visitStatus]}`}>
      {labels[visitStatus]}
    </span>
  );
}

function genericStatusBadge(status: string) {
  const labels: Record<string, string> = {
    new: "Nouveau",
    contacted: "Contacté",
    qualified: "Qualifié",
    archived: "Archivé",
  };
  const label = labels[status] ?? status;
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500">
      {label}
    </span>
  );
}

function sourceChannelLabel(channel?: string | null): string {
  if (channel === "visit_request") return "Demande de visite";
  if (channel === "buyer_profile") return "Dossier acheteur";
  if (channel === "contact_request") return "Demande de contact";
  if (channel === "seller") return "Vendeur";
  if (channel === "promoter") return "Promoteur";
  return channel ?? "—";
}

function sellerBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-bronze-100 px-2.5 py-0.5 text-[11px] font-extrabold text-bronze-800">
      Vendeur
    </span>
  );
}

function promoterBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-extrabold text-purple-800">
      Promoteur
    </span>
  );
}

function formatBudget(v: number | null, currency: string | null) {
  if (!v) return "—";
  return `${v.toLocaleString("fr-FR")} ${currency ?? "MAD"}`;
}

function whatsappHref(phone: string, text?: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  const base = `https://wa.me/${digits.replace(/^\+/, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
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

function getSourceAccessLabel(access?: string | null) {
  switch (access) {
    case "partner_full":
      return "Accès partenaire";
    case "preview_allowed":
      return "Prévisualisation autorisée";
    case "indexed_only":
      return "Indexé uniquement";
    default:
      return null;
  }
}

function LeadCard({ lead, adminToken }: { lead: BuyerLeadRow; adminToken: string }) {
  const leadType = lead.lead_type ?? "buyer_profile";
  const isVisit = leadType === "visit_request";
  const isSeller = lead.source_channel === "seller";
  const isPromoter = lead.source_channel === "promoter";
  const visitMessage = lead.visit_message ?? lead.message;
  const location =
    lead.listing_neighborhood && lead.listing_city
      ? `${lead.listing_city}, ${lead.listing_neighborhood}`
      : lead.listing_city ?? lead.city ?? null;

  const visitWhatsAppText = isVisit
    ? buildVisitWhatsAppMessage({
        fullName: lead.full_name ?? "client",
        listingTitle: lead.listing_title ?? "ce bien",
        preferredSlot1: lead.visit_preferred_slot_1 ?? null,
        preferredDaypart: lead.visit_preferred_daypart ?? null,
      })
    : undefined;

  return (
    <div className="rounded-[1.3rem] border border-[#eadfca] bg-white p-5 shadow-[0_2px_10px_rgba(7,27,51,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {isPromoter ? promoterBadge() : isSeller ? sellerBadge() : leadTypeBadge(leadType)}
          {tempBadge(lead.lead_temperature)}
          {lead.is_mre ? (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-800">
              MRE
            </span>
          ) : null}
          <span className="text-[12px] text-gray-400">{formatDate(lead.created_at)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isVisit ? visitStatusBadge(lead.visit_status ?? "pending") : null}
          {genericStatusBadge(lead.status)}
        </div>
      </div>

      {isVisit ? (
        <>
          <div className="mt-4 rounded-2xl border border-[#efe3cd] bg-[#fffaf0] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[1.05rem] font-extrabold text-deepblue">
                  {lead.listing_title ?? "Annonce liée"}
                </p>
                {location ? (
                  <p className="mt-1 text-[13px] font-semibold text-gray-600">
                    {location}
                  </p>
                ) : null}
              </div>
              {lead.listing_price ? (
                <p className="text-[1rem] font-extrabold text-bronze-700">
                  {formatBudget(lead.listing_price, "DH")}
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {lead.visit_preferred_slot_1 ? (
                <div className="rounded-xl bg-white px-3.5 py-3 ring-1 ring-[#efe3cc]">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
                    Créneau 1
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-deepblue">
                    {formatVisitSlot(lead.visit_preferred_slot_1)}
                  </p>
                </div>
              ) : null}
              {lead.visit_preferred_slot_2 ? (
                <div className="rounded-xl bg-white px-3.5 py-3 ring-1 ring-[#efe3cc]">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
                    Créneau 2
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-deepblue">
                    {formatVisitSlot(lead.visit_preferred_slot_2)}
                  </p>
                </div>
              ) : null}
              {lead.visit_preferred_daypart ? (
                <div className="rounded-xl bg-white px-3.5 py-3 ring-1 ring-[#efe3cc]">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
                    Moment préféré
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-deepblue">
                    {lead.visit_preferred_daypart}
                  </p>
                </div>
              ) : null}
              {lead.listing_source_access_level ? (
                <div className="rounded-xl bg-white px-3.5 py-3 ring-1 ring-[#efe3cc]">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
                    Accès source
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-deepblue">
                    {getSourceAccessLabel(lead.listing_source_access_level)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      <div className={`mt-4 grid gap-x-6 gap-y-2 ${isVisit ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}>
        {lead.full_name ? (
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              Nom
            </p>
            <p className="text-[13px] font-bold text-deepblue">{lead.full_name}</p>
          </div>
        ) : null}
        {lead.city ? (
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              Ville
            </p>
            <p className="text-[13px] font-bold text-deepblue">{lead.city}</p>
          </div>
        ) : null}
        {!isVisit && lead.project_type ? (
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              Projet
            </p>
            <p className="text-[13px] font-bold capitalize text-deepblue">
              {lead.project_type}
            </p>
          </div>
        ) : null}
        {!isVisit && lead.budget_total ? (
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              Budget
            </p>
            <p className="text-[13px] font-bold text-deepblue">
              {formatBudget(lead.budget_total, lead.currency)}
            </p>
          </div>
        ) : null}
        {!isVisit && lead.timing ? (
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              Timing
            </p>
            <p className="text-[13px] font-bold text-deepblue">{lead.timing}</p>
          </div>
        ) : null}
        {lead.property_type ? (
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              Type de bien
            </p>
            <p className="text-[13px] font-bold capitalize text-deepblue">
              {lead.property_type}
            </p>
          </div>
        ) : null}
        {lead.residence_country ? (
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              Pays
            </p>
            <p className="text-[13px] font-bold text-deepblue">
              {lead.residence_country}
            </p>
          </div>
        ) : null}
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
            Source
          </p>
          <p className="text-[13px] font-bold text-deepblue">
            {sourceChannelLabel(lead.source_channel)}
          </p>
        </div>
      </div>

      {visitMessage ? (
        <p className="mt-3 rounded-xl bg-[#f7f5ef] px-3.5 py-2.5 text-[12.5px] italic text-gray-600">
          &ldquo;{visitMessage}&rdquo;
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <a
          href={whatsappHref(lead.phone_whatsapp, visitWhatsAppText)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-extrabold text-white transition hover:bg-emerald-700"
        >
          WhatsApp {lead.phone_whatsapp}
        </a>
        {lead.listing_id ? (
          <Link
            href={`/listings/${lead.listing_id}`}
            className="rounded-xl border border-[#d8c8a3] bg-[#fffdf8] px-4 py-2 text-[13px] font-bold text-deepblue transition hover:bg-[#f7f3ea]"
          >
            Voir l&apos;annonce →
          </Link>
        ) : null}
        {isVisit && lead.listing_source_url ? (
          <a
            href={lead.listing_source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[#e5dcc8] bg-white px-4 py-2 text-[13px] font-bold text-gray-600 transition hover:bg-[#f7f3ea] hover:text-deepblue"
          >
            Voir la source →
          </a>
        ) : null}
      </div>

      <LeadCrmCard lead={lead} adminToken={adminToken} />
    </div>
  );
}

type Props = {
  searchParams: Promise<{
    token?: string;
    status?: string;
    filter?: string;
  }>;
};

export default async function LeadsPage({ searchParams }: Props) {
  const { token, status: statusFilter, filter } = await searchParams;

  const adminToken = process.env.LEADS_ADMIN_TOKEN;

  if (!adminToken || !token || token !== adminToken) {
    return <AccessDenied />;
  }

  let leads: BuyerLeadRow[] = [];
  let fetchError: string | null = null;
  let total = 0;

  try {
    const supabase = getSupabaseServerClient();
    let q = supabase
      .from("buyer_leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(200);

    if (statusFilter && ["new", "contacted", "qualified", "visit_confirmed", "reschedule_requested", "archived"].includes(statusFilter)) {
      q = q.eq("status", statusFilter);
    }

    if (filter === "buyer_profile") {
      q = q
        .eq("lead_type", "buyer_profile")
        .neq("source_channel", "seller")
        .neq("source_channel", "promoter");
    } else if (filter === "visit_request") {
      q = q.eq("lead_type", "visit_request");
    } else if (filter === "seller") {
      q = q.eq("source_channel", "seller");
    } else if (filter === "promoter") {
      q = q.eq("source_channel", "promoter");
    } else if (filter === "chaud") {
      q = q.eq("lead_temperature", "chaud");
    } else if (filter === "new") {
      q = q.eq("status", "new");
    }

    const { data, count, error } = await q;
    if (error) {
      fetchError = error.message;
    } else {
      leads = (data ?? []) as BuyerLeadRow[];
      total = count ?? 0;
    }
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Erreur inconnue";
  }

  const normalizedLeads = leads.map((lead) => ({
    ...lead,
    lead_type: lead.lead_type ?? "buyer_profile",
  }));

  const chaud = normalizedLeads.filter((lead) => lead.lead_temperature === "chaud");
  const visitRequests = normalizedLeads.filter((lead) => lead.lead_type === "visit_request");
  const sellers = normalizedLeads.filter((lead) => lead.source_channel === "seller");
  const promoters = normalizedLeads.filter((lead) => lead.source_channel === "promoter");
  const buyerProfiles = normalizedLeads.filter(
    (lead) =>
      lead.lead_type !== "visit_request" &&
      lead.source_channel !== "seller" &&
      lead.source_channel !== "promoter"
  );

  const filterTabs: Array<{ label: string; value: string }> = [
    { label: "Tous", value: "" },
    { label: "Dossiers acheteurs", value: "buyer_profile" },
    { label: "Vendeurs", value: "seller" },
    { label: "Promoteurs", value: "promoter" },
    { label: "Demandes de visite", value: "visit_request" },
    { label: "Chaud", value: "chaud" },
    { label: "Nouveau", value: "new" },
  ];

  const baseHref = `/pro/leads?token=${encodeURIComponent(token)}`;

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
              Boîte réception leads
            </h1>
            <p className="mt-1 text-[13.5px] text-gray-500">
              {total} lead{total !== 1 ? "s" : ""} total · {sellers.length} vendeur{sellers.length !== 1 ? "s" : ""} · {promoters.length} promoteur{promoters.length !== 1 ? "s" : ""} · {visitRequests.length} demande{visitRequests.length !== 1 ? "s" : ""} de visite · {chaud.length} chaud{chaud.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/api/leads/export?token=${encodeURIComponent(token)}`}
              download
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#d8c8a3] bg-white px-4 py-2.5 text-[13px] font-bold text-deepblue transition hover:bg-[#f7f3ea]"
            >
              Exporter CSV
            </a>
            <Link
              href={`/pro/alerts?token=${encodeURIComponent(token)}`}
              className="text-[13px] font-bold text-bronze-700 hover:underline"
            >
              Alertes →
            </Link>
            <Link href="/pro" className="text-[13px] font-bold text-bronze-700 hover:underline">
              ← AkarFinder Pro
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {filterTabs.map(({ label, value }) => {
            const active = (filter ?? "") === value;
            return (
              <Link
                key={value || "all"}
                href={value ? `${baseHref}&filter=${value}` : baseHref}
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
          </div>
        ) : normalizedLeads.length === 0 ? (
          <div className="rounded-[1.3rem] border border-[#eadfca] bg-white p-10 text-center">
            <p className="text-[14px] text-gray-400">
              Aucun lead{filter ? " pour ce filtre" : ""} pour l&apos;instant.
            </p>
            <p className="mt-2 text-[12.5px] text-gray-400">
              Les dossiers acheteurs et demandes de visite apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {normalizedLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} adminToken={token} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-[12.5px] font-bold text-amber-800">
            ⚠ MVP interne — Limitations actuelles
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] text-amber-700">
            <li>Aucune authentification complète — accès par token URL uniquement.</li>
            <li>Aucune notification automatique propriétaire/agence/source.</li>
            <li>Une demande de visite reste en attente de confirmation tant qu&apos;elle n&apos;est pas traitée manuellement.</li>
            <li>La mise à jour du statut (lead et visite), les notes internes et la date de suivi sont disponibles via le panneau &quot;Suivi interne&quot; de chaque lead.</li>
          </ul>
          <p className="mt-3 text-[12px] text-amber-700/90">
            Dossiers acheteurs : {buyerProfiles.length} · Vendeurs : {sellers.length} · Promoteurs : {promoters.length} · Demandes de visite : {visitRequests.length}
          </p>
        </div>
      </Container>
    </div>
  );
}
