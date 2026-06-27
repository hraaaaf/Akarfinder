import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Users,
  BarChart2,
  FileText,
  MessageCircle,
  QrCode,
  Bell,
  ShieldCheck,
  Megaphone,
  ClipboardList,
  MapPin,
  Ruler,
  LayoutGrid,
  CalendarClock,
  Info,
  TrendingUp,
  Check,
  Sparkles,
  Download,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { ListingVisual } from "@/components/listings/ListingVisual";
import type { Listing } from "@/lib/listings/types";

// Repères hero
const REPERES = [
  { icon: Building2, label: "Pages de projets premium", note: "Fiches dédiées, soignées" },
  { icon: Users,     label: "Leads qualifiés",          note: "Demandes sérieuses, en clair" },
  { icon: BarChart2, label: "Outils pour performer",    note: "Reporting & diffusion" },
];

// Projet exemple (aperçu) — jamais présenté comme réel.
const EXAMPLE_PROJECT = {
  name: "Résidence Akar Garden",
  city: "Casablanca",
  neighborhood: "Bouskoura",
  typologies: "2 à 4 pièces",
  surface: "72 à 145 m²",
  delivery: "T2 2026",
  priceLabel: "Nous consulter",
};
const EXAMPLE_VISUAL = {
  id: "promo-example-akar-garden",
  transaction_type: "new",
  property_type: "Appartement",
  city: "Casablanca",
} as unknown as Listing;

// Leads exemples (aperçu) — données fictives illustratives.
const EXAMPLE_LEADS = [
  { initials: "Y", name: "Yassine B.", detail: "Appartement 3 pièces · Casablanca" },
  { initials: "M", name: "Meryem A.",  detail: "Appartement 4 pièces · Bouskoura" },
  { initials: "K", name: "Khalid F.",  detail: "Studio · Casablanca" },
];

// Reporting exemple (simulation).
const EXAMPLE_REPORTING = [
  { label: "Vues de la page", value: "8 742" },
  { label: "Clics sur contact", value: "812" },
  { label: "Leads reçus", value: "146" },
];

// Packs (offres) — sans promesse de résultat.
const PACKS = [
  { name: "Starter", note: "Lancer une page projet", highlight: false },
  { name: "Pro",     note: "Diffusion + reporting",   highlight: false },
  { name: "Premium", note: "Visibilité renforcée",    highlight: true },
  { name: "Expo",    note: "Salon & événements",      highlight: false },
];

const FEATURES = [
  { icon: Megaphone,     label: "Diffusion multicanale", note: "Réseaux, web et partenaires" },
  { icon: ClipboardList, label: "Formulaire intelligent", note: "Demandes structurées" },
  { icon: Bell,          label: "Notifications",          note: "Dès qu'une demande arrive" },
  { icon: ShieldCheck,   label: "Données sécurisées",     note: "Vos données restent protégées" },
];

