"use client";

// SEARCH-RELOOKING-1 — Card résultat dark premium dédiée /search.
// CLONE restylé de PhotoFirstListingCard (NON modifiée, partagée ailleurs).
// Même richesse data, thème dark deepblue/bronze. CTAs : Voir le bien, Voir la
// source, Comparer, Favori + contextuel (Simuler le crédit / Créer une alerte).
// Wording prudent : Indice AkarFinder, repères indicatifs, source visible.
// THEME-SYSTEM-V1-P0 — Rendu theme-safe via tokens + dark: prefix.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { MapPin, ArrowRight, Calculator, BellPlus } from "lucide-react";
import { AkarInfoPassportCard } from "@/components/akarinfo/AkarInfoPassportCard";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { PricePositionBadge } from "@/components/price-position/PricePositionBadge";
import { SourceBadge, deriveBadge } from "@/components/badges/SourceBadge";
import { SourceAttribution } from "@/components/badges/SourceAttribution";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { getListingImageMode, getImageAttribution } from "@/lib/listings/image-policy";
import { getListingObservedPriceComparison } from "@/lib/market/get-market-reference";
import { getListingProximity } from "@/lib/proximity/get-listing-proximity";
import { calculatePackageScore } from "@/lib/package-score/calculate-package-score";
import { track } from "@/lib/tracking/track";
import { buildAkarInfoPassportForListing } from "@/lib/akarinfo/akarinfo-passport";
import type { PackageScoreLabel } from "@/lib/package-score/types";
import type { Listing } from "@/lib/listings/types";

