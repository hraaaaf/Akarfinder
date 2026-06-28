import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ShieldCheck,
  Scale,
  TrendingUp,
  AlertCircle,
  MapPin,
  ArrowRight,
  Star,
  Heart,
  Ruler,
  BedDouble,
  Bath,
  Wallet,
  Bus,
  GraduationCap,
  ShoppingCart,
  Pill,
  Car,
  Sofa,
  BarChart2,
  Activity,
} from "lucide-react";

import { Container } from "@/components/ui/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { TrackedLink } from "@/components/tracking/TrackedLink";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { searchListings } from "@/lib/search";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { getListingImageMode } from "@/lib/listings/image-policy";
import { RentAlertForm } from "@/components/alerts/RentAlertForm";
import type { Listing } from "@/lib/listings/types";

// Repères de loyer indicatifs par quartier (DH/mois, appartement) — repères observés.
const LOYERS_QUARTIERS = [
  { quartier: "Maârif",  ville: "Casablanca", loyer: 8500, level: 4 },
  { quartier: "Racine",  ville: "Casablanca", loyer: 9500, level: 4 },
  { quartier: "Gauthier", ville: "Casablanca", loyer: 9000, level: 4 },
  { quartier: "Aïn Diab", ville: "Casablanca", loyer: 11000, level: 4 },
  { quartier: "Agdal",   ville: "Rabat",      loyer: 7000, level: 3 },
  { quartier: "Guéliz",  ville: "Marrakech",  loyer: 6500, level: 3 },
];
const LOYER_MAX = Math.max(...LOYERS_QUARTIERS.map((r) => r.loyer));

const BUDGET_CHIPS = [
  { label: "< 3 000 DH",        href: "/search?transaction_type=rent&maxPrice=3000" },
  { label: "3 000 – 5 000 DH",  href: "/search?transaction_type=rent&minPrice=3000&maxPrice=5000" },
  { label: "5 000 – 8 000 DH",  href: "/search?transaction_type=rent&minPrice=5000&maxPrice=8000" },
  { label: "8 000 – 12 000 DH", href: "/search?transaction_type=rent&minPrice=8000&maxPrice=12000" },
  { label: "12 000+ DH",        href: "/search?transaction_type=rent&minPrice=12000" },
];

const TYPE_CHIPS = [
  { label: "Studio",      href: "/search?transaction_type=rent&property_type=Studio" },
  { label: "Appartement", href: "/search?transaction_type=rent&property_type=Appartement" },
  { label: "Villa",       href: "/search?transaction_type=rent&property_type=Villa" },
  { label: "Bureau",      href: "/search?transaction_type=rent&property_type=Bureau" },
];

// Meublé / Vide — la DB n'est pas filtrable sur ce critère → indicateur visuel non trompeur.
const MEUBLE_CHIPS = ["Meublé", "Vide"];

const VIE_QUOTIDIENNE = [
  { icon: Bus,           label: "Transports & taxi" },
  { icon: GraduationCap, label: "Écoles à proximité" },
  { icon: ShoppingCart,  label: "Marché & commerces" },
  { icon: Pill,          label: "Pharmacie & santé" },
  { icon: Car,           label: "Parking & stationnement" },
  { icon: MapPin,        label: "Repère de quartier" },
];

const FIABILITE_LOCATION = [
  { icon: TrendingUp, label: "Prix observé" },
  { icon: Activity,   label: "Demande locative" },
  { icon: BarChart2,  label: "Tension locative" },
  { icon: Star,       label: "Qualité de l'annonce" },
];

function getReliability(score: number) {
  if (score >= 80) return { label: "Élevée",    dots: 4, color: "#22c55e" };
  if (score >= 50) return { label: "Modérée",   dots: 2, color: "#f59e0b" };
  return             { label: "À vérifier", dots: 1, color: "#ef4444" };
}

