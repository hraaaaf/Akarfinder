"use client";

import { ExternalIndexedResultCard } from "./ExternalIndexedResultCard";
import { buildExternalResultPresentation } from "@/lib/search/external-result-presentation";
import { buildPublicResultSimilaritySummaries } from "@/lib/public-result-similarity/group-public-results";
import { assertPublicResultSimilaritySafety } from "@/lib/public-result-similarity/public-safety";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

type ExternalIndexedResultsSectionProps = {
  results: SearchGatewayNormalizedResult[];
  isLoading?: boolean;
  showHeader?: boolean;
};

export function ExternalIndexedResultsSection({
  results,
  isLoading = false,
  showHeader = true,
}: ExternalIndexedResultsSectionProps) {
  if (!isLoading && results.length === 0) return null;

  const similaritySummaries = buildPublicResultSimilaritySummaries(
    results.map((result) => {
      const presentation = buildExternalResultPresentation(result);
      return {
        id: result.id,
        title: presentation.title,
        snippet: presentation.snippet ?? undefined,
        original_url: result.original_url,
        display_url: presentation.displayUrl ?? result.display_url,
        source_name: result.source_name,
        source_host: presentation.sourceHost,
      };
    }),
  );

  for (const summary of Object.values(similaritySummaries)) {
    assertPublicResultSimilaritySafety(summary);
  }

  return (
    <section className="space-y-3 sm:space-y-4" data-search-external-serp-section>
      {showHeader ? (
        <div className="border-t border-border/15 pt-6 dark:border-white/10 sm:pt-8">
          <h2 className="text-[16px] font-extrabold text-foreground dark:text-white/90 sm:text-[18px]">
            Résultats indexés sur le web
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-muted-foreground dark:text-white/50 sm:text-[13px]">
            {results.length > 0 ? `${results.length} résultat${results.length > 1 ? "s" : ""} chargé${results.length > 1 ? "s" : ""}. ` : ""}
            Les informations complètes restent sur les sites sources.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 px-0.5 text-[11px] text-muted-foreground sm:text-[12px]">
          <span className="font-extrabold text-foreground/75 dark:text-white/75">Sources externes indexées</span>
          <span data-external-loaded-count>{isLoading && results.length === 0 ? "Chargement…" : `${results.length} chargés`}</span>
        </div>
      )}

      {isLoading && results.length === 0 ? (
        <div className="space-y-2.5" data-external-serp-skeleton>
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="h-[154px] animate-pulse rounded-2xl border border-border/10 bg-card dark:border-white/10 dark:bg-white/[0.04] sm:h-[166px]"
            />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2.5 sm:space-y-3" data-search-external-serp-list>
          {results.map((result) => (
            <ExternalIndexedResultCard
              key={result.id}
              result={result}
              similarResults={similaritySummaries[result.id]}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
