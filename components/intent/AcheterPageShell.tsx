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
  Clock,
  Users,
} from "lucide-react";

import { Container } from "@/components/ui/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { PhotoFirstListingCard } from "@/components/listings/PhotoFirstListingCard";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { formatPrice } from "@/lib/listings/utils";
import type { Listing } from "@/lib/listings/types";

// P10D — data sourced from MARKET_DATA in lib/market/morocco-market-prices.ts
// appartement achat, city-level, confidence élevée
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

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-deepblue pb-12 pt-12 sm:pt-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(13,42,77,0.55) 0%, transparent 65%)",
          }}
        />

        <Container className="relative">
          <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
            {/* Left */}
            <div className="max-w-2xl">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-bronze-500">
                Acheter
              </p>
              <h1 className="mt-3 text-[2.6rem] font-extrabold leading-[1.08] tracking-[-0.05em] text-white sm:text-[3.4rem]">
                Trouvez le bien<br className="hidden sm:block" /> fait pour vous
              </h1>
              <p className="mt-4 max-w-lg text-[15px] leading-7 text-white/68">
                Achetez en toute clarté grâce à nos données de marché au Maroc.
              </p>

              {/* Search form */}
              <form action="/search" method="get" className="mt-7">
                <div className="flex overflow-hidden rounded-xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                  <div className="flex flex-1 items-center gap-2 px-4">
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
                      className="w-full bg-transparent py-3.5 text-[14px] text-gray-800 placeholder-gray-400 outline-none"
                    />
                  </div>
                  <div className="hidden items-center gap-1.5 border-l border-gray-200 px-4 sm:flex">
                    <MapPin
                      size={14}
                      strokeWidth={2.2}
                      className="text-bronze-600 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-[13px] font-semibold text-gray-600">Maroc</span>
                    <ChevronDown size={13} className="text-gray-400" aria-hidden="true" />
                  </div>
                  <button
                    type="submit"
                    className="shrink-0 rounded-r-xl bg-[#145ee8] px-5 py-3.5 text-[14px] font-extrabold text-white transition hover:bg-[#0f4fc5]"
                  >
                    Explorer
                  </button>
                </div>
              </form>

              {/* Filter chips */}
              <div className="mt-3.5 flex flex-wrap gap-2">
                {FILTER_CHIPS.map((chip) => (
                  <Link
                    key={chip.label}
                    href={chip.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white/85 transition hover:bg-white/18"
                  >
                    {chip.label}
                    <ChevronDown size={12} aria-hidden="true" />
                  </Link>
                ))}
                <Link
                  href="/search"
                  aria-label="Filtres avancés"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-3.5 py-2 text-white/70 transition hover:bg-white/18"
                >
                  <SlidersHorizontal size={14} aria-hidden="true" />
                </Link>
              </div>

              {/* Counter */}
              <div className="mt-5">
                {totalListings !== null && totalListings > 0 ? (
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-white/80">
                    <Star
                      size={14}
                      className="shrink-0 text-bronze-500"
                      fill="currentColor"
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="text-white">
                        {totalListings.toLocaleString("fr-FR")}
                      </strong>{" "}
                      annonces analysées
                    </span>
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-white/65">
                    <Star
                      size={14}
                      className="shrink-0 text-bronze-500"
                      fill="currentColor"
                      aria-hidden="true"
                    />
                    Annonces analysées depuis plusieurs sources
                  </p>
                )}
              </div>
            </div>

            {/* Right — Fiabilité visible card (desktop only) */}
            <aside className="hidden lg:flex lg:flex-col lg:justify-center">
              <div className="rounded-2xl border border-white/12 bg-white/10 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0c4a2a] text-[#34d399]">
                    <ShieldCheck size={18} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[14px] font-extrabold text-white">Fiabilité visible</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-white/60">
                      Repères de fiabilité calculés à partir de signaux du marché.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  {[
                    "Historique des prix",
                    "Qualité de l'annonce",
                    "Similarité du bien",
                    "Activité du marché",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-lg bg-white/8 px-3 py-2.5"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-bronze-500" />
                      <span className="text-[12px] font-semibold leading-4 text-white/80">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* ── Fiabilité visible — mobile only ──────────────────────────────────── */}
      <section className="border-b border-[#eadfca] bg-white px-4 py-5 lg:hidden">
        <Container>
          <div className="flex items-start gap-3">
            <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8f5ee] text-[#16724b]">
              <ShieldCheck size={17} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[14px] font-extrabold text-deepblue">Fiabilité visible</p>
              <p className="mt-1 text-[13px] leading-5 text-gray-500">
                Historique des prix · Qualité de l'annonce · Similarité du bien · Activité du marché
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Listing cards ────────────────────────────────────────────────────── */}
      <section className="py-10 lg:py-14">
        <Container>
          <div className="mb-7 flex items-baseline justify-between gap-4">
            <h2 className="text-[1.3rem] font-extrabold tracking-[-0.035em] text-deepblue">
              Biens analysés en ce moment
            </h2>
            <Link
              href="/search?transaction_type=buy"
              className="shrink-0 text-[13px] font-bold text-bronze-700 transition hover:text-bronze-900"
            >
              Voir tout{" "}
              <ArrowRight
                size={12}
                strokeWidth={2.4}
                className="inline"
                aria-hidden="true"
              />
            </Link>
          </div>

          {listings.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <PhotoFirstListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#eadfca] bg-white px-6 py-12 text-center shadow-sm">
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
        </Container>
      </section>

      {/* ── Doublon block ────────────────────────────────────────────────────── */}
      <div className="border-y border-amber-200 bg-amber-50">
        <Container className="py-4 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
              <Copy size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-extrabold text-amber-900">Doublon possible</p>
              {hasDuplicates ? (
                <p className="mt-0.5 text-[13px] leading-5 text-amber-700">
                  {duplicatesDetected.toLocaleString("fr-FR")} signaux de doublons
                  détectés parmi les annonces analysées.
                </p>
              ) : (
                <p className="mt-0.5 text-[13px] leading-5 text-amber-700">
                  Quand un bien semble publié plusieurs fois, AkarFinder peut le signaler.
                </p>
              )}
            </div>
            <Link
              href="/search"
              className="shrink-0 self-start rounded-xl border border-amber-300 bg-amber-100 px-4 py-2.5 text-[13px] font-extrabold text-amber-800 transition hover:bg-amber-200 sm:self-auto"
            >
              Voir les doublons
            </Link>
          </div>
        </Container>
      </div>

      {/* ── Comparer section ─────────────────────────────────────────────────── */}
      <section className="py-10 lg:py-14">
        <Container>
          <div className="overflow-hidden rounded-2xl border border-[#eadfca] bg-white shadow-[0_4px_20px_rgba(7,27,51,0.06)]">
            <div className="border-b border-[#eadfca] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-deepblue text-white">
                  <Scale size={18} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[15px] font-extrabold text-deepblue">Comparer des biens</p>
                  <p className="mt-0.5 text-[13px] text-gray-500">
                    Ajoutez des biens depuis les fiches pour les comparer côte à côte.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {compareListings.length >= 2 ? (
                <div className="flex items-stretch gap-3">
                  {/* Card A */}
                  <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[#eadfca] bg-[#f7f5ef]">
                    <div className="relative h-28 overflow-hidden">
                      <ListingVisual listing={compareListings[0]} className="h-full w-full" />
                      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-deepblue">
                        {compareListings[0].city}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-[13px] font-extrabold leading-tight text-deepblue">
                        {formatPrice(compareListings[0].price, "DH")}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-gray-500">
                        {compareListings[0].neighborhood || compareListings[0].city}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center self-center px-1">
                    <span className="text-[15px] font-extrabold text-gray-400">VS</span>
                  </div>

                  {/* Card B */}
                  <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[#eadfca] bg-[#f7f5ef]">
                    <div className="relative h-28 overflow-hidden">
                      <ListingVisual listing={compareListings[1]} className="h-full w-full" />
                      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-deepblue">
                        {compareListings[1].city}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-[13px] font-extrabold leading-tight text-deepblue">
                        {formatPrice(compareListings[1].price, "DH")}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-gray-500">
                        {compareListings[1].neighborhood || compareListings[1].city}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="flex-1 rounded-xl border-2 border-dashed border-[#d8c8a3] bg-[#f7f5ef] p-6 text-center"
                    >
                      <p className="text-[12px] text-gray-400">Bien {n}</p>
                    </div>
                  ))}
                  <span className="shrink-0 text-[16px] font-extrabold text-gray-400">VS</span>
                </div>
              )}

              <Link
                href="/compare"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-deepblue px-5 py-3.5 text-[14px] font-extrabold text-white shadow-[0_6px_18px_rgba(7,27,51,0.18)] transition hover:bg-deepblue-700"
              >
                Voir le comparatif
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Prix observés ────────────────────────────────────────────────────── */}
      <section className="bg-white py-10 lg:py-14">
        <Container>
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-deepblue-700 text-bronze-500">
              <TrendingUp size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[1.15rem] font-extrabold text-deepblue">Prix observés</h2>
              <p className="mt-0.5 text-[13px] text-gray-500">
                Repères indicatifs — appartement achat — à confirmer avant décision
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#eadfca]">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="bg-[#f7f5ef]">
                  <th className="px-4 py-3 text-left text-[12px] font-extrabold uppercase tracking-[0.08em] text-deepblue">
                    Ville
                  </th>
                  <th className="px-4 py-3 text-right text-[12px] font-extrabold uppercase tracking-[0.08em] text-deepblue">
                    Médiane DH/m²
                  </th>
                  <th className="hidden px-4 py-3 text-right text-[12px] font-extrabold uppercase tracking-[0.08em] text-deepblue sm:table-cell">
                    Fourchette observée
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRIX_OBSERVES.map((row, i) => (
                  <tr
                    key={row.city}
                    className={`border-t border-[#f0e8d8] ${i % 2 === 0 ? "bg-white" : "bg-[#faf9f5]"}`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800">{row.city}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-deepblue">
                      {row.median.toLocaleString("fr-FR")} DH
                    </td>
                    <td className="hidden px-4 py-3 text-right text-gray-500 sm:table-cell">
                      {row.min.toLocaleString("fr-FR")}–{row.max.toLocaleString("fr-FR")} DH
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 flex items-start gap-2 text-[12px] leading-5 text-gray-400">
            <AlertCircle
              size={14}
              strokeWidth={2}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            Repères observés sur annonces publiques analysées (données 2024–2025). Données
            indicatives, non officielles — à confirmer avant toute décision d'achat.
          </p>
        </Container>
      </section>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <section className="border-y border-[#eadfca] bg-[#f7f5ef] py-8">
        <Container>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {/* Stat 1 — total listings (real data) */}
            <div className="flex flex-col gap-1.5">
              <Star size={18} className="text-bronze-700" fill="currentColor" aria-hidden="true" />
              <p className="text-[1.5rem] font-extrabold leading-none tracking-[-0.04em] text-deepblue">
                {totalListings !== null && totalListings > 0
                  ? totalListings.toLocaleString("fr-FR")
                  : "—"}
              </p>
              <p className="text-[12px] leading-5 text-gray-500">
                annonces analysées
              </p>
            </div>

            {/* Stat 2 — multi-sources (descriptive, no fake number) */}
            <div className="flex flex-col gap-1.5">
              <BarChart2 size={18} className="text-bronze-700" aria-hidden="true" />
              <p className="text-[1.5rem] font-extrabold leading-none tracking-[-0.04em] text-deepblue">
                Multi
              </p>
              <p className="text-[12px] leading-5 text-gray-500">
                sources analysées au Maroc
              </p>
            </div>

            {/* Stat 3 — freshness (descriptive) */}
            <div className="flex flex-col gap-1.5">
              <Clock size={18} className="text-bronze-700" aria-hidden="true" />
              <p className="text-[1.5rem] font-extrabold leading-none tracking-[-0.04em] text-deepblue">
                Récent
              </p>
              <p className="text-[12px] leading-5 text-gray-500">
                toutes villes confondues
              </p>
            </div>

            {/* Stat 4 — accompagnement (descriptive) */}
            <div className="flex flex-col gap-1.5">
              <Users size={18} className="text-bronze-700" aria-hidden="true" />
              <p className="text-[1.5rem] font-extrabold leading-none tracking-[-0.04em] text-deepblue">
                Méthode
              </p>
              <p className="text-[12px] leading-5 text-gray-500">
                acheteurs accompagnés
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Explorer le Maroc ────────────────────────────────────────────────── */}
      <section className="bg-deepblue py-10 lg:py-14">
        <Container>
          <div className="mb-6">
            <h2 className="text-[1.15rem] font-extrabold text-white">Explorer le Maroc</h2>
            <p className="mt-1 text-[13px] text-white/60">
              Accédez aux données de marché par ville et trouvez votre prochain bien.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {EXPLORER_CITIES.map((item) => (
              <Link
                key={item.city}
                href={item.href}
                className="flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/8 px-4 py-3.5 text-[14px] font-bold text-white transition hover:bg-white/14"
              >
                <MapPin
                  size={15}
                  strokeWidth={2.2}
                  className="shrink-0 text-bronze-500"
                  aria-hidden="true"
                />
                {item.city}
              </Link>
            ))}
          </div>

          <Link
            href="/map"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-bronze-600 bg-transparent px-6 py-3 text-[14px] font-extrabold text-bronze-400 transition hover:bg-bronze-900/20"
          >
            Explorer la carte
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