// ─── Card location — verticale (image top, contenu bas), prix DH/mois ─────────
function RentCard({ listing }: { listing: Listing }) {
  const reliability = getReliability(listing.reliability_score ?? 0);
  const imageMode = getListingImageMode(listing);
  const useRealPhoto = imageMode !== "fallback_visual" && !!listing.main_image_url;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_14px_44px_rgba(2,10,24,0.4)] ring-1 ring-white/10 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_64px_rgba(2,10,24,0.55)] hover:ring-bronze-500/40">

      {/* Image */}
      <Link
        href={`/listings/${listing.id}`}
        aria-label={`Voir la location : ${listing.title}`}
        className="relative block h-[200px] overflow-hidden"
      >
        <div className="absolute inset-0 transition duration-700 ease-out group-hover:scale-[1.06]">
          {useRealPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.main_image_url!} alt={listing.title} className="h-full w-full object-cover" />
          ) : (
            <ListingVisual listing={listing} className="h-full w-full" />
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/85 via-[#03101f]/12 to-transparent" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 80% at 50% -10%, rgba(194,163,104,0.18) 0%, transparent 55%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.30) 100%)" }}
        />

        {/* City badge */}
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[#071B33]/70 px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-1 ring-white/15 backdrop-blur-md">
          <MapPin size={10} className="text-bronze-400" aria-hidden="true" />
          {listing.city}
        </span>

        {/* Heart */}
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-1 ring-white/25 backdrop-blur-md transition group-hover:bg-white/25"
        >
          <Heart size={14} strokeWidth={2.2} />
        </span>

        {/* À louer badge */}
        <span className="absolute bottom-3 left-3 rounded-full bg-gradient-to-r from-bronze-700 to-bronze-600 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
          À louer
        </span>

        {!useRealPhoto && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/30 px-2 py-1 text-[9px] font-medium text-white/55 backdrop-blur-sm">
            Aperçu illustratif
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-bronze-500/60 to-transparent" />
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/listings/${listing.id}`} className="block">
          <h3 className="line-clamp-1 text-[14px] font-extrabold leading-snug text-deepblue transition group-hover:text-bronze-700">
            {listing.title}
          </h3>
        </Link>

        {/* Prix DH/mois */}
        <p className="mt-1 flex items-baseline gap-1 text-[1.4rem] font-extrabold leading-none tracking-[-0.04em] text-bronze-700">
          {formatPrice(listing.price, listing.currency)}
          <span className="text-[12px] font-bold text-gray-400">/mois</span>
        </p>
        {listing.price_per_m2 > 0 && (
          <p className="mt-1 text-[11px] font-bold text-gray-400">
            {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²/mois
          </p>
        )}

        {/* Quartier */}
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-gray-500">
          <MapPin size={11} strokeWidth={2.2} className="shrink-0 text-bronze-600" aria-hidden="true" />
          <span className="truncate">
            {listing.neighborhood ? `${listing.city}, ${listing.neighborhood}` : listing.city}
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
          {listing.floor_type && (
            <span className="text-gray-400">{listing.floor_type}</span>
          )}
        </div>

        {/* Repères indicatifs + reliability */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4].map((d) => (
                <span
                  key={d}
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: d <= reliability.dots ? reliability.color : "#e5e7eb" }}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-gray-500">{reliability.label}</span>
          </div>
          <span className="rounded-full bg-[#f7f3ea] px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.05em] text-bronze-700">
            Repères indicatifs
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

        {/* Lead CTA — dossier locataire pour ce logement */}
        <Link
          href={`/onboarding?intent=louer&listing=${listing.id}`}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e5dcc8] bg-[#fdfbf7] px-4 py-2 text-[11.5px] font-extrabold text-bronze-700 transition hover:border-bronze-500/60 hover:bg-[#f7f3ea]"
        >
          Préparer mon dossier pour ce logement
          <ArrowRight size={11} strokeWidth={2.6} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

// ─── Tuile CTA (remplit la grille sans inventer de faux listing) ──────────────
function SearchTile() {
  return (
    <Link
      href="/search?transaction_type=rent"
      className="group flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-[20px] border border-dashed border-white/15 bg-white/[0.04] p-6 text-center transition hover:border-bronze-500/40 hover:bg-white/[0.07]"
    >
      <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-bronze-500/12 text-bronze-400 ring-1 ring-bronze-500/25 transition group-hover:bg-bronze-500/20">
        <Search size={22} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <div>
        <p className="text-[14px] font-extrabold text-white">Explorer toutes les locations</p>
        <p className="mt-1.5 text-[12px] leading-5 text-white/55">
          Affinez par ville, budget mensuel et type de bien dans la recherche complète.
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-bronze-400">
        Lancer la recherche
        <ArrowRight size={13} className="transition group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}

export async function LouerPageShell() {
  let rentListings: Listing[] = [];
  let rentTotal: number | null = null;
  try {
    const result = await searchListings({ transaction_type: "rent", limit: 6 });
    rentListings = result.listings ?? [];
    rentTotal = result.total ?? null;
  } catch {
    // fallback: no listings, CTA tiles shown
  }

  // Remplit la grille à 3 colonnes sans fabriquer de faux biens.
  const showSearchTile = rentListings.length < 3;

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
          <div className="grid gap-12 lg:grid-cols-[1fr_330px]">

            {/* LEFT */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-bronze-500/70" aria-hidden="true" />
                <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-bronze-400">Louer</p>
              </div>
              <h1 className="mt-4 text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.05em] text-white sm:mt-5 sm:text-[3.5rem]">
                Louer au Maroc,<br className="hidden sm:block" />{" "}
                <span className="text-bronze-400">simple et clair.</span>
              </h1>
              <p className="mt-3.5 max-w-lg text-[14.5px] leading-6 text-white/65 sm:mt-5 sm:text-[15.5px] sm:leading-7">
                Des annonces analysées, des repères de loyer et des signaux utiles
                pour louer avec plus de clarté.
              </p>

              {/* Search */}
              <form action="/search" method="get" className="mt-6 sm:mt-8">
                <input type="hidden" name="transaction_type" value="rent" />
                <div className="flex overflow-hidden rounded-2xl bg-white p-1 shadow-[0_18px_60px_rgba(0,0,0,0.4)] ring-1 ring-white/20">
                  <div className="flex flex-1 items-center gap-2.5 px-4">
                    <Search size={17} strokeWidth={2.2} className="shrink-0 text-gray-400" aria-hidden="true" />
                    <input
                      name="q"
                      type="text"
                      placeholder="Ville, quartier, résidence..."
                      className="w-full bg-transparent py-3.5 text-[14px] text-gray-800 placeholder-gray-400 outline-none"
                    />
                  </div>
                  <div className="hidden items-center gap-1.5 border-l border-gray-100 px-4 sm:flex">
                    <MapPin size={13} strokeWidth={2.2} className="shrink-0 text-bronze-600" aria-hidden="true" />
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

              {/* Budget chips */}
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/45">
                  <Wallet size={12} className="text-bronze-400" aria-hidden="true" />
                  Budget mensuel
                </p>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_CHIPS.map((chip) => (
                    <Link
                      key={chip.label}
                      href={chip.href}
                      className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white/85 transition hover:border-bronze-500/40 hover:bg-white/16"
                    >
                      {chip.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Type + meublé/vide */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {TYPE_CHIPS.map((chip) => (
                  <Link
                    key={chip.label}
                    href={chip.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white/85 transition hover:border-bronze-500/40 hover:bg-white/16"
                  >
                    {chip.label}
                  </Link>
                ))}
                <span className="mx-1 hidden h-4 w-px bg-white/15 sm:inline-block" aria-hidden="true" />
                {/* Meublé/Vide — indicateur visuel (DB non filtrable) */}
                <span className="inline-flex overflow-hidden rounded-full border border-bronze-500/30 bg-bronze-500/[0.08]" title="Indicateur visuel — à confirmer auprès de la source">
                  <Sofa size={12} className="ml-3 self-center text-bronze-400" aria-hidden="true" />
                  {MEUBLE_CHIPS.map((m) => (
                    <span key={m} className="px-3 py-1.5 text-[12px] font-semibold text-white/70">
                      {m}
                    </span>
                  ))}
                </span>
              </div>

              {/* Counter */}
              <div className="mt-4 sm:mt-6">
                <p className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13.5px] font-semibold text-white/80">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bronze-500/20">
                    <Star size={11} className="text-bronze-400" fill="currentColor" aria-hidden="true" />
                  </span>
                  {rentTotal !== null && rentTotal > 0 ? (
                    <span>
                      <strong className="text-white">{rentTotal.toLocaleString("fr-FR")}</strong> locations analysées
                    </span>
                  ) : (
                    <span>Locations analysées depuis plusieurs sources</span>
                  )}
                </p>
              </div>
            </div>

            {/* RIGHT — Repères de fiabilité location */}
            <aside className="hidden lg:flex lg:flex-col lg:justify-center">
              <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] shadow-[0_20px_50px_rgba(2,10,24,0.4)] backdrop-blur-md">
                <div className="border-b border-white/10 bg-white/[0.03] px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0c4a2a] text-[#34d399] ring-1 ring-[#34d399]/20">
                      <ShieldCheck size={18} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[14px] font-extrabold text-white">Fiabilité location</p>
                      <p className="mt-0.5 text-[11.5px] leading-5 text-white/55">Signaux de marché locatif</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  {FIABILITE_LOCATION.map(({ label, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 transition hover:border-bronze-500/25 hover:bg-white/[0.07]"
                    >
                      <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-bronze-500/15 text-bronze-400">
                        <Icon size={13} aria-hidden="true" />
                      </span>
                      <span className="flex-1 text-[12.5px] font-semibold text-white/80">{label}</span>
                      <div className="flex gap-0.5" aria-hidden="true">
                        {[1, 2, 3].map((d) => (
                          <span key={d} className="h-1.5 w-1.5 rounded-full bg-bronze-500/60" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/8 px-6 py-3.5">
                  <p className="text-[11px] text-white/45">Repères indicatifs — à confirmer avant décision</p>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* ── Fiabilité — mobile (carte encartée, espace autour) ────────────────── */}
      <div className="bg-deepblue px-4 pb-5 pt-3 lg:hidden">
        <Container>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 backdrop-blur-sm">
            <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0c4a2a] text-[#34d399] ring-1 ring-[#34d399]/20">
              <ShieldCheck size={16} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <p className="text-[12.5px] font-semibold text-white/70">
              <span className="font-extrabold text-white">Fiabilité location</span>
              {" · "}Prix observé · Demande · Tension · Qualité
            </p>
          </div>
        </Container>
      </div>

      {/* ── DASHBOARD — [cards | sidebar] ─────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-deepblue to-[#050f1e] py-12 lg:py-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

            {/* LEFT — cards */}
            <div>
              <div className="mb-7 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
                    <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">À louer</p>
                  </div>
                  <h2 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.04em] text-white">
                    Locations analysées
                  </h2>
                </div>
                <Link
                  href="/search?transaction_type=rent"
                  className="group shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-[12.5px] font-bold text-bronze-400 transition hover:border-bronze-500/40 hover:bg-white/10"
                >
                  Voir tout
                  <ArrowRight size={12} strokeWidth={2.4} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </div>

              {rentListings.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {rentListings.map((listing) => (
                    <RentCard key={listing.id} listing={listing} />
                  ))}
                  {showSearchTile && <SearchTile />}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-14 text-center backdrop-blur-sm">
                  <p className="text-[15px] font-semibold text-white/70">
                    Aucune location disponible pour le moment.
                  </p>
                  <p className="mt-2 text-[13px] text-white/45">
                    Lancez une recherche pour explorer toutes les locations analysées.
                  </p>
                  <Link
                    href="/search?transaction_type=rent"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[14px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.35)] transition hover:from-bronze-600"
                  >
                    Rechercher une location
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              )}

              <p className="mt-4 flex items-start gap-1.5 text-[11.5px] leading-5 text-white/40">
                <AlertCircle size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
                Loyers indicatifs issus d'annonces publiques analysées. Charges, caution et
                disponibilité (meublé/vide) à confirmer auprès de la source avant décision.
              </p>
            </div>

            {/* RIGHT — sidebar */}
            <aside className="flex flex-col gap-5">

              {/* Vie quotidienne */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="flex items-start gap-2.5 border-b border-white/10 bg-white/[0.03] px-5 py-4">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-bronze-400" aria-hidden="true" />
                  <div>
                    <p className="text-[13px] font-extrabold text-white">Vie quotidienne</p>
                    <p className="text-[10.5px] text-white/45">Repères de proximité — à confirmer sur place</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4">
                  {VIE_QUOTIDIENNE.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5">
                      <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-bronze-500/15 text-bronze-400">
                        <Icon size={13} strokeWidth={2.1} aria-hidden="true" />
                      </span>
                      <span className="text-[11px] font-semibold leading-tight text-white/75">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerte location — P18A */}
              <RentAlertForm />

              {/* Ma sélection */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Heart size={15} className="text-bronze-400" aria-hidden="true" />
                    <p className="text-[13px] font-extrabold text-white">Ma sélection</p>
                  </div>
                  <p className="mt-1 text-[11.5px] text-white/50">
                    Sauvegardez vos locations et comparez-les avant de visiter.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4">
                  <Link
                    href="/favorites"
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-4 text-center transition hover:border-bronze-500/30 hover:bg-white/[0.07]"
                  >
                    <Heart size={16} className="text-bronze-400" aria-hidden="true" />
                    <span className="text-[11.5px] font-extrabold text-white/85">Favoris</span>
                  </Link>
                  <Link
                    href="/compare"
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-4 text-center transition hover:border-bronze-500/30 hover:bg-white/[0.07]"
                  >
                    <Scale size={16} className="text-bronze-400" aria-hidden="true" />
                    <span className="text-[11.5px] font-extrabold text-white/85">Comparer</span>
                  </Link>
                </div>
              </div>

              {/* Dossier locataire — CTA lead */}
              <div className="overflow-hidden rounded-2xl border border-bronze-500/30 bg-gradient-to-br from-bronze-500/[0.18] to-bronze-500/[0.05] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
                <div className="px-5 py-5">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-400">
                    Accompagnement
                  </p>
                  <h3 className="mt-2 text-[1rem] font-extrabold leading-snug text-white">
                    Préparer mon dossier locataire
                  </h3>
                  <p className="mt-2 text-[12px] leading-5 text-white/60">
                    Budget mensuel, zone, type de bien, timing — recevez les locations compatibles.
                  </p>
                  <p className="mt-2 text-[10.5px] text-white/35">
                    Dossier indicatif · non contractuel.
                  </p>
                </div>
                <div className="border-t border-bronze-500/20 bg-bronze-500/[0.06] px-5 py-3">
                  <TrackedLink
                    href="/onboarding?intent=louer"
                    event={{ event_name: "renter_cta_click", source_page: "/louer", source_channel: "onboarding", intent: "louer" }}
                    className="flex items-center justify-between text-[13px] font-extrabold text-bronze-300 transition hover:text-bronze-200"
                  >
                    Créer mon dossier
                    <ArrowRight size={14} aria-hidden="true" />
                  </TrackedLink>
                </div>
              </div>

            </aside>
          </div>
        </Container>
      </section>

      {/* ── STATS ROW ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-white/8 bg-[#050f1e] py-11 lg:py-14">
        <Container>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
            {[
              { value: rentTotal !== null && rentTotal > 0 ? rentTotal.toLocaleString("fr-FR") : "—", label: "locations analysées", icon: BarChart2 },
              { value: "Mensuel", label: "repères de loyer observés", icon: Wallet },
              { value: "Quartier", label: "vie quotidienne & proximité", icon: MapPin },
              { value: "Récent",  label: "mises à jour régulières", icon: TrendingUp },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="mb-3 inline-grid h-9 w-9 place-items-center rounded-xl bg-bronze-500/12 text-bronze-400 ring-1 ring-bronze-500/20">
                  <stat.icon size={15} aria-hidden="true" />
                </span>
                <p className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-white">{stat.value}</p>
                <p className="mt-2 text-[12px] font-semibold text-white/50">{stat.label}</p>
                <div className="mt-3 h-0.5 w-8 rounded-full bg-gradient-to-r from-bronze-500 to-transparent" />
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CARTE DES LOYERS — indicative ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#040b16] py-14 lg:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(70% 80% at 88% 30%, rgba(34,72,132,0.35) 0%, transparent 60%)" }}
        />
        <Container className="relative">
          <div className="mb-9 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="h-px w-6 bg-bronze-500/60" aria-hidden="true" />
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">Repères de loyer</p>
              </div>
              <h2 className="mt-2 text-[1.55rem] font-extrabold tracking-[-0.04em] text-white">
                Carte des loyers
              </h2>
              <p className="mt-2 max-w-md text-[14px] leading-6 text-white/55">
                Repères de loyer observés par quartier (appartement, DH/mois).
                Indicatifs — à confirmer avant décision.
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

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
            {LOYERS_QUARTIERS.map((item) => (
              <div
                key={`${item.ville}-${item.quartier}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 transition duration-200 hover:border-bronze-500/35 hover:from-white/[0.10]"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-bronze-500/10 blur-2xl transition group-hover:bg-bronze-500/20" />
                <div className="relative flex items-start justify-between">
                  <span className="inline-grid h-9 w-9 place-items-center rounded-xl bg-bronze-500/12 text-bronze-400 ring-1 ring-bronze-500/20">
                    <MapPin size={15} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div className="flex items-end gap-0.5 pt-1.5" aria-hidden="true">
                    {[1, 2, 3, 4].map((b) => (
                      <span
                        key={b}
                        className={`w-1 rounded-full ${b <= item.level ? "bg-bronze-400" : "bg-white/15"}`}
                        style={{ height: `${4 + b * 2.5}px` }}
                      />
                    ))}
                  </div>
                </div>
                <p className="relative mt-3 text-[13.5px] font-extrabold text-white">{item.quartier}</p>
                <p className="relative text-[10px] font-semibold text-white/45">{item.ville}</p>
                <div className="relative mt-2 flex items-baseline gap-1 border-t border-white/8 pt-2">
                  <span className="text-[13px] font-extrabold text-bronze-400">{item.loyer.toLocaleString("fr-FR")}</span>
                  <span className="text-[9.5px] font-semibold text-white/45">DH/mois</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 flex items-start gap-1.5 text-[11.5px] leading-5 text-white/40">
            <AlertCircle size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
            Carte indicative des loyers — repères observés, à confirmer avant décision.
            Ne constitue pas un loyer officiel.
          </p>

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
