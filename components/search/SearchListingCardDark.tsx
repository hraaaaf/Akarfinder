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
    <article
      onMouseEnter={() => hoverListing(listing, "list")}
      onMouseLeave={clearHover}
      onFocus={() => hoverListing(listing, "list")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) clearHover();
      }}
      data-property-active={active ? "true" : "false"}
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-card transition duration-300 hover:-translate-y-0.5 dark:bg-white/[0.045] ${
        active
          ? "border-bronze-500/70 shadow-[0_24px_55px_rgba(155,120,56,0.22)] ring-2 ring-bronze-500/15"
          : "border-border/15 shadow-[0_12px_34px_rgba(2,10,24,0.12)] hover:border-bronze-500/35"
      }`}
    >
      <Link
        href={resultHref}
        target={resultTarget}
        rel={resultRel}
        className="block"
        aria-label={observedExternal ? `Voir la source originale ${listing.title}` : `Voir le bien ${listing.title}`}
      >
        <div className="relative h-[220px] overflow-hidden bg-white">
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
                sizes="(max-width: 640px) 100vw, 420px"
              />
            ) : (
              <PropertyTypeArtwork kind={listing.property_type} className="h-full w-full" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/78 via-transparent to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-deepblue/88 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-white ring-1 ring-white/15 backdrop-blur">
              {getTransactionLabel(listing.transaction_type)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold backdrop-blur ${truthStyle(truth.tier)}`}>
              {truth.label}
            </span>
          </div>

          <span className="absolute bottom-3 left-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-extrabold text-deepblue shadow-sm backdrop-blur">
            {listing.property_type}
          </span>
          {imageMode === "fallback_visual" ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/45 px-2 py-1 text-[9px] font-medium text-white/75 backdrop-blur-sm">
              Visuel illustratif
            </span>
          ) : attribution ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/45 px-2 py-1 text-[9px] font-medium text-white/75 backdrop-blur-sm">
              {attribution}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[1.55rem] font-extrabold leading-none tracking-[-0.035em] text-bronze-500 dark:text-bronze-300">
              {formatPrice(smartCard.price, listing.currency)}
            </p>
            {smartCard.pricePerM2 != null ? (
              <p className="mt-1 text-[12px] font-bold text-muted-foreground">
                {smartCard.pricePerM2.toLocaleString("fr-MA")} DH/m²
              </p>
            ) : null}
          </div>
          {!observedExternal ? <FavoriteToggleButton listingId={listing.id} variant="icon" /> : null}
        </div>

        <Link href={resultHref} target={resultTarget} rel={resultRel} className="mt-3 block">
          <h2 className="line-clamp-2 text-[1.02rem] font-extrabold leading-snug text-foreground transition group-hover:text-bronze-600 dark:text-white dark:group-hover:text-bronze-300">
            {smartCard.title}
          </h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            <MapPin size={13} className="shrink-0 text-bronze-500" aria-hidden="true" />
            <span className="truncate">{smartCard.locationLabel}</span>
          </p>
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] font-bold text-foreground/70 dark:text-white/65">
          {smartCard.facts.slice(0, 4).map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/12 pt-3 text-[11px] dark:border-white/8">
          <span className="font-semibold text-muted-foreground">{smartCard.freshnessLabel}</span>
          <span className="truncate font-semibold text-muted-foreground">
            {listing.source_name || truth.informationLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={() => selectListing(listing, "list")}
          aria-pressed={selected}
          className={`mt-3 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-extrabold transition ${
            selected
              ? "border-bronze-500/60 bg-bronze-500/15 text-bronze-700 dark:text-bronze-200"
              : "border-border/15 bg-surface/70 text-muted-foreground hover:border-bronze-500/40 hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:hover:text-white"
          }`}
        >
          <MapPin size={13} aria-hidden="true" />
          {selected ? "Aperçu ouvert" : "Voir sur la carte"}
        </button>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
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

        {!observedExternal ? (
          <div className="mt-2">
            <CompareToggleButton listing={listing} className="w-full justify-center" />
          </div>
        ) : null}
      </div>
    </article>
  );
}
