"use client";

import Link from "next/link";
import { ArrowRight, Building2, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { buildExternalSearchResultHref } from "@/lib/search/result-navigation";
import { resolvePublicListingAttribution } from "@/lib/search/public-attribution";
import type { Listing } from "@/lib/listings/types";
import { track } from "@/lib/tracking/client";
import { buildAkarInfoPassport, isAkarInfoPassportEligible } from "@/lib/akarinfo/build-passport";
import { getRabatNeighborhoodPhoto } from "@/lib/search/rabat-neighborhood-photos";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { ContextualListingArtwork } from "@/components/search/ContextualListingArtwork";
import { AkarInfoPassportCard } from "@/components/akarinfo/AkarInfoPassportCard";

const DEFAULT_PUBLIC_ATTRIBUTION = {
  sourceLabel: "Source publique",
  typeLabel: "Information publique",
  style: "indexed" as const,
};

function formatPrice(price: number | null, currency: string | null) {
  if (price == null) return "Prix non communiqué";
  const normalizedCurrency = (currency || "MAD").toUpperCase();
  const suffix = normalizedCurrency === "MAD" || normalizedCurrency === "DH" ? "DH" : normalizedCurrency;
  return `${new Intl.NumberFormat("fr-FR").format(price)} ${suffix}`;
}

function buildFacts(listing: Listing) {
  const facts: string[] = [];
  if (listing.bedrooms != null && listing.bedrooms > 0) facts.push(`${listing.bedrooms} ch.`);
  if (listing.bathrooms != null && listing.bathrooms > 0) facts.push(`${listing.bathrooms} sdb`);
  if (listing.surface_m2 != null && listing.surface_m2 > 0) facts.push(`${Math.round(listing.surface_m2)} m²`);
  if (listing.property_type) facts.push(listing.property_type);
  return facts.slice(0, 4);
}

function normalizeExternalResult(result: Listing) {
  const raw = result as Listing & { original_url?: string | null; normalized_city?: string | null; normalized_property_type?: string | null };
  return {
    originalUrl: raw.listing_url ?? raw.original_url ?? null,
    city: raw.city ?? raw.normalized_city ?? null,
    propertyType: raw.property_type ?? raw.normalized_property_type ?? null,
  };
}

type Props = {
  listing: Listing;
  active?: boolean;
  onHover?: (listingId: string | null) => void;
};

export function SearchListingCardDark({ listing, active = false, onHover }: Props) {
  const external = normalizeExternalResult(listing);
  const observedExternal = listing.source_access_level === "indexed_only" && external.originalUrl != null;
  const resultHref = observedExternal && external.originalUrl
    ? buildExternalSearchResultHref(external.originalUrl, { source: "search_card" })
    : `/listings/${listing.id}`;
  const resultTarget = observedExternal ? "_blank" : undefined;
  const resultRel = observedExternal ? "noopener noreferrer" : undefined;
  const showOriginal = Boolean(listing.listing_url);
  const facts = buildFacts(listing);
  const publicAttribution = resolvePublicListingAttribution(listing) ?? DEFAULT_PUBLIC_ATTRIBUTION;
  const passport = isAkarInfoPassportEligible(listing) ? buildAkarInfoPassport(listing) : null;
  const neighborhoodPhoto = !listing.image_url
    ? getRabatNeighborhoodPhoto({ city: listing.city, neighborhood: listing.neighborhood, identity: listing.id })
    : null;
  const showNeighborhoodPhoto = Boolean(neighborhoodPhoto);

  return (
    <>
      <article
        data-property-active={active ? "true" : "false"}
        data-mobile-compact-card
        data-search-listing-card
        data-search-listing-id={listing.id}
        className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition ${
          active ? "border-primary/50 shadow-[0_16px_40px_rgba(2,10,24,0.14)]" : "border-border/15 hover:border-primary/30 hover:shadow-md"
        }`}
        onMouseEnter={() => onHover?.(listing.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        <Link href={resultHref} target={resultTarget} rel={resultRel} aria-label={listing.title}>
          <div data-card-image className="relative h-[164px] overflow-hidden bg-white sm:h-[196px]">
            {listing.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.image_url} alt="" className="h-full w-full object-cover" />
            ) : showNeighborhoodPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={neighborhoodPhoto.src}
                alt=""
                className="h-full w-full object-cover"
                data-neighborhood-photo
                data-neighborhood-photo-key={neighborhoodPhoto.id}
                data-neighborhood-photo-district={neighborhoodPhoto.district}
              />
            ) : (
              <ContextualListingArtwork city={listing.city} propertyType={listing.property_type} seed={listing.id} />
            )}
            {showNeighborhoodPhoto ? (
              <div className="pointer-events-none absolute inset-x-2 bottom-2 flex min-w-0 items-end justify-between gap-2 text-white">
                <span className="max-w-[72%] truncate rounded-full bg-black/58 px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.1em] backdrop-blur-sm sm:text-[10px]">
                  {neighborhoodPhoto.district} · Rabat
                </span>
                <span className="shrink-0 rounded-full bg-black/58 px-2 py-1 text-[8px] font-bold backdrop-blur-sm sm:text-[10px]">
                  Photo d’ambiance
                </span>
              </div>
            ) : null}
            <div className="absolute right-2 top-2 z-10" onClick={(event) => event.preventDefault()}>
              <FavoriteToggleButton listingId={listing.id} compact />
            </div>
          </div>
        </Link>

        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <p data-mobile-price data-card-price className="truncate text-[1.04rem] font-black tracking-tight text-foreground sm:text-[1.55rem]">
            {formatPrice(listing.price, listing.currency)}
          </p>

          <Link href={resultHref} target={resultTarget} rel={resultRel} className="mt-1.5 block sm:mt-2.5">
            <h2 data-card-title className="line-clamp-2 text-[12.5px] font-extrabold leading-[1.22] text-foreground sm:text-[0.9rem] sm:leading-[1.25]">
              {listing.title}
            </h2>
            <p data-card-location className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground sm:text-[12px]">
              <MapPin size={12} strokeWidth={2.2} aria-hidden="true" />
              <span className="truncate">{[listing.neighborhood, listing.city].filter(Boolean).join(", ") || "Localisation non précisée"}</span>
            </p>
          </Link>

          <div data-card-facts className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[10px] font-bold text-foreground/70 sm:mt-2.5 sm:flex-wrap sm:gap-2 sm:text-[11px]">
            {facts.length ? facts.map((fact, index) => (
              <span key={`${fact}-${index}`} className="flex shrink-0 items-center gap-1">
                {index > 0 ? <span className="text-border-strong" aria-hidden="true">•</span> : null}
                {fact}
              </span>
            )) : <span>Informations à compléter</span>}
          </div>

          <div data-card-provenance className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9.5px] font-semibold text-muted-foreground sm:mt-2.5 sm:gap-3 sm:border-border/12 sm:pt-2.5 sm:text-[11px]">
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
              {publicAttribution.style === "first_party" ? <ShieldCheck size={12} aria-hidden="true" /> : <Building2 size={12} aria-hidden="true" />}
              <span className="truncate">{publicAttribution.sourceLabel}</span>
            </span>
            <span className="shrink-0">{listing.freshness_label || "Fraîcheur à vérifier"}</span>
          </div>

          {showNeighborhoodPhoto ? (
            <a
              href={neighborhoodPhoto.sourcePage}
              target="_blank"
              rel="noopener noreferrer"
              data-neighborhood-photo-credit
              className="mt-1.5 inline-flex w-fit max-w-full truncate text-[8.5px] font-semibold text-muted-foreground/75 underline-offset-2 hover:text-foreground hover:underline sm:text-[9px]"
              aria-label={`Crédit et licence de la photo d’ambiance ${neighborhoodPhoto.label}`}
            >
              Crédit & licence · Wikimedia Commons
            </a>
          ) : null}
          {!observedExternal && listing.duplicate_score != null && listing.duplicate_score >= 0.7 ? (
            <p className="mt-1.5 text-[9px] font-semibold text-amber-700 dark:text-amber-200 sm:mt-1 sm:text-[11px]">
              Doublon possible
            </p>
          ) : null}

          {!observedExternal ? (
            <Link
              href={resultHref}
              onClick={() =>
                track({
                  event_name: "search_result_click",
                  source_page: "/search",
                  listing_id: listing.id,
                  intent: listing.transaction_type === "rent" ? "rent" : "buy",
                })
              }
              data-card-primary-action
              className="mt-3 hidden w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.28)] transition hover:from-bronze-600 sm:flex"
            >
              Voir le bien
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : showOriginal ? (
            <a
              href={listing.listing_url!}
              target="_blank"
              rel="noopener noreferrer"
              data-card-primary-action
              className="mt-3 hidden w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.28)] transition hover:from-bronze-600 sm:flex"
            >
              Voir l’annonce originale
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : null}

          {observedExternal && showOriginal ? (
            <a
              href={listing.listing_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-[10px] font-extrabold text-bronze-700 dark:text-bronze-300 sm:hidden"
            >
              Voir l’annonce
            </a>
          ) : null}
        </div>
      </article>

      <style jsx global>{`
        @media (max-width: 639px) {
          [data-search-continuous-flow] > div.grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            column-gap: 0.75rem;
            row-gap: 1.5rem;
          }
        }
      `}</style>
    </>
  );
}
