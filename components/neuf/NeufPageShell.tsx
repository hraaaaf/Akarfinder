import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Compass,
  FileText,
  ShieldCheck,
  MapPin,
  MessageCircle,
  Phone,
  Scale,
  Ruler,
  LayoutGrid,
  CalendarClock,
  Info,
  Download,
  TrendingUp,
  Sparkles,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { CreditSimulator } from "@/components/credit/CreditSimulator";
import type { Listing } from "@/lib/listings/types";

// THEME-SYSTEM-V1-P0 — P0-D: rendu theme-safe via tokens système + dark: prefix.

// ── Repères Neuf (hero) ──────────────────────────────────────────────────────
const REPERES_NEUF = [
  { icon: Sparkles,  label: "Projets récents",        note: "Programmes neufs sélectionnés" },
  { icon: Compass,   label: "Emplacements recherchés", note: "Quartiers prisés au Maroc" },
  { icon: FileText,  label: "Plans & brochures",       note: "Fournis par le promoteur" },
  { icon: ShieldCheck, label: "Repères indicatifs",    note: "À confirmer avant décision" },
];

// ── Projet exemple — APERÇU clairement labellisé (aucun partenaire actif) ─────
// Données illustratives. Jamais présenté comme un projet réel actif.
const EXAMPLE_PROJECT = {
  name: "Résidence Al Manar",
  city: "Casablanca",
  neighborhood: "Maârif",
  priceFrom: 850_000,
  typologies: ["Studio", "T2", "T3"],
  surfaceMin: 45,
  surfaceMax: 120,
  delivery: "Livraison prévue 2026 — à confirmer",
};

// Objet minimal pour réutiliser ListingVisual (motif "neuf" → grue de chantier).
const EXAMPLE_VISUAL = {
  id: "neuf-example-al-manar",
  transaction_type: "new",
  property_type: "Appartement",
  city: "Casablanca",
} as unknown as Listing;

// Repères Neuf vs Ancien — comparaison indicative (prudente).
const NEUF_VS_ANCIEN = {
  neuf: {
    prix: "À partir de 850 000 DH",
    surface: "Dès 45 m²",
    frais: "Frais d'enregistrement réduits",
    extra: "Aux normes récentes",
  },
  ancien: {
    prix: "≈ 13 000 DH/m² observé",
    surface: "Surface variable",
    frais: "Frais variables",
    extra: "Disponible immédiatement",
  },
};

