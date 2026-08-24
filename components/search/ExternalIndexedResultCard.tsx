"use client";

import { useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
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

function getIntentLabel(intent?: string) {
  if (intent === "rent" || intent === "location") return "Location";
  if (intent === "new" || intent === "neuf") return "Neuf";
  if (intent === "buy" || intent === "sale" || intent === "achat") return "Achat";
  return "Annonce indexée";
}

function formatTrustedPrice(price?: number | null) {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  return `${Math.round(price).toLocaleString("fr-MA")} DH`;
}

export function ExternalIndexedResultCard({ result, similarResults }: ExternalIndexedResultCardProps) {
  if (!result.can_show_result) return null;

  const sanitizedTitle = sanitizeVisibleText(result.title) || "Annonce immobilière";
  const publicAttribution = deriveGatewayPublicAttribution(result);
  const safePropertyType = isListingPropertyType(result.normalized_property_type)
    ? result.normalized_property_type
    : null;
  const trustedPrice = formatTrustedPrice(result.normalized_price_mad);
  const showThumbnail = THUMBNAILS_ENABLED && result.can_show_thumbnail && !!result.thumbnail_url;
  const [thumbError, setThumbError] = useState(false);
  const facts = [
    result.normalized_city || null,
    safePropertyType,
    result.normalized_surface_m2 != null && result.normalized_surface_m2 > 0
      ? `${Math.round(result.normalized_surface_m2).toLocaleString("fr-MA")} m²`
      : null,
    trustedPrice,
  ].filter((value): value is string => Boolean(value));

  return (
    <a
      href={result.original_url}
      data-external-serp-row
      data-mobile-compact-external-card
      data-unified-listing-card
      className="group block border-b border-border/12 px-1 py-3.5 transition-colors hover:bg-surface/70 dark:border-white/8 dark:hover:bg-white/[0.035] sm:px-2 sm:py-4"
    >
      <div className="flex min-w-0 gap-3 sm:gap-4">
        {showThumbnail && !thumbError ? (
          <div data-card-image className="h-[72px] w-[96px] shrink-0 overflow-hidden rounded-xl bg-surface sm:h-[86px] sm:w-[116px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.thumbnail_url}
              alt=""
              loading="lazy"
              decoding="async"
              data-visual-inventory-class="authorized_or_listing_image"
              onError={() => setThumbError(true)}
              className="h-full w-full object-cover object-center"
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div data-card-provenance className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-bold text-muted-foreground sm:text-[11.5px]">
            <span data-public-attribution-source className="truncate text-bronze-700 dark:text-bronze-300">
              {publicAttribution.sourceLabel || result.domain}
            </span>
            <span aria-hidden="true">·</span>
            <span data-public-attribution-type className="shrink-0">{publicAttribution.typeLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{getIntentLabel(result.normalized_intent)}</span>
          </div>

          <h3
            data-card-title
            className="mt-1 line-clamp-2 text-[14px] font-extrabold leading-[1.28] tracking-[-0.01em] text-foreground transition-colors group-hover:text-bronze-700 dark:text-white dark:group-hover:text-bronze-300 sm:text-[15.5px]"
          >
            {sanitizedTitle}
          </h3>

          <div data-card-facts className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-semibold text-muted-foreground sm:text-[11.5px]">
            {facts.length > 0 ? (
              facts.map((fact, index) => (
                <span key={`${fact}-${index}`} className="inline-flex min-w-0 items-center gap-1">
                  {index === 0 && result.normalized_city ? <MapPin size={11} className="shrink-0 text-bronze-500" aria-hidden="true" /> : null}
                  <span className="truncate">{fact}</span>
                </span>
              ))
            ) : (
              <span>Informations minimales indexées</span>
            )}
          </div>

          {similarResults?.similar_possible ? (
            <p data-card-trust-note className="mt-1.5 text-[10px] font-semibold text-amber-800 dark:text-amber-100 sm:text-[11px]">
              Résultat proche d’une autre source · vérifiez l’annonce originale.
            </p>
          ) : null}
        </div>

        <div data-card-action data-public-attribution-cta className="hidden shrink-0 self-center items-center gap-1.5 text-[11px] font-extrabold text-bronze-700 dark:text-bronze-300 sm:flex">
          <span>{publicAttribution.primaryCtaLabel ?? "Voir la source"}</span>
          <ExternalLink size={13} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 sm:hidden">
        <span data-card-provenance-detail className="truncate text-[9.5px] font-semibold text-muted-foreground">{result.domain}</span>
        <span data-public-attribution-cta className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-extrabold text-bronze-700 dark:text-bronze-300">
          {publicAttribution.primaryCtaLabel ?? "Voir la source"}
          <ExternalLink size={12} aria-hidden="true" />
        </span>
      </div>
    </a>
  );
}
