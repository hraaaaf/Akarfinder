"use client";

import { useEffect, useRef } from "react";
import type { ListingFiltersState } from "@/lib/listings/types";
import type { SortBy } from "@/lib/listings/utils";
import type { SearchViewMode } from "@/lib/ux/contracts";
import {
  buildCanonicalSearchHref,
  restoreSearchHistorySnapshot,
  shouldReplaceSearchHistory,
} from "@/lib/ux/search-history";

type UseCanonicalSearchSessionArgs = {
  filters: ListingFiltersState;
  sortBy: SortBy;
  view: SearchViewMode;
  onRestore: (snapshot: ReturnType<typeof restoreSearchHistorySnapshot>) => void;
};

export function useCanonicalSearchSession({
  filters,
  sortBy,
  view,
  onRestore,
}: UseCanonicalSearchSessionArgs): void {
  const restoringRef = useRef(false);
  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    const handlePopState = () => {
      restoringRef.current = true;
      onRestoreRef.current(restoreSearchHistorySnapshot(window.location.search));
      queueMicrotask(() => {
        restoringRef.current = false;
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (restoringRef.current) return;

    const nextHref = buildCanonicalSearchHref(
      window.location.pathname,
      filters,
      sortBy,
      view,
    );
    const currentHref = `${window.location.pathname}${window.location.search}`;

    if (shouldReplaceSearchHistory(currentHref, nextHref)) {
      window.history.replaceState(window.history.state, "", nextHref);
    }
  }, [filters, sortBy, view]);
}
