import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calculator,
  FileText,
  Heart,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Phone,
  Scale,
  Star,
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

const VILLE_CHIPS = [
  { label: "Casablanca", href: "/search?city=Casablanca&transaction_type=buy" },
  { label: "Marrakech", href: "/search?city=Marrakech&transaction_type=buy" },
  { label: "Rabat", href: "/search?city=Rabat&transaction_type=buy" },
  { label: "Tanger", href: "/search?city=Tanger&transaction_type=buy" },
  { label: "Agadir", href: "/search?city=Agadir&transaction_type=buy" },
  { label: "Fès", href: "/search?city=F%C3%A8s&transaction_type=buy" },
];

const PRIX_CHIPS = [
  { label: "< 500 000 DH", href: "/search?transaction_type=buy&maxPrice=500000" },
  { label: "500K – 1,5M DH", href: "/search?transaction_type=buy&minPrice=500000&maxPrice=1500000" },
  { label: "1,5M – 3M DH", href: "/search?transaction_type=buy&minPrice=1500000&maxPrice=3000000" },
  { label: "> 3M DH", href: "/search?transaction_type=buy&minPrice=3000000" },
];

const TYPO_CHIPS = [
  { label: "Studio", href: "/search?transaction_type=buy&property_type=Studio" },
  { label: "Appartement", href: "/search?transaction_type=buy&property_type=Appartement" },
  { label: "Villa", href: "/search?transaction_type=buy&property_type=Villa" },
  { label: "Duplex", href: "/search?transaction_type=buy&property_type=Appartement" },
  { label: "Lots & terrains", href: "/search?transaction_type=buy&property_type=Terrain" },
  { label: "Bureau / local", href: "/search?transaction_type=buy&property_type=Bureau" },
];

const PROMOTEUR_BLOCS = [
  {
    icon: <Star size={18} strokeWidth={2.2} />,
    bg: "bg-amber-600",
    title: "Projet partenaire",
    body: "Les projets affichés sur cette page sont des projets partenaires référencés avec l'accord du promoteur. Données fournies par le promoteur, à confirmer directement auprès d'eux avant tout engagement.",
  },
  {
    icon: <Building2 size={18} strokeWidth={2.2} />,
    bg: "bg-[#92400e]",
    title: "Informations promoteur",
    body: "Nom du promoteur, localisation du projet, typologies disponibles et prix à partir de. Ces informations sont fournies par le promoteur partenaire et constituent des repères indicatifs.",
  },
  {
    icon: <FileText size={18} strokeWidth={2.2} />,
    bg: "bg-[#78350f]",
    title: "Brochure fournie par le promoteur",
    body: "Certains projets partenaires mettent à disposition une brochure PDF téléchargeable directement depuis la fiche projet. Contenu sous la responsabilité du promoteur partenaire.",
  },
];

