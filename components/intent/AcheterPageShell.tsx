import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ShieldCheck,
  Copy,
  Scale,
  TrendingUp,
  AlertCircle,
  MapPin,
  ArrowRight,
  Star,
  BarChart2,
  Heart,
  Ruler,
  BedDouble,
  Bath,
} from "lucide-react";

import { Container } from "@/components/ui/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { CreditSimulator } from "@/components/credit/CreditSimulator";
import { SimulateCreditButton } from "@/components/credit/SimulateCreditButton";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import type { Listing } from "@/lib/listings/types";

// P10D — repères indicatifs extraits de lib/market/morocco-market-prices.ts
// appartement achat, city-level
const PRIX_OBSERVES = [
  { city: "Casablanca", median: 13000 },
  { city: "Rabat",      median: 13000 },
  { city: "Marrakech",  median: 12500 },
  { city: "Tanger",     median: 11500 },
  { city: "Agadir",     median: 10500 },
];
const PRIX_MAX = Math.max(...PRIX_OBSERVES.map((r) => r.median));

const FILTER_CHIPS = [
  { label: "Acheter",         href: "/search?transaction_type=buy" },
  { label: "Type de bien",    href: "/search?transaction_type=buy" },
  { label: "Prix max",        href: "/search?transaction_type=buy" },
  { label: "Plus de filtres", href: "/search?transaction_type=buy" },
];

// level = repère relatif du prix/m² (1-4) pour le mini-indicateur visuel
const EXPLORER_CITIES = [
  { city: "Casablanca", price: 13000, level: 4, href: "/map?city=Casablanca" },
  { city: "Rabat",      price: 13000, level: 4, href: "/map?city=Rabat" },
  { city: "Marrakech",  price: 12500, level: 3, href: "/map?city=Marrakech" },
  { city: "Tanger",     price: 11500, level: 3, href: "/map?city=Tanger" },
];

export type AcheterPageShellProps = {
  listings: Listing[];
  totalListings: number | null;
  duplicatesDetected: number;
};

function getReliability(score: number) {
  if (score >= 80) return { label: "Élevée",     dots: 4, color: "#22c55e" };
  if (score >= 50) return { label: "Modérée",    dots: 2, color: "#f59e0b" };
  return             { label: "À vérifier",  dots: 1, color: "#ef4444" };
}

