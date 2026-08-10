"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import { usePropertySelection } from "@/components/search/PropertySelectionProvider";
import { resolveRabatRealPhoto } from "@/lib/contextual-illustrations/rabat-real-photo-library";
import { getListingImageMode, getImageAttribution } from "@/lib/listings/image-policy";
import type { Listing } from "@/lib/listings/types";
import { formatPrice } from "@/lib/listings/utils";
import {
  getSearchTruthPresentation,
  isObservedExternalListing,
  type SearchTruthTier,
} from "@/lib/search/search-truth-tier";
import { track } from "@/lib/tracking/track";
import { buildSmartPropertyCardModel } from "@/lib/ux/smart-property-card";
import { deriveListingPublicAttribution } from "@/lib/search/public-attribution";

function getTransactionLabel(type: Listing["transaction_type"]) {
  if (type === "rent") return "Location";
  if (type === "new") return "Neuf";
  return "Achat";
}

function truthStyle(tier: SearchTruthTier) {
  if (tier === "analyzed") {
    return "border-emerald-400/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200";
  }
  if (tier === "partial") {
    return "border-amber-400/30 bg-amber-500/12 text-amber-700 dark:text-amber-200";
  }
  return "border-slate-400/25 bg-slate-500/10 text-slate-700 dark:text-white/65";
}

