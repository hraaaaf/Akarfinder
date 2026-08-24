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
      className="group block min-w-0 rounded-2xl border border-border/15 bg-card px-4 py-4 shadow-[0_4px_14px_rgba(2,10,24,0.05)] transition hover:border-bronze-500/35 hover:shadow-[0_8px_24px_rgba(2,10,24,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze-500/60 dark:border-white/10 dark:bg-white/[0.035] sm:px-5 sm:py-5"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/15 bg-surface text-[12px] font-black uppercase text-deepblue dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
          >
            {presentation.sourceHost.charAt(0)}
          </span>
          <div className="min-w-0">
            <p data-external-source-host className="truncate text-[12px] font-extrabold text-foreground dark:text-white sm:text-[13px]">
              {presentation.sourceHost}
            </p>
            <p className="truncate text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
              Source externe indexée
            </p>
          </div>
        </div>
        {publicAttribution.badge ? <SourceBadge badge={publicAttribution.badge} variant="dark" /> : null}
      </div>

      <h3
        data-external-result-title
        className="mt-3 text-[15px] font-extrabold leading-[1.28] tracking-[-0.015em] text-deepblue transition group-hover:text-bronze-700 dark:text-white dark:group-hover:text-bronze-300 sm:text-[17px]"
      >
        {presentation.title}
      </h3>

      {metadata.length > 0 ? (
        <div data-external-result-metadata className="mt-2 flex flex-wrap gap-1.5">
          {metadata.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border/15 bg-surface/80 px-2 py-1 text-[10px] font-bold text-foreground/70 dark:border-white/10 dark:bg-white/[0.045] dark:text-white/70 sm:text-[11px]"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {presentation.isMinimal ? (
        <p data-external-minimal-disclaimer className="mt-3 max-w-3xl text-[11px] leading-5 text-muted-foreground sm:text-[12px]">
          Résultat indexé. Prix, disponibilité, photos et détails sont à vérifier directement sur le site source.
        </p>
      ) : presentation.snippet ? (
        <p className="mt-3 line-clamp-2 max-w-3xl text-[12px] leading-5 text-muted-foreground sm:text-[13px]">
          {presentation.snippet}
        </p>
      ) : null}

      {richFacts.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-extrabold text-foreground/75 dark:text-white/75 sm:text-[12px]">
          {richFacts.map((fact) => <span key={fact}>{fact}</span>)}
        </div>
      ) : null}

      {similarResults?.similar_possible ? (
        <p className="mt-3 text-[10px] font-semibold text-amber-800 dark:text-amber-100 sm:text-[11px]">
          Résultat proche d’une autre source · doublon possible.
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/10 pt-3 dark:border-white/8">
        <span className="min-w-0 truncate text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
          {presentation.displayUrl || publicAttribution.sourceLabel}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-extrabold text-bronze-700 dark:text-bronze-300 sm:text-[12px]">
          Voir l’annonce source <ExternalLink size={13} aria-hidden="true" />
        </span>
      </div>
    </a>
  );
}
