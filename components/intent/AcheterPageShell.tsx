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
} from "lucide-react";

import { Container } from "@/components/ui/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import type { Listing } from "@/lib/listings/types";

// P10D — repères indicatifs extraits de lib/market/morocco-market-prices.ts
// appartement achat, city-level
const PRIX_OBSERVES = [
  { city: "Casablanca", min: 10000, max: 17000, median: 13000 },
  { city: "Rabat",      min: 10500, max: 16000, median: 13000 },
  { city: "Marrakech",  min: 10000, max: 16000, median: 12500 },
  { city: "Tanger",     min:  9000, max: 14000, median: 11500 },
  { city: "Agadir",     min:  8500, max: 13000, median: 10500 },
];

const FILTER_CHIPS = [
  { label: "Acheter",         href: "/search?transaction_type=buy" },
  { label: "Type de bien",    href: "/search" },
  { label: "Prix max",        href: "/search" },
  { label: "Plus de filtres", href: "/search" },
];

const EXPLORER_CITIES = [
  { city: "Casablanca", href: "/map?city=Casablanca" },
  { city: "Rabat",      href: "/map?city=Rabat" },
  { city: "Marrakech",  href: "/map?city=Marrakech" },
  { city: "Tanger",     href: "/map?city=Tanger" },
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

// ─── Premium listing card — horizontal desktop / stacked mobile ───────────────
// Image = ListingVisual SVG (P10IMG compliant) with gradient overlay.
// Labellisé "Aperçu illustratif" pour clarté.
function AcheterListingCard({ listing }: { listing: Listing }) {
  const reliability = getReliability(listing.reliability_score ?? 0);

  return (
    <article className="group overflow-hidden rounded-2xl border border-[#eadfca] bg-white shadow-[0_4px_20px_rgba(7,27,51,0.07)] transition duration-300 hover:shadow-[0_20px_48px_rgba(7,27,51,0.14)]">
      <div className="flex flex-col sm:flex-row">

        {/* ── Image zone ─────────────────────────────────────────────────── */}
        <Link
          href={`/listings/${listing.id}`}
          aria-label={`Voir le bien : ${listing.title}`}
          className="relative block h-56 shrink-0 overflow-hidden sm:h-auto sm:min-h-[210px] sm:w-[260px]"
        >
          <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.04]">
            <ListingVisual listing={listing} className="h-full w-full" />
          </div>

          {/* Bottom-to-top gradient for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* City badge */}
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-extrabold text-deepblue shadow-sm backdrop-blur-sm">
            <MapPin size={10} className="text-bronze-700" aria-hidden="true" />
            {listing.city}
          </span>

          {/* Transaction type badge */}
          <span className="absolute right-3 top-3 rounded-full bg-deepblue/88 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white backdrop-blur-sm">
            Achat
          </span>

          {/* Property type badge — bronze bottom-left */}
          <span className="absolute bottom-3 left-3 rounded-full bg-[#9B7838]/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-white shadow-sm backdrop-blur-sm">
            {listing.property_type}
          </span>

          {/* Aperçu label — P10IMG disclosure */}
          <span className="absolute bottom-3 right-3 rounded-full bg-black/28 px-2 py-1 text-[9.5px] text-white/62 backdrop-blur-sm">
            Aperçu illustratif
          </span>
        </Link>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col p-5">
          {/* Price */}
          <p className="text-[1.65rem] font-extrabold leading-none tracking-[-0.045em] text-deepblue">
            {formatPrice(listing.price, listing.currency)}
          </p>
          {listing.price_per_m2 > 0 && (
            <p className="mt-1 text-[12px] font-bold text-bronze-700">
              {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²
            </p>
          )}

          {/* Title + location */}
          <Link href={`/listings/${listing.id}`} className="mt-3 block">
            <h2 className="line-clamp-2 text-[14px] font-extrabold leading-snug text-gray-900 transition group-hover:text-deepblue-600">
              {listing.title}
            </h2>
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-gray-500">
              <MapPin size={12} strokeWidth={2.2} className="shrink-0 text-bronze-700" aria-hidden="true" />
              <span className="truncate">
                {listing.neighborhood
                  ? `${listing.city}, ${listing.neighborhood}`
                  : listing.city}
              </span>
            </p>
          </Link>

          {/* Specs row */}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#f0e6d2] pt-3.5 text-[13px] font-bold text-gray-700">
            {listing.surface_m2 > 0 && <span>{formatSurface(listing.surface_m2)}</span>}
            {listing.bedrooms > 0 && <span>{listing.bedrooms} ch.</span>}
            {listing.bathrooms > 0 && <span>{listing.bathrooms} sdb</span>}
            {listing.freshness_label && (
              <>
                <span className="text-gray-300" aria-hidden="true">·</span>
                <span className="text-gray-400">{listing.freshness_label}</span>
              </>
            )}
          </div>

          {/* Reliability dots */}
          <div className="mt-3.5 flex items-center gap-2.5">
            <div className="flex items-center gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4].map((d) => (
                <span
                  key={d}
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: d <= reliability.dots ? reliability.color : "#e5e7eb" }}
                />
              ))}
            </div>
            <span className="text-[12px] font-semibold text-gray-500">
              Repères de fiabilité :{" "}
              <span className="font-extrabold text-gray-700">{reliability.label}</span>
            </span>
          </div>

          {/* CTAs */}
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Link
              href={`/listings/${listing.id}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-deepblue px-4 py-3 text-[13px] font-extrabold text-white shadow-[0_4px_14px_rgba(7,27,51,0.22)] transition hover:bg-deepblue-700"
            >
              Voir le bien
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
            {listing.listing_url && (
              <a
                href={listing.listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center rounded-xl border border-[#eadfca] px-4 py-3 text-[13px] font-bold text-gray-600 transition hover:bg-[#f7f3ea] hover:text-deepblue"
              >
                Voir la source
              </a>
            )}
          </div>

          <div className="mt-2.5 text-center">
            <Link
              href="/compare"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-400 transition hover:text-deepblue"
            >
              <Scale size={12} aria-hidden="true" />
              Comparer
            </Link>
          </div>
        </div>
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
    <main className="min-h-screen bg-[#f7f5ef] text-gray-900">
      <SiteHeader />

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-deepblue pb-14 pt-12 sm:pt-16">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 60% 30%, rgba(30,65,120,0.7) 0%, transparent 65%)",
          }}
        />
        {/* Bronze shimmer line bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bronze-500/40 to-transparent" />

        <Container className="relative">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">

            {/* ── LEFT — Title / search / chips / counter ────────────────── */}
            <div className="max-w-2xl">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-bronze-500">
                Acheter
              </p>
              <h1 className="mt-3 text-[2.8rem] font-extrabold leading-[1.06] tracking-[-0.05em] text-white sm:text-[3.6rem]">
                Trouvez le bien<br className="hidden sm:block" />{" "}
                <span className="text-bronze-400">fait pour vous</span>
              </h1>
              <p className="mt-4 max-w-lg text-[15px] leading-7 text-white/62">
                Achetez en toute clarté grâce à nos repères de marché au Maroc.
              </p>

              {/* Search form */}
              <form action="/search" method="get" className="mt-7">
                <div className="flex overflow-hidden rounded-xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.28)]">
                  <div className="flex flex-1 items-center gap-2.5 px-4">
                    <Search
                      size={16}
                      strokeWidth={2.2}
                      className="shrink-0 text-gray-400"
                      aria-hidden="true"
                    />
                    <input
                      name="q"
                      type="text"
                      placeholder="Ville, quartier, résidence, référence..."
                      className="w-full bg-transparent py-4 text-[14px] text-gray-800 placeholder-gray-400 outline-none"
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
                    className="shrink-0 rounded-r-xl bg-bronze-600 px-6 py-4 text-[14px] font-extrabold text-white transition hover:bg-bronze-700"
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[12.5px] font-semibold text-white/80 transition hover:bg-white/18"
                  >
                    {chip.label}
                    <ChevronDown size={11} aria-hidden="true" />
                  </Link>
                ))}
                <Link
                  href="/search"
                  aria-label="Filtres avancés"
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-white/60 transition hover:bg-white/18"
                >
                  <SlidersHorizontal size={13} aria-hidden="true" />
                </Link>
              </div>

              {/* Counter */}
              <div className="mt-5">
                {totalListings !== null && totalListings > 0 ? (
                  <p className="flex items-center gap-2.5 text-[14px] font-semibold text-white/80">
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
                  <p className="flex items-center gap-2.5 text-[14px] font-semibold text-white/60">
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
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/8 backdrop-blur-sm">
                {/* Card header */}
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0c4a2a] text-[#34d399]">
                      <ShieldCheck size={18} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[14px] font-extrabold text-white">Fiabilité visible</p>
                      <p className="mt-0.5 text-[11.5px] leading-5 text-white/50">
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
                      className="flex items-center gap-3 rounded-xl bg-white/7 px-4 py-3"
                    >
                      <Icon
                        size={14}
                        className="shrink-0 text-bronze-400"
                        aria-hidden="true"
                      />
                      <span className="flex-1 text-[12.5px] font-semibold text-white/75">
                        {label}
                      </span>
                      <div className="flex gap-0.5" aria-hidden="true">
                        {[1, 2, 3].map((d) => (
                          <span
                            key={d}
                            className="h-1.5 w-1.5 rounded-full bg-bronze-500/55"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer note */}
                <div className="border-t border-white/8 px-6 py-3.5">
                  <p className="text-[11px] text-white/40">
                    Repères indicatifs — à confirmer avant décision
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* ── Fiabilité — mobile strip ──────────────────────────────────────────── */}
      <div className="border-b border-[#eadfca] bg-[#f0ece2] px-4 py-4 lg:hidden">
        <Container>
          <div className="flex items-center gap-3">
            <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dff2e9] text-[#16724b]">
              <ShieldCheck size={16} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <p className="text-[12.5px] font-semibold text-gray-700">
              <span className="font-extrabold text-deepblue">Fiabilité visible</span>
              {" · "}Historique prix · Qualité · Similarité · Activité
            </p>
          </div>
        </Container>
      </div>

      {/* ── DASHBOARD — 2-col [listing cards | sidebar] ───────────────────────── */}
      <section className="py-10 lg:py-14">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

            {/* ── LEFT — listing cards ──────────────────────────────────── */}
            <div>
              <div className="mb-6 flex items-baseline justify-between gap-4">
                <h2 className="text-[1.25rem] font-extrabold tracking-[-0.035em] text-deepblue">
                  Biens analysés en ce moment
                </h2>
                <Link
                  href="/search?transaction_type=buy"
                  className="shrink-0 text-[13px] font-bold text-bronze-700 transition hover:text-bronze-900"
                >
                  Voir tout{" "}
                  <ArrowRight
                    size={11}
                    strokeWidth={2.4}
                    className="inline"
                    aria-hidden="true"
                  />
                </Link>
              </div>

              {listings.length > 0 ? (
                <div className="flex flex-col gap-5">
                  {listings.map((listing) => (
                    <AcheterListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#eadfca] bg-white px-6 py-14 text-center shadow-sm">
                  <p className="text-[15px] font-semibold text-gray-500">
                    Aucune annonce disponible pour le moment.
                  </p>
                  <p className="mt-2 text-[13px] text-gray-400">
                    Lancez une recherche pour explorer toutes les annonces analysées.
                  </p>
                  <Link
                    href="/search"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-deepblue px-5 py-3 text-[14px] font-extrabold text-white shadow-[0_6px_18px_rgba(7,27,51,0.20)] transition hover:bg-deepblue-700"
                  >
                    Lancer une recherche
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>

            {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
            <aside className="flex flex-col gap-5">

              {/* Doublon block */}
              <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
                      <Copy size={16} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <p className="text-[13.5px] font-extrabold text-amber-900">
                      Doublon possible
                    </p>
                  </div>
                  <p className="mt-3 text-[12.5px] leading-5 text-amber-700">
                    {hasDuplicates
                      ? `${duplicatesDetected.toLocaleString("fr-FR")} signaux de doublons détectés parmi les annonces analysées.`
                      : "Quand un bien semble publié plusieurs fois, AkarFinder peut le signaler avant que vous contactiez."}
                  </p>
                </div>
                <div className="border-t border-amber-200 bg-amber-100/50 px-5 py-3">
                  <Link
                    href="/search"
                    className="flex items-center justify-between text-[12.5px] font-extrabold text-amber-800 transition hover:text-amber-900"
                  >
                    Voir les doublons
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Comparer module */}
              <div className="overflow-hidden rounded-2xl border border-[#eadfca] bg-white shadow-sm">
                {/* Header deepblue */}
                <div className="border-b border-[#eadfca] bg-deepblue px-5 py-4">
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
                      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[#eadfca]">
                        <div className="relative h-[72px]">
                          <ListingVisual
                            listing={compareListings[0]}
                            className="h-full w-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                          <p className="absolute bottom-1.5 left-2 truncate pr-1 text-[10.5px] font-extrabold text-white">
                            {formatPrice(compareListings[0].price, "DH")}
                          </p>
                        </div>
                        <p className="truncate bg-[#f7f5ef] px-2 py-1.5 text-[10px] font-bold text-deepblue">
                          {compareListings[0].city}
                        </p>
                      </div>

                      <span
                        className="shrink-0 text-[12px] font-extrabold text-gray-400"
                        aria-hidden="true"
                      >
                        VS
                      </span>

                      {/* Card B */}
                      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[#eadfca]">
                        <div className="relative h-[72px]">
                          <ListingVisual
                            listing={compareListings[1]}
                            className="h-full w-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                          <p className="absolute bottom-1.5 left-2 truncate pr-1 text-[10.5px] font-extrabold text-white">
                            {formatPrice(compareListings[1].price, "DH")}
                          </p>
                        </div>
                        <p className="truncate bg-[#f7f5ef] px-2 py-1.5 text-[10px] font-bold text-deepblue">
                          {compareListings[1].city}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {[1, 2].map((n) => (
                        <div
                          key={n}
                          className="flex-1 rounded-xl border-2 border-dashed border-[#d8c8a3] bg-[#f7f5ef] py-5 text-center"
                        >
                          <p className="text-[11px] text-gray-400">Bien {n}</p>
                        </div>
                      ))}
                      <span
                        className="shrink-0 text-[13px] font-extrabold text-gray-400"
                        aria-hidden="true"
                      >
                        VS
                      </span>
                    </div>
                  )}

                  <Link
                    href="/compare"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-deepblue px-4 py-3 text-[12.5px] font-extrabold text-white shadow-sm transition hover:bg-deepblue-700"
                  >
                    Voir le comparatif
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Prix observés */}
              <div className="overflow-hidden rounded-2xl border border-[#eadfca] bg-white shadow-sm">
                <div className="flex items-start gap-2.5 border-b border-[#eadfca] px-5 py-4">
                  <TrendingUp
                    size={16}
                    className="mt-0.5 shrink-0 text-deepblue"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-[13px] font-extrabold text-deepblue">Prix observés</p>
                    <p className="text-[10.5px] text-gray-400">
                      Appartement · achat · repères indicatifs
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-[#f0e8d8]">
                  {PRIX_OBSERVES.map((row) => (
                    <div
                      key={row.city}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <span className="text-[12.5px] font-semibold text-gray-700">
                        {row.city}
                      </span>
                      <div className="text-right">
                        <p className="text-[13px] font-extrabold text-deepblue">
                          {row.median.toLocaleString("fr-FR")} DH
                        </p>
                        <p className="text-[10px] text-gray-400">médiane/m²</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-1.5 bg-[#f7f5ef] px-5 py-3">
                  <AlertCircle
                    size={11}
                    strokeWidth={2}
                    className="mt-0.5 shrink-0 text-gray-400"
                    aria-hidden="true"
                  />
                  <p className="text-[10.5px] leading-4 text-gray-400">
                    Repères indicatifs — à confirmer avant décision
                  </p>
                </div>
              </div>

            </aside>
          </div>
        </Container>
      </section>

      {/* ── STATS ROW — deepblue premium ──────────────────────────────────────── */}
      <section className="bg-deepblue py-10 lg:py-14">
        <Container>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">

            <div className="flex flex-col">
              <p className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-white">
                {totalListings !== null && totalListings > 0
                  ? totalListings.toLocaleString("fr-FR")
                  : "—"}
              </p>
              <p className="mt-2 text-[12px] font-semibold text-white/50">
                annonces analysées
              </p>
              <div className="mt-3 h-0.5 w-8 rounded-full bg-bronze-500" />
            </div>

            <div className="flex flex-col">
              <p className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-white">
                Multi
              </p>
              <p className="mt-2 text-[12px] font-semibold text-white/50">
                sources analysées au Maroc
              </p>
              <div className="mt-3 h-0.5 w-8 rounded-full bg-bronze-500" />
            </div>

            <div className="flex flex-col">
              <p className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-white">
                Récent
              </p>
              <p className="mt-2 text-[12px] font-semibold text-white/50">
                mises à jour régulières
              </p>
              <div className="mt-3 h-0.5 w-8 rounded-full bg-bronze-500" />
            </div>

            <div className="flex flex-col">
              <p className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-white">
                Méthode
              </p>
              <p className="mt-2 text-[12px] font-semibold text-white/50">
                analyse structurée
              </p>
              <div className="mt-3 h-0.5 w-8 rounded-full bg-bronze-500" />
            </div>

          </div>
        </Container>
      </section>

      {/* ── EXPLORER LE MAROC — dark premium ─────────────────────────────────── */}
      <section className="bg-[#050f1e] py-12 lg:py-16">
        <Container>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-bronze-500">
                Carte AkarFinder
              </p>
              <h2 className="mt-2 text-[1.4rem] font-extrabold tracking-[-0.035em] text-white">
                Explorer le Maroc
              </h2>
              <p className="mt-1.5 text-[14px] text-white/48">
                Données de marché par ville — trouvez votre prochain bien.
              </p>
            </div>
            <Link
              href="/map"
              className="hidden shrink-0 items-center gap-2 rounded-xl border border-bronze-700/50 px-5 py-2.5 text-[13px] font-extrabold text-bronze-400 transition hover:bg-bronze-900/20 sm:inline-flex"
            >
              Explorer la carte
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {EXPLORER_CITIES.map((item) => (
              <Link
                key={item.city}
                href={item.href}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/5 px-5 py-6 transition duration-200 hover:bg-white/10"
              >
                {/* Accent circle */}
                <div className="absolute right-3 top-3 h-8 w-8 rounded-full bg-bronze-500/10 transition group-hover:bg-bronze-500/20" />

                <MapPin
                  size={18}
                  strokeWidth={2}
                  className="mb-3 text-bronze-400"
                  aria-hidden="true"
                />
                <p className="text-[15px] font-extrabold text-white">{item.city}</p>
                <p className="mt-0.5 text-[11.5px] text-white/38">Voir les biens</p>
                <ArrowRight
                  size={13}
                  className="mt-3 text-bronze-400/55 transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>

          <div className="mt-5 sm:hidden">
            <Link
              href="/map"
              className="flex items-center justify-center gap-2 rounded-xl border border-bronze-700/50 py-3 text-[13px] font-extrabold text-bronze-400 transition hover:bg-bronze-900/20"
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
