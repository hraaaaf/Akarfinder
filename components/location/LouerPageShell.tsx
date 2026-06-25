import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Heart,
  Home,
  MapPin,
  Scale,
  ShoppingCart,
  Bus,
  GraduationCap,
  Pill,
  Briefcase,
  Wallet,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { searchListings } from "@/lib/search";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { getListingImageMode } from "@/lib/listings/image-policy";
import type { Listing } from "@/lib/listings/types";

const BUDGET_CHIPS = [
  { label: "< 2 000 DH/mois", href: "/search?transaction_type=rent&maxPrice=2000" },
  { label: "2 000 – 5 000 DH", href: "/search?transaction_type=rent&minPrice=2000&maxPrice=5000" },
  { label: "5 000 – 10 000 DH", href: "/search?transaction_type=rent&minPrice=5000&maxPrice=10000" },
  { label: "> 10 000 DH/mois", href: "/search?transaction_type=rent&minPrice=10000" },
];

const TYPE_CHIPS = [
  { label: "Studio", href: "/search?transaction_type=rent&property_type=Studio" },
  { label: "Appartement", href: "/search?transaction_type=rent&property_type=Appartement" },
  { label: "Villa", href: "/search?transaction_type=rent&property_type=Villa" },
  { label: "Bureau", href: "/search?transaction_type=rent&property_type=Bureau" },
  { label: "Meublé", href: "/search?transaction_type=rent" },
  { label: "Vide", href: "/search?transaction_type=rent" },
];

const VIE_QUOTIDIENNE = [
  { icon: <Briefcase size={15} strokeWidth={2.2} />, label: "Proximité bureau / zone d'activité" },
  { icon: <GraduationCap size={15} strokeWidth={2.2} />, label: "Établissements scolaires à proximité" },
  { icon: <Bus size={15} strokeWidth={2.2} />, label: "Transports en commun et taxi" },
  { icon: <Pill size={15} strokeWidth={2.2} />, label: "Pharmacie et services de santé" },
  { icon: <ShoppingCart size={15} strokeWidth={2.2} />, label: "Supermarché et marché de quartier" },
  { icon: <MapPin size={15} strokeWidth={2.2} />, label: "Repère de quartier indicatif sur la fiche" },
];

