"use client";

// SEARCH-GATEWAY-MULTISOURCE-SERP-UI-INTEGRATION-1
// Section header + grid for external indexed results from Search Gateway

import { ExternalIndexedResultCard } from "./ExternalIndexedResultCard";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

type ExternalIndexedResultsSectionProps = {
  results: SearchGatewayNormalizedResult[];
  isLoading?: boolean;
};

export function ExternalIndexedResultsSection({
  results,
  isLoading = false,
}: ExternalIndexedResultsSectionProps) {
  // Don't show section if no results and not loading
  if (!isLoading && results.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 sm:space-y-5">
      {/* Section Header */}
      <div className="border-t border-border/15 dark:border-white/10 pt-6 sm:pt-8">
        <h2 className="text-[16px] sm:text-[18px] font-bold text-foreground dark:text-white/90 mb-1">
          Résultats issus d'un index de recherche
        </h2>
        <p className="text-[12px] sm:text-[13px] text-muted-foreground dark:text-white/50">
          Aperçus limités avec source visible. AkarFinder redirige vers le site original.
        </p>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl border border-border/15 dark:border-white/10 bg-card dark:bg-white/[0.04] h-40"
            />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((result) => (
            <ExternalIndexedResultCard key={result.id} result={result} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
