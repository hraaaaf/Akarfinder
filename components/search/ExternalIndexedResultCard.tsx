"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { AkarInfoPassportCard } from "@/components/akarinfo/AkarInfoPassportCard";
import { SourceBadge } from "@/components/badges/SourceBadge";
import { deriveGatewayPublicAttribution } from "@/lib/search/public-attribution";
import { ContextualListingArtwork } from "@/components/search/ContextualListingArtwork";
import { buildAkarInfoPassportForGatewayResult } from "@/lib/akarinfo/akarinfo-passport";
import { isListingPropertyType } from "@/lib/property-types/presentation";
import type { PublicResultSimilaritySummary } from "@/lib/public-result-similarity/types";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

const THUMBNAILS_ENABLED = process.env.NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED === "true";

type ExternalIndexedResultCardProps = {
  result: SearchGatewayNormalizedResult;
  similarResults?: PublicResultSimilaritySummary;
};

const CONTACT_PATTERNS = [/wa\.me/gi, /api\.whatsapp/gi, /whatsapp/gi, /tel:/gi];

function sanitizeVisibleText(value: string | null | undefined) {
  if (!value) return value;
  return CONTACT_PATTERNS.reduce((accumulator, pattern) => accumulator.replace(pattern, ""), value)
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatIndexedPrice(price?: number) {
  if (price == null || !Number.isFinite(price) || price <= 0) return "Prix non communiqué";
  return `${Math.round(price).toLocaleString("fr-MA")} DH`;
}

function getIntentLabel(intent?: string) {
  if (intent === "rent" || intent === "location") return "Location";
  if (intent === "new" || intent === "neuf") return "Neuf";
  if (intent === "buy" || intent === "sale" || intent === "achat") return "Achat";
  return "Annonce indexée";
}

export function ExternalIndexedResultCard({ result, similarResults }: ExternalIndexedResultCardProps) {
  if (!result.can_show_result) return null;
  const passport = buildAkarInfoPassportForGatewayResult(result, similarResults);
  const sanitizedTitle = sanitizeVisibleText(result.title) || "Annonce immobilière";
  const sanitizedDisplayUrl = sanitizeVisibleText(result.display_url);
  const showThumbnail = THUMBNAILS_ENABLED && result.can_show_thumbnail && !!result.thumbnail_url;
  const hasPrice = result.normalized_price_mad != null && Number.isFinite(result.normalized_price_mad) && result.normalized_price_mad > 0;
  const safeFallbackPropertyType = isListingPropertyType(result.normalized_property_type)
    ? result.normalized_property_type
    : null;
  const publicAttribution = deriveGatewayPublicAttribution(result);
  const [thumbError, setThumbError] = useState(false);
  const showFallback = !showThumbnail || thumbError;
  const facts = [
    safeFallbackPropertyType,
    result.normalized_surface_m2 != null && result.normalized_surface_m2 > 0
      ? `${Math.round(result.normalized_surface_m2).toLocaleString("fr-MA")} m²`
      : null,
    result.price_per_m2_mad != null && result.price_per_m2_mad > 0
      ? `${Math.round(result.price_per_m2_mad).toLocaleString("fr-MA")} DH/m²`
      : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <Link
      href={result.original_url}
      data-mobile-compact-external-card
      data-unified-listing-card
      className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-border/10 bg-card shadow-[0_5px_16px_rgba(2,10,24,0.08)] transition duration-300 hover:border-bronze-500/35 sm:rounded-2xl sm:border-border/15 sm:shadow-[0_12px_34px_rgba(2,10,24,0.12)] sm:hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.045]"
    >
      <div data-card-image className="relative h-[164px] w-full flex-shrink-0 overflow-hidden bg-white sm:h-[196px]">
        {showThumbnail && !thumbError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.thumbnail_url}
            alt={sanitizedTitle}
            loading="lazy"
            decoding="async"
            data-visual-inventory-class="authorized_or_listing_image"
            onError={() => setThumbError(true)}
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.025]"
          />
        ) : (
          <ContextualListingArtwork
            stableRepresentationKey={result.original_url}
            city={result.normalized_city}
            propertyType={safeFallbackPropertyType}
            className="transition duration-500 group-hover:scale-[1.025]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/58 via-transparent to-transparent sm:from-[#03101f]/78" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 sm:left-3 sm:top-3 sm:gap-2">
          <span className="rounded-full bg-deepblue/88 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.05em] text-white ring-1 ring-white/15 backdrop-blur sm:px-2.5 sm:py-1 sm:text-[10.5px]">
            {getIntentLabel(result.normalized_intent)}
          </span>
          <span className="hidden rounded-full border border-slate-400/25 bg-slate-500/10 px-2.5 py-1 text-[10.5px] font-extrabold text-white/80 backdrop-blur sm:inline-flex">
            Informations limitées
          </span>
        </div>
        <span className="absolute bottom-2 left-2 rounded-full bg-white/92 px-2 py-0.5 text-[9px] font-extrabold text-deepblue shadow-sm backdrop-blur sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
          {safeFallbackPropertyType || "Bien immobilier"}
        </span>
        {showFallback ? (
          <span
            data-contextual-illustration-label
            className="absolute bottom-2 right-2 rounded-full bg-black/52 px-1.5 py-0.5 text-[8px] font-medium text-white/90 backdrop-blur-sm sm:bottom-3 sm:right-3 sm:px-2 sm:py-1 sm:text-[9px]"
          >
            Illustration
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p
          data-mobile-price
          data-card-price
          className={hasPrice
            ? "truncate text-[1.04rem] font-extrabold leading-tight tracking-[-0.025em] text-deepblue dark:text-white sm:text-[1.55rem] sm:leading-none sm:tracking-[-0.035em] sm:text-bronze-500 dark:sm:text-bronze-300"
            : "min-h-[2.05em] whitespace-normal text-[0.92rem] font-extrabold leading-[1.05] tracking-[-0.02em] text-deepblue dark:text-white sm:min-h-0 sm:whitespace-nowrap sm:text-[1.25rem] sm:leading-none sm:text-bronze-500 dark:sm:text-bronze-300"}
        >
          {formatIndexedPrice(result.normalized_price_mad)}
        </p>
        {result.price_per_m2_mad != null && result.price_per_m2_mad > 0 ? (
          <p className="mt-1 hidden text-[12px] font-bold text-muted-foreground sm:block">
            {Math.round(result.price_per_m2_mad).toLocaleString("fr-MA")} DH/m²
          </p>
        ) : null}

        <h3 data-card-title className="mt-1.5 line-clamp-2 text-[12.5px] font-extrabold leading-snug text-foreground transition group-hover:text-bronze-600 dark:text-white sm:mt-2.5 sm:line-clamp-2 sm:text-[1.02rem] dark:group-hover:text-bronze-300">
          {sanitizedTitle}
        </h3>

        <p data-card-location className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground sm:mt-1.5 sm:gap-1.5 sm:text-[13px]">
          <MapPin size={11} className="shrink-0 text-bronze-500 sm:h-[13px] sm:w-[13px]" aria-hidden="true" />
          <span className="truncate">{result.normalized_city || "Localisation non précisée"}</span>
        </p>

        <div data-card-facts className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[10px] font-bold text-foreground/65 dark:text-white/65 sm:mt-2.5 sm:flex-wrap sm:gap-x-3 sm:gap-y-1.5 sm:text-[12px]">
          {facts.length > 0 ? facts.slice(0, 3).map((fact) => <span key={fact}>{fact}</span>) : <span>Informations à compléter</span>}
        </div>


        <div data-card-provenance className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9.5px] dark:border-white/8 sm:mt-2.5 sm:gap-3 sm:border-border/12 sm:pt-3 sm:text-[11px]">
          <span data-public-attribution-type className="truncate font-semibold text-muted-foreground">{publicAttribution.typeLabel}</span>
          <span data-public-attribution-source className="truncate font-semibold text-muted-foreground">{publicAttribution.sourceLabel}</span>
        </div>

        {similarResults?.similar_possible ? (
          <p data-card-trust-note className="mt-1.5 text-[9px] font-semibold text-amber-800 dark:text-amber-100 sm:mt-2 sm:text-[11px]">
            Résultats proches · doublon possible. Comparez les sources pour confirmer.
          </p>
        ) : null}
        <div data-card-provenance-detail className="mt-2 hidden items-center justify-between gap-2 sm:flex">
          <span className="min-w-0 truncate text-[10px] text-muted-foreground/60 dark:text-white/30">{sanitizedDisplayUrl}</span>
          {publicAttribution.badge ? <SourceBadge badge={publicAttribution.badge} variant="dark" /> : null}
        </div>
        <div data-card-provenance-detail className="hidden sm:block">
          <AkarInfoPassportCard passport={passport} variant="serp" className="mt-2" />
        </div>

        <div data-card-action className="mt-2.5 flex items-center justify-between gap-2 sm:mt-3 sm:rounded-xl sm:border sm:border-border/15 sm:bg-surface/70 sm:px-3 sm:py-2.5 dark:sm:border-white/10 dark:sm:bg-white/[0.04]">
          <span className="min-w-0 truncate text-[9.5px] font-extrabold text-bronze-700 dark:text-bronze-300 sm:text-[12px]">
            {publicAttribution.primaryCtaLabel ?? "Voir la source originale"}
          </span>
          <ArrowRight size={13} aria-hidden="true" className="shrink-0" />
        </div>
      </div>
    </Link>
  );
}