export function NeufPageShell() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface dark:bg-deepblue pb-11 pt-7 sm:pb-16 sm:pt-20">
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{ background: "radial-gradient(ellipse 80% 70% at 62% 26%, rgba(34,72,132,0.72) 0%, transparent 64%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{ background: "radial-gradient(60% 50% at 95% 100%, rgba(194,163,104,0.10) 0%, transparent 60%)" }}
        />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bronze-500/45 to-transparent" />

        <Container className="relative">
          <div className="grid gap-12 lg:grid-cols-[1fr_360px]">

            {/* LEFT */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-bronze-500/70" aria-hidden="true" />
                <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-bronze-500 dark:text-bronze-400">Neuf</p>
              </div>
              <h1 className="mt-4 text-[2.3rem] font-extrabold leading-[1.05] tracking-[-0.05em] text-foreground sm:mt-5 sm:text-[3.4rem]">
                Découvrez les nouveaux<br className="hidden sm:block" />{" "}
                <span className="text-bronze-500 dark:text-bronze-400">projets au Maroc</span>
              </h1>
              <p className="mt-3.5 max-w-xl text-[14.5px] leading-6 text-muted-foreground sm:mt-5 sm:text-[15.5px] sm:leading-7">
                Programmes neufs, données fournies par le promoteur et repères indicatifs
                pour vous projeter avec plus de clarté.
              </p>

              {/* CTAs */}
              <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
                <Link
                  href="#projet"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.4)] transition hover:from-bronze-600"
                >
                  Voir le projet
                  <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </Link>
                <Link
                  href="/promoteurs"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/20 dark:border-white/15 bg-surface dark:bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-foreground dark:text-white/90 transition hover:border-bronze-500/40"
                >
                  Espace promoteurs
                  <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </Link>
                <Link
                  href="/search?type=new"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/20 dark:border-white/15 bg-surface dark:bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-foreground dark:text-white/90 transition hover:border-bronze-500/40"
                >
                  Explorer les programmes neufs
                  <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </Link>
              </div>

              {/* Counter / note */}
              <div className="mt-5 sm:mt-6">
                <p className="inline-flex items-center gap-2.5 rounded-full border border-border/15 dark:border-white/10 bg-surface/50 dark:bg-white/5 px-4 py-2 text-[13px] font-semibold text-muted-foreground dark:text-white/70">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bronze-500/20">
                    <Info size={11} className="text-bronze-500 dark:text-bronze-400" aria-hidden="true" />
                  </span>
                  Données fournies par le promoteur — informations indicatives
                </p>
              </div>
            </div>

            {/* RIGHT — Repères Neuf (mobile : 2×2) */}
            <aside className="lg:flex lg:flex-col lg:justify-center">
              <div className="overflow-hidden rounded-2xl border border-border/20 dark:border-white/12 bg-card dark:bg-white/[0.06] shadow-[0_20px_50px_rgba(2,10,24,0.15)] dark:shadow-[0_20px_50px_rgba(2,10,24,0.4)] backdrop-blur-md">
                <div className="border-b border-border/15 dark:border-white/10 bg-surface dark:bg-white/[0.03] px-5 py-4">
                  <p className="text-[13px] font-extrabold text-foreground">Repères Neuf</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">Ce que vous trouverez ici</p>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3 lg:grid-cols-1">
                  {REPERES_NEUF.map(({ icon: Icon, label, note }) => (
                    <div
                      key={label}
                      className="flex items-start gap-2.5 rounded-xl border border-border/12 dark:border-white/8 bg-background dark:bg-white/[0.04] px-3 py-2.5 transition hover:border-bronze-500/25 dark:hover:bg-white/[0.07]"
                    >
                      <span className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bronze-500/15 text-bronze-500 dark:text-bronze-400">
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-extrabold leading-tight text-foreground">{label}</p>
                        <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* ── DASHBOARD — [projet + neuf/ancien | sidebar contact] ──────────────── */}
      <section id="projet" className="relative scroll-mt-20 bg-background dark:bg-deepblue py-12 lg:py-16">
        <Container>
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-500 dark:text-bronze-400">Exemple de présentation</p>
              </div>
              <h2 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.04em] text-foreground">
                À quoi ressemble une présentation promoteur
              </h2>
              <p className="mt-1.5 max-w-xl text-[12.5px] leading-5 text-muted-foreground">
                Exemple illustratif — aucun projet partenaire actif pour le moment.
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

            {/* LEFT — grande card projet (exemple) + Neuf vs Ancien */}
            <div className="flex flex-col gap-8">

              {/* PROJECT CARD */}
              <article className="overflow-hidden rounded-[20px] border border-border/15 dark:border-white/10 bg-card dark:bg-white/[0.04] shadow-[0_18px_50px_rgba(2,10,24,0.12)] dark:shadow-[0_18px_50px_rgba(2,10,24,0.4)] backdrop-blur-sm">
                {/* Visuel */}
                <div className="relative h-[230px] overflow-hidden sm:h-[300px]">
                  <ListingVisual listing={EXAMPLE_VISUAL} className="h-full w-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/85 via-[#03101f]/20 to-transparent" />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: "radial-gradient(120% 80% at 50% -10%, rgba(194,163,104,0.16) 0%, transparent 55%)" }}
                  />
                  {/* Label unique — exemple illustratif (non trompeur) */}
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#071B33]/80 px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-bronze-200 shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-1 ring-bronze-500/35 backdrop-blur-md">
                    <Info size={11} aria-hidden="true" />
                    Aperçu · exemple
                  </span>
                  <span className="absolute bottom-3 right-4 rounded-full bg-black/30 px-2 py-1 text-[9px] font-medium text-white/55 backdrop-blur-sm">
                    Aperçu illustratif
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-bronze-500/60 to-transparent" />
                </div>

                {/* Contenu projet */}
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[1.3rem] font-extrabold tracking-[-0.03em] text-foreground">{EXAMPLE_PROJECT.name}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground">
                        <MapPin size={12} className="text-bronze-500 dark:text-bronze-400" aria-hidden="true" />
                        {EXAMPLE_PROJECT.city}, {EXAMPLE_PROJECT.neighborhood}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[1.6rem] font-extrabold leading-none tracking-[-0.04em] text-bronze-500 dark:text-bronze-400">
                        {EXAMPLE_PROJECT.priceFrom.toLocaleString("fr-FR")} DH
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-muted-foreground">prix à partir de</p>
                    </div>
                  </div>

                  {/* Libellé prudent — contenu illustratif (pas de promoteur actif) */}
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-bronze-500/10 px-3 py-1 text-[10.5px] font-bold text-bronze-500 dark:text-bronze-300">
                    <Info size={11} aria-hidden="true" />
                    Données illustratives — exemple de présentation
                  </p>

                  {/* Caractéristiques */}
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/12 dark:border-white/8 bg-background dark:bg-white/[0.04] px-4 py-3">
                      <div className="flex items-center gap-1.5 text-bronze-500 dark:text-bronze-400">
                        <LayoutGrid size={13} aria-hidden="true" />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Typologies</span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] font-extrabold text-foreground">{EXAMPLE_PROJECT.typologies.join(" · ")}</p>
                    </div>
                    <div className="rounded-xl border border-border/12 dark:border-white/8 bg-background dark:bg-white/[0.04] px-4 py-3">
                      <div className="flex items-center gap-1.5 text-bronze-500 dark:text-bronze-400">
                        <Ruler size={13} aria-hidden="true" />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Surfaces</span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] font-extrabold text-foreground">{EXAMPLE_PROJECT.surfaceMin}–{EXAMPLE_PROJECT.surfaceMax} m²</p>
                    </div>
                    <div className="col-span-2 rounded-xl border border-border/12 dark:border-white/8 bg-background dark:bg-white/[0.04] px-4 py-3 sm:col-span-1">
                      <div className="flex items-center gap-1.5 text-bronze-500 dark:text-bronze-400">
                        <CalendarClock size={13} aria-hidden="true" />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Livraison</span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] font-extrabold text-foreground">{EXAMPLE_PROJECT.delivery}</p>
                    </div>
                  </div>

                  {/* Plan type + brochure */}
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <div className="flex flex-1 items-center gap-3 rounded-xl border border-border/12 dark:border-white/8 bg-background dark:bg-white/[0.04] px-4 py-3">
                      <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bronze-500/15 text-bronze-500 dark:text-bronze-400">
                        <LayoutGrid size={15} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-extrabold text-foreground">Plan type</p>
                        <p className="text-[10.5px] text-muted-foreground">Fourni par le promoteur sur la fiche projet</p>
                      </div>
                    </div>
                    <div className="flex flex-1 items-center gap-3 rounded-xl border border-border/12 dark:border-white/8 bg-background dark:bg-white/[0.04] px-4 py-3">
                      <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bronze-500/15 text-bronze-500 dark:text-bronze-400">
                        <FileText size={15} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-extrabold text-foreground">Brochure fournie par le promoteur</p>
                        <p className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                          <Download size={10} aria-hidden="true" /> Bientôt disponible
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CTA unique — conseiller AkarFinder (l'exemple n'est pas un projet réel) */}
                  <div className="mt-5">
                    <Link
                      href="/onboarding"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e7d4f] px-4 py-3 text-[13px] font-extrabold text-white shadow-[0_4px_14px_rgba(14,125,79,0.3)] transition hover:bg-[#0c6c44]"
                    >
                      <MessageCircle size={14} strokeWidth={2.2} aria-hidden="true" />
                      Parler à un conseiller AkarFinder
                    </Link>
                  </div>

                  {/* Disclaimer projet */}
                  <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
                    <Info size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Exemple de présentation — aucun projet partenaire actif pour le moment. Les valeurs
                    (prix, surfaces, livraison) sont illustratives. Sur un vrai projet, ces données
                    seraient fournies par le promoteur et à confirmer avant tout engagement.
                  </p>
                </div>
              </article>

              {/* NEUF VS ANCIEN */}
              <div className="overflow-hidden rounded-2xl border border-border/15 dark:border-white/10 bg-card dark:bg-white/[0.04] shadow-[0_14px_40px_rgba(2,10,24,0.1)] dark:shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="flex items-start gap-2.5 border-b border-border/15 dark:border-white/10 bg-surface dark:bg-white/[0.03] px-5 py-4">
                  <Scale size={16} className="mt-0.5 shrink-0 text-bronze-500 dark:text-bronze-400" aria-hidden="true" />
                  <div>
                    <p className="text-[13px] font-extrabold text-foreground">Neuf vs Ancien</p>
                    <p className="text-[10.5px] text-muted-foreground">Comparaison indicative — les prix et frais peuvent varier</p>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-0">
                  {/* NEUF */}
                  <div className="p-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-bronze-500 dark:text-bronze-400">Neuf</p>
                    <ul className="mt-3 space-y-2.5">
                      {[NEUF_VS_ANCIEN.neuf.prix, NEUF_VS_ANCIEN.neuf.surface, NEUF_VS_ANCIEN.neuf.frais, NEUF_VS_ANCIEN.neuf.extra].map((v, i) => (
                        <li key={v} className="flex items-start gap-2 text-[12.5px] font-semibold text-foreground/80">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bronze-500 dark:bg-bronze-400" aria-hidden="true" />
                          <span className={i === 0 ? "font-extrabold text-foreground" : ""}>{v}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* VS */}
                  <div className="flex items-center justify-center px-1">
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-border/20 dark:border-white/15 bg-surface dark:bg-white/[0.06] text-[11px] font-extrabold text-bronze-500 dark:text-bronze-400" aria-hidden="true">
                      VS
                    </span>
                  </div>
                  {/* ANCIEN */}
                  <div className="border-l border-border/12 dark:border-white/8 p-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Ancien</p>
                    <ul className="mt-3 space-y-2.5">
                      {[NEUF_VS_ANCIEN.ancien.prix, NEUF_VS_ANCIEN.ancien.surface, NEUF_VS_ANCIEN.ancien.frais, NEUF_VS_ANCIEN.ancien.extra].map((v, i) => (
                        <li key={v} className="flex items-start gap-2 text-[12.5px] font-semibold text-foreground/80">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30" aria-hidden="true" />
                          <span className={i === 0 ? "font-extrabold text-foreground" : ""}>{v}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 border-t border-border/12 dark:border-white/8 bg-surface/50 dark:bg-white/[0.02] px-5 py-3">
                  <Info size={11} strokeWidth={2} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p className="text-[10.5px] leading-4 text-muted-foreground">
                    Comparaison indicative — à confirmer avec le promoteur / notaire.
                    Prix observé ancien issu des résultats historiques.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT — sidebar contact */}
            <aside className="flex flex-col gap-5">

              {/* CREDIT-MVP — Mensualité indicative */}
              <CreditSimulator sourcePage="/neuf" id="financement" defaultPrice={850_000} />

              {/* Promoteur */}
              <div className="overflow-hidden rounded-2xl border border-border/15 dark:border-white/10 bg-card dark:bg-white/[0.05] shadow-[0_14px_40px_rgba(2,10,24,0.1)] dark:shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="border-b border-border/15 dark:border-white/10 bg-surface dark:bg-white/[0.03] px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Building2 size={15} className="text-bronze-500 dark:text-bronze-400" aria-hidden="true" />
                    <p className="text-[13px] font-extrabold text-foreground">Promoteur</p>
                  </div>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">Données fournies par le promoteur</p>
                </div>
                <div className="p-5">
                  <p className="text-[13px] leading-6 text-muted-foreground">
                    Aucun promoteur partenaire actif pour le moment. Vous êtes promoteur ?
                    Présentez votre projet neuf sur AkarFinder.
                  </p>
                  <Link
                    href="/promoteurs"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-[0_6px_16px_rgba(155,120,56,0.3)] transition hover:from-bronze-600"
                  >
                    Présenter un projet
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Contact — WhatsApp / rappel / conseiller */}
              <div className="overflow-hidden rounded-2xl border border-border/15 dark:border-white/10 bg-card dark:bg-white/[0.05] shadow-[0_14px_40px_rgba(2,10,24,0.1)] dark:shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="border-b border-border/15 dark:border-white/10 bg-surface dark:bg-white/[0.03] px-5 py-4">
                  <p className="text-[13px] font-extrabold text-foreground">Une question sur le neuf ?</p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">Un conseiller AkarFinder peut vous orienter</p>
                </div>
                <div className="space-y-2.5 p-4">
                  <Link
                    href="/onboarding"
                    className="flex items-center gap-3 rounded-xl border border-border/15 dark:border-white/10 bg-background dark:bg-white/[0.04] px-4 py-3 text-foreground/85 dark:text-white/85 transition hover:border-bronze-500/30 dark:hover:bg-white/[0.07]"
                  >
                    <Phone size={15} strokeWidth={2.2} className="text-bronze-500 dark:text-bronze-400" aria-hidden="true" />
                    <span className="text-[12.5px] font-extrabold">Être rappelé</span>
                  </Link>
                  <p className="px-1 pt-1 text-[10.5px] leading-4 text-muted-foreground">
                    Le contact direct WhatsApp avec le promoteur sera disponible sur les projets
                    partenaires actifs.
                  </p>
                </div>
              </div>

              {/* Guide d'achat Neuf */}
              <div className="overflow-hidden rounded-2xl border border-bronze-500/25 bg-gradient-to-br from-bronze-500/[0.14] to-bronze-500/[0.03] shadow-[0_14px_40px_rgba(2,10,24,0.1)] dark:shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bronze-500/20 text-bronze-500 dark:text-bronze-300 ring-1 ring-bronze-500/30">
                      <FileText size={16} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <p className="text-[13.5px] font-extrabold text-foreground dark:text-bronze-300">Guide d'achat Neuf</p>
                  </div>
                  <p className="mt-3 text-[12.5px] leading-5 text-muted-foreground">
                    Frais notariaux réduits, étapes VEFA, points à vérifier avant de réserver.
                    Repères indicatifs à confirmer avec le promoteur et le notaire.
                  </p>
                </div>
                <div className="border-t border-bronze-500/20 bg-bronze-500/[0.06] px-5 py-3">
                  <Link
                    href="/onboarding"
                    className="flex items-center justify-between text-[12.5px] font-extrabold text-bronze-500 dark:text-bronze-300 transition hover:text-bronze-600 dark:hover:text-bronze-200"
                  >
                    Créer mon dossier acheteur
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>

            </aside>
          </div>
        </Container>
      </section>

      {/* ── STATS / repères ───────────────────────────────────────────────────── */}
      <section className="border-y border-border/12 dark:border-white/8 bg-surface-muted dark:bg-[#050f1e] py-11 lg:py-14">
        <Container>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
            {[
              { value: "Partenaire", label: "données fournies par le promoteur", icon: Building2 },
              { value: "À partir de", label: "prix indicatifs, hors frais", icon: TrendingUp },
              { value: "Plans", label: "& brochures promoteur", icon: FileText },
              { value: "Indicatif", label: "à confirmer avant décision", icon: ShieldCheck },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="mb-3 inline-grid h-9 w-9 place-items-center rounded-xl bg-bronze-500/12 text-bronze-500 dark:text-bronze-400 ring-1 ring-bronze-500/20">
                  <stat.icon size={15} aria-hidden="true" />
                </span>
                <p className="text-[1.5rem] font-extrabold leading-tight tracking-[-0.03em] text-foreground">{stat.value}</p>
                <p className="mt-2 text-[12px] font-semibold text-muted-foreground">{stat.label}</p>
                <div className="mt-3 h-0.5 w-8 rounded-full bg-gradient-to-r from-bronze-500 to-transparent" />
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CALLOUT PROMOTEURS ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface dark:bg-[#040b16] py-14 lg:py-20">
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{ background: "radial-gradient(70% 80% at 88% 30%, rgba(34,72,132,0.35) 0%, transparent 60%)" }}
        />
        <Container className="relative">
          <div className="overflow-hidden rounded-[24px] border border-border/15 dark:border-white/10 bg-card dark:bg-gradient-to-br dark:from-white/[0.06] dark:to-white/[0.02] p-8 backdrop-blur-sm sm:p-10">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-500 dark:text-bronze-400">Espace promoteurs</p>
            </div>
            <h2 className="mt-3 max-w-xl text-[1.7rem] font-extrabold leading-tight tracking-[-0.04em] text-foreground">
              Vous êtes promoteur ? Présentez vos projets sur AkarFinder
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-7 text-muted-foreground">
              Pages projet dédiées, présentation soignée et mise en relation avec des acheteurs.
              Données fournies par le promoteur — sans promesse de volume ni garantie de résultats.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/promoteurs"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.35)] transition hover:from-bronze-600"
              >
                Découvrir l'espace promoteurs
                <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </Link>
              <Link
                href="/pro"
                className="inline-flex items-center gap-2 rounded-xl border border-border/20 dark:border-white/15 bg-surface dark:bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-foreground dark:text-white/90 transition hover:border-bronze-500/40"
              >
                Accéder à AkarFinder Pro
                <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="mt-6 flex items-start gap-1.5 text-[11.5px] leading-5 text-muted-foreground">
            <Info size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
            Les informations sur les projets neufs sont fournies par les promoteurs partenaires
            (données partenaires), à titre indicatif. Prix à partir de, hors frais notariaux et
            charges. Disponibilité, typologies et plans à confirmer directement auprès du promoteur
            avant tout engagement. AkarFinder n'est pas partie à la transaction.
          </p>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