function RentCard({ listing }: { listing: Listing }) {
  const imageMode = getListingImageMode(listing);
  return (
    <article className="flex flex-col overflow-hidden rounded-[1.2rem] border border-[#eadfca] bg-white shadow-[0_6px_22px_rgba(7,27,51,0.06)]">
      <Link
        href={`/listings/${listing.id}`}
        className="relative block h-[160px] overflow-hidden bg-[#f0f4f8]"
      >
        {imageMode !== "fallback_visual" && listing.main_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.main_image_url}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ListingVisual listing={listing} className="h-full w-full" />
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-[#0e7490]/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white">
          À louer
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[1.35rem] font-extrabold leading-none tracking-[-0.04em] text-deepblue">
          {formatPrice(listing.price, listing.currency)}
          <span className="ml-1 text-[11px] font-bold text-gray-400">/ loyer indicatif</span>
        </p>
        <p className="text-[11.5px] font-bold text-[#0e7490]">
          {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²
        </p>
        <Link href={`/listings/${listing.id}`} className="mt-1 block">
          <h3 className="line-clamp-2 text-[0.9rem] font-extrabold leading-snug text-gray-950">
            {listing.title}
          </h3>
          <p className="mt-0.5 text-[12px] text-gray-500">
            {listing.neighborhood ? `${listing.city}, ${listing.neighborhood}` : listing.city}
          </p>
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-bold text-gray-600">
          <span>{formatSurface(listing.surface_m2)}</span>
          {listing.bedrooms > 0 ? <span>{listing.bedrooms} ch.</span> : null}
        </div>
        <div className="mt-3 flex gap-2">
          <Link
            href={`/listings/${listing.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-deepblue px-3 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
          >
            Voir la fiche
            <ArrowRight size={12} strokeWidth={2.4} aria-hidden="true" />
          </Link>
          <Link
            href="/favorites"
            aria-label="Mes favoris"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#eadfca] bg-[#fffdf8] text-gray-400 transition hover:border-red-200 hover:text-red-400"
          >
            <Heart size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export async function LouerPageShell() {
  let rentListings: Listing[] = [];
  try {
    const result = await searchListings({ transaction_type: "rent", limit: 6 });
    rentListings = result.listings ?? [];
  } catch {
    // fallback: no listings displayed, CTA shown
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="bg-[#0e4756] px-4 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-cyan-300">
            Location immobilière
          </p>
          <h1 className="mt-3 text-[2.2rem] font-extrabold leading-[1.12] tracking-[-0.05em] sm:text-[3rem]">
            Trouver une location selon votre vie quotidienne
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-white/72">
            Annonces de locations analysées depuis plusieurs sources marocaines.
            Filtrez par loyer mensuel, type de bien et quartier pour constituer votre shortlist avant de contacter.
            Loyers indicatifs — à confirmer auprès de la source.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/search?transaction_type=rent"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-white/20"
            >
              Voir les locations
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
            <Link
              href="/favorites"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-white/20"
            >
              Ma shortlist
              <Heart size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-white/20"
            >
              Comparer
              <Scale size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <Container className="space-y-12 py-12 lg:py-16">

        {/* ── Bloc 1 : Budget mensuel ── */}
        <section>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0e7490] text-white">
              <Wallet size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[1.3rem] font-extrabold tracking-[-0.03em] text-deepblue">
                Budget mensuel
              </h2>
              <p className="mt-1 max-w-2xl text-[13.5px] leading-6 text-gray-500">
                Filtrez par loyer mensuel maximum. Les loyers affichés sont issus d'annonces publiques analysées —
                repères indicatifs à confirmer auprès du propriétaire ou de l'agence. Charges et caution à préciser
                lors du contact.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {BUDGET_CHIPS.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c8a3] bg-white px-4 py-2 text-[13px] font-bold text-deepblue transition hover:border-[#0e7490] hover:bg-[#f0fafc] hover:text-[#0e7490]"
              >
                {chip.label}
                <ArrowRight size={11} strokeWidth={2.5} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Bloc 2 : Type de location ── */}
        <section>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0f766e] text-white">
              <Home size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[1.3rem] font-extrabold tracking-[-0.03em] text-deepblue">
                Type de location
              </h2>
              <p className="mt-1 max-w-2xl text-[13.5px] leading-6 text-gray-500">
                Appartement, studio, villa ou bureau. Meublé ou vide — précisez votre besoin pour
                filtrer les annonces pertinentes. La distinction meublé/vide et la disponibilité
                sont à confirmer directement auprès de la source.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {TYPE_CHIPS.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c8a3] bg-white px-4 py-2 text-[13px] font-bold text-deepblue transition hover:border-[#0f766e] hover:bg-[#f0fdf4] hover:text-[#0f766e]"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Bloc 3 : Vie quotidienne ── */}
        <section className="rounded-[1.7rem] border border-[#eadfca] bg-white p-6 shadow-[0_6px_22px_rgba(7,27,51,0.04)] sm:p-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#065f46] text-white">
              <MapPin size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[1.3rem] font-extrabold tracking-[-0.03em] text-deepblue">
                Vie quotidienne & proximité
              </h2>
              <p className="mt-1 text-[13.5px] leading-6 text-gray-500">
                Repères de proximité affichés à titre indicatif sur chaque fiche de location.
                À vérifier sur place ou auprès du propriétaire avant toute décision.
              </p>
            </div>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VIE_QUOTIDIENNE.map(({ icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl bg-[#f0fdf4] px-4 py-3 text-[13px] font-semibold text-gray-700"
              >
                <span className="shrink-0 text-[#065f46]">{icon}</span>
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-deepblue transition hover:text-[#065f46]"
            >
              Explorer la carte des quartiers
              <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── Biens à louer (données réelles) ── */}
        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-[1.3rem] font-extrabold tracking-[-0.03em] text-deepblue">
              Biens à louer disponibles
            </h2>
            <Link
              href="/search?transaction_type=rent"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#0e7490] transition hover:text-deepblue"
            >
              Voir toutes les locations
              <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </div>

          {rentListings.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rentListings.map((listing) => (
                <RentCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-[#d8c8a3] bg-white p-8 text-center">
              <p className="text-[14px] font-bold text-gray-500">
                Aucune location disponible en ce moment dans notre base.
              </p>
              <Link
                href="/search?transaction_type=rent"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-deepblue px-5 py-3 text-[13px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
              >
                Rechercher une location
                <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </Link>
            </div>
          )}
          <p className="mt-3 text-[11.5px] text-gray-400">
            Loyers indicatifs issus d'annonces publiques analysées. À confirmer auprès de la source avant toute décision.
          </p>
        </section>

        {/* ── Bloc 4 : Shortlist + Comparateur ── */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
            <span className="inline-grid h-10 w-10 place-items-center rounded-2xl bg-red-500 text-white">
              <Heart size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-[1rem] font-extrabold tracking-[-0.02em] text-deepblue">
              Shortlist de locations
            </h3>
            <p className="mt-2 text-[13.5px] leading-6 text-gray-500">
              Sauvegardez les locations qui vous intéressent. Retrouvez-les dans votre shortlist pour
              comparer loyers, surfaces et localisation avant de visiter.
            </p>
            <Link
              href="/favorites"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-deepblue transition hover:text-red-500"
            >
              Mes favoris
              <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </div>
          <div className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
            <span className="inline-grid h-10 w-10 place-items-center rounded-2xl bg-[#1a4a8a] text-white">
              <Scale size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-[1rem] font-extrabold tracking-[-0.02em] text-deepblue">
              Comparer avant de visiter
            </h3>
            <p className="mt-2 text-[13.5px] leading-6 text-gray-500">
              Comparez jusqu'à 4 biens simultanément — loyer, surface, prix/m² et signaux de fiabilité —
              pour qualifier vos visites et éviter les déplacements inutiles.
            </p>
            <Link
              href="/compare"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-deepblue transition hover:text-[#1a4a8a]"
            >
              Ouvrir le comparateur
              <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── Bloc 5 : Alertes futures ── */}
        <section className="rounded-[1.4rem] border border-dashed border-[#a5b4fc] bg-[#f5f3ff] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#1d4ed8] text-white">
              <Bell size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[1rem] font-extrabold tracking-[-0.02em] text-deepblue">
                  Alertes location
                </h3>
                <span className="rounded-full border border-[#a5b4fc] bg-white px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#4338ca]">
                  À venir
                </span>
              </div>
              <p className="mt-2 text-[13.5px] leading-6 text-gray-600">
                Recevez une notification dès qu'une location correspondant à vos critères est disponible :
                nouveau bien, baisse de loyer, zone de quartier ou budget maximum. Fonctionnalité
                en cours de développement — disponible dans les prochaines versions d'AkarFinder.
              </p>
              <ul className="mt-3 space-y-1 text-[12.5px] font-semibold text-gray-500">
                {["Nouveau bien dans ma zone", "Loyer inférieur à mon budget", "Baisses de loyer observées", "Quartier précis"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4338ca]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Callout final ── */}
        <section className="rounded-[1.7rem] bg-deepblue p-8 text-white">
          <h2 className="text-[1.5rem] font-extrabold tracking-[-0.04em]">
            Commencez votre recherche de location
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-7 text-white/72">
            Parcourez les annonces de locations disponibles, sauvegardez vos coups de cœur et contactez
            directement propriétaires ou agences depuis chaque fiche.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/search?transaction_type=rent"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-white/20"
            >
              Voir toutes les locations
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-white/20"
            >
              Créer mon dossier acheteur
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <p className="rounded-xl border border-[#eadfca] bg-[#fffdf8] px-4 py-3 text-[12px] leading-5 text-gray-500">
          Les loyers affichés sur AkarFinder proviennent d'annonces publiques analysées.
          Ils constituent des repères indicatifs et non des loyers officiels.
          La disponibilité, le type (meublé/vide), les charges et la caution sont à confirmer
          directement auprès du propriétaire ou de l'agence source avant tout engagement.
          AkarFinder n'est pas partie à la transaction locative.
        </p>

      </Container>

      <SiteFooter />
    </main>
  );
}
