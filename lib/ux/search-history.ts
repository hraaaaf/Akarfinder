import type { ListingFiltersState } from "@/lib/listings/types";
import type { SortBy } from "@/lib/listings/utils";
import type { SearchViewMode } from "@/lib/ux/contracts";
import {
  listingFiltersToSearchSession,
  searchSessionFromUrl,
  searchSessionToListingState,
  searchSessionToUrl,
} from "@/lib/ux/search-session";

export type SearchHistorySnapshot = {
  filters: Partial<ListingFiltersState>;
  sortBy: SortBy;
  view: SearchViewMode;
};

export type SearchHistoryMutation = "none" | "replace" | "push";

export const SEARCH_HISTORY_PUSH_DELAY_MS = 280;

export function buildCanonicalSearchHref(
  pathname: string,
  filters: ListingFiltersState,
  sortBy: SortBy,
  view: SearchViewMode,
): string {
  const params = searchSessionToUrl(
    listingFiltersToSearchSession(filters, sortBy, view),
  );
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function applySearchContinuityContext(
  href: string,
  currentSearch: string,
  mreOnly: boolean,
): string {
  const parsed = new URL(href, "https://akarfinder.local");
  const currentParams = new URLSearchParams(
    currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch,
  );

  if (mreOnly) parsed.searchParams.set("mre", "true");
  else parsed.searchParams.delete("mre");

  const projectId = currentParams.get("project_id")?.trim();
  if (projectId) parsed.searchParams.set("project_id", projectId);
  else parsed.searchParams.delete("project_id");

  const query = parsed.searchParams.toString();
  return `${parsed.pathname}${query ? `?${query}` : ""}`;
}

export function restoreSearchHistorySnapshot(search: string): SearchHistorySnapshot {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const snapshot = searchSessionToListingState(searchSessionFromUrl(params));
  return {
    ...snapshot,
    filters: {
      ...snapshot.filters,
      mreOnly: (params.get("mre") ?? "").toLowerCase() === "true",
    },
  };
}

export function getSearchHistoryMutation(
  currentHref: string,
  nextHref: string,
  hydrated: boolean,
): SearchHistoryMutation {
  if (currentHref === nextHref) return "none";
  return hydrated ? "push" : "replace";
}

export function shouldReplaceSearchHistory(currentHref: string, nextHref: string): boolean {
  return currentHref !== nextHref;
}
