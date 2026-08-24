"use client";

import { ExternalIndexedResultCard } from "./ExternalIndexedResultCard";
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
    results.map((result) => ({
      id: result.id,
      title: result.title,
      snippet: result.snippet,
      original_url: result.original_url,
      display_url: result.display_url,
      source_name: result.source_name,
      source_host: result.domain,
    })),
  );

  for (const summary of Object.values(similaritySummaries)) {
    assertPublicResultSimilaritySafety(summary);
  }

  return (
    <section className="border-t border-border/15 pt-3 dark:border-white/10 sm:pt-4" data-external-serp-section>
      <div className="mb-1.5 flex items-end justify-between gap-3 px-1 sm:mb-2 sm:px-2">
        <div>
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-foreground/80 dark:text-white/80 sm:text-[13px]">
            {showHeader ? "Résultats indexés sur le web" : "Sur le web"}
          </h2>
          {showHeader ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-[12px]">
              Vérifiez la disponibilité et les détails sur le site d’origine.
            </p>
          ) : null}
        </div>
        {!isLoading && results.length > 0 ? (
          <span className="shrink-0 text-[10.5px] font-bold text-muted-foreground sm:text-[11.5px]">
            {results.length.toLocaleString("fr-FR")} affiché{results.length > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="divide-y divide-border/10 dark:divide-white/8" data-external-serp-loading>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex animate-pulse gap-3 px-1 py-4 sm:px-2">
              <div className="h-[72px] w-[96px] shrink-0 rounded-xl bg-surface dark:bg-white/[0.06]" />
              <div className="min-w-0 flex-1 space-y-2 pt-1">
                <div className="h-3 w-1/4 rounded-full bg-surface dark:bg-white/[0.06]" />
                <div className="h-4 w-4/5 rounded-full bg-surface dark:bg-white/[0.06]" />
                <div className="h-3 w-2/5 rounded-full bg-surface dark:bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="divide-y-0" data-external-serp-list>
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
