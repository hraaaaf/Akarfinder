import Link from "next/link";
import {
  ArrowRight,
  Home,
  MapPin,
  Ruler,
  BedDouble,
  Bath,
  Car,
  TrendingUp,
  Info,
  ShieldCheck,
  Eye,
  MessageCircle,
  Share2,
  Globe,
  Users,
  Wallet,
  Check,
  BarChart2,
  Camera,
  FileText,
  Tag,
  Megaphone,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { TrackedLink } from "@/components/tracking/TrackedLink";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { searchListings } from "@/lib/search";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import type { Listing } from "@/lib/listings/types";

// Bien vendeur exemple (aperçu) — jamais présenté comme réel.
const VENDOR_BIEN = {
  name: "Villa contemporaine avec piscine",
  city: "Casablanca",
  neighborhood: "Bouskoura",
  surface: 420,
  bedrooms: 5,
  bathrooms: 4,
  parking: 2,
  statut: "Brouillon",
};
const VENDOR_VISUAL = {
  id: "vendre-example-villa-bouskoura",
  transaction_type: "buy",
  property_type: "Villa",
  city: "Casablanca",
} as unknown as Listing;

// Estimation indicative (fourchette prudente).
const ESTIMATION = { min: 4_600_000, max: 5_200_000, median: 4_900_000, ppm2Min: 10_950, ppm2Max: 12_380 };

// Prix observés dans la zone (repères, DH/m²).
const PRIX_ZONE = [
  { quartier: "Bouskoura",          ppm2: 11_800, level: 3 },
  { quartier: "Dar Bouazza",        ppm2: 13_200, level: 3 },
  { quartier: "Casablanca (moy.)",  ppm2: 16_400, level: 4 },
];
const PRIX_MAX = Math.max(...PRIX_ZONE.map((r) => r.ppm2));

// Repères vendeur (hero).
const REPERES = [
  { icon: TrendingUp, label: "Estimation indicative", note: "Fourchette prudente" },
  { icon: BarChart2,  label: "Prix observés",         note: "Repères de votre zone" },
  { icon: Home,       label: "Annonces similaires",   note: "Pour vous situer" },
  { icon: Eye,        label: "Visibilité potentielle", note: "Diffusion multi-canal" },
];

// Canaux de diffusion (visibilité potentielle).
const CANAUX = [
  { icon: MessageCircle, label: "WhatsApp" },
  { icon: Share2,        label: "Réseaux sociaux" },
  { icon: Globe,         label: "Portails" },
  { icon: Home,          label: "AkarFinder" },
];

// Demandes sérieuses / leads (aperçu) — exemples illustratifs, non des demandes réelles.
const LEADS = [
  { initials: "S", name: "Salma R.",  budget: "4,5 – 5 M DH", note: "Villa · Bouskoura" },
  { initials: "Y", name: "Yassir M.", budget: "≈ 5 M DH",     note: "Achat famille · Casablanca" },
  { initials: "N", name: "Nadia E.",  budget: "4 – 4,8 M DH", note: "Villa avec piscine" },
];

// Checklist préparation vente.
const CHECKLIST = [
  { icon: FileText, label: "Rassembler les documents", note: "Titre, plans, taxe d'habitation" },
  { icon: Tag,      label: "Définir un prix réaliste",  note: "À partir des repères de marché" },
  { icon: Camera,   label: "Préparer photos & description", note: "Mettre le bien en valeur" },
  { icon: BarChart2, label: "Comparer aux annonces similaires", note: "Pour vous situer" },
  { icon: Wallet,   label: "Fixer une marge de négociation", note: "Fourchette confortable" },
  { icon: Megaphone, label: "Choisir vos canaux de diffusion", note: "Où publier l'annonce" },
];

function Sparkline() {
  return (
    <svg viewBox="0 0 84 26" className="h-6 w-24" aria-hidden="true">
      <defs>
        <linearGradient id="vendre-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C2A368" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#C2A368" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points="0,21 14,18 28,19 42,12 56,14 70,7 84,4" fill="none" stroke="#C2A368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="0,21 14,18 28,19 42,12 56,14 70,7 84,4 84,26 0,26" fill="url(#vendre-spark)" />
    </svg>
  );
}

export async function VendrePageShell() {
  let similar: Listing[] = [];
  try {
    const result = await searchListings({ transaction_type: "buy", limit: 3 });
    similar = result.listings ?? [];
  } catch {
    // fallback : section masquée si pas d'annonces
  }

  const medianPct = Math.round(((ESTIMATION.median - ESTIMATION.min) / (ESTIMATION.max - ESTIMATION.min)) * 100);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="dark" compact />

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface pb-11 pt-7 sm:pb-16 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 hidden dark:block" style={{ background: "radial-gradient(ellipse 80% 70% at 62% 26%, rgba(34,72,132,0.72) 0%, transparent 64%)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 95% 100%, rgba(194,163,104,0.10) 0%, transparent 60%)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bronze-500/45 to-transparent" />

        <Container className="relative">
          <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
            {/* LEFT */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-bronze-500/70" aria-hidden="true" />
                <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-bronze-400">Vendre</p>
              </div>
              <h1 className="mt-4 text-[2.4rem] font-extrabold leading-[1.04] tracking-[-0.05em] text-foreground sm:mt-5 sm:text-[3.5rem]">
                Vendre avec<br className="hidden sm:block" />{" "}
                <span className="text-bronze-400">plus de clarté.</span>
              </h1>
              <p className="mt-3.5 max-w-xl text-[14.5px] leading-6 text-muted-foreground sm:mt-5 sm:text-[15.5px] sm:leading-7">
                Comparez votre bien aux annonces similaires, observez les prix du marché et
                préparez votre mise en vente avec des repères indicatifs.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
                <TrackedLink href="/vendre/dossier" event={{ event_name: "seller_cta_click", source_page: "/vendre", source_channel: "seller", intent: "vendre" }} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.4)] transition hover:from-bronze-600">
                  Préparer ma vente
                  <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </TrackedLink>
                <Link href="#estimation" className="inline-flex items-center gap-2 rounded-xl border border-border/15 bg-surface-muted px-5 py-3 text-[13.5px] font-extrabold text-foreground transition hover:border-bronze-500/40 hover:bg-surface-muted">
                  Comparer avec le marché
                  <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </Link>
              </div>

              <div className="mt-5 sm:mt-6">
                <p className="inline-flex items-center gap-2.5 rounded-full border border-border/15 bg-surface-muted px-4 py-2 text-[13px] font-semibold text-muted-foreground">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bronze-500/20">
                    <Info size={11} className="text-bronze-400" aria-hidden="true" />
                  </span>
                  Repères indicatifs — à confirmer avant décision
                </p>
              </div>
            </div>

            {/* RIGHT — Repères vendeur (mobile : 2×2) */}
            <aside className="lg:flex lg:flex-col lg:justify-center">
              <div className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_20px_50px_rgba(2,10,24,0.4)] backdrop-blur-md">
                <div className="border-b border-border/15 bg-card px-5 py-4">
                  <p className="text-[13px] font-extrabold text-foreground">Vos repères vendeur</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">Pour préparer la mise en vente</p>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3 lg:grid-cols-1">
                  {REPERES.map(({ icon: Icon, label, note }) => (
                    <div key={label} className="flex items-start gap-2.5 rounded-xl border border-border/15 bg-card px-3 py-2.5 transition hover:border-bronze-500/25 hover:bg-card">
                      <span className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bronze-500/15 text-bronze-400">
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

      {/* ── DASHBOARD VENDEUR ─────────────────────────────────────────────────── */}
      <section id="estimation" className="relative scroll-mt-20 bg-background py-12 lg:py-16">
        <Container>
          <div className="mb-7">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">Tableau de bord vendeur</p>
            </div>
            <h2 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.04em] text-foreground">Votre vente en un coup d'œil</h2>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">Exemple illustratif — les données affichées sont des aperçus.</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            {/* LEFT */}
            <div className="flex flex-col gap-8">

              {/* 1. APERÇU BIEN VENDEUR */}
              <article className="overflow-hidden rounded-[20px] border border-border/15 bg-card shadow-[0_18px_50px_rgba(2,10,24,0.4)] backdrop-blur-sm">
                <div className="relative h-[210px] overflow-hidden sm:h-[260px]">
                  <ListingVisual listing={VENDOR_VISUAL} className="h-full w-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/85 via-[#03101f]/20 to-transparent" />
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#071B33]/80 px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-bronze-200 ring-1 ring-bronze-500/35 backdrop-blur-md">
                    <Info size={11} aria-hidden="true" />
                    Aperçu · votre bien
                  </span>
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-foreground ring-1 ring-border/20 backdrop-blur-md">
                    Statut : {VENDOR_BIEN.statut}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-bronze-500/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-[1.25rem] font-extrabold tracking-[-0.03em] text-foreground">{VENDOR_BIEN.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                      <MapPin size={12} className="text-bronze-300" aria-hidden="true" />
                      {VENDOR_BIEN.city}, {VENDOR_BIEN.neighborhood}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:p-6">
                  {[
                    { icon: Ruler, k: "Surface", v: `${VENDOR_BIEN.surface} m²` },
                    { icon: BedDouble, k: "Chambres", v: `${VENDOR_BIEN.bedrooms}` },
                    { icon: Bath, k: "Salles de bain", v: `${VENDOR_BIEN.bathrooms}` },
                    { icon: Car, k: "Parking", v: `${VENDOR_BIEN.parking}` },
                  ].map(({ icon: Icon, k, v }) => (
                    <div key={k} className="rounded-xl border border-border/15 bg-card px-3.5 py-3">
                      <div className="flex items-center gap-1.5 text-bronze-400">
                        <Icon size={12} aria-hidden="true" />
                        <span className="text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">{k}</span>
                      </div>
                      <p className="mt-1.5 text-[13px] font-extrabold text-foreground">{v}</p>
                    </div>
                  ))}
                </div>
              </article>

              {/* 2. ESTIMATION INDICATIVE */}
              <div className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2 border-b border-border/15 bg-card px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <TrendingUp size={16} className="text-bronze-400" aria-hidden="true" />
                    <p className="text-[13px] font-extrabold text-foreground">Estimation indicative</p>
                  </div>
                  <span className="rounded-full bg-bronze-500/15 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-bronze-300">Fourchette prudente</span>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Fourchette indicative</p>
                      <p className="mt-1 text-[1.5rem] font-extrabold leading-none tracking-[-0.04em] text-bronze-400 sm:text-[1.7rem]">
                        {(ESTIMATION.min / 1_000_000).toLocaleString("fr-FR")} – {(ESTIMATION.max / 1_000_000).toLocaleString("fr-FR")} M DH
                      </p>
                    </div>
                    <p className="text-right text-[11px] font-semibold text-muted-foreground">
                      {ESTIMATION.ppm2Min.toLocaleString("fr-FR")} – {ESTIMATION.ppm2Max.toLocaleString("fr-FR")}<br />DH/m²
                    </p>
                  </div>

                  {/* Range bar */}
                  <div className="mt-5">
                    <div className="relative h-2.5 rounded-full bg-foreground/10">
                      <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-bronze-700/40 via-bronze-500/70 to-bronze-700/40" />
                      <div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[#061027] bg-bronze-400 shadow-[0_0_0_3px_rgba(194,163,104,0.25)]" style={{ left: `calc(${medianPct}% - 8px)` }} aria-hidden="true" />
                    </div>
                    <div className="mt-2 flex justify-between text-[10.5px] font-semibold text-muted-foreground">
                      <span>{(ESTIMATION.min / 1_000_000).toLocaleString("fr-FR")} M</span>
                      <span className="text-bronze-300">médiane ≈ {(ESTIMATION.median / 1_000_000).toLocaleString("fr-FR")} M</span>
                      <span>{(ESTIMATION.max / 1_000_000).toLocaleString("fr-FR")} M</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-2 rounded-xl border border-border/15 bg-card px-4 py-3">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0 text-bronze-400" aria-hidden="true" />
                    <p className="text-[11.5px] leading-5 text-muted-foreground">
                      Estimation indicative et prudente — elle ne remplace ni une visite ni l'avis
                      d'un professionnel. À confirmer avant décision.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. VISIBILITÉ POTENTIELLE */}
              <div className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2 border-b border-border/15 bg-card px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Eye size={16} className="text-bronze-400" aria-hidden="true" />
                    <p className="text-[13px] font-extrabold text-foreground">Visibilité potentielle</p>
                  </div>
                  <span className="rounded-full bg-bronze-500/15 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-bronze-300">Aperçu</span>
                </div>
                <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Diffusion multi-canal</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {CANAUX.map(({ icon: Icon, label }) => (
                        <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-border/15 bg-card px-3 py-1.5 text-[11.5px] font-semibold text-foreground">
                          <Icon size={12} className="text-bronze-400" aria-hidden="true" />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-border/15 bg-card px-4 py-3">
                    <div>
                      <p className="text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-foreground">+1k</p>
                      <p className="mt-1 text-[10.5px] font-semibold text-muted-foreground">vues estimées (aperçu)</p>
                    </div>
                    <Sparkline />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <aside className="flex flex-col gap-5">
              {/* 3. PRIX OBSERVÉS DANS LA ZONE */}
              <div className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="flex items-start gap-2.5 border-b border-border/15 bg-card px-5 py-4">
                  <BarChart2 size={16} className="mt-0.5 shrink-0 text-bronze-400" aria-hidden="true" />
                  <div>
                    <p className="text-[13px] font-extrabold text-foreground">Prix observés dans la zone</p>
                    <p className="text-[10.5px] text-muted-foreground">Repères DH/m² — indicatifs</p>
                  </div>
                </div>
                <div className="space-y-3 px-5 py-4">
                  {PRIX_ZONE.map((row) => (
                    <div key={row.quartier}>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-muted-foreground">{row.quartier}</span>
                        <span className="text-[12.5px] font-extrabold text-foreground">
                          {row.ppm2.toLocaleString("fr-FR")}<span className="ml-1 text-[9.5px] font-semibold text-muted-foreground">DH/m²</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-bronze-600 to-bronze-400" style={{ width: `${Math.round((row.ppm2 / PRIX_MAX) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/15 bg-surface px-5 py-3">
                  <Link href="/map" className="flex items-center justify-between text-[11.5px] font-extrabold text-bronze-300 transition hover:text-bronze-200">
                    Voir le détail par zone
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* 6. DEMANDES SÉRIEUSES / LEADS APERÇU */}
              <div className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2 border-b border-border/15 bg-card px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Users size={15} className="text-bronze-400" aria-hidden="true" />
                    <p className="text-[13px] font-extrabold text-foreground">Demandes sérieuses</p>
                  </div>
                  <span className="rounded-full bg-bronze-500/15 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-bronze-300">Aperçu</span>
                </div>
                <div className="divide-y divide-white/8">
                  {LEADS.map((l) => (
                    <div key={l.name} className="flex items-center gap-3 px-4 py-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bronze-500/15 text-[13px] font-extrabold text-bronze-300">{l.initials}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-extrabold text-foreground">{l.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{l.note}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-[10.5px] font-extrabold text-bronze-300">{l.budget}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/15 px-4 py-3">
                  <p className="mb-2 text-[10px] text-muted-foreground">Exemples illustratifs — non des demandes réelles</p>
                  <Link href="/vendre/dossier" className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/15 bg-card px-4 py-2.5 text-[12px] font-extrabold text-foreground transition hover:border-bronze-500/30 hover:bg-card">
                    Préparer ma vente
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* ── 4. ANNONCES SIMILAIRES ────────────────────────────────────────────── */}
      {similar.length > 0 && (
        <section className="border-t border-border/15 bg-[#050f1e] py-12 lg:py-14">
          <Container>
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">Pour vous situer</p>
                </div>
                <h2 className="mt-2 text-[1.4rem] font-extrabold tracking-[-0.04em] text-foreground">Annonces similaires analysées</h2>
                <p className="mt-1.5 text-[12.5px] text-muted-foreground">Repères indicatifs issus d'annonces publiques analysées.</p>
              </div>
              <Link href="/acheter" className="group hidden shrink-0 items-center gap-1.5 rounded-full border border-border/15 bg-surface-muted px-4 py-2 text-[12.5px] font-bold text-bronze-400 transition hover:border-bronze-500/40 hover:bg-surface-muted sm:inline-flex">
                Voir des biens comparables
                <ArrowRight size={12} strokeWidth={2.4} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((listing) => (
                <article key={listing.id} className="group flex flex-col overflow-hidden rounded-[18px] border border-border/15 bg-card shadow-[0_12px_36px_rgba(2,10,24,0.35)] backdrop-blur-sm transition hover:-translate-y-1 hover:border-bronze-500/30">
                  <Link href={`/listings/${listing.id}`} className="relative block h-[150px] overflow-hidden">
                    <div className="absolute inset-0 transition duration-700 group-hover:scale-[1.05]">
                      <ListingVisual listing={listing} className="h-full w-full" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/80 to-transparent" />
                    <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[#071B33]/75 px-2.5 py-1 text-[10px] font-extrabold text-white ring-1 ring-border/20 backdrop-blur-md">
                      <MapPin size={9} className="text-bronze-400" aria-hidden="true" />
                      {listing.city}
                    </span>
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-[1.15rem] font-extrabold leading-none tracking-[-0.04em] text-bronze-400">{formatPrice(listing.price, listing.currency)}</p>
                    <h3 className="mt-2 line-clamp-1 text-[12.5px] font-extrabold text-foreground">{listing.title}</h3>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/15 pt-2.5 text-[11.5px] font-bold text-muted-foreground">
                      {listing.surface_m2 > 0 && <span>{formatSurface(listing.surface_m2)}</span>}
                      {listing.bedrooms > 0 && <span>{listing.bedrooms} ch.</span>}
                      {listing.price_per_m2 > 0 && <span className="text-muted-foreground">{listing.price_per_m2.toLocaleString("fr-FR")} DH/m²</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ── 7. CHECKLIST PRÉPARATION VENTE ────────────────────────────────────── */}
      <section className="bg-[#050f1e] pb-12 lg:pb-14">
        <Container>
          <div className="overflow-hidden rounded-[24px] border border-border/15 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-6 backdrop-blur-sm sm:p-8">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">Étapes clés</p>
            </div>
            <h2 className="mt-2 text-[1.4rem] font-extrabold tracking-[-0.04em] text-foreground">Checklist de préparation à la vente</h2>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">Des repères pour avancer sereinement — à adapter à votre situation.</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CHECKLIST.map(({ icon: Icon, label, note }, i) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl border border-border/15 bg-card p-4 transition hover:border-bronze-500/25 hover:bg-card">
                  <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bronze-500/12 text-bronze-400 ring-1 ring-bronze-500/20">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-foreground">
                      <span className="text-bronze-400/70">{String(i + 1).padStart(2, "0")}</span>
                      {label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── 8. CTA ACCOMPAGNEMENT ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#040b16] py-14 lg:py-20">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 80% at 88% 30%, rgba(34,72,132,0.35) 0%, transparent 60%)" }} />
        <Container className="relative">
          <div className="overflow-hidden rounded-[24px] border border-border/15 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 backdrop-blur-sm sm:p-10">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">Accompagnement</p>
            </div>
            <h2 className="mt-3 max-w-xl text-[1.7rem] font-extrabold leading-tight tracking-[-0.04em] text-foreground">
              Préparez votre vente avec des repères clairs
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-7 text-muted-foreground">
              Estimation indicative, prix observés et annonces similaires réunis pour vous aider à
              fixer le bon prix et toucher des acheteurs sérieux. Repères indicatifs — à confirmer
              avant décision.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/vendre/dossier" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.35)] transition hover:from-bronze-600">
                Préparer ma vente
                <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </Link>
              <Link href="#estimation" className="inline-flex items-center gap-2 rounded-xl border border-border/15 bg-surface-muted px-5 py-3 text-[13.5px] font-extrabold text-foreground transition hover:border-bronze-500/40 hover:bg-surface-muted">
                Comparer avec le marché
                <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <p className="mt-6 flex items-start gap-1.5 text-[11.5px] leading-5 text-muted-foreground">
            <Info size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
            Les estimations, demandes et chiffres de visibilité présentés sont des aperçus indicatifs
            (exemples / simulations) et non une estimation officielle, une valeur certifiée ou une
            promesse de vente. AkarFinder n'est pas expert immobilier ni partie à la transaction.
            Repères à confirmer auprès d'un professionnel avant toute décision.
          </p>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
