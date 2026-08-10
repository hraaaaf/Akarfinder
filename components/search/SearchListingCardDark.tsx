"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
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
import { deriveListingPublicAttribution } from "@/lib/search/public-attribution";
import { track } from "@/lib/tracking/track";
import { buildSmartPropertyCardModel } from "@/lib/ux/smart-property-card";

function getTransactionLabel(type: Listing["transaction_type"]) {
  if (type === "rent") return "Location";
  if (type === "new") return "Neuf";
  return "Achat";
}

function truthStyle(tier: SearchTruthTier) {
  if (tier === "analyzed") return "text-emerald-700 dark:text-emerald-300";
  if (tier === "partial") return "text-amber-700 dark:text-amber-300";
  return "text-muted-foreground";
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
  const resultHref = observedExternal && listing.listing_url ? listing.listing_url : `/listings/${listing.id}`;
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
  const placeLabel = [listing.city, listing.neighborhood].filter(Boolean).join(" • ");

  return (
    <article
      onMouseEnter={() => hoverListing(listing, "list")}
      onMouseLeave={clearHover}
      onFocus={() => hoverListing(listing, "list")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) clearHover();
      }}
      data-property-active={active ? "true" : "false"}
      data-mobile-compact-card
      data-unified-listing-card
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-[16px] border bg-card transition duration-200 focus-within:ring-2 focus-within:ring-bronze-500/45 dark:bg-white/[0.045] ${
        active
          ? "border-bronze-500/60 shadow-[0_10px_28px_rgba(155,120,56,0.16)]"
          : "border-border/12 shadow-[0_4px_14px_rgba(2,10,24,0.07)] hover:-translate-y-0.5 hover:border-bronze-500/30 hover:shadow-[0_12px_28px_rgba(2,10,24,0.11)] dark:border-white/10"
      }`}
    >
      <Link
        href={resultHref}
        target={resultTarget}
        rel={resultRel}
        data-card-primary-link
        aria-label={observedExternal ? `Voir la source originale ${listing.title}` : `Voir le bien ${listing.title}`}
        onClick={() =>
          track({
            event_name: "search_result_click",
            source_page: "/search",
            listing_id: listing.id,
            intent: listing.transaction_type === "rent" ? "rent" : "buy",
          })
        }
        className="absolute inset-0 z-10 rounded-[16px] focus:outline-none"
      />

      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white">
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
              sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
            />
          ) : showNeighborhoodPhoto ? (
            <div className="relative h-full w-full" data-neighborhood-photo-frame>
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
                className="h-full w-full object-cover object-center brightness-[0.96] contrast-[1.05] saturate-[0.9]"
              />
              <div
                aria-hidden="true"
                data-neighborhood-photo-brand-overlay
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,16,31,0.42),transparent_42%,rgba(3,16,31,0.28))]"
              />
            </div>
          ) : (
            <PropertyTypeArtwork kind={listing.property_type} className="h-full w-full" />
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#03101f]/38 via-transparent to-[#03101f]/30" />

        <div className="absolute left-2 top-2 z-20 max-w-[calc(100%-3.25rem)] sm:left-2.5 sm:top-2.5">
          <p className="truncate rounded-md bg-deepblue/82 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.07em] text-white backdrop-blur-sm sm:px-2 sm:text-[9.5px]">
            {placeLabel || getTransactionLabel(listing.transaction_type)}
          </p>
          {showNeighborhoodPhoto ? (
            <p className="mt-1 hidden text-[8.5px] font-semibold text-white/95 drop-shadow sm:block">Photo d’ambiance du quartier</p>
          ) : null}
        </div>

        {!observedExternal ? (
          <div className="absolute right-1.5 top-1.5 z-30 scale-[0.82] sm:right-2 sm:top-2 sm:scale-90">
            <FavoriteToggleButton listingId={listing.id} variant="icon" />
          </div>
        ) : null}

        <span className="absolute bottom-2 left-2 z-20 max-w-[72%] truncate rounded-md bg-white/94 px-1.5 py-0.5 text-[8.5px] font-extrabold text-deepblue shadow-sm backdrop-blur sm:bottom-2.5 sm:left-2.5 sm:px-2 sm:py-1 sm:text-[10px]">
          {listing.property_type}
        </span>

        {imageMode === "fallback_visual" ? (
          <span className="absolute bottom-2 right-2 z-20 rounded-md bg-black/48 px-1.5 py-0.5 text-[7.5px] font-semibold text-white/90 backdrop-blur-sm sm:bottom-2.5 sm:right-2.5 sm:text-[8.5px]">
            {showNeighborhoodPhoto ? "Ambiance" : "Illustration"}
          </span>
        ) : attribution ? (
          <span className="absolute bottom-2 right-2 z-20 hidden max-w-[42%] truncate rounded-md bg-black/42 px-1.5 py-0.5 text-[8px] font-medium text-white/80 backdrop-blur-sm sm:block">
            {attribution}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
        <h2 className="line-clamp-2 min-h-[2.45em] text-[11.5px] font-extrabold leading-[1.22] text-foreground transition group-hover:text-bronze-700 dark:text-white dark:group-hover:text-bronze-300 sm:text-[14px]">
          {smartCard.title}
        </h2>

        <p className="mt-1 flex min-w-0 items-center gap-1 text-[9px] font-semibold text-muted-foreground sm:text-[11px]">
          <MapPin size={10} className="shrink-0 text-bronze-500 sm:h-3 sm:w-3" aria-hidden="true" />
          <span className="truncate">{smartCard.locationLabel}</span>
        </p>

        {smartCard.facts.length > 0 ? (
          <div className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[8.5px] font-bold text-foreground/60 dark:text-white/60 sm:mt-2 sm:gap-x-2 sm:text-[10.5px]">
            {smartCard.facts.slice(0, 3).map((fact) => (
              <span key={fact} className="shrink-0">{fact}</span>
            ))}
          </div>
        ) : null}

        <p data-mobile-price className="mt-2 whitespace-normal break-words text-[12px] font-black leading-[1.05] tracking-[-0.035em] text-deepblue dark:text-white sm:mt-2.5 sm:text-[17px] sm:leading-none">
          {formatPrice(smartCard.price, listing.currency)}
        </p>

        <div className="relative z-20 mt-2 flex min-w-0 items-center justify-between gap-1.5 border-t border-border/10 pt-1.5 text-[7.5px] dark:border-white/8 sm:mt-2.5 sm:pt-2 sm:text-[9px]">
          <span className={`min-w-0 truncate font-semibold ${truthStyle(truth.tier)}`}>{truth.label}</span>
          {showOriginal && !observedExternal ? (
            <a
              href={listing.listing_url!}
              target="_blank"
              rel="noopener noreferrer"
              data-secondary-source-link
              className="inline-flex min-w-0 max-w-[55%] items-center gap-1 font-semibold text-muted-foreground transition hover:text-bronze-700 dark:hover:text-bronze-300"
              aria-label="Voir la source originale"
            >
              <span data-public-attribution className="truncate">{publicAttribution.combinedLabel}</span>
              <ExternalLink size={9} aria-hidden="true" className="shrink-0" />
            </a>
          ) : (
            <span data-public-attribution className="max-w-[55%] truncate font-semibold text-muted-foreground">
              {publicAttribution.combinedLabel}
            </span>
          )}
        </div>

        {showNeighborhoodPhoto ? (
          <a
            href={neighborhoodPhoto.sourcePage}
            target="_blank"
            rel="noopener noreferrer"
            data-neighborhood-photo-credit
            className="relative z-20 mt-1 inline-flex w-fit max-w-full truncate text-[7px] font-semibold text-muted-foreground/65 underline-offset-2 hover:text-foreground hover:underline sm:text-[8px]"
            aria-label={`Crédit et licence de la photo d’ambiance ${neighborhoodPhoto.label}`}
          >
            Crédit & licence · Wikimedia Commons
          </a>
        ) : null}

        {!observedExternal && listing.duplicate_score != null && listing.duplicate_score >= 0.7 ? (
          <p className="mt-1 text-[7.5px] font-semibold text-amber-700 dark:text-amber-200 sm:text-[9px]">Doublon possible</p>
        ) : null}
      </div>
    </article>
  );
}
