"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BellPlus, Calculator, MapPin } from "lucide-react";
import { AkarInfoPassportCard } from "@/components/akarinfo/AkarInfoPassportCard";
import { SourceAttribution } from "@/components/badges/SourceAttribution";
import { SourceBadge, deriveBadge } from "@/components/badges/SourceBadge";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { PricePositionBadge } from "@/components/price-position/PricePositionBadge";
import { useTheme } from "@/components/theme/ThemeProvider";
import { buildAkarInfoPassportForListing } from "@/lib/akarinfo/akarinfo-passport";
import { getListingImageMode, getImageAttribution } from "@/lib/listings/image-policy";
import type { Listing } from "@/lib/listings/types";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import {
  getSearchTruthPresentation,
  isObservedExternalListing,
  type SearchTruthTier,
} from "@/lib/search/search-truth-tier";
import { track } from "@/lib/tracking/track";

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

  const { theme } = useTheme();
  const [thumbnailError, setThumbnailError] = useState(false);
  const rawImageMode = getListingImageMode(listing);
  const policyBlocked = listing.display_images?.policy === "no_listing_image";
  const imageMode =
    policyBlocked || (rawImageMode === "db_provider_thumbnail" && thumbnailError)
      ? "fallback_visual"
      : rawImageMode;
  const attribution = getImageAttribution(listing);
  const transactionType = listing.transaction_type === "rent" ? "rent" : "buy";
  const isRent = listing.transaction_type === "rent";
  const passport = buildAkarInfoPassportForListing(listing);
  const truth = getSearchTruthPresentation(listing);
  const observedExternal = isObservedExternalListing(listing);
  const resultHref = observedExternal && listing.listing_url ? listing.listing_url : `/listings/${listing.id}`;
  const resultTarget = observedExternal ? "_blank" : undefined;
  const resultRel = observedExternal ? "noopener noreferrer" : undefined;
  const showOriginal = Boolean(
    listing.listing_url &&
      (!listing.allowed_ctas ||
        listing.allowed_ctas.includes("view_original") ||
        listing.allowed_ctas.includes("view_source")),
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_14px_40px_rgba(2,10,24,0.15)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-bronze-500/40 hover:shadow-[0_26px_56px_rgba(2,10,24,0.3)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_14px_40px_rgba(2,10,24,0.4)] dark:hover:shadow-[0_26px_56px_rgba(2,10,24,0.55)]">
      <Link
        href={resultHref}
        target={resultTarget}
        rel={resultRel}
        onClick={() =>
          track({
            event_name: "search_result_click",
            source_page: "/search",
            listing_id: listing.id,
            intent: transactionType,
            metadata: { city: listing.city, truth_tier: truth.tier },
          })
        }
        className="block"
        aria-label={observedExternal ? `Voir la source originale ${listing.title}` : `Voir le bien ${listing.title}`}
      >
        <div className="relative h-[220px] overflow-hidden">
          <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.04]">
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
              <ListingVisual listing={listing} className="h-full w-full" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/80 via-transparent to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-deepblue/85 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-white ring-1 ring-white/15 backdrop-blur">
              {getTransactionLabel(listing.transaction_type)}
            </span>
            {listing.source_name ? (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-extrabold text-deepblue backdrop-blur">
                {listing.source_name}
              </span>
            ) : null}
          </div>

          <span className="absolute bottom-3 left-3 rounded-full bg-gradient-to-r from-bronze-700 to-bronze-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white shadow-sm">
            {listing.property_type}
          </span>
          {imageMode === "fallback_visual" ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2 py-1 text-[9px] font-medium text-white/70 backdrop-blur-sm">
              Visuel illustratif
            </span>
          ) : attribution ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2 py-1 text-[9px] font-medium text-white/70 backdrop-blur-sm">
              {attribution}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[1.6rem] font-extrabold leading-none tracking-[-0.04em] text-bronze-400">
              {formatPrice(listing.price, listing.currency)}
            </p>
            {listing.price_per_m2 != null && listing.price_per_m2 > 0 ? (
              <p className="mt-1 text-[12px] font-bold text-muted-foreground">
                {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²
              </p>
            ) : null}
          </div>
          {!observedExternal ? <FavoriteToggleButton listingId={listing.id} variant="icon" /> : null}
        </div>

        <Link href={resultHref} target={resultTarget} rel={resultRel} className="mt-3 block">
          <h2 className="line-clamp-1 text-[1.02rem] font-extrabold leading-snug text-foreground transition group-hover:text-bronze-300 dark:text-white">
            {listing.title}
          </h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            <MapPin size={13} strokeWidth={2.2} className="shrink-0 text-bronze-500" aria-hidden="true" />
            <span className="truncate">
              {listing.neighborhood ? `${listing.city}, ${listing.neighborhood}` : listing.city}
            </span>
          </p>
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/12 pt-3 text-[13px] font-bold text-foreground/75 dark:border-white/8">
          <span>{formatSurface(listing.surface_m2)}</span>
          {listing.bedrooms > 0 ? <span>{listing.bedrooms} ch.</span> : null}
          {listing.bathrooms > 0 ? <span>{listing.bathrooms} sdb</span> : null}
          <span className="text-foreground/25">·</span>
          <span className="text-muted-foreground">{listing.freshness_label}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold ${truthStyle(truth.tier)}`}>
            {truth.label}
          </span>
          <span className="rounded-full border border-border/15 bg-surface px-2.5 py-1 text-[10.5px] font-bold text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60">
            {truth.informationLabel}
          </span>
          {deriveBadge(listing.source_badge, listing.source_access_level) ? (
            <SourceBadge
              badge={listing.source_badge}
              sourceAccessLevel={listing.source_access_level}
              variant={theme === "dark" ? "dark" : "light"}
            />
          ) : null}
          {!observedExternal ? (
            <PricePositionBadge listing={listing} variant={theme === "dark" ? "dark" : "light"} />
          ) : null}
          {!observedExternal && listing.duplicate_score != null && listing.duplicate_score >= 0.7 ? (
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10.5px] font-bold text-amber-700 dark:text-amber-200">
              Doublon possible
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-[11px] leading-5 text-muted-foreground/90">{truth.explanation}</p>

        <SourceAttribution
          sourceAttributionLabel={listing.source_attribution_label}
          displayPolicyReason={listing.display_policy_reason}
          sourceName={listing.source_name}
          variant={theme === "dark" ? "dark" : "light"}
        />

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {!observedExternal ? (
            <Link
              href={`/listings/${listing.id}`}
              onClick={() =>
                track({
                  event_name: "search_result_click",
                  source_page: "/search",
                  listing_id: listing.id,
                  intent: transactionType,
                })
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.35)] transition hover:from-bronze-600 group-hover:gap-3"
            >
              Voir le bien<ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          ) : null}
          {showOriginal ? (
            <a
              href={listing.listing_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/20 bg-surface px-4 py-3 text-[12.5px] font-bold text-foreground/70 transition hover:border-border/35 hover:bg-surface/80 hover:text-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-white/70 dark:hover:border-white/25 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              {observedExternal ? "Voir sur le site original" : "Voir la source"}
            </a>
          ) : null}
        </div>

        {!observedExternal ? (
          <div className="mt-2 flex items-center gap-2">
            {isRent ? (
              <Link
                href="/louer#alerte"
                onClick={() =>
                  track({
                    event_name: "search_alert_click",
                    source_page: "/search",
                    listing_id: listing.id,
                    intent: "rent",
                    metadata: { city: listing.city },
                  })
                }
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-bronze-500/30 bg-bronze-500/10 px-3 py-2 text-[12px] font-extrabold text-bronze-300 transition hover:bg-bronze-500/20"
              >
                <BellPlus size={13} strokeWidth={2.4} aria-hidden="true" />
                Créer une alerte
              </Link>
            ) : (
              <Link
                href="/acheter#financement"
                onClick={() =>
                  track({
                    event_name: "search_credit_click",
                    source_page: "/search",
                    listing_id: listing.id,
                    intent: "buy",
                    metadata: { city: listing.city, price: listing.price },
                  })
                }
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-bronze-500/30 bg-bronze-500/10 px-3 py-2 text-[12px] font-extrabold text-bronze-300 transition hover:bg-bronze-500/20"
              >
                <Calculator size={13} strokeWidth={2.4} aria-hidden="true" />
                Simuler le crédit
              </Link>
            )}
            <CompareToggleButton listingId={listing.id} className="flex-1 justify-center" />
          </div>
        ) : null}

        <AkarInfoPassportCard passport={passport} className="mt-3" />
      </div>
    </article>
  );
}
