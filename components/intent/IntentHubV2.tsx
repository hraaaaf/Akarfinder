import Link from "next/link";
import { ArrowRight, Compass, MapPin, Search, ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import type { Listing } from "@/lib/listings/types";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { getSearchTruthPresentation, isObservedExternalListing } from "@/lib/search/search-truth-tier";

type Intent = "buy" | "rent";

type IntentHubV2Props = {
  intent: Intent;
  listings: Listing[];
  totalListings: number | null;
};

const COPY = {
  buy: {
    eyebrow: "Acheter",
    title: "Commencez ici. Affinez ensuite dans le moteur.",
    description:
      "AkarFinder vous donne un aperçu de l’offre disponible puis vous envoie vers la recherche complète, où la pertinence, le niveau d’information et la source sont explicités.",
    searchPlaceholder: "Ville, quartier, résidence…",
    cta: "Explorer les biens à acheter",
    quick: [
      ["Appartements", "Appartement"],
      ["Villas", "Villa"],
      ["Terrains", "Terrain"],
    ] as const,
  },
  rent: {
    eyebrow: "Louer",
    title: "Trouvez votre zone. Continuez dans le moteur.",
    description:
      "Budget, type et localisation se filtrent dans une seule surface de recherche. AkarFinder n’affiche pas ici de pseudo-filtres ou de signaux qu’il ne peut pas réellement appliquer.",
    searchPlaceholder: "Ville, quartier, résidence…",
    cta: "Explorer les locations",
    quick: [
      ["Studios", "Studio"],
      ["Appartements", "Appartement"],
      ["Villas", "Villa"],
    ] as const,
  },
} satisfies Record<Intent, unknown>;

function resultHref(listing: Listing) {
  return isObservedExternalListing(listing) && listing.listing_url
    ? listing.listing_url
    : `/listings/${listing.id}`;
}

function IntentPreviewCard({ listing }: { listing: Listing }) {
  const truth = getSearchTruthPresentation(listing);
  const external = isObservedExternalListing(listing);
  const href = resultHref(listing);

  return (
    <article className="rounded-2xl border border-border/15 bg-card p-5 shadow-[0_14px_40px_rgba(2,10,24,0.10)] dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-border/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
          {truth.label}
        </span>
        {listing.city ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <MapPin size={11} aria-hidden="true" /> {listing.city}
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 line-clamp-2 text-[15px] font-extrabold leading-5 text-foreground">{listing.title}</h3>
      <p className="mt-2 text-[1.25rem] font-extrabold tracking-[-0.03em] text-bronze-500">
        {formatPrice(listing.price, listing.currency)}
        {listing.transaction_type === "rent" ? <span className="ml-1 text-[11px] font-bold text-muted-foreground">/mois</span> : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-[11.5px] font-semibold text-muted-foreground">
        {listing.neighborhood ? <span>{listing.neighborhood}</span> : null}
        {listing.surface_m2 > 0 ? <span>{formatSurface(listing.surface_m2)}</span> : null}
        {listing.property_type ? <span>{listing.property_type}</span> : null}
      </div>

      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-bronze-500 transition hover:text-bronze-400"
      >
        {external ? "Voir la source originale" : "Voir la fiche"}
        <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </article>
  );
}

export function IntentHubV2({ intent, listings, totalListings }: IntentHubV2Props) {
  const copy = COPY[intent];
  const transactionType = intent;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />

      <section className="relative overflow-hidden border-b border-border/12 bg-surface py-12 dark:border-white/8 dark:bg-deepblue sm:py-16 lg:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-bronze-500">{copy.eyebrow}</p>
              <h1 className="mt-3 text-[2.35rem] font-extrabold leading-[1.04] tracking-[-0.05em] sm:text-[3.5rem]">{copy.title}</h1>
              <p className="mt-4 max-w-2xl text-[14px] leading-7 text-muted-foreground sm:text-[15.5px]">{copy.description}</p>

              <form action="/search" method="get" className="mt-7 flex overflow-hidden rounded-2xl border border-border/15 bg-card p-1 shadow-[0_16px_50px_rgba(2,10,24,0.12)] dark:border-white/10 dark:bg-white/[0.06]">
                <input type="hidden" name="transaction_type" value={transactionType} />
                <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
                  <Search size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input name="q" placeholder={copy.searchPlaceholder} className="min-w-0 flex-1 bg-transparent py-3.5 text-[14px] outline-none placeholder:text-muted-foreground" />
                </div>
                <button type="submit" className="shrink-0 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13px] font-extrabold text-white">
                  Rechercher
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {copy.quick.map(([label, propertyType]) => (
                  <Link
                    key={propertyType}
                    href={`/search?transaction_type=${transactionType}&property_type=${encodeURIComponent(propertyType)}`}
                    className="rounded-full border border-border/20 bg-card px-4 py-2 text-[12px] font-bold text-foreground/75 transition hover:border-bronze-500/40 hover:text-foreground dark:border-white/12 dark:bg-white/[0.04]"
                  >
                    {label}
                  </Link>
                ))}
                <Link href={`/search?transaction_type=${transactionType}`} className="rounded-full border border-bronze-500/35 bg-bronze-500/10 px-4 py-2 text-[12px] font-extrabold text-bronze-500">
                  Tous les filtres →
                </Link>
              </div>
            </div>

            <aside className="rounded-3xl border border-border/15 bg-card p-6 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-bronze-500/12 text-bronze-500"><ShieldCheck size={18} aria-hidden="true" /></span>
                <div>
                  <p className="text-[13px] font-extrabold">Niveau d’information explicite</p>
                  <p className="text-[11.5px] text-muted-foreground">Pas un score de confiance inventé</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-[12px] leading-5 text-muted-foreground">
                <p><strong className="text-foreground">Analysé par AkarFinder</strong> — fiche structurée avec analyse disponible.</p>
                <p><strong className="text-foreground">Analyse partielle</strong> — informations structurées mais incomplètes.</p>
                <p><strong className="text-foreground">Offre observée</strong> — aperçu public à vérifier sur la source originale.</p>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-bronze-500">Aperçu du moteur</p>
              <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.04em]">Quelques résultats actuellement disponibles</h2>
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                {totalListings && totalListings > 0 ? `${totalListings.toLocaleString("fr-FR")} résultats indexés correspondent à cet intent. ` : ""}
                L’aperçu ci-dessous n’est pas un volume de marché garanti.
              </p>
            </div>
            <Link href={`/search?transaction_type=${transactionType}`} className="inline-flex items-center gap-2 text-[12.5px] font-extrabold text-bronze-500">
              {copy.cta} <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>

          {listings.length ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.slice(0, 6).map((listing) => <IntentPreviewCard key={listing.id} listing={listing} />)}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-border/20 bg-surface/50 p-7 text-[13px] text-muted-foreground">
              Aucun aperçu structuré disponible ici pour le moment. Le moteur peut néanmoins rechercher des offres observées sur leurs sources originales.
            </div>
          )}
        </Container>
      </section>

      <section className="border-y border-border/12 bg-surface py-12 dark:border-white/8">
        <Container>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href={`/search?transaction_type=${transactionType}`} className="rounded-2xl border border-border/15 bg-card p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <Search size={18} className="text-bronze-500" aria-hidden="true" />
              <p className="mt-4 font-extrabold">Recherche complète</p>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">Filtres réels, tri explicite et sources visibles.</p>
            </Link>
            <Link href="/compagnon" className="rounded-2xl border border-border/15 bg-card p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <Compass size={18} className="text-bronze-500" aria-hidden="true" />
              <p className="mt-4 font-extrabold">Construire Mon Projet</p>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">Clarifiez budget, zones, contraintes et préférences.</p>
            </Link>
            <Link href="/map" className="rounded-2xl border border-border/15 bg-card p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <MapPin size={18} className="text-bronze-500" aria-hidden="true" />
              <p className="mt-4 font-extrabold">Explorer les quartiers</p>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">Repères géographiques séparés des résultats du moteur.</p>
            </Link>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
