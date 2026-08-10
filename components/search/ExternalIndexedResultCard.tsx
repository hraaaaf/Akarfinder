"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { SourceBadge } from "@/components/badges/SourceBadge";
import { ContextualListingArtwork } from "@/components/search/ContextualListingArtwork";
import { deriveGatewayPublicAttribution } from "@/lib/search/public-attribution";
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

  const sanitizedTitle = sanitizeVisibleText(result.title) || "Annonce immobilière";
  const showThumbnail = THUMBNAILS_ENABLED && result.can_show_thumbnail && !!result.thumbnail_url;
  const safeFallbackPropertyType = isListingPropertyType(result.normalized_property_type)
    ? result.normalized_property_type
    : null;
  const publicAttribution = deriveGatewayPublicAttribution(result);
  const [thumbError, setThumbError] = useState(false);
  const showFallback = !showThumbnail || thumbError;
  const facts = [
    result.normalized_surface_m2 != null && result.normalized_surface_m2 > 0
      ? `${Math.round(result.normalized_surface_m2).toLocaleString("fr-MA")} m²`
      : null,
    result.price_per_m2_mad != null && result.price_per_m2_mad > 0
      ? `${Math.round(result.price_per_m2_mad).toLocaleString("fr-MA")} DH/m²`
      : null,
  ].filter((value): value is string => Boolean(value));
  const placeLabel = result.normalized_city || getIntentLabel(result.normalized_intent);

  return (
    <Link
      href={result.original_url}
      target="_blank"
      rel="noopener noreferrer"
      data-mobile-compact-external-card
      data-unified-listing-card
      aria-label={`Voir la source originale ${sanitizedTitle}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[16px] border border-border/12 bg-card shadow-[0_4px_14px_rgba(2,10,24,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-bronze-500/30 hover:shadow-[0_12px_28px_rgba(2,10,24,0.11)] focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze-500/45 dark:border-white/10 dark:bg-white/[0.045]"
    >
      <div className="relative aspect-[4/3] w-full flex-shrink-0 overflow-hidden bg-white">
        {showThumbnail && !thumbError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.thumbnail_url}
            alt={sanitizedTitle}
            loading="lazy"
            decoding="async"
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#03101f]/38 via-transparent to-[#03101f]/30" />

        <div className="absolute left-2 top-2 max-w-[calc(100%-3rem)] sm:left-2.5 sm:top-2.5">
          <span className="block truncate rounded-md bg-deepblue/82 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.07em] text-white backdrop-blur-sm sm:px-2 sm:text-[9.5px]">
            {placeLabel}
          </span>
          <span className="mt-1 hidden text-[8px] font-semibold text-white/95 drop-shadow sm:block">Informations limitées</span>
        </div>
        <ExternalLink size={15} className="absolute right-2 top-2 text-white drop-shadow sm:right-2.5 sm:top-2.5" aria-hidden="true" />

        <span className="absolute bottom-2 left-2 max-w-[72%] truncate rounded-md bg-white/94 px-1.5 py-0.5 text-[8.5px] font-extrabold text-deepblue shadow-sm backdrop-blur sm:bottom-2.5 sm:left-2.5 sm:px-2 sm:py-1 sm:text-[10px]">
          {safeFallbackPropertyType || "Bien immobilier"}
        </span>
        {showFallback ? (
          <span data-contextual-illustration-label className="absolute bottom-2 right-2 rounded-md bg-black/48 px-1.5 py-0.5 text-[7.5px] font-semibold text-white/90 backdrop-blur-sm sm:bottom-2.5 sm:right-2.5 sm:text-[8.5px]">Illustration</span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
        <h3 className="mt-1.5 line-clamp-2 min-h-[2.45em] text-[11.5px] font-extrabold leading-[1.22] text-foreground transition group-hover:text-bronze-700 dark:text-white dark:group-hover:text-bronze-300 sm:mt-0 sm:text-[14px]">
          {sanitizedTitle}
        </h3>

        <p className="mt-1 flex min-w-0 items-center gap-1 text-[9px] font-semibold text-muted-foreground sm:text-[11px]">
          <MapPin size={10} className="shrink-0 text-bronze-500 sm:h-3 sm:w-3" aria-hidden="true" />
          <span className="truncate">{result.normalized_city || "Localisation non précisée"}</span>
        </p>

        <div className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[8.5px] font-bold text-foreground/60 dark:text-white/60 sm:mt-2 sm:gap-x-2 sm:text-[10.5px]">
          {facts.length > 0 ? facts.slice(0, 2).map((fact) => <span key={fact} className="shrink-0">{fact}</span>) : <span>Informations à compléter</span>}
        </div>

        <p data-mobile-price className="mt-2 whitespace-normal break-words text-[12px] font-black leading-[1.05] tracking-[-0.035em] text-deepblue dark:text-white sm:mt-2.5 sm:text-[17px] sm:leading-none">
          {formatIndexedPrice(result.normalized_price_mad)}
        </p>

        <div className="mt-2 flex min-w-0 items-center justify-between gap-1.5 border-t border-border/10 pt-1.5 text-[7.5px] dark:border-white/8 sm:mt-2.5 sm:pt-2 sm:text-[9px]">
          <span data-public-attribution-type className="min-w-0 truncate font-semibold text-muted-foreground">{publicAttribution.typeLabel}</span>
          <span data-public-attribution-source className="max-w-[55%] truncate font-semibold text-muted-foreground">{publicAttribution.sourceLabel}</span>
        </div>

        <span className="sr-only">{publicAttribution.primaryCtaLabel ?? "Voir la source originale"}</span>
        {publicAttribution.badge ? <div className="mt-1 hidden sm:block"><SourceBadge badge={publicAttribution.badge} variant="dark" /></div> : null}

        {similarResults?.similar_possible ? (
          <p className="mt-1 text-[7.5px] font-semibold text-amber-800 dark:text-amber-100 sm:text-[9px]">Résultats proches · Comparez les sources</p>
        ) : null}
      </div>
    </Link>
  );
}
