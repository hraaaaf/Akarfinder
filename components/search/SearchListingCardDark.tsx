"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import { usePropertySelection } from "@/components/search/PropertySelectionProvider";
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

  const { selection, hoverListing, clearHover, selectListing, isActive, registerListing } =
    usePropertySelection();
  const [thumbnailError, setThumbnailError] = useState(false);

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
  const resultHref =
    observedExternal && listing.listing_url ? listing.listing_url : `/listings/${listing.id}`;
  const resultTarget = observedExternal ? "_blank" : undefined;
  const resultRel = observedExternal ? "noopener noreferrer" : undefined;
  const active = isActive(listing);
  const selected = active && selection.interaction === "selected";
  const showOriginal = Boolean(
    listing.listing_url &&
      (!listing.allowed_ctas ||
        listing.allowed_ctas.includes("view_original") ||
        listing.allowed_ctas.includes("view_source")),
  );

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
        className={`group flex min-w-0 flex-col overflow-hidden rounded-[20px] border bg-card transition duration-300 sm:rounded-2xl sm:hover:-translate-y-0.5 dark:bg-white/[0.045] ${
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

            <span className="absolute bottom-2 left-2 rounded-full bg-white/92 px-2 py-0.5 text-[9px] font-extrabold text-deepblue shadow-sm backdrop-blur sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
              {listing.property_type}
            </span>
            {imageMode === "fallback_visual" ? (
              <span className="absolute bottom-2 right-2 rounded-full bg-black/45 px-1.5 py-0.5 text-[8px] font-medium text-white/80 backdrop-blur-sm sm:bottom-3 sm:right-3 sm:px-2 sm:py-1 sm:text-[9px]">
                Illustration
              </span>
            ) : attribution ? (
              <span className="absolute bottom-3 right-3 hidden rounded-full bg-black/45 px-2 py-1 text-[9px] font-medium text-white/75 backdrop-blur-sm sm:inline-flex">
                {attribution}
              </span>
            ) : null}
          </div>
        </Link>

        <div className="flex flex-1 flex-col p-3 sm:p-5">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <p className="truncate text-[1.04rem] font-extrabold leading-tight tracking-[-0.025em] text-deepblue dark:text-white sm:text-[1.55rem] sm:leading-none sm:tracking-[-0.035em] sm:text-bronze-500 dark:sm:text-bronze-300">
                {formatPrice(smartCard.price, listing.currency)}
              </p>
              {smartCard.pricePerM2 != null ? (
                <p className="mt-1 hidden text-[12px] font-bold text-muted-foreground sm:block">
                  {smartCard.pricePerM2.toLocaleString("fr-MA")} DH/m²
                </p>
              ) : null}
            </div>
            {!observedExternal ? (
              <div className="-mr-1 -mt-1 scale-90 sm:mr-0 sm:mt-0 sm:scale-100">
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

          <div className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[9.5px] font-bold text-foreground/65 dark:text-white/65 sm:mt-3 sm:flex-wrap sm:gap-x-3 sm:gap-y-1.5 sm:text-[12px]">
            {smartCard.facts.slice(0, 3).map((fact) => (
              <span key={fact} className="shrink-0 sm:shrink">{fact}</span>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9px] dark:border-white/8 sm:mt-3 sm:gap-3 sm:border-border/12 sm:pt-3 sm:text-[11px]">
            <span className="truncate font-semibold text-muted-foreground">{smartCard.freshnessLabel}</span>
            <span className="truncate font-semibold text-muted-foreground">
              {listing.source_name || truth.informationLabel}
            </span>
          </div>

          {!observedExternal && listing.duplicate_score != null && listing.duplicate_score >= 0.7 ? (
            <p className="mt-1.5 text-[9px] font-semibold text-amber-700 dark:text-amber-200 sm:mt-2 sm:text-[11px]">
              Doublon possible
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => selectListing(listing, "list")}
            aria-pressed={selected}
            className={`mt-3 hidden items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-extrabold transition sm:flex ${
              selected
                ? "border-bronze-500/60 bg-bronze-500/15 text-bronze-700 dark:text-bronze-200"
                : "border-border/15 bg-surface/70 text-muted-foreground hover:border-bronze-500/40 hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:hover:text-white"
            }`}
          >
            <MapPin size={13} aria-hidden="true" />
            {selected ? "Aperçu ouvert" : "Repérer sur la carte"}
          </button>

          <div className="mt-4 hidden flex-col gap-2 sm:flex sm:flex-row">
            {!observedExternal ? (
              <Link
                href={`/listings/${listing.id}`}
                onClick={() =>
                  track({
                    event_name: "search_result_click",
                    source_page: "/search",
                    listing_id: listing.id,
                    intent: listing.transaction_type === "rent" ? "rent" : "buy",
                  })
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.28)] transition hover:from-bronze-600"
              >
                Voir le bien
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ) : null}

            {showOriginal ? (
              <a
                href={listing.listing_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/20 bg-surface px-4 py-3 text-[12.5px] font-bold text-foreground/75 transition hover:border-bronze-500/35 hover:text-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-white/75 dark:hover:text-white"
              >
                {observedExternal ? "Voir l’annonce originale" : "Voir la source"}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : null}
          </div>

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

          {!observedExternal ? (
            <div className="mt-2 hidden sm:block">
              <CompareToggleButton listing={listing} className="w-full justify-center" />
            </div>
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
