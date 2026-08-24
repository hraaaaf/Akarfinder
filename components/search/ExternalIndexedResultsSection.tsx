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
    <div className="space-y-2.5 sm:space-y-3" data-search-external-serp-list>
      {showHeader ? (
        <div className="border-t border-border/15 pt-5 dark:border-white/10 sm:pt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-extrabold text-foreground dark:text-white/90 sm:text-[18px]">
                Résultats indexés sur le web
              </h2>
              <p className="mt-1 text-[12px] text-muted-foreground dark:text-white/50 sm:text-[13px]">
                {results.length} affiché{results.length > 1 ? "s" : ""} · ouvrez la source pour vérifier les détails.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-2.5 sm:space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-[112px] animate-pulse rounded-2xl border border-border/10 bg-card dark:border-white/10 dark:bg-white/[0.04] sm:h-[118px]"
            />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2.5 sm:space-y-3" data-search-external-results-list>
          {results.map((result) => (
            <ExternalIndexedResultCard
              key={result.id}
              result={result}
              similarResults={similaritySummaries[result.id]}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
