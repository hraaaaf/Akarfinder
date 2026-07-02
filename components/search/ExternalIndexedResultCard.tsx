"use client";

// SEARCH-GATEWAY-MULTISOURCE-SERP-UI-INTEGRATION-1
// Thin card for external indexed results from Search Gateway
// Always redirects to original source, no internal details

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SourceBadge } from "@/components/badges/SourceBadge";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

const THUMBNAILS_ENABLED =
  process.env.NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED === "true";

type ExternalIndexedResultCardProps = {
  result: SearchGatewayNormalizedResult;
};

const CONTACT_PATTERNS = [
  /wa\.me/gi,
  /api\.whatsapp/gi,
  /whatsapp/gi,
  /tel:/gi,
];

function sanitizeVisibleText(value: string | null | undefined) {
  if (!value) return value;

  return CONTACT_PATTERNS.reduce((accumulator, pattern) => accumulator.replace(pattern, ""), value).replace(/\s{2,}/g, " ").trim();
}

export function ExternalIndexedResultCard({
  result,
}: ExternalIndexedResultCardProps) {
  // Guard: suppressed results must never render
  if (!result.can_show_result) return null;

  const sanitizedTitle = sanitizeVisibleText(result.title);
  const sanitizedSnippet = sanitizeVisibleText(result.snippet);
  const sanitizedDisplayUrl = sanitizeVisibleText(result.display_url);

  const showThumbnail =
    THUMBNAILS_ENABLED &&
    result.can_show_thumbnail &&
    !!result.thumbnail_url;

  const [thumbError, setThumbError] = useState(false);

  return (
    <Link
      href={result.original_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/15 dark:border-white/10 bg-card dark:bg-white/[0.04] transition-all hover:border-border/30 dark:hover:border-white/20 hover:shadow-lg dark:hover:shadow-black/30"
    >
      {/* Thumbnail — remote URL only, never downloaded/proxied */}
      {showThumbnail && !thumbError && (
        <div className="relative h-[120px] sm:h-[130px] w-full overflow-hidden bg-muted/30 dark:bg-white/[0.03] flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.thumbnail_url}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setThumbError(true)}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
          {/* "Résultat web" overlay chip */}
          <span className="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
            Résultat web
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-4 sm:p-5">
        {/* Header: Source Name + "Résultat web" chip (when no thumbnail) + Badge */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground dark:text-white/50 uppercase tracking-wider truncate">
              {result.source_name}
            </span>
            {/* Always show "Résultat web" chip — clearly marks external origin */}
            {(!showThumbnail || thumbError) && (
              <span className="flex-shrink-0 inline-flex items-center rounded-full border border-border/20 dark:border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-white/40">
                Résultat web
              </span>
            )}
          </div>
          {result.source_badge && (
            <SourceBadge badge={result.source_badge} variant="dark" />
          )}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-[15px] sm:text-base font-semibold text-foreground dark:text-white/90 line-clamp-2 group-hover:text-[#0B63CE] dark:group-hover:text-blue-400 transition">
          {sanitizedTitle}
        </h3>

        {/* Snippet */}
        {sanitizedSnippet && (
          <p className="mb-3 text-[13px] text-muted-foreground dark:text-white/60 line-clamp-2">
            {sanitizedSnippet}
          </p>
        )}

        {/* Footer: Attribution + CTA */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-border/10 dark:border-white/5">
          <span className="text-[10px] text-muted-foreground dark:text-white/40">
            {result.result_attribution_label}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B63CE] dark:text-blue-400 group-hover:gap-2 transition-all">
            {result.primary_cta_label}
            <ArrowRight size={12} />
          </span>
        </div>

        {/* Display URL (subtle) */}
        <p className="mt-2 text-[10px] text-muted-foreground/60 dark:text-white/30 truncate">
          {sanitizedDisplayUrl}
        </p>
      </div>
    </Link>
  );
}
