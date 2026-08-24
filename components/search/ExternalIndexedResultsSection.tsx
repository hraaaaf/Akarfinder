"use client";

import { ExternalIndexedResultCard } from "./ExternalIndexedResultCard";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

type ExternalIndexedResultsSectionProps = {
  results: SearchGatewayNormalizedResult[];
  isLoading?: boolean;
  showHeader?: boolean;
};

function SerpSkeletonRow() {
  return (
    <div className="flex animate-pulse gap-3 px-3.5 py-4 sm:gap-3.5 sm:px-4">
      <div className="h-9 w-9 shrink-0 rounded-xl bg-surface dark:bg-white/10 sm:h-10 sm:w-10" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-28 rounded-full bg-surface dark:bg-white/10" />
        <div className="h-4 w-3/5 rounded-full bg-surface dark:bg-white/10" />
        <div className="h-3 w-2/5 rounded-full bg-surface dark:bg-white/10" />
      </div>
    </div>
  );
}

export function ExternalIndexedResultsSection({
  results,
  isLoading = false,
  showHeader = true,
}: ExternalIndexedResultsSectionProps) {
  if (!isLoading && results.length === 0) return null;

  return (
    <section className="space-y-3" data-search-external-serp-section>
      {showHeader ? (
        <div className="flex flex-wrap items-end justify-between gap-2 border-t border-border/15 pt-5 dark:border-white/10 sm:pt-6">
          <div>
            <h2 className="text-[15px] font-extrabold text-foreground dark:text-white sm:text-[16px]">
              Résultats indexés externes
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground dark:text-white/50 sm:text-[12px]">
              {results.length > 0 ? `${results.length.toLocaleString("fr-FR")} affiché${results.length > 1 ? "s" : ""} · ` : ""}
              ouvrez la source originale pour les détails.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground/75 dark:text-white/40">
            Mode SERP
          </span>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_8px_28px_rgba(15,23,42,0.05)] divide-y divide-border/12 dark:border-white/10 dark:bg-white/[0.025] dark:divide-white/8" data-search-external-serp-list>
        {isLoading
          ? [...Array(5)].map((_, index) => <SerpSkeletonRow key={index} />)
          : results.map((result) => (
              <ExternalIndexedResultCard key={result.id} result={result} />
            ))}
      </div>
    </section>
  );
}