function PackageBadge({ label }: { label: PackageScoreLabel }) {
  const displayLabel: Record<PackageScoreLabel, string> = {
    "Excellent package": "Niveau d'information élevé",
    "Bon package": "Niveau d'information solide",
    "Package correct": "Niveau d'information correct",
    "À analyser": "À analyser",
    "Données insuffisantes": "Données insuffisantes",
  };
  const styles: Record<PackageScoreLabel, string> = {
    "Excellent package": "border-emerald-400/30 bg-emerald-400/15 text-emerald-300",
    "Bon package": "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    "Package correct": "border-amber-300/30 bg-amber-300/10 text-amber-200",
    "À analyser": "border-border/20 dark:border-white/15 bg-surface dark:bg-white/5 text-muted-foreground dark:text-white/55",
    "Données insuffisantes": "border-border/15 dark:border-white/12 bg-surface dark:bg-white/5 text-muted-foreground/80 dark:text-white/40",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles[label]}`}>{displayLabel[label]}</span>;
}

function getReliabilityLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function reliabilityStyle(level: "high" | "medium" | "low") {
  if (level === "high") return { label: "Niveau d'information élevé", cls: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300" };
  if (level === "medium") return { label: "Niveau d'information moyen", cls: "border-amber-300/30 bg-amber-300/12 text-amber-200" };
  return { label: "Doublon possible", cls: "border-rose-400/30 bg-rose-400/12 text-rose-300" };
}

function getTransactionLabel(type: Listing["transaction_type"]) {
  if (type === "rent") return "Location";
  if (type === "new") return "Neuf";
  return "Achat";
}

export function SearchListingCardDark({ listing }: { listing: Listing }) {
  // Guard: suppressed results must never render in SERP
  if (listing.can_show_result === false) return null;
  // Guard: production-blocked results hidden in production (e.g. ToS pending)
  if (process.env.NODE_ENV === "production" && listing.production_allowed === false) return null;

  const { theme } = useTheme();
  const [thumbnailError, setThumbnailError] = useState(false);
  const reliabilityLevel = getReliabilityLevel(listing.reliability_score);
  const rel = reliabilityStyle(reliabilityLevel);
  const showReliability = listing.reliability_available !== false;
  const rawImageMode = getListingImageMode(listing);
  // display_images.policy guard: "no_listing_image" forces fallback even if permission granted.
  const policyBlocked = listing.display_images?.policy === "no_listing_image";
  const imageMode =
    policyBlocked || (rawImageMode === "db_provider_thumbnail" && thumbnailError)
      ? "fallback_visual"
      : rawImageMode;
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
  const isRent = listing.transaction_type === "rent";
  const passport = buildAkarInfoPassportForListing(listing);
  const isLimitedExternalResult =
    listing.source_badge === "external_web_result" && listing.original_source_required === true;
  // Public external rows are admitted only with a safe listing_url.
  const resultHref = isLimitedExternalResult ? listing.listing_url! : `/listings/${listing.id}`;
  const resultTarget = isLimitedExternalResult ? "_blank" : undefined;
  const resultRel = isLimitedExternalResult ? "noopener noreferrer" : undefined;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/15 dark:border-white/10 bg-card dark:bg-white/[0.045] shadow-[0_14px_40px_rgba(2,10,24,0.15)] dark:shadow-[0_14px_40px_rgba(2,10,24,0.4)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-bronze-500/40 hover:shadow-[0_26px_56px_rgba(2,10,24,0.3)] dark:hover:shadow-[0_26px_56px_rgba(2,10,24,0.55)]">
      <Link
        href={resultHref}
        target={resultTarget}
        rel={resultRel}
        onClick={() => track({ event_name: "search_result_click", source_page: "/search", listing_id: listing.id, intent: transactionType, metadata: { city: listing.city } })}
        className="block"
        aria-label={isLimitedExternalResult ? `Voir la source originale ${listing.title}` : `Voir le bien ${listing.title}`}
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
              <Image src={listing.main_image_url!} alt={listing.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 420px" />
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
            <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2 py-1 text-[9px] font-medium text-white/70 backdrop-blur-sm">Visuel illustratif</span>
          ) : attribution ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2 py-1 text-[9px] font-medium text-white/70 backdrop-blur-sm">{attribution}</span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[1.6rem] font-extrabold leading-none tracking-[-0.04em] text-bronze-400">
              {formatPrice(listing.price, listing.currency)}
            </p>
            {listing.price_per_m2 > 0 ? (
              <p className="mt-1 text-[12px] font-bold text-muted-foreground">
                {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²
              </p>
            ) : null}
          </div>
          <FavoriteToggleButton listingId={listing.id} variant="icon" />
        </div>

        <Link href={resultHref} target={resultTarget} rel={resultRel} className="mt-3 block">
          <h2 className="line-clamp-1 text-[1.02rem] font-extrabold leading-snug text-foreground dark:text-white transition group-hover:text-bronze-300">
            {listing.title}
          </h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            <MapPin size={13} strokeWidth={2.2} className="shrink-0 text-bronze-500" aria-hidden="true" />
            <span className="truncate">{listing.neighborhood ? `${listing.city}, ${listing.neighborhood}` : listing.city}</span>
          </p>
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/12 dark:border-white/8 pt-3 text-[13px] font-bold text-foreground/75">
          <span>{formatSurface(listing.surface_m2)}</span>
          {listing.bedrooms > 0 ? <span>{listing.bedrooms} ch.</span> : null}
          {listing.bathrooms > 0 ? <span>{listing.bathrooms} sdb</span> : null}
          <span className="text-foreground/25">·</span>
          <span className="text-muted-foreground">{listing.freshness_label}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {/* V9.5 Source Badge — shown first if source_badge or source_access_level available */}
          {deriveBadge(listing.source_badge, listing.source_access_level) && (
            <SourceBadge
              badge={listing.source_badge}
              sourceAccessLevel={listing.source_access_level}
              variant={theme === "dark" ? "dark" : "light"}
            />
          )}
          {hasPackage ? (
            <PackageBadge label={packageScore.overall_label} />
          ) : (
            <PricePositionBadge listing={listing} variant={theme === "dark" ? "dark" : "light"} />
          )}
          {showReliability ? (
            <span className={`rounded-full border px-2.5 py-1 text-[10.5px] font-bold ${rel.cls}`}>{rel.label}</span>
          ) : null}
          {listing.duplicate_score != null && listing.duplicate_score >= 0.7 ? (
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10.5px] font-bold text-amber-200">Doublon possible</span>
          ) : null}
          {listing.is_mre_friendly ? (
            <span className="rounded-full border border-blue-400/30 bg-blue-400/12 px-2.5 py-1 text-[10.5px] font-bold text-blue-300">MRE-friendly</span>
          ) : null}
        </div>
        {/* V9.5 Source Attribution — compact policy reason line */}
        <SourceAttribution
          sourceAttributionLabel={listing.source_attribution_label}
          displayPolicyReason={listing.display_policy_reason}
          sourceName={listing.source_name}
          variant={theme === "dark" ? "dark" : "light"}
        />

        {/* CTAs — respect allowed_ctas when provided, fall back to default behavior */}
        {(() => {
          const ctas = listing.allowed_ctas;
          const showOriginal = listing.listing_url && (
            !ctas || ctas.includes("view_original") || ctas.includes("view_source")
          );
          const originalLabel = listing.original_source_required
            ? "Voir sur le site original"
            : "Voir la source";
          return (
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {!isLimitedExternalResult ? (
                <Link
                  href={`/listings/${listing.id}`}
                  onClick={() => track({ event_name: "search_result_click", source_page: "/search", listing_id: listing.id, intent: transactionType })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.35)] transition hover:from-bronze-600 group-hover:gap-3"
                >
                  Voir le bien
                  <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
                </Link>
              ) : null}
              {showOriginal ? (
                <a
                  href={listing.listing_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/20 dark:border-white/12 bg-surface dark:bg-white/[0.04] px-4 py-3 text-[12.5px] font-bold text-foreground/70 dark:text-white/70 transition hover:border-border/35 dark:hover:border-white/25 hover:bg-surface/80 dark:hover:bg-white/[0.08] hover:text-foreground dark:hover:text-white"
                >
                  {originalLabel}
                </a>
              ) : null}
            </div>
          );
        })()}

        {/* CTA contextuel : crédit (achat) / alerte (location) */}
        <div className="mt-2 flex items-center gap-2">
          {isRent ? (
            <Link
              href="/louer#alerte"
              onClick={() => track({ event_name: "search_alert_click", source_page: "/search", listing_id: listing.id, intent: "rent", metadata: { city: listing.city } })}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-bronze-500/30 bg-bronze-500/10 px-3 py-2 text-[12px] font-extrabold text-bronze-300 transition hover:bg-bronze-500/20"
            >
              <BellPlus size={13} strokeWidth={2.4} aria-hidden="true" />
              Créer une alerte
            </Link>
          ) : (
            <Link
              href="/acheter#financement"
              onClick={() => track({ event_name: "search_credit_click", source_page: "/search", listing_id: listing.id, intent: "buy", metadata: { city: listing.city, price: listing.price } })}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-bronze-500/30 bg-bronze-500/10 px-3 py-2 text-[12px] font-extrabold text-bronze-300 transition hover:bg-bronze-500/20"
            >
              <Calculator size={13} strokeWidth={2.4} aria-hidden="true" />
              Simuler le crédit
            </Link>
          )}
          <CompareToggleButton listingId={listing.id} className="flex-1 justify-center" />
        </div>

        <AkarInfoPassportCard passport={passport} className="mt-3" />
      </div>
    </article>
  );
}
