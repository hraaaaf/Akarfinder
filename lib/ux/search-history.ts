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

export function restoreSearchHistorySnapshot(search: string): SearchHistorySnapshot {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return searchSessionToListingState(searchSessionFromUrl(params));
}

export function shouldReplaceSearchHistory(currentHref: string, nextHref: string): boolean {
  return currentHref !== nextHref;
}
