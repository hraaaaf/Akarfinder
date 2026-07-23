"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AkarInfoPassportCard } from "@/components/akarinfo/AkarInfoPassportCard";
import { SourceBadge } from "@/components/badges/SourceBadge";
import { buildAkarInfoPassportForGatewayResult } from "@/lib/akarinfo/akarinfo-passport";
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
  const [thumbError, setThumbError] = useState(false);

  return (
    <Link
      href={result.original_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/15 bg-card transition-all hover:border-border/30 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:shadow-black/30"
    >
      {showThumbnail && !thumbError ? (
        <div className="relative h-[120px] w-full flex-shrink-0 overflow-hidden bg-muted/30 dark:bg-white/[0.03] sm:h-[130px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.thumbnail_url}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setThumbError(true)}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/95 backdrop-blur-sm">
            Offre observée
          </span>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-white/50">
              {result.source_name}
            </span>
            {!showThumbnail || thumbError ? (
              <span className="inline-flex flex-shrink-0 items-center rounded-full border border-border/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/10 dark:text-white/50">
                Offre observée
              </span>
            ) : null}
            <span className="inline-flex flex-shrink-0 items-center rounded-full border border-slate-400/20 bg-slate-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:text-white/55">
              Aperçu limité
            </span>
          </div>
          {result.source_badge ? <SourceBadge badge={result.source_badge} variant="dark" /> : null}
        </div>

        <h3 className="mb-2 line-clamp-2 text-[15px] font-semibold text-foreground transition group-hover:text-[#0B63CE] dark:text-white/90 dark:group-hover:text-blue-400 sm:text-base">
          {sanitizedTitle}
        </h3>

        {sanitizedSnippet ? (
          <p className="mb-3 line-clamp-2 text-[13px] text-muted-foreground dark:text-white/60">{sanitizedSnippet}</p>
        ) : null}

        {similarResults?.similar_possible ? (
          <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-400/25 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-100">
                {similarResults.similar_public_label}
              </span>
              {typeof similarResults.similar_count === "number" ? (
                <span className="text-[10px] font-semibold text-amber-800/80 dark:text-amber-100/80">
                  {similarResults.similar_count} résultat{similarResults.similar_count > 1 ? "s" : ""} proche{similarResults.similar_count > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-foreground/75 dark:text-white/70">
              Ces offres peuvent se ressembler sans être nécessairement le même bien. Comparez les sources originales.
            </p>
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/10 pt-3 dark:border-white/5">
          <span className="text-[10px] text-muted-foreground dark:text-white/40">{result.result_attribution_label}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B63CE] transition-all group-hover:gap-2 dark:text-blue-400">
            {result.primary_cta_label}<ArrowRight size={12} aria-hidden="true" />
          </span>
        </div>

        <p className="mt-2 truncate text-[10px] text-muted-foreground/60 dark:text-white/30">{sanitizedDisplayUrl}</p>
        <AkarInfoPassportCard passport={passport} className="mt-3" />
      </div>
    </Link>
  );
}