// ─── Premium listing card — vertical (image top, content bottom) ─────────────
// Carte blanche qui ressort sur fond deepblue sombre.
// Image = ListingVisual SVG (P10IMG) avec habillage premium (gradient, glow, badges).
function AcheterListingCard({ listing }: { listing: Listing }) {
  const reliability = getReliability(listing.reliability_score ?? 0);

  return (
    <article className="group flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_14px_44px_rgba(2,10,24,0.4)] ring-1 ring-white/10 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_64px_rgba(2,10,24,0.55)] hover:ring-bronze-500/40">

      {/* ── Image zone — pleine largeur en haut ──────────────────────── */}
      <Link
        href={`/listings/${listing.id}`}
        aria-label={`Voir le bien : ${listing.title}`}
        className="relative block h-[200px] overflow-hidden"
      >
        <div className="absolute inset-0 transition duration-700 ease-out group-hover:scale-[1.06]">
          <ListingVisual listing={listing} className="h-full w-full" />
        </div>

        {/* Gradient bottom-up — profondeur premium */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/85 via-[#03101f]/12 to-transparent" />
        {/* Bronze glow subtil en haut */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% -10%, rgba(194,163,104,0.18) 0%, transparent 55%)",
          }}
        />
        {/* Vignette latérale douce */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.30) 100%)",
          }}
        />

        {/* City badge — top-left glass deepblue */}
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[#071B33]/70 px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-1 ring-white/15 backdrop-blur-md">
          <MapPin size={10} className="text-bronze-400" aria-hidden="true" />
          {listing.city}
        </span>

        {/* Heart — top-right glass (décoratif, conforme visuel référence) */}
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-1 ring-white/25 backdrop-blur-md transition group-hover:bg-white/25"
        >
          <Heart size={14} strokeWidth={2.2} />
        </span>

        {/* Property type — bottom-left bronze */}
        <span className="absolute bottom-3 left-3 rounded-full bg-gradient-to-r from-bronze-700 to-bronze-600 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
          {listing.property_type}
        </span>

        {/* Aperçu illustratif — bottom-right discret (P10IMG) */}
        <span className="absolute bottom-3 right-3 rounded-full bg-black/30 px-2 py-1 text-[9px] font-medium text-white/55 backdrop-blur-sm">
          Aperçu illustratif
        </span>

        {/* Bronze shimmer line bas d'image */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-bronze-500/60 to-transparent" />
      </Link>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4">

        {/* Title */}
        <Link href={`/listings/${listing.id}`} className="block">
          <h3 className="line-clamp-1 text-[14px] font-extrabold leading-snug text-deepblue transition group-hover:text-bronze-700">
            {listing.title}
          </h3>
        </Link>

        {/* Price — bronze (signature) */}
        <p className="mt-1 text-[1.4rem] font-extrabold leading-none tracking-[-0.04em] text-bronze-700">
          {formatPrice(listing.price, listing.currency)}
        </p>
        {listing.price_per_m2 > 0 && (
          <p className="mt-1 text-[11px] font-bold text-gray-400">
            {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²
          </p>
        )}

        {/* Location */}
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-gray-500">
          <MapPin size={11} strokeWidth={2.2} className="shrink-0 text-bronze-600" aria-hidden="true" />
          <span className="truncate">
            {listing.neighborhood
              ? `${listing.city}, ${listing.neighborhood}`
              : listing.city}
          </span>
        </p>

        {/* Specs */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[#f0e6d2] pt-3 text-[12px] font-bold text-gray-700">
          {listing.surface_m2 > 0 && (
            <span className="inline-flex items-center gap-1">
              <Ruler size={12} className="text-bronze-600" aria-hidden="true" />
              {formatSurface(listing.surface_m2)}
            </span>
          )}
          {listing.bedrooms > 0 && (
            <span className="inline-flex items-center gap-1">
              <BedDouble size={12} className="text-bronze-600" aria-hidden="true" />
              {listing.bedrooms} ch.
            </span>
          )}
          {listing.bathrooms > 0 && (
            <span className="inline-flex items-center gap-1">
              <Bath size={12} className="text-bronze-600" aria-hidden="true" />
              {listing.bathrooms} sdb
            </span>
          )}
        </div>

        {/* Reliability */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4].map((d) => (
              <span
                key={d}
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: d <= reliability.dots ? reliability.color : "#e5e7eb" }}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-gray-500">
            Repères de fiabilité :{" "}
            <span className="font-extrabold text-gray-700">{reliability.label}</span>
          </span>
        </div>

        {/* CTAs */}
        <div className="mt-auto flex items-center gap-2 pt-4">
          <Link
            href={`/listings/${listing.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-deepblue px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-[0_4px_14px_rgba(7,27,51,0.25)] transition hover:bg-deepblue-700 group-hover:gap-3"
          >
            Voir le bien
            <ArrowRight size={13} strokeWidth={2.4} aria-hidden="true" />
          </Link>
          {listing.listing_url && (
            <a
              href={listing.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Voir la source de l'annonce"
              className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border border-[#eadfca] text-gray-500 transition hover:border-bronze-500 hover:bg-[#f7f3ea] hover:text-deepblue"
            >
              <ArrowRight size={15} className="-rotate-45" aria-hidden="true" />
            </a>
          )}
        </div>

        {/* Lead CTA — dossier acheteur pour ce bien */}
        <Link
          href={`/onboarding?intent=acheter&listing=${listing.id}`}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e5dcc8] bg-[#fdfbf7] px-4 py-2 text-[11.5px] font-extrabold text-bronze-700 transition hover:border-bronze-500/60 hover:bg-[#f7f3ea]"
        >
          Préparer mon dossier pour ce bien
          <ArrowRight size={11} strokeWidth={2.6} aria-hidden="true" />
        </Link>

        {/* CREDIT-MVP / CREDIT-UX-1 — Simuler le crédit pour ce bien (prix prérempli) */}
        <SimulateCreditButton price={listing.price} />
      </div>
    </article>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────
export function AcheterPageShell({
  listings,
  totalListings,
  duplicatesDetected,
}: AcheterPageShellProps) {
  const hasDuplicates = duplicatesDetected > 0;
  const compareListings = listings.slice(0, 2);

  return (
    <main className="min-h-screen bg-[#061027] text-white">
      <SiteHeader variant="dark" compact />

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-deepblue pb-11 pt-10 sm:pb-16 sm:pt-20">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 62% 26%, rgba(34,72,132,0.72) 0%, transparent 64%)",
          }}
        />
        {/* Bronze ambient corner */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 95% 100%, rgba(194,163,104,0.10) 0%, transparent 60%)",
          }}
        />
        {/* Bronze shimmer line bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bronze-500/45 to-transparent" />

        <Container className="relative">
          <div className="grid gap-12 lg:grid-cols-[1fr_330px]">

            {/* ── LEFT — Title / search / chips / counter ────────────────── */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-bronze-500/70" aria-hidden="true" />
                <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-bronze-400">
                  Acheter
                </p>
              </div>
              <h1 className="mt-4 text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.05em] text-white sm:mt-5 sm:text-[3.7rem]">
                Trouvez le bien<br className="hidden sm:block" />{" "}
                <span className="text-bronze-400">fait pour vous</span>
              </h1>
              <p className="mt-3.5 max-w-lg text-[14.5px] leading-6 text-white/65 sm:mt-5 sm:text-[15.5px] sm:leading-7">
                Achetez en toute clarté grâce à nos repères de marché au Maroc —
                prix observés, doublons détectés et fiabilité visible.
              </p>

              {/* Search form */}
              <form action="/search" method="get" className="mt-6 sm:mt-8">
                <div className="flex overflow-hidden rounded-2xl bg-white p-1 shadow-[0_18px_60px_rgba(0,0,0,0.4)] ring-1 ring-white/20">
                  <div className="flex flex-1 items-center gap-2.5 px-4">
                    <Search
                      size={17}
                      strokeWidth={2.2}
                      className="shrink-0 text-gray-400"
                      aria-hidden="true"
                    />
                    <input
                      name="q"
                      type="text"
                      placeholder="Ville, quartier, résidence, référence..."
                      className="w-full bg-transparent py-3.5 text-[14px] text-gray-800 placeholder-gray-400 outline-none"
                    />
                  </div>
                  <div className="hidden items-center gap-1.5 border-l border-gray-100 px-4 sm:flex">
                    <MapPin
                      size={13}
                      strokeWidth={2.2}
                      className="shrink-0 text-bronze-600"
                      aria-hidden="true"
                    />
                    <span className="text-[13px] font-semibold text-gray-600">Maroc</span>
                    <ChevronDown size={12} className="text-gray-400" aria-hidden="true" />
                  </div>
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-6 py-3.5 text-[14px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.4)] transition hover:from-bronze-600 hover:to-bronze-700"
                  >
                    Explorer
                  </button>
                </div>
              </form>

              {/* Filter chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {FILTER_CHIPS.map((chip) => (
                  <Link
                    key={chip.label}
                    href={chip.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[12.5px] font-semibold text-white/85 transition hover:border-bronze-500/40 hover:bg-white/16"
                  >
                    {chip.label}
                    <ChevronDown size={11} aria-hidden="true" />
                  </Link>
                ))}
                <Link
                  href="/search"
                  aria-label="Filtres avancés"
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-white/60 transition hover:bg-white/16"
                >
                  <SlidersHorizontal size={13} aria-hidden="true" />
                </Link>
              </div>

              {/* Counter */}
              <div className="mt-4 sm:mt-6">
                {totalListings !== null && totalListings > 0 ? (
                  <p className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13.5px] font-semibold text-white/80">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bronze-500/20">
                      <Star
                        size={11}
                        className="text-bronze-400"
                        fill="currentColor"
                        aria-hidden="true"
                      />
                    </span>
                    <span>
                      <strong className="text-white">
                        {totalListings.toLocaleString("fr-FR")}
                      </strong>{" "}
                      annonces analysées
                    </span>
                  </p>
                ) : (
                  <p className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13.5px] font-semibold text-white/60">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bronze-500/15">
                      <Star
                        size={11}
                        className="text-bronze-400"
                        fill="currentColor"
                        aria-hidden="true"
                      />
                    </span>
                    Annonces analysées depuis plusieurs sources
                  </p>
                )}
              </div>
            </div>

            {/* ── RIGHT — Fiabilité visible card ─────────────────────────── */}
            <aside className="hidden lg:flex lg:flex-col lg:justify-center">
              <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] shadow-[0_20px_50px_rgba(2,10,24,0.4)] backdrop-blur-md">
                {/* Card header */}
                <div className="border-b border-white/10 bg-white/[0.03] px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0c4a2a] text-[#34d399] ring-1 ring-[#34d399]/20">
                      <ShieldCheck size={18} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[14px] font-extrabold text-white">Fiabilité visible</p>
                      <p className="mt-0.5 text-[11.5px] leading-5 text-white/55">
                        Signaux de marché pour chaque annonce
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signal list */}
                <div className="space-y-2 p-4">
                  {[
                    { label: "Historique des prix",  icon: TrendingUp },
                    { label: "Qualité de l'annonce", icon: Star       },
                    { label: "Similarité du bien",   icon: Copy       },
                    { label: "Activité du marché",   icon: BarChart2  },
                  ].map(({ label, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 transition hover:border-bronze-500/25 hover:bg-white/[0.07]"
                    >
                      <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-bronze-500/15 text-bronze-400">
                        <Icon size={13} aria-hidden="true" />
                      </span>
                      <span className="flex-1 text-[12.5px] font-semibold text-white/80">
                        {label}
                      </span>
                      <div className="flex gap-0.5" aria-hidden="true">
                        {[1, 2, 3].map((d) => (
                          <span
                            key={d}
                            className="h-1.5 w-1.5 rounded-full bg-bronze-500/60"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer note */}
                <div className="border-t border-white/8 px-6 py-3.5">
                  <p className="text-[11px] text-white/45">
                    Repères indicatifs — à confirmer avant décision
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* ── Fiabilité — mobile strip (dark glass) ─────────────────────────────── */}
      <div className="border-b border-white/8 bg-[#071B33] px-4 py-4 lg:hidden">
        <Container>
          <div className="flex items-center gap-3">
            <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0c4a2a] text-[#34d399] ring-1 ring-[#34d399]/20">
              <ShieldCheck size={16} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <p className="text-[12.5px] font-semibold text-white/70">
              <span className="font-extrabold text-white">Fiabilité visible</span>
              {" · "}Historique prix · Qualité · Similarité · Activité
            </p>
          </div>
        </Container>
      </div>

      {/* ── DASHBOARD — 2-col [listing cards | sidebar] sur fond sombre ────────── */}
      <section className="relative bg-gradient-to-b from-deepblue to-[#050f1e] py-12 lg:py-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

            {/* ── LEFT — listing cards ──────────────────────────────────── */}
            <div>
              <div className="mb-7 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
                    <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">
                      En direct
                    </p>
                  </div>
                  <h2 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.04em] text-white">
                    Biens analysés en ce moment
                  </h2>
                </div>
                <Link
                  href="/search?transaction_type=buy"
                  className="group shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-[12.5px] font-bold text-bronze-400 transition hover:border-bronze-500/40 hover:bg-white/10"
                >
                  Voir tout
                  <ArrowRight
                    size={12}
                    strokeWidth={2.4}
                    className="transition group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>

              {listings.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {listings.map((listing) => (
                    <AcheterListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-14 text-center backdrop-blur-sm">
                  <p className="text-[15px] font-semibold text-white/70">
                    Aucune annonce disponible pour le moment.
                  </p>
                  <p className="mt-2 text-[13px] text-white/45">
                    Lancez une recherche pour explorer toutes les annonces analysées.
                  </p>
                  <Link
                    href="/search"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[14px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.35)] transition hover:from-bronze-600"
                  >
                    Lancer une recherche
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>

            {/* ── RIGHT SIDEBAR — cartes glass sombres ──────────────────── */}
            <aside className="flex flex-col gap-5">

              {/* CREDIT-MVP — Simulateur de financement */}
              <CreditSimulator sourcePage="/acheter" id="financement" defaultPrice={1_200_000} />

              {/* Doublon block — bronze glass */}
              <div className="overflow-hidden rounded-2xl border border-bronze-500/25 bg-gradient-to-br from-bronze-500/[0.14] to-bronze-500/[0.03] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bronze-500/20 text-bronze-300 ring-1 ring-bronze-500/30">
                      <Copy size={16} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <p className="text-[13.5px] font-extrabold text-bronze-100">
                      Doublon possible
                    </p>
                  </div>
                  <p className="mt-3 text-[12.5px] leading-5 text-white/65">
                    {hasDuplicates
                      ? `${duplicatesDetected.toLocaleString("fr-FR")} signaux de doublons détectés parmi les annonces analysées.`
                      : "Quand un bien semble publié plusieurs fois, AkarFinder peut le signaler avant que vous contactiez."}
                  </p>
                </div>
                <div className="border-t border-bronze-500/20 bg-bronze-500/[0.06] px-5 py-3">
                  <Link
                    href="/search?transaction_type=buy"
                    className="flex items-center justify-between text-[12.5px] font-extrabold text-bronze-300 transition hover:text-bronze-200"
                  >
                    Explorer les annonces
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Comparer module — glass sombre */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Scale size={15} className="text-bronze-400" aria-hidden="true" />
                    <p className="text-[13px] font-extrabold text-white">Comparer des biens</p>
                  </div>
                  <p className="mt-1 text-[11.5px] text-white/50">
                    Sélectionnez des biens pour les comparer côte à côte.
                  </p>
                </div>

                <div className="p-4">
                  {compareListings.length >= 2 ? (
                    <div className="flex items-center gap-2">
                      {/* Card A */}
                      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-white/10">
                        <div className="relative h-[72px]">
                          <ListingVisual
                            listing={compareListings[0]}
                            className="h-full w-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                          <p className="absolute bottom-1.5 left-2 truncate pr-1 text-[10.5px] font-extrabold text-white">
                            {formatPrice(compareListings[0].price, "DH")}
                          </p>
                        </div>
                        <p className="truncate bg-white/[0.04] px-2 py-1.5 text-[10px] font-bold text-white/75">
                          {compareListings[0].city}
                        </p>
                      </div>

                      <span
                        className="shrink-0 text-[12px] font-extrabold text-bronze-400"
                        aria-hidden="true"
                      >
                        VS
                      </span>

                      {/* Card B */}
                      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-white/10">
                        <div className="relative h-[72px]">
                          <ListingVisual
                            listing={compareListings[1]}
                            className="h-full w-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                          <p className="absolute bottom-1.5 left-2 truncate pr-1 text-[10.5px] font-extrabold text-white">
                            {formatPrice(compareListings[1].price, "DH")}
                          </p>
                        </div>
                        <p className="truncate bg-white/[0.04] px-2 py-1.5 text-[10px] font-bold text-white/75">
                          {compareListings[1].city}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {[1, 2].map((n) => (
                        <div
                          key={n}
                          className="flex-1 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.03] py-5 text-center"
                        >
                          <p className="text-[11px] text-white/40">Bien {n}</p>
                        </div>
                      ))}
                      <span
                        className="shrink-0 text-[13px] font-extrabold text-bronze-400"
                        aria-hidden="true"
                      >
                        VS
                      </span>
                    </div>
                  )}

                  <Link
                    href="/compare"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[12.5px] font-extrabold text-white shadow-[0_6px_16px_rgba(155,120,56,0.3)] transition hover:from-bronze-600"
                  >
                    Voir le comparatif
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Dossier acheteur — CTA lead */}
              <div className="overflow-hidden rounded-2xl border border-bronze-500/30 bg-gradient-to-br from-bronze-500/[0.18] to-bronze-500/[0.05] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="px-5 py-5">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-400">
                    Accompagnement
                  </p>
                  <h3 className="mt-2 text-[1rem] font-extrabold leading-snug text-white">
                    Préparer mon dossier acheteur
                  </h3>
                  <p className="mt-2 text-[12px] leading-5 text-white/60">
                    Budget, zone, type de bien, timing — recevez les biens compatibles avec votre projet.
                  </p>
                  <p className="mt-2 text-[10.5px] text-white/35">
                    Dossier indicatif · non contractuel.
                  </p>
                </div>
                <div className="border-t border-bronze-500/20 bg-bronze-500/[0.06] px-5 py-3">
                  <Link
                    href="/onboarding?intent=acheter"
                    className="flex items-center justify-between text-[13px] font-extrabold text-bronze-300 transition hover:text-bronze-200"
                  >
                    Créer mon dossier
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Prix observés — glass sombre avec barres */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="flex items-start gap-2.5 border-b border-white/10 bg-white/[0.03] px-5 py-4">
                  <TrendingUp
                    size={16}
                    className="mt-0.5 shrink-0 text-bronze-400"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-[13px] font-extrabold text-white">Prix observés</p>
                    <p className="text-[10.5px] text-white/45">
                      Appartement · achat · repères indicatifs
                    </p>
                  </div>
                </div>

                <div className="space-y-3 px-5 py-4">
                  {PRIX_OBSERVES.map((row) => (
                    <div key={row.city}>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-white/75">
                          {row.city}
                        </span>
                        <span className="text-[12.5px] font-extrabold text-white">
                          {row.median.toLocaleString("fr-FR")}
                          <span className="ml-1 text-[9.5px] font-semibold text-white/40">DH/m²</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-bronze-600 to-bronze-400"
                          style={{ width: `${Math.round((row.median / PRIX_MAX) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-1.5 border-t border-white/8 bg-white/[0.02] px-5 py-3">
                  <AlertCircle
                    size={11}
                    strokeWidth={2}
                    className="mt-0.5 shrink-0 text-white/40"
                    aria-hidden="true"
                  />
                  <p className="text-[10.5px] leading-4 text-white/45">
                    Repères indicatifs — à confirmer avant décision
                  </p>
                </div>
              </div>

            </aside>
          </div>
        </Container>
      </section>

      {/* ── STATS ROW — bande sombre + bronze ─────────────────────────────────── */}
      <section className="border-y border-white/8 bg-[#050f1e] py-11 lg:py-14">
        <Container>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
            {[
              { value: totalListings !== null && totalListings > 0 ? totalListings.toLocaleString("fr-FR") : "—", label: "annonces analysées", icon: BarChart2 },
              { value: "Multi",   label: "sources analysées au Maroc", icon: Copy },
              { value: "Récent",  label: "mises à jour régulières",     icon: TrendingUp },
              { value: "Méthode", label: "analyse structurée",          icon: ShieldCheck },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="mb-3 inline-grid h-9 w-9 place-items-center rounded-xl bg-bronze-500/12 text-bronze-400 ring-1 ring-bronze-500/20">
                  <stat.icon size={15} aria-hidden="true" />
                </span>
                <p className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-white">
                  {stat.value}
                </p>
                <p className="mt-2 text-[12px] font-semibold text-white/50">
                  {stat.label}
                </p>
                <div className="mt-3 h-0.5 w-8 rounded-full bg-gradient-to-r from-bronze-500 to-transparent" />
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── EXPLORER LE MAROC — section sombre premium ───────────────────────── */}
      <section className="relative overflow-hidden bg-[#040b16] py-14 lg:py-20">
        {/* Ambient map glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 80% at 88% 30%, rgba(34,72,132,0.35) 0%, transparent 60%)",
          }}
        />
        <Container className="relative">
          <div className="mb-9 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">
                  Carte AkarFinder
                </p>
              </div>
              <h2 className="mt-2 text-[1.55rem] font-extrabold tracking-[-0.04em] text-white">
                Explorer le Maroc
              </h2>
              <p className="mt-2 max-w-md text-[14px] leading-6 text-white/55">
                Parcourez les repères de prix par ville et trouvez votre prochain
                bien là où le marché vous parle.
              </p>
            </div>
            <Link
              href="/map"
              className="hidden shrink-0 items-center gap-2 rounded-xl border border-bronze-500/40 bg-bronze-500/5 px-5 py-2.5 text-[13px] font-extrabold text-bronze-300 transition hover:bg-bronze-500/15 sm:inline-flex"
            >
              Explorer la carte
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {EXPLORER_CITIES.map((item) => (
              <Link
                key={item.city}
                href={item.href}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 transition duration-200 hover:border-bronze-500/35 hover:from-white/[0.10] hover:to-white/[0.03]"
              >
                {/* Accent glow */}
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-bronze-500/10 blur-2xl transition group-hover:bg-bronze-500/22" />

                {/* Top row : icône + mini-indicateur de niveau de prix */}
                <div className="relative flex items-start justify-between">
                  <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-bronze-500/12 text-bronze-400 ring-1 ring-bronze-500/20 transition group-hover:bg-bronze-500/20">
                    <MapPin size={17} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div className="flex items-end gap-0.5 pt-1.5" aria-hidden="true">
                    {[1, 2, 3, 4].map((b) => (
                      <span
                        key={b}
                        className={`w-1 rounded-full ${b <= item.level ? "bg-bronze-400" : "bg-white/15"}`}
                        style={{ height: `${5 + b * 3}px` }}
                      />
                    ))}
                  </div>
                </div>

                <p className="relative mt-4 text-[15.5px] font-extrabold text-white">{item.city}</p>

                {/* Repère prix/m² */}
                <div className="relative mt-1 flex items-baseline gap-1">
                  <span className="text-[13.5px] font-extrabold text-bronze-400">
                    {item.price.toLocaleString("fr-FR")}
                  </span>
                  <span className="text-[10px] font-semibold text-white/45">DH/m²</span>
                </div>
                <p className="relative mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/35">
                  Repères de marché
                </p>

                {/* CTA */}
                <div className="relative mt-4 flex items-center justify-between border-t border-white/8 pt-3">
                  <span className="text-[11.5px] font-bold text-white/55 transition group-hover:text-white/85">
                    Voir les biens
                  </span>
                  <ArrowRight
                    size={13}
                    className="text-bronze-400/80 transition group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-5 sm:hidden">
            <Link
              href="/map"
              className="flex items-center justify-center gap-2 rounded-xl border border-bronze-500/40 bg-bronze-500/5 py-3 text-[13px] font-extrabold text-bronze-300 transition hover:bg-bronze-500/15"
            >
              Explorer la carte
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
