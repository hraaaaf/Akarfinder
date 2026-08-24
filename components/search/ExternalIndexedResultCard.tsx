"use client";

import { ExternalLink } from "lucide-react";
import { SourceBadge } from "@/components/badges/SourceBadge";
import { buildExternalResultPresentation } from "@/lib/search/external-result-presentation";
import { deriveGatewayPublicAttribution } from "@/lib/search/public-attribution";
import type { PublicResultSimilaritySummary } from "@/lib/public-result-similarity/types";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

type ExternalIndexedResultCardProps = {
  result: SearchGatewayNormalizedResult;
  similarResults?: PublicResultSimilaritySummary;
};

function formatPrice(value: number) {
  return `${Math.round(value).toLocaleString("fr-MA")} DH`;
}

export function ExternalIndexedResultCard({ result, similarResults }: ExternalIndexedResultCardProps) {
  if (!result.can_show_result) return null;

  const presentation = buildExternalResultPresentation(result);
  const publicAttribution = deriveGatewayPublicAttribution(result);
  const metadata = [presentation.city, presentation.propertyType, presentation.intentLabel].filter(
    (value): value is string => Boolean(value),
  );
  const richFacts = presentation.isMinimal
    ? []
    : [
        presentation.priceMad != null ? formatPrice(presentation.priceMad) : null,
        presentation.surfaceM2 != null ? `${Math.round(presentation.surfaceM2).toLocaleString("fr-MA")} m²` : null,
        presentation.pricePerM2Mad != null
          ? `${Math.round(presentation.pricePerM2Mad).toLocaleString("fr-MA")} DH/m²`
          : null,
      ].filter((value): value is string => Boolean(value));

  return (
    <a
      href={result.original_url}
      data-external-serp-row
      data-external-result-mode={presentation.isMinimal ? "minimal" : "rich"}
      className="group block min-w-0 px-3.5 py-2.5 transition hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bronze-500/60 dark:hover:bg-white/[0.035] sm:px-4 sm:py-3"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p data-external-source-host className="min-w-0 truncate text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 sm:text-[12px]">
          {presentation.sourceHost}
        </p>
        {publicAttribution.badge ? <SourceBadge badge={publicAttribution.badge} variant="dark" /> : null}
      </div>

      <h3
        data-external-result-title
        className="mt-1 line-clamp-1 text-[14px] font-extrabold leading-[1.3] tracking-[-0.01em] text-deepblue transition group-hover:text-bronze-700 dark:text-white dark:group-hover:text-bronze-300 sm:text-[15px]"
      >
        {presentation.title}
      </h3>

      {metadata.length > 0 ? (
        <div data-external-result-metadata className="mt-1 flex min-w-0 flex-nowrap items-center gap-x-1.5 overflow-hidden text-[10.5px] font-bold text-foreground/60 dark:text-white/60 sm:text-[11px]">
          {metadata.map((item, index) => (
            <span key={`${item}-${index}`} className="inline-flex min-w-0 shrink items-center gap-1.5 whitespace-nowrap">
              {index > 0 ? <span aria-hidden="true" className="text-foreground/25 dark:text-white/25">·</span> : null}
              <span className="truncate">{item}</span>
            </span>
          ))}
        </div>
      ) : null}

      {presentation.isMinimal ? (
        <p data-external-minimal-disclaimer className="mt-1 truncate text-[10.5px] leading-[17px] text-muted-foreground sm:text-[11px]">
          Prix, photos et détails à vérifier sur la source.
        </p>
      ) : presentation.snippet ? (
        <p className="mt-1 line-clamp-1 max-w-3xl text-[11px] leading-[17px] text-muted-foreground sm:text-[12px]">
          {presentation.snippet}
        </p>
      ) : null}

      {richFacts.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-extrabold text-foreground/75 dark:text-white/75 sm:text-[12px]">
          {richFacts.map((fact) => <span key={fact}>{fact}</span>)}
        </div>
      ) : null}

      {similarResults?.similar_possible ? (
        <p className="mt-1 truncate text-[10px] font-semibold text-amber-800 dark:text-amber-100">
          Doublon possible avec une autre source.
        </p>
      ) : null}

      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[10px] font-semibold text-muted-foreground">
          {presentation.displayUrl || publicAttribution.sourceLabel}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-bronze-700 dark:text-bronze-300">
          Ouvrir la source <ExternalLink size={12} aria-hidden="true" />
        </span>
      </div>
    </a>
  );
}