function NewListingCard({ listing }: { listing: Listing }) {
  const imageMode = getListingImageMode(listing);
  return (
    <article className="flex flex-col overflow-hidden rounded-[1.2rem] border border-[#eadfca] bg-white shadow-[0_6px_22px_rgba(7,27,51,0.06)]">
      <Link
        href={`/listings/${listing.id}`}
        className="relative block h-[160px] overflow-hidden bg-[#fef3c7]"
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
        <span className="absolute left-2.5 top-2.5 rounded-full bg-amber-700/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white">
          {listing.property_type ?? "Bien"}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-deepblue">
          {formatPrice(listing.price, listing.currency)}
          <span className="ml-1 text-[11px] font-bold text-gray-400">prix à partir de</span>
        </p>
        {listing.price_per_m2 > 0 ? (
          <p className="text-[11.5px] font-bold text-amber-700">
            {listing.price_per_m2.toLocaleString("fr-FR")} DH/m² · prix observé
          </p>
        ) : null}
        <Link href={`/listings/${listing.id}`} className="mt-1 block">
          <h3 className="line-clamp-2 text-[0.9rem] font-extrabold leading-snug text-gray-950">
            {listing.title}
          </h3>
          <p className="mt-0.5 text-[12px] text-gray-500">
            {listing.neighborhood
              ? `${listing.city}, ${listing.neighborhood}`
              : listing.city}
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
            href="/compare"
            aria-label="Comparer"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#eadfca] bg-[#fffdf8] text-gray-400 transition hover:border-amber-200 hover:text-amber-600"
          >
            <Scale size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export async function NeufPageShell() {
  let newListings: Listing[] = [];
  try {
    const result = await searchListings({ transaction_type: "buy", limit: 6 });
    newListings = result.listings ?? [];
  } catch {
    // fallback: no listings, CTA shown
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="bg-[#78350f] px-4 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-300">
            Immobilier neuf
          </p>
          <h1 className="mt-3 text-[2.2rem] font-extrabold leading-[1.12] tracking-[-0.05em] sm:text-[3rem]">
            Programmes neufs au Maroc
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-white/72">
            Projets partenaires référencés sur AkarFinder. Informations fournies par les promoteurs —
            prix à partir de, hors frais notariaux. À confirmer directement auprès du promoteur
            avant tout engagement.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/search?transaction_type=buy"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-white/20"
            >
              Voir les programmes
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-white/20"
            >
              Créer mon dossier acheteur
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
            <Link
              href="/promoteurs"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-white/20"
            >
              Espace promoteurs
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <Container className="space-y-12 py-12 lg:py-16">

        {/* ── Bloc 1 : Projets par ville ── */}
        <section>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-700 text-white">
              <MapPin size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[1.3rem] font-extrabold tracking-[-0.03em] text-deepblue">
                Projets par ville
              </h2>
              <p className="mt-1 max-w-2xl text-[13.5px] leading-6 text-gray-500">
                Programmes neufs référencés dans les principales villes marocaines.
                Quartiers, disponibilités et prix à partir de — à confirmer auprès du promoteur.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {VILLE_CHIPS.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c8a3] bg-white px-4 py-2 text-[13px] font-bold text-deepblue transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
              >
                {chip.label}
                <ArrowRight size={11} strokeWidth={2.5} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Bloc 2 : Prix à partir de ── */}
        <section>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#92400e] text-white">
              <Calculator size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[1.3rem] font-extrabold tracking-[-0.03em] text-deepblue">
                Budget d'acquisition
              </h2>
              <p className="mt-1 max-w-2xl text-[13.5px] leading-6 text-gray-500">
                Filtrez par budget. Les prix affichés sont des prix à partir de issus des annonces
                analysées — repères indicatifs, hors frais notariaux, charges et frais d'agence.
                À confirmer auprès du promoteur.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {PRIX_CHIPS.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c8a3] bg-white px-4 py-2 text-[13px] font-bold text-deepblue transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
              >
                {chip.label}
                <ArrowRight size={11} strokeWidth={2.5} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Bloc 3 : Typologies ── */}
        <section>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#78350f] text-white">
              <LayoutGrid size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[1.3rem] font-extrabold tracking-[-0.03em] text-deepblue">
                Typologies & surfaces
              </h2>
              <p className="mt-1 max-w-2xl text-[13.5px] leading-6 text-gray-500">
                Studio, appartement, villa, duplex ou lot. Surfaces et plans à confirmer
                auprès du promoteur. Disponibilité des typologies à vérifier directement.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {TYPO_CHIPS.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c8a3] bg-white px-4 py-2 text-[13px] font-bold text-deepblue transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Section programmes neufs (données réelles) ── */}
        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-[1.3rem] font-extrabold tracking-[-0.03em] text-deepblue">
              Biens et programmes disponibles
            </h2>
            <Link
              href="/search?transaction_type=buy"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-amber-700 transition hover:text-deepblue"
            >
              Voir toutes les annonces
              <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </div>

          {newListings.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {newListings.map((listing) => (
                <NewListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-[#d8c8a3] bg-white p-8 text-center">
              <p className="text-[14px] font-bold text-gray-500">
                Aucun programme disponible en ce moment dans notre base.
              </p>
              <Link
                href="/search?transaction_type=buy"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-deepblue px-5 py-3 text-[13px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
              >
                Rechercher un programme neuf
                <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </Link>
            </div>
          )}
          <p className="mt-3 text-[11.5px] text-gray-400">
            Prix à partir de issus d'annonces analysées — repères indicatifs. Disponibilité et
            conditions à confirmer auprès du promoteur ou de l'agence source.
          </p>
        </section>

        {/* ── Bloc Promoteur ── */}
        <section>
          <h2 className="mb-5 text-[1.3rem] font-extrabold tracking-[-0.03em] text-deepblue">
            Projets partenaires promoteurs
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {PROMOTEUR_BLOCS.map((bloc) => (
              <article
                key={bloc.title}
                className="flex flex-col gap-3 rounded-[1.2rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]"
              >
                <span className={`inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${bloc.bg} text-white`}>
                  {bloc.icon}
                </span>
                <h3 className="text-[0.95rem] font-extrabold tracking-[-0.02em] text-deepblue">
                  {bloc.title}
                </h3>
                <p className="text-[13px] leading-6 text-gray-500">{bloc.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Bloc Brochure / Rappel / WhatsApp ── */}
        <section className="rounded-[1.7rem] border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <h2 className="mb-1 text-[1.3rem] font-extrabold tracking-[-0.03em] text-deepblue">
            Demander des informations sur un projet
          </h2>
          <p className="mb-6 max-w-xl text-[13.5px] leading-6 text-gray-600">
            Brochure, demande de rappel, contact WhatsApp ou dossier acheteur — plusieurs façons
            d'entrer en contact avec un promoteur partenaire.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-[1.1rem] border border-amber-200 bg-white p-4">
              <span className="mt-0.5 inline-grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-amber-700 text-white">
                <FileText size={16} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-[0.88rem] font-extrabold text-deepblue">
                  Brochure promoteur
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-gray-500">
                  Brochure fournie par le promoteur — téléchargeable depuis la fiche projet.
                  Disponible sur les projets partenaires.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[1.1rem] border border-amber-200 bg-white p-4">
              <span className="mt-0.5 inline-grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#92400e] text-white">
                <MessageCircle size={16} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-[0.88rem] font-extrabold text-deepblue">
                  Contact WhatsApp
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-gray-500">
                  Disponible depuis chaque fiche projet partenaire. Coordonnées fournies
                  par le promoteur.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[1.1rem] border border-amber-200 bg-white p-4">
              <span className="mt-0.5 inline-grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#78350f] text-white">
                <Phone size={16} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-[0.88rem] font-extrabold text-deepblue">
                  Dossier acheteur
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-gray-500">
                  Créez votre dossier acheteur indicatif sur AkarFinder — transmis au
                  promoteur partenaire sans engagement.
                </p>
                <Link
                  href="/onboarding"
                  className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-extrabold text-deepblue transition hover:text-amber-700"
                >
                  Créer mon dossier
                  <ArrowRight size={10} strokeWidth={2.5} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bloc Shortlist + Comparaison neuf vs ancien ── */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
            <span className="inline-grid h-10 w-10 place-items-center rounded-2xl bg-red-500 text-white">
              <Heart size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-[1rem] font-extrabold tracking-[-0.02em] text-deepblue">
              Shortlist de programmes
            </h3>
            <p className="mt-2 text-[13.5px] leading-6 text-gray-500">
              Sauvegardez les projets qui vous intéressent dans votre shortlist. Retrouvez-les
              pour comparer prix, surfaces et localisation avant de contacter un promoteur.
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
              Comparer neuf vs ancien
            </h3>
            <p className="mt-2 text-[13.5px] leading-6 text-gray-500">
              Comparez un programme neuf avec des biens existants dans le même quartier —
              prix/m² observé, surface, package score. Repères indicatifs à compléter
              par votre propre analyse.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/compare"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-deepblue transition hover:text-[#1a4a8a]"
              >
                Ouvrir le comparateur
                <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />
              </Link>
              <Link
                href="/search?transaction_type=buy"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-gray-500 transition hover:text-deepblue"
              >
                Voir les biens existants
                <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Callout Promoteurs ── */}
        <section className="rounded-[1.7rem] bg-deepblue p-8 text-white">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-300">
            Espace promoteurs
          </p>
          <h2 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.04em]">
            Vous êtes promoteur ?
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-7 text-white/72">
            Référencez vos projets neufs sur AkarFinder. Pages projet dédiées, accès aux acheteurs
            qualifiés et présence aux événements sectoriels comme Sakan Expo.
            Sans promesse de volume de leads ni garantie de résultats.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/promoteurs"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-white/20"
            >
              Découvrir l'espace promoteurs
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
            <Link
              href="/pro"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-white/20"
            >
              Accéder à AkarFinder Pro
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <p className="rounded-xl border border-[#eadfca] bg-[#fffdf8] px-4 py-3 text-[12px] leading-5 text-gray-500">
          Les informations affichées sur les projets neufs sont fournies par les promoteurs partenaires
          (données partenaires). Prix à partir de, hors frais notariaux et charges. Disponibilité,
          typologies et plans à confirmer directement auprès du promoteur avant tout engagement.
          AkarFinder n'est pas partie à la transaction et ne garantit aucun résultat commercial.
        </p>

      </Container>

      <SiteFooter />
    </main>
  );
}
