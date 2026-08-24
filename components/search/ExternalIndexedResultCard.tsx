"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import { SourceBadge } from "@/components/badges/SourceBadge";
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
  return "Immobilier";
}

function cleanDomain(domain: string) {
  return domain.replace(/^www\./i, "");
}

export function ExternalIndexedResultCard({ result, similarResults }: ExternalIndexedResultCardProps) {
  if (!result.can_show_result) return null;

  const sanitizedTitle = sanitizeVisibleText(result.title) || "Annonce immobilière";
  const safePropertyType = isListingPropertyType(result.normalized_property_type)
    ? result.normalized_property_type
    : null;
  const sourceHost = cleanDomain(result.domain || result.source_name || "source");
  const publicAttribution = deriveGatewayPublicAttribution(result);
  const isMinimalIndex = result.display_eligibility_reason === "external_minimal_index"
    || result.quality_tier === "Q0_link_only";
  const showThumbnail = !isMinimalIndex
    && THUMBNAILS_ENABLED
    && result.can_show_thumbnail
    && Boolean(result.thumbnail_url);
  const trustedPrice = !isMinimalIndex
    && result.normalized_price_mad != null
    && Number.isFinite(result.normalized_price_mad)
    && result.normalized_price_mad > 0
      ? result.normalized_price_mad
      : null;

  return (
    <Link
      href={result.original_url}
      data-external-serp-row
      data-external-minimal-index={isMinimalIndex ? "true" : "false"}
      className="group block min-w-0 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.045)] transition hover:border-blue-300 hover:shadow-[0_7px_22px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] sm:px-4 sm:py-3.5"
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        {showThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.thumbnail_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-[72px] w-[88px] shrink-0 rounded-xl object-cover sm:h-[82px] sm:w-[108px]"
          />
        ) : (
          <div
            data-external-source-mark
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-400/15 dark:bg-blue-400/10 dark:text-blue-200 sm:h-12 sm:w-12"
            aria-hidden="true"
          >
            <Building2 size={20} strokeWidth={1.9} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-white/45 sm:text-[10.5px]">
            <span className="shrink-0 text-blue-700 dark:text-blue-300">{sourceHost}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">Index web</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden truncate sm:inline">{getIntentLabel(result.normalized_intent)}</span>
          </div>

          <div className="mt-1 flex min-w-0 items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 text-[14.5px] font-extrabold leading-[1.28] tracking-[-0.015em] text-slate-950 transition group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300 sm:text-[16px]">
              {sanitizedTitle}
            </h3>
            {trustedPrice != null ? (
              <span className="hidden shrink-0 text-[15px] font-extrabold text-slate-950 dark:text-white sm:inline">
                {Math.round(trustedPrice).toLocaleString("fr-MA")} DH
              </span>
            ) : null}
          </div>

          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-semibold text-slate-500 dark:text-white/50 sm:text-[12px]">
            {result.normalized_city ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin size={12} className="shrink-0 text-blue-600" aria-hidden="true" />
                <span className="truncate">{result.normalized_city}</span>
              </span>
            ) : null}
            {safePropertyType ? <span>· {safePropertyType}</span> : null}
            {result.normalized_intent ? <span>· {getIntentLabel(result.normalized_intent)}</span> : null}
          </div>

          <div className="mt-2.5 flex min-w-0 items-center justify-between gap-3 border-t border-slate-100 pt-2 dark:border-white/8">
            <div className="flex min-w-0 items-center gap-2">
              {publicAttribution.badge ? <SourceBadge badge={publicAttribution.badge} variant="dark" /> : null}
              {similarResults?.similar_possible ? (
                <span className="truncate text-[10px] font-semibold text-amber-700 dark:text-amber-200">Doublon possible</span>
              ) : (
                <span className="truncate text-[10px] font-semibold text-slate-400 dark:text-white/35">Lien vers la source originale</span>
              )}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-blue-700 dark:text-blue-300 sm:text-[12px]">
              Voir sur {sourceHost}
              <ArrowUpRight size={13} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
