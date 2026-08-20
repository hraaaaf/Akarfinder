"use client";

import { useEffect, useRef } from "react";
import type { ListingFiltersState } from "@/lib/listings/types";
import type { SortBy } from "@/lib/listings/utils";
import type { SearchViewMode } from "@/lib/ux/contracts";
import {
  applySearchContinuityContext,
  buildCanonicalSearchHref,
  getSearchHistoryMutation,
  restoreSearchHistorySnapshot,
  SEARCH_HISTORY_PUSH_DELAY_MS,
} from "@/lib/ux/search-history";

export const CANONICAL_SEARCH_SESSION_EVENT = "akarfinder:canonical-search-session";

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
  const hydratedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const hydrationFrameRef = useRef<number | null>(null);
  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    const clearPendingPush = () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const restoreFromLocation = () => {
      clearPendingPush();
      restoringRef.current = true;
      hydratedRef.current = false;
      onRestoreRef.current(restoreSearchHistorySnapshot(window.location.search));
      window.dispatchEvent(new Event(CANONICAL_SEARCH_SESSION_EVENT));

      queueMicrotask(() => {
        restoringRef.current = false;
      });
      hydrationFrameRef.current = window.requestAnimationFrame(() => {
        hydratedRef.current = true;
        hydrationFrameRef.current = null;
      });
    };

    const handlePopState = () => restoreFromLocation();

    restoreFromLocation();
    window.addEventListener("popstate", handlePopState);
    return () => {
      clearPendingPush();
      if (hydrationFrameRef.current != null) {
        window.cancelAnimationFrame(hydrationFrameRef.current);
        hydrationFrameRef.current = null;
      }
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (restoringRef.current) return;

    const canonicalHref = buildCanonicalSearchHref(
      window.location.pathname,
      filters,
      sortBy,
      view,
    );
    const nextHref = applySearchContinuityContext(
      canonicalHref,
      window.location.search,
      filters.mreOnly,
    );
    const currentHref = `${window.location.pathname}${window.location.search}`;
    const mutation = getSearchHistoryMutation(
      currentHref,
      nextHref,
      hydratedRef.current,
    );

    if (mutation === "none") return;

    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (mutation === "replace") {
      window.history.replaceState(window.history.state, "", nextHref);
      window.dispatchEvent(new Event(CANONICAL_SEARCH_SESSION_EVENT));
      return;
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (restoringRef.current) return;

      const liveHref = `${window.location.pathname}${window.location.search}`;
      if (liveHref === nextHref) return;

      window.history.pushState(window.history.state, "", nextHref);
      window.dispatchEvent(new Event(CANONICAL_SEARCH_SESSION_EVENT));
    }, SEARCH_HISTORY_PUSH_DELAY_MS);

    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [filters, sortBy, view]);
}
