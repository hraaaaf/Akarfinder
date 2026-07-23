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
    <div className="space-y-4 sm:space-y-5">
      {showHeader ? (
        <div className="border-t border-border/15 pt-6 dark:border-white/10 sm:pt-8">
          <h2 className="mb-1 text-[16px] font-bold text-foreground dark:text-white/90 sm:text-[18px]">
            Offres observées sur le web
          </h2>
          <p className="text-[12px] text-muted-foreground dark:text-white/50 sm:text-[13px]">
            {results.length > 0 ? `${results.length} résultat${results.length > 1 ? "s" : ""} · ` : ""}
            Aperçus limités avec source visible — vérifiez toujours le détail sur le site original.
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse overflow-hidden rounded-2xl border border-border/15 bg-card dark:border-white/10 dark:bg-white/[0.04]"
            />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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
