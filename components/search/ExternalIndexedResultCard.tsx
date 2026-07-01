"use client";

// SEARCH-GATEWAY-MULTISOURCE-SERP-UI-INTEGRATION-1
// Thin card for external indexed results from Search Gateway
// Always redirects to original source, no internal details

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SourceBadge } from "@/components/badges/SourceBadge";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

type ExternalIndexedResultCardProps = {
  result: SearchGatewayNormalizedResult;
};

export function ExternalIndexedResultCard({
  result,
}: ExternalIndexedResultCardProps) {
  // Guard: suppressed results must never render
  if (!result.can_show_result) return null;

  return (
    <Link
      href={result.original_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-2xl border border-border/15 dark:border-white/10 bg-card dark:bg-white/[0.04] transition-all hover:border-border/30 dark:hover:border-white/20 hover:shadow-lg dark:hover:shadow-black/30"
    >
      <div className="flex flex-col h-full p-4 sm:p-5">
        {/* Header: Source Badge + Source Name */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-muted-foreground dark:text-white/50 uppercase tracking-wider">
            {result.source_name}
          </span>
          {result.source_badge && (
            <SourceBadge badge={result.source_badge} variant="dark" />
          )}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-[15px] sm:text-base font-semibold text-foreground dark:text-white/90 line-clamp-2 group-hover:text-[#0B63CE] dark:group-hover:text-blue-400 transition">
          {result.title}
        </h3>

        {/* Snippet */}
        {result.snippet && (
          <p className="mb-3 text-[13px] text-muted-foreground dark:text-white/60 line-clamp-2">
            {result.snippet}
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
          {result.display_url}
        </p>
      </div>
    </Link>
  );
}
