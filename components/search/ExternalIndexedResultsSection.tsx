"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalIndexedResultCard } from "./ExternalIndexedResultCard";
import { buildExternalSerpGroups } from "@/lib/search/external-serp-groups";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

type ExternalIndexedResultsSectionProps = {
  results: SearchGatewayNormalizedResult[];
  isLoading?: boolean;
  showHeader?: boolean;
};

const GROUP_PAGE_SIZE = 15;

function SerpSkeletonRow() {
  return (
    <div className="animate-pulse rounded-2xl border border-border/12 bg-card px-3.5 py-4 dark:border-white/8 dark:bg-white/[0.03] sm:px-4">
      <div className="space-y-2">
        <div className="h-4 w-3/5 rounded-full bg-surface dark:bg-white/10" />
        <div className="h-3 w-2/5 rounded-full bg-surface dark:bg-white/10" />
        <div className="h-6 w-1/3 rounded-full bg-surface dark:bg-white/10" />
      </div>
    </div>
  );
}

export function ExternalIndexedResultsSection({
  results,
  isLoading = false,
  showHeader = true,
}: ExternalIndexedResultsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [visibleGroupCount, setVisibleGroupCount] = useState(GROUP_PAGE_SIZE);
  const groups = useMemo(() => buildExternalSerpGroups(results), [results]);
  const loadedPageCount = results.filter((result) => result.can_show_result).length;
  const resultSetAnchor = results.slice(0, 3).map((result) => result.id).join("|");
  const visibleGroups = groups.slice(0, visibleGroupCount);
  const hiddenGroupCount = Math.max(0, groups.length - visibleGroups.length);
  const nextGroupCount = Math.min(GROUP_PAGE_SIZE, hiddenGroupCount);
  const hasHiddenLoadedGroups = hiddenGroupCount > 0;

  useEffect(() => {
    setVisibleGroupCount(GROUP_PAGE_SIZE);
  }, [resultSetAnchor]);

  useEffect(() => {
    if (!hasHiddenLoadedGroups) return;
    const pane = sectionRef.current?.closest<HTMLElement>("[data-search-list-pane]");
    if (!pane) return;

    const pagination = Array.from(pane.children).find((child) => {
      if (!(child instanceof HTMLElement)) return false;
      const button = child.querySelector("button");
      return button?.textContent?.includes("Afficher plus de résultats") ?? false;
    });
    if (!(pagination instanceof HTMLElement)) return;

    const previousHidden = pagination.hidden;
    const previousDisplay = pagination.style.display;
    pagination.hidden = true;
    pagination.style.display = "none";

    return () => {
      pagination.hidden = previousHidden;
      pagination.style.display = previousDisplay;
    };
  }, [hasHiddenLoadedGroups]);

  if (!isLoading && groups.length === 0) return null;

  const loadedSummary = `${visibleGroups.length.toLocaleString("fr-FR")} affiché${visibleGroups.length > 1 ? "s" : ""} · ${loadedPageCount.toLocaleString("fr-FR")} page${loadedPageCount > 1 ? "s" : ""} source${loadedPageCount > 1 ? "s" : ""} chargée${loadedPageCount > 1 ? "s" : ""}`;

  return (
    <section
      ref={sectionRef}
      className="space-y-3"
      data-search-external-serp-section
      data-external-serp-pagination-deferred={hasHiddenLoadedGroups ? "true" : "false"}
    >
      {showHeader ? (
        <div className="flex flex-wrap items-end justify-between gap-2 border-t border-border/15 pt-5 dark:border-white/10 sm:pt-6">
          <div>
            <h2 className="text-[15px] font-extrabold text-foreground dark:text-white sm:text-[16px]">
              Résultats indexés sur le web
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground dark:text-white/50 sm:text-[12px]">
              {isLoading && groups.length === 0 ? "Chargement…" : loadedSummary}
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground/75 dark:text-white/40">
            Sources originales
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 px-0.5 py-0.5 text-[11px] text-muted-foreground sm:text-[12px]">
          <span className="font-extrabold text-foreground/75 dark:text-white/75">Résultats du web</span>
          <span data-external-loaded-count>
            {isLoading && groups.length === 0 ? "Chargement…" : loadedSummary}
          </span>
        </div>
      )}

      {isLoading && groups.length === 0 ? (
        <div className="space-y-2.5" data-external-serp-skeleton>
          {[...Array(5)].map((_, index) => <SerpSkeletonRow key={index} />)}
        </div>
      ) : (
        <div className="space-y-2.5" data-search-external-serp-list>
          {visibleGroups.map((group) => (
            <ExternalIndexedResultCard
              key={group.key}
              results={group.results}
              similarPossible={group.similarPossible}
            />
          ))}
        </div>
      )}

      {hasHiddenLoadedGroups ? (
        <div className="flex justify-center pt-1" data-external-serp-local-pagination>
          <button
            type="button"
            onClick={() => setVisibleGroupCount((current) => current + GROUP_PAGE_SIZE)}
            className="rounded-full border border-bronze-500/35 bg-bronze-500/10 px-5 py-2.5 text-[12px] font-extrabold text-bronze-700 transition hover:bg-bronze-500/15 dark:text-bronze-300"
          >
            {nextGroupCount === GROUP_PAGE_SIZE
              ? "Afficher 15 suivants"
              : `Afficher les ${nextGroupCount} suivants`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