export function SearchListingCardDark({ listing }: { listing: Listing }) {
  if (listing.can_show_result === false) return null;
  if (process.env.NODE_ENV === "production" && listing.production_allowed === false) return null;

  const { hoverListing, clearHover, isActive, registerListing } = usePropertySelection();
  const [thumbnailError, setThumbnailError] = useState(false);
  const [neighborhoodPhotoError, setNeighborhoodPhotoError] = useState(false);

  useEffect(() => registerListing(listing), [listing, registerListing]);

  const rawImageMode = getListingImageMode(listing);
  const policyBlocked = listing.display_images?.policy === "no_listing_image";
  const imageMode =
    policyBlocked || (rawImageMode === "db_provider_thumbnail" && thumbnailError)
      ? "fallback_visual"
      : rawImageMode;
  const attribution = getImageAttribution(listing);
  const truth = getSearchTruthPresentation(listing);
  const smartCard = buildSmartPropertyCardModel(listing);
  const observedExternal = isObservedExternalListing(listing);
  const publicAttribution = deriveListingPublicAttribution(listing);
  const resultHref =
    observedExternal && listing.listing_url ? listing.listing_url : `/listings/${listing.id}`;
  const resultTarget = observedExternal ? "_blank" : undefined;
  const resultRel = observedExternal ? "noopener noreferrer" : undefined;
  const active = isActive(listing);
  const showOriginal = Boolean(
    listing.listing_url &&
      (!listing.allowed_ctas ||
        listing.allowed_ctas.includes("view_original") ||
        listing.allowed_ctas.includes("view_source")),
  );
  const neighborhoodPhoto =
    imageMode === "fallback_visual" && !neighborhoodPhotoError
      ? resolveRabatRealPhoto({
          stableKey: listing.listing_url ?? listing.id,
          city: listing.city,
          district: listing.neighborhood,
        })
      : null;
  const showNeighborhoodPhoto = neighborhoodPhoto !== null;

  return (
    <>
      <article
        onMouseEnter={() => hoverListing(listing, "list")}
        onMouseLeave={clearHover}
        onFocus={() => hoverListing(listing, "list")}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) clearHover();
        }}
        data-property-active={active ? "true" : "false"}
        data-mobile-compact-card
        className={`group relative flex min-w-0 flex-col overflow-hidden rounded-[20px] border bg-card transition duration-300 sm:rounded-2xl sm:hover:-translate-y-0.5 dark:bg-white/[0.045] ${
          active
            ? "border-bronze-500/70 shadow-[0_12px_28px_rgba(155,120,56,0.16)] ring-1 ring-bronze-500/15 sm:shadow-[0_24px_55px_rgba(155,120,56,0.22)] sm:ring-2"
            : "border-border/10 shadow-[0_5px_16px_rgba(2,10,24,0.08)] sm:border-border/15 sm:shadow-[0_12px_34px_rgba(2,10,24,0.12)] sm:hover:border-bronze-500/35"
        }`}
      >
        <Link
          href={resultHref}
          target={resultTarget}
          rel={resultRel}
          className="block"
          aria-label={observedExternal ? `Voir la source originale ${listing.title}` : `Voir le bien ${listing.title}`}
        >
          <div className="relative h-[164px] overflow-hidden bg-white sm:h-[220px]">
            <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.025]">
              {imageMode === "db_provider_thumbnail" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.thumbnail_url!}
                  alt={listing.title}
                  loading="lazy"
                  decoding="async"
                  onError={() => setThumbnailError(true)}
                  className="h-full w-full object-cover"
                />
              ) : imageMode !== "fallback_visual" ? (
                <Image
                  src={listing.main_image_url!}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 420px"
                />
              ) : showNeighborhoodPhoto ? (
                <div className="relative h-full w-full" data-neighborhood-photo-frame>
                  {/* Commons source stays intact; AkarFinder identity is applied only as CSS presentation. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={neighborhoodPhoto.asset}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setNeighborhoodPhotoError(true)}
                    data-neighborhood-photo-id={neighborhoodPhoto.id}
                    data-neighborhood-photo-district={neighborhoodPhoto.district}
                    className="h-full w-full object-cover object-center brightness-[0.96] contrast-[1.06] saturate-[0.88]"
                  />
                  <div
                    aria-hidden="true"
                    data-neighborhood-photo-brand-overlay
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(3,16,31,0.34),rgba(10,82,135,0.12)_52%,rgba(255,255,255,0.04))]"
                  />
                </div>
              ) : (
                <PropertyTypeArtwork kind={listing.property_type} className="h-full w-full" />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/58 via-transparent to-transparent sm:from-[#03101f]/78" />

            <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 sm:left-3 sm:top-3 sm:gap-2">
              <span className="rounded-full bg-deepblue/88 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.05em] text-white ring-1 ring-white/15 backdrop-blur sm:px-2.5 sm:py-1 sm:text-[10.5px] sm:tracking-[0.06em]">
                {getTransactionLabel(listing.transaction_type)}
              </span>
              <span className={`hidden rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold backdrop-blur sm:inline-flex ${truthStyle(truth.tier)}`}>
                {truth.label}
              </span>
            </div>

            {showNeighborhoodPhoto ? (
              <span
                data-neighborhood-photo-title
                className="absolute bottom-8 left-2 right-2 truncate text-[9px] font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] sm:bottom-11 sm:left-3 sm:right-3 sm:text-[11px]"
              >
                {neighborhoodPhoto.label}
              </span>
            ) : null}

            <span className="absolute bottom-2 left-2 rounded-full bg-white/92 px-2 py-0.5 text-[9px] font-extrabold text-deepblue shadow-sm backdrop-blur sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
              {listing.property_type}
            </span>
            {imageMode === "fallback_visual" ? (
              showNeighborhoodPhoto ? (
                <span
                  data-neighborhood-photo-disclosure
                  className="absolute bottom-2 right-2 rounded-full bg-deepblue/82 px-1.5 py-0.5 text-[8px] font-semibold text-white/95 ring-1 ring-white/10 backdrop-blur-sm sm:bottom-3 sm:right-3 sm:px-2 sm:py-1 sm:text-[9px]"
                >
                  Photo d’ambiance
                </span>
              ) : (
                <span className="absolute bottom-2 right-2 rounded-full bg-black/45 px-1.5 py-0.5 text-[8px] font-medium text-white/80 backdrop-blur-sm sm:bottom-3 sm:right-3 sm:px-2 sm:py-1 sm:text-[9px]">
                  Visuel illustratif
                </span>
              )
            ) : attribution ? (
              <span className="absolute bottom-3 right-3 hidden rounded-full bg-black/45 px-2 py-1 text-[9px] font-medium text-white/75 backdrop-blur-sm sm:inline-flex">
                {attribution}
              </span>
            ) : null}
          </div>
        </Link>

        <div className="flex flex-1 flex-col p-3 sm:p-5">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <p data-mobile-price className="truncate text-[1.04rem] font-extrabold leading-tight tracking-[-0.025em] text-deepblue dark:text-white sm:text-[1.55rem] sm:leading-none sm:tracking-[-0.035em] sm:text-bronze-500 dark:sm:text-bronze-300">
                {formatPrice(smartCard.price, listing.currency)}
              </p>
              {smartCard.pricePerM2 != null ? (
                <p className="mt-1 hidden text-[12px] font-bold text-muted-foreground sm:block">
                  {smartCard.pricePerM2.toLocaleString("fr-MA")} DH/m²
                </p>
              ) : null}
            </div>
            {!observedExternal ? (
              <div className="absolute right-2 top-2 z-20 scale-90 sm:static sm:z-auto sm:scale-100">
                <FavoriteToggleButton listingId={listing.id} variant="icon" />
              </div>
            ) : null}
          </div>

          <Link href={resultHref} target={resultTarget} rel={resultRel} className="mt-1.5 block sm:mt-3">
            <h2 className="line-clamp-1 text-[12.5px] font-extrabold leading-snug text-foreground transition group-hover:text-bronze-600 dark:text-white dark:group-hover:text-bronze-300 sm:line-clamp-2 sm:text-[1.02rem]">
              {smartCard.title}
            </h2>
            <p className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground sm:mt-1.5 sm:gap-1.5 sm:text-[13px]">
              <MapPin size={11} className="shrink-0 text-bronze-500 sm:h-[13px] sm:w-[13px]" aria-hidden="true" />
              <span className="truncate">{smartCard.locationLabel}</span>
            </p>
          </Link>

          {showNeighborhoodPhoto ? (
            <a
              href={neighborhoodPhoto.sourcePage}
              target="_blank"
              rel="noopener noreferrer"
              data-neighborhood-photo-credit
              className="mt-1 inline-flex w-fit max-w-full truncate text-[7.5px] font-semibold text-muted-foreground/75 underline-offset-2 hover:text-foreground hover:underline sm:text-[9px]"
              aria-label={`Crédit et licence de la photo d’ambiance ${neighborhoodPhoto.label}`}
            >
              Crédit & licence · Wikimedia Commons
            </a>
          ) : null}

          <div className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[9.5px] font-bold text-foreground/65 dark:text-white/65 sm:mt-3 sm:flex-wrap sm:gap-x-3 sm:gap-y-1.5 sm:text-[12px]">
            {smartCard.facts.slice(0, 3).map((fact) => (
              <span key={fact} className="shrink-0 sm:shrink">{fact}</span>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9px] dark:border-white/8 sm:mt-3 sm:gap-3 sm:border-border/12 sm:pt-3 sm:text-[11px]">
            <span className="truncate font-semibold text-muted-foreground">{smartCard.freshnessLabel}</span>
            {showOriginal && !observedExternal ? (
              <a
                href={listing.listing_url!}
                target="_blank"
                rel="noopener noreferrer"
                data-secondary-source-link
                className="inline-flex min-w-0 items-center gap-1 font-semibold text-muted-foreground transition hover:text-bronze-700 dark:hover:text-bronze-300"
                aria-label="Voir la source originale"
              >
                <span data-public-attribution className="truncate">{publicAttribution.combinedLabel}</span>
                <ExternalLink size={11} aria-hidden="true" className="shrink-0" />
              </a>
            ) : (
              <span data-public-attribution className="truncate font-semibold text-muted-foreground">
                {publicAttribution.combinedLabel}
              </span>
            )}
          </div>

          {!observedExternal && listing.duplicate_score != null && listing.duplicate_score >= 0.7 ? (
            <p className="mt-1.5 text-[9px] font-semibold text-amber-700 dark:text-amber-200 sm:mt-2 sm:text-[11px]">
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
              className="mt-4 hidden w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.28)] transition hover:from-bronze-600 sm:flex"
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
              className="mt-4 hidden w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.28)] transition hover:from-bronze-600 sm:flex"
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