function Sparkline() {
  return (
    <svg viewBox="0 0 80 24" className="h-6 w-20" aria-hidden="true">
      <polyline
        points="0,20 12,16 24,18 36,10 48,12 60,6 72,8 80,3"
        fill="none"
        stroke="#C2A368"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PromoteursPageShell() {
  return (
    <main className="min-h-screen bg-[#061027] text-white">
      <SiteHeader variant="dark" compact />

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-deepblue pb-11 pt-7 sm:pb-16 sm:pt-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 70% at 62% 26%, rgba(34,72,132,0.72) 0%, transparent 64%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 50% at 95% 100%, rgba(194,163,104,0.10) 0%, transparent 60%)" }}
        />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bronze-500/45 to-transparent" />

        <Container className="relative">
          <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
            {/* LEFT */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-bronze-500/70" aria-hidden="true" />
                <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-bronze-400">Promoteurs</p>
              </div>
              <h1 className="mt-4 text-[2.2rem] font-extrabold leading-[1.06] tracking-[-0.05em] text-white sm:mt-5 sm:text-[3.2rem]">
                Présentez vos projets.<br className="hidden sm:block" />{" "}
                <span className="text-bronze-400">Recevez des leads qualifiés.</span>
              </h1>
              <p className="mt-3.5 max-w-xl text-[14.5px] leading-6 text-white/65 sm:mt-5 sm:text-[15.5px] sm:leading-7">
                Créez des pages de projets premium, partagez-les sur tous vos canaux
                et captez des acheteurs réellement intéressés.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
                <Link
                  href="/pro"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.4)] transition hover:from-bronze-600"
                >
                  Demander une page promoteur
                  <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </Link>
                <Link
                  href="#packs"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white/90 transition hover:border-bronze-500/40 hover:bg-white/16"
                >
                  Comparer les packs
                  <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* RIGHT — 3 repères (mobile : empilés) */}
            <aside className="lg:flex lg:flex-col lg:justify-center">
              <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] shadow-[0_20px_50px_rgba(2,10,24,0.4)] backdrop-blur-md">
                <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
                  <p className="text-[13px] font-extrabold text-white">Ce qu'AkarFinder propose</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-white/55">Aux promoteurs partenaires</p>
                </div>
                <div className="space-y-2 p-3">
                  {REPERES.map(({ icon: Icon, label, note }) => (
                    <div key={label} className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5">
                      <span className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bronze-500/15 text-bronze-400">
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-extrabold leading-tight text-white/90">{label}</p>
                        <p className="mt-0.5 text-[10px] leading-tight text-white/45">{note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* ── DASHBOARD — [projet + reporting | leads + whatsapp] ───────────────── */}
      <section className="relative bg-gradient-to-b from-deepblue to-[#050f1e] py-12 lg:py-16">
        <Container>
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">Aperçu</p>
              </div>
              <h2 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.04em] text-white">
                Votre espace promoteur en un coup d'œil
              </h2>
              <p className="mt-1.5 text-[12.5px] text-white/50">
                Exemples illustratifs — les données affichées sont des simulations.
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            {/* LEFT */}
            <div className="flex flex-col gap-8">
              {/* PROJECT CARD (aperçu) */}
              <article className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(2,10,24,0.4)] backdrop-blur-sm">
                <div className="relative h-[210px] overflow-hidden sm:h-[270px]">
                  <ListingVisual listing={EXAMPLE_VISUAL} className="h-full w-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/85 via-[#03101f]/20 to-transparent" />
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#071B33]/80 px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-bronze-200 ring-1 ring-bronze-500/35 backdrop-blur-md">
                    <Info size={11} aria-hidden="true" />
                    Aperçu · exemple de page projet
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-bronze-500/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-[1.3rem] font-extrabold tracking-[-0.03em] text-white">{EXAMPLE_PROJECT.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-white/75">
                      <MapPin size={12} className="text-bronze-300" aria-hidden="true" />
                      {EXAMPLE_PROJECT.city}, {EXAMPLE_PROJECT.neighborhood}
                    </p>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { icon: LayoutGrid, k: "Typologies", v: EXAMPLE_PROJECT.typologies },
                      { icon: Ruler, k: "Surface", v: EXAMPLE_PROJECT.surface },
                      { icon: CalendarClock, k: "Livraison", v: EXAMPLE_PROJECT.delivery },
                      { icon: TrendingUp, k: "À partir de", v: EXAMPLE_PROJECT.priceLabel },
                    ].map(({ icon: Icon, k, v }) => (
                      <div key={k} className="rounded-xl border border-white/8 bg-white/[0.04] px-3.5 py-3">
                        <div className="flex items-center gap-1.5 text-bronze-400">
                          <Icon size={12} aria-hidden="true" />
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/45">{k}</span>
                        </div>
                        <p className="mt-1.5 text-[12px] font-extrabold text-white">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href="/pro"
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13px] font-extrabold text-white shadow-[0_6px_16px_rgba(155,120,56,0.3)] transition hover:from-bronze-600"
                    >
                      Voir la page de projet
                      <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
                    </Link>
                    <p className="inline-flex items-center gap-1.5 text-[11px] text-white/45">
                      <Info size={12} aria-hidden="true" />
                      Données fournies par le promoteur
                    </p>
                  </div>
                </div>
              </article>

              {/* REPORTING (simulation) */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <BarChart2 size={16} className="text-bronze-400" aria-hidden="true" />
                    <p className="text-[13px] font-extrabold text-white">Reporting</p>
                  </div>
                  <span className="rounded-full bg-bronze-500/15 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-bronze-300">
                    Simulation
                  </span>
                </div>
                <div className="grid grid-cols-1 divide-y divide-white/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {EXAMPLE_REPORTING.map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div>
                        <p className="text-[1.4rem] font-extrabold leading-none tracking-[-0.04em] text-white">{r.value}</p>
                        <p className="mt-1.5 text-[11px] font-semibold text-white/50">{r.label}</p>
                      </div>
                      <Sparkline />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-white/8 bg-white/[0.02] px-5 py-3">
                  <p className="text-[10.5px] text-white/40">Données simulées — reporting réel disponible dans l'espace Pro</p>
                  <Link href="/pro" className="text-[11.5px] font-extrabold text-bronze-300 transition hover:text-bronze-200">
                    Voir le reporting
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT — leads + whatsapp */}
            <aside className="flex flex-col gap-5">
              {/* Leads qualifiés (aperçu) */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Users size={15} className="text-bronze-400" aria-hidden="true" />
                    <p className="text-[13px] font-extrabold text-white">Leads qualifiés</p>
                  </div>
                  <span className="rounded-full bg-bronze-500/15 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-bronze-300">
                    Aperçu
                  </span>
                </div>
                <div className="divide-y divide-white/8">
                  {EXAMPLE_LEADS.map((l) => (
                    <div key={l.name} className="flex items-center gap-3 px-4 py-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bronze-500/15 text-[13px] font-extrabold text-bronze-300">
                        {l.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-extrabold text-white">{l.name}</p>
                        <p className="truncate text-[11px] text-white/50">{l.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/8 px-4 py-3">
                  <p className="mb-2 text-[10px] text-white/40">Exemples illustratifs — non des demandes réelles</p>
                  <Link
                    href="/pro"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-extrabold text-white/85 transition hover:border-bronze-500/30 hover:bg-white/[0.07]"
                  >
                    Voir tous les leads
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="overflow-hidden rounded-2xl border border-[#0e7d4f]/30 bg-gradient-to-br from-[#0e7d4f]/[0.16] to-[#0e7d4f]/[0.03] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0e7d4f]/25 text-[#34d399] ring-1 ring-[#34d399]/25">
                      <MessageCircle size={16} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <p className="text-[13.5px] font-extrabold text-white">WhatsApp</p>
                  </div>
                  <p className="mt-3 text-[12.5px] leading-5 text-white/65">
                    Échangez directement avec vos prospects depuis votre page projet,
                    une fois votre espace promoteur actif.
                  </p>
                </div>
                <div className="border-t border-white/8 bg-white/[0.02] px-5 py-3">
                  <Link href="/pro" className="flex items-center justify-between text-[12.5px] font-extrabold text-[#34d399] transition hover:text-[#6ee7b7]">
                    Activer la discussion
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* ── OUTILS — brochure / QR / formulaire ───────────────────────────────── */}
      <section className="border-t border-white/8 bg-[#050f1e] py-12 lg:py-14">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Brochure PDF */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
              <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-bronze-500/12 text-bronze-400 ring-1 ring-bronze-500/20">
                <FileText size={17} aria-hidden="true" />
              </span>
              <p className="mt-3.5 text-[14px] font-extrabold text-white">Brochure PDF</p>
              <p className="mt-1.5 flex-1 text-[12px] leading-5 text-white/55">
                Mettez votre brochure projet à disposition des acheteurs intéressés,
                directement depuis votre page.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-white/40">
                <Download size={12} aria-hidden="true" /> Disponible sur les pages actives
              </span>
            </div>

            {/* QR salon / Expo */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-bronze-500/12 text-bronze-400 ring-1 ring-bronze-500/20">
                  <QrCode size={17} aria-hidden="true" />
                </span>
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/90 text-deepblue" aria-hidden="true">
                  <QrCode size={34} strokeWidth={1.6} />
                </span>
              </div>
              <p className="mt-3.5 text-[14px] font-extrabold text-white">QR salon / Expo</p>
              <p className="mt-1.5 flex-1 text-[12px] leading-5 text-white/55">
                Générez un QR code vers votre page projet pour vos stands et supports
                lors des salons immobiliers.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-white/40">
                <Info size={12} aria-hidden="true" /> Aperçu — QR généré sur les pages actives
              </span>
            </div>

            {/* Formulaire intelligent */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
              <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-bronze-500/12 text-bronze-400 ring-1 ring-bronze-500/20">
                <ClipboardList size={17} aria-hidden="true" />
              </span>
              <p className="mt-3.5 text-[14px] font-extrabold text-white">Formulaire intelligent</p>
              <p className="mt-1.5 flex-1 text-[12px] leading-5 text-white/55">
                Collectez des demandes structurées (budget, typologie, délai) pour
                qualifier vos prospects en amont.
              </p>
              <Link href="/pro" className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-bronze-300 transition hover:text-bronze-200">
                En savoir plus
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ── PACKS ─────────────────────────────────────────────────────────────── */}
      <section id="packs" className="scroll-mt-20 bg-[#050f1e] pb-14 lg:pb-16">
        <Container>
          <div className="mb-7">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">Offres</p>
            </div>
            <h2 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.04em] text-white">Choisissez votre pack</h2>
            <p className="mt-1.5 text-[12.5px] text-white/50">
              Selon vos objectifs de visibilité. Sans promesse de volume ni garantie de résultats.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {PACKS.map((pack) => (
              <div
                key={pack.name}
                className={`relative flex flex-col rounded-2xl border p-5 transition ${
                  pack.highlight
                    ? "border-bronze-500/40 bg-gradient-to-b from-bronze-500/[0.14] to-bronze-500/[0.03]"
                    : "border-white/10 bg-white/[0.04] hover:border-bronze-500/25"
                }`}
              >
                {pack.highlight && (
                  <span className="absolute right-3 top-3 rounded-full bg-bronze-500/20 px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[0.08em] text-bronze-200 ring-1 ring-bronze-500/30">
                    Populaire
                  </span>
                )}
                <span className={`inline-grid h-9 w-9 place-items-center rounded-xl ${pack.highlight ? "bg-bronze-500/25 text-bronze-200" : "bg-bronze-500/12 text-bronze-400"} ring-1 ring-bronze-500/20`}>
                  <Sparkles size={15} aria-hidden="true" />
                </span>
                <p className="mt-3.5 text-[15px] font-extrabold text-white">{pack.name}</p>
                <p className="mt-1 flex-1 text-[11.5px] leading-5 text-white/55">{pack.note}</p>
                <Link
                  href="/pro"
                  className={`mt-4 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11.5px] font-extrabold transition ${
                    pack.highlight
                      ? "bg-gradient-to-br from-bronze-500 to-bronze-700 text-white hover:from-bronze-600"
                      : "border border-white/12 bg-white/[0.04] text-white/85 hover:border-bronze-500/30"
                  }`}
                >
                  Détails
                  <ArrowRight size={11} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Link
              href="/pro"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.35)] transition hover:from-bronze-600"
            >
              Comparer les packs
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      {/* ── FEATURES STRIP ────────────────────────────────────────────────────── */}
      <section className="border-y border-white/8 bg-[#040b16] py-11 lg:py-14">
        <Container>
          <div className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-4">
            {FEATURES.map(({ icon: Icon, label, note }) => (
              <div key={label} className="flex flex-col">
                <span className="mb-3 inline-grid h-9 w-9 place-items-center rounded-xl bg-bronze-500/12 text-bronze-400 ring-1 ring-bronze-500/20">
                  <Icon size={15} aria-hidden="true" />
                </span>
                <p className="text-[13.5px] font-extrabold text-white">{label}</p>
                <p className="mt-1 text-[11.5px] leading-5 text-white/50">{note}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CALLOUT ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#040b16] pb-14 pt-2 lg:pb-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(70% 80% at 88% 30%, rgba(34,72,132,0.35) 0%, transparent 60%)" }}
        />
        <Container className="relative">
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 backdrop-blur-sm sm:p-10">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">Espace promoteurs</p>
            </div>
            <h2 className="mt-3 max-w-xl text-[1.7rem] font-extrabold leading-tight tracking-[-0.04em] text-white">
              Référencez votre projet sur AkarFinder
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-7 text-white/60">
              Page projet premium, diffusion multicanale et demandes qualifiées transmises
              directement. Données fournies par le promoteur — sans promesse de volume ni
              garantie de résultats.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pro"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.35)] transition hover:from-bronze-600"
              >
                Accéder à l'espace Pro
                <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </Link>
              <Link
                href="/neuf"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white/90 transition hover:border-bronze-500/40 hover:bg-white/16"
              >
                Voir les projets neufs
                <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <p className="mt-6 flex items-start gap-1.5 text-[11.5px] leading-5 text-white/40">
            <Info size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
            Les leads, le reporting, les QR codes et les pages projet présentés ici sont des
            aperçus illustratifs (exemples / simulations) et non des résultats réels. AkarFinder
            ne garantit aucun volume de leads, aucun résultat commercial ni exclusivité
            territoriale. Les informations projet sont publiées sous la responsabilité du promoteur.
          </p>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
