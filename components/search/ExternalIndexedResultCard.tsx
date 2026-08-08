"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AkarInfoPassportCard } from "@/components/akarinfo/AkarInfoPassportCard";
import { SourceBadge } from "@/components/badges/SourceBadge";
import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
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

export function ExternalIndexedResultCard({ result, similarResults }: ExternalIndexedResultCardProps) {
  if (!result.can_show_result) return null;
  const passport = buildAkarInfoPassportForGatewayResult(result, similarResults);
  const sanitizedTitle = sanitizeVisibleText(result.title);
  const sanitizedSnippet = sanitizeVisibleText(result.snippet);
  const sanitizedDisplayUrl = sanitizeVisibleText(result.display_url);
  const showThumbnail = THUMBNAILS_ENABLED && result.can_show_thumbnail && !!result.thumbnail_url;
  const safeFallbackPropertyType = isListingPropertyType(result.normalized_property_type)
    ? result.normalized_property_type
    : null;
  const [thumbError, setThumbError] = useState(false);
  const showFallback = (!showThumbnail || thumbError) && safeFallbackPropertyType !== null;

  return (
    <Link
      href={result.original_url}
      target="_blank"
      rel="noopener noreferrer"
      data-mobile-compact-external-card
      className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-border/10 bg-card shadow-[0_5px_16px_rgba(2,10,24,0.08)] transition-all hover:border-border/30 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 sm:rounded-2xl sm:border-border/15 sm:shadow-none sm:hover:shadow-lg dark:sm:hover:shadow-black/30"
    >
      {showThumbnail && !thumbError ? (
        <div className="relative h-[164px] w-full flex-shrink-0 overflow-hidden bg-muted/30 dark:bg-white/[0.03] sm:h-[130px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.thumbnail_url}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setThumbError(true)}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-black/65 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-white/95 backdrop-blur-sm sm:text-[9px]">
            Source externe
          </span>
        </div>
      ) : showFallback ? (
        <div className="relative h-[164px] w-full flex-shrink-0 overflow-hidden bg-white sm:h-[130px]">
          <PropertyTypeArtwork kind={safeFallbackPropertyType} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" />
          <span className="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-black/65 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-white/95 backdrop-blur-sm sm:text-[9px]">
            Visuel illustratif
          </span>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="truncate text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground dark:text-white/50 sm:text-[10px]">
              {result.source_name}
            </span>
            {!showThumbnail && !showFallback || thumbError && !showFallback ? (
              <span className="inline-flex flex-shrink-0 items-center rounded-full border border-border/20 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/10 dark:text-white/50 sm:text-[9px]">
                Source externe
              </span>
            ) : null}
            <span className="hidden flex-shrink-0 items-center rounded-full border border-slate-400/20 bg-slate-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:text-white/55 sm:inline-flex">
              Informations limitées
            </span>
          </div>
          <div className="hidden sm:block">
            {result.source_badge ? <SourceBadge badge={result.source_badge} variant="dark" /> : null}
          </div>
        </div>

        <h3 className="mb-1 line-clamp-2 text-[12.5px] font-extrabold leading-snug text-foreground transition group-hover:text-bronze-600 dark:text-white/90 dark:group-hover:text-bronze-300 sm:mb-2 sm:text-base sm:font-semibold sm:group-hover:text-[#0B63CE] dark:sm:group-hover:text-blue-400">
          {sanitizedTitle}
        </h3>

        {sanitizedSnippet ? (
          <p className="mb-3 hidden line-clamp-2 text-[13px] text-muted-foreground dark:text-white/60 sm:block">{sanitizedSnippet}</p>
        ) : null}

        {similarResults?.similar_possible ? (
          <div className="mb-2 text-[9px] font-semibold text-amber-800 dark:text-amber-100 sm:mb-3 sm:rounded-xl sm:border sm:border-amber-400/20 sm:bg-amber-500/10 sm:px-3 sm:py-2.5 sm:text-[11px]">
            <span className="font-extrabold">Résultats proches</span>
            <span className="hidden sm:inline"> · Ils peuvent correspondre au même bien, sans certitude. Comparez les sources pour confirmer.</span>
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/10 pt-2 dark:border-white/5 sm:pt-3">
          <span className="truncate text-[8.5px] text-muted-foreground dark:text-white/40 sm:text-[10px]">{result.result_attribution_label}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[9.5px] font-extrabold text-bronze-700 transition-all group-hover:gap-2 dark:text-bronze-300 sm:text-[11px] sm:text-[#0B63CE] dark:sm:text-blue-400">
            {result.primary_cta_label}<ArrowRight size={11} aria-hidden="true" className="sm:h-3 sm:w-3" />
          </span>
        </div>

        <p className="mt-1.5 hidden truncate text-[10px] text-muted-foreground/60 dark:text-white/30 sm:block">{sanitizedDisplayUrl}</p>
        <div className="hidden sm:block">
          <AkarInfoPassportCard passport={passport} className="mt-3" />
        </div>
      </div>
    </Link>
  );
}
