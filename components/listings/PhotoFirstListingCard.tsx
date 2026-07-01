"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { MreBadge } from "@/components/ui/MreBadge";
import { ReliabilityBadge } from "@/components/ui/ReliabilityBadge";
import { SourceBadge, deriveBadge } from "@/components/badges/SourceBadge";
import { MarketPriceScoreBadge } from "@/components/badges/MarketPriceScoreBadge";
import { SourceAttribution } from "@/components/badges/SourceAttribution";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { getListingImageMode, getImageAttribution } from "@/lib/listings/image-policy";
import { getMarketReference, getListingObservedPriceComparison } from "@/lib/market/get-market-reference";
import { getListingProximity } from "@/lib/proximity/get-listing-proximity";
import { calculatePackageScore } from "@/lib/package-score/calculate-package-score";
import type { PackageScoreLabel } from "@/lib/package-score/types";
import type { Listing } from "@/lib/listings/types";

function PackageCardBadge({ label }: { label: PackageScoreLabel }) {
  const styles: Record<PackageScoreLabel, string> = {
    "Excellent package": "border border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]",
    "Bon package": "border border-[#6ee7b7] bg-[#d1fae5] text-[#047857]",
    "Package correct": "border border-[#fde68a] bg-[#fffbeb] text-[#92400e]",
    "À analyser": "border border-[#e5e7eb] bg-[#f9fafb] text-gray-600",
    "Données insuffisantes": "border border-[#e5e7eb] bg-[#f9fafb] text-gray-400",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${styles[label]}`}>
      {label}
    </span>
  );
}

function getReliabilityLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function getReliabilityLabel(level: "high" | "medium" | "low") {
  if (level === "high") return "Fiabilité élevée";
  if (level === "medium") return "À vérifier";
  return "Doublon possible";
}

function getTransactionLabel(type: Listing["transaction_type"]) {
  if (type === "rent") return "Location";
  if (type === "new") return "Neuf";
  return "Achat";
}

type PhotoFirstListingCardProps = {
  listing: Listing;
};

export function PhotoFirstListingCard({ listing }: PhotoFirstListingCardProps) {
  // Guard: suppressed results must never render
  if (listing.can_show_result === false) return null;
  // Guard: production-blocked results hidden in production (e.g. ToS pending)
  if (process.env.NODE_ENV === "production" && listing.production_allowed === false) return null;

  const reliabilityLevel = getReliabilityLevel(listing.reliability_score);
  const reliabilityLabel = getReliabilityLabel(reliabilityLevel);
  const showReliability = listing.reliability_available !== false;
  const rawImageMode = getListingImageMode(listing);
  // display_images.policy guard: "no_listing_image" forces fallback even if permission granted.
  const imageMode =
    listing.display_images?.policy === "no_listing_image" ? "fallback_visual" : rawImageMode;
  const attribution = getImageAttribution(listing);
  const transactionType = listing.transaction_type === "rent" ? "rent" : "buy";
  const proximityPoints = getListingProximity(listing.city, listing.neighborhood);
  const priceComparison = getListingObservedPriceComparison(
    listing.city, listing.neighborhood, listing.property_type, transactionType, listing.price_per_m2
  );
  const packageScore = calculatePackageScore(
    listing.reliability_score,
    listing.reliability_available !== false,
    listing.duplicate_score,
    proximityPoints,
    priceComparison
  );
  const hasPackage = packageScore.overall_label !== "Données insuffisantes";
  const marketRef = hasPackage ? null : getMarketReference(listing.city, listing.neighborhood, listing.property_type, transactionType, listing.price_per_m2);

  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.4rem] border border-[#eadfca] bg-white shadow-[0_8px_28px_rgba(7,27,51,0.07)] transition duration-300 hover:-translate-y-1 hover:border-[#dcc89a] hover:shadow-[0_22px_48px_rgba(7,27,51,0.16)]">
      <Link
        href={`/listings/${listing.id}`}
        className="block"
        aria-label={`Voir le bien ${listing.title}`}
      >
        <div className="relative h-[238px] overflow-hidden sm:h-[250px]">
          <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.04]">
            {imageMode !== "fallback_visual" ? (
              <Image
                src={listing.main_image_url!}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 400px"
              />
            ) : (
              <ListingVisual listing={listing} className="h-full w-full" />
            )}
          </div>

          <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-2">
            <span className="rounded-full bg-deepblue/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white shadow-sm backdrop-blur">
              {getTransactionLabel(listing.transaction_type)}
            </span>
            {listing.source_name ? (
              <span className="rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-extrabold text-deepblue shadow-sm backdrop-blur">
                {listing.source_name}
              </span>
            ) : null}
          </div>

          <span className="absolute bottom-3.5 left-3.5 rounded-full bg-bronze-700/95 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white shadow-sm">
            {listing.property_type}
          </span>
          {imageMode === "fallback_visual" ? (
            <span className="absolute bottom-3.5 right-3.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/75 backdrop-blur-sm">
              Visuel illustratif
            </span>
          ) : attribution ? (
            <span className="absolute bottom-3.5 right-3.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/75 backdrop-blur-sm">
              {attribution}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[1.75rem] font-extrabold leading-none tracking-[-0.045em] text-deepblue">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <p className="mt-1.5 text-[12.5px] font-bold text-bronze-700">
              {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²
            </p>
          </div>
          <FavoriteToggleButton listingId={listing.id} variant="icon" />
        </div>

        <Link href={`/listings/${listing.id}`} className="mt-3 block">
          <h2 className="line-clamp-1 text-[1.08rem] font-extrabold leading-snug text-gray-950">
            {listing.title}
          </h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-semibold text-gray-600">
            <MapPin size={14} strokeWidth={2.2} className="shrink-0 text-bronze-700" aria-hidden="true" />
            <span className="truncate">
              {listing.neighborhood ? `${listing.city}, ${listing.neighborhood}` : listing.city}
            </span>
          </p>
        </Link>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#f0e6d2] pt-3.5 text-[13.5px] font-bold text-gray-700">
          <span>{formatSurface(listing.surface_m2)}</span>
          {listing.bedrooms > 0 ? <span>{listing.bedrooms} ch.</span> : null}
          {listing.bathrooms > 0 ? <span>{listing.bathrooms} sdb</span> : null}
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">{listing.freshness_label}</span>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {/* V9.5 Source Badge */}
          {deriveBadge(listing.source_badge, listing.source_access_level) && (
            <SourceBadge
              badge={listing.source_badge}
              sourceAccessLevel={listing.source_access_level}
              variant="light"
            />
          )}
          <MarketPriceScoreBadge listing={listing} variant="light" />
          {showReliability ? (
            <ReliabilityBadge level={reliabilityLevel} label={reliabilityLabel} />
          ) : null}
          {listing.is_mre_friendly ? <MreBadge /> : null}
          {listing.data_completeness_score != null ? (
            <span className="rounded-full border border-[#c7dff7] bg-[#f0f7ff] px-2.5 py-1 text-[11px] font-bold text-[#1a4a8a]">
              Indice AkarFinder : {listing.data_completeness_score}/100
            </span>
          ) : null}
          {listing.duplicate_score != null && listing.duplicate_score >= 0.70 ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              Doublon possible
            </span>
          ) : null}
          {hasPackage ? (
            <PackageCardBadge label={packageScore.overall_label} />
          ) : marketRef ? (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              marketRef.confidence === "faible"
                ? "border border-[#e5e7eb] bg-[#f9fafb] text-gray-500"
                : marketRef.position === "coherent"
                  ? "border border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]"
                  : marketRef.position === "high"
                    ? "border border-[#fecaca] bg-[#fef2f2] text-[#dc2626]"
                    : "border border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"
            }`}>
              {marketRef.confidence === "faible"
                ? "Repère faible"
                : marketRef.position === "coherent"
                  ? "Prix cohérent"
                  : marketRef.position === "high"
                    ? "Prix supérieur au repère"
                    : "Prix inférieur au repère"}
            </span>
          ) : (
            <span className="rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-2.5 py-1 text-[11px] font-bold text-gray-400">
              Données limitées
            </span>
          )}
        </div>

        {/* V9.5 Source Attribution */}
        <SourceAttribution
          sourceAttributionLabel={listing.source_attribution_label}
          displayPolicyReason={listing.display_policy_reason}
          sourceName={listing.source_name}
          variant="light"
        />

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/listings/${listing.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-deepblue px-4 py-3.5 text-[14px] font-extrabold text-white shadow-[0_6px_18px_rgba(7,27,51,0.20)] transition hover:bg-deepblue-700 group-hover:gap-3"
          >
            Voir le bien
            <ArrowRight size={16} strokeWidth={2.4} className="transition-transform" aria-hidden="true" />
          </Link>

          {listing.listing_url ? (
            <a
              href={listing.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#eadfca] bg-transparent px-4 py-3 text-[13px] font-bold text-gray-600 transition hover:bg-[#f7f3ea] hover:text-deepblue"
            >
              {listing.original_source_required ? "Voir sur le site original" : "Voir la source"}
            </a>
          ) : null}
        </div>

        <div className="mt-2.5">
          <CompareToggleButton listingId={listing.id} className="justify-center" />
        </div>
      </div>
    </article>
  );
}
