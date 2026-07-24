import { searchDatabase } from "./database-search";
import { enrichSearchQueryWithTextIntent } from "./query-intent";
import { getSearchProvider, useTypesenseSearch } from "./provider";
import { searchTypesense } from "./typesense-search";
import { canonicalizeGeoPair } from "@/lib/geo/geo-entity-registry";
import { collapseStructuredDuplicateGroups } from "@/lib/search/search-truth-tier";
import type { SearchQuery, SearchResult } from "./types";

export type { SearchQuery, SearchResult };
export { getSearchProvider, isTypesenseConfigured } from "./provider";
export { mapListingToTypesenseDocument } from "./mapping";

function canonicalizeResultGeo(result: SearchResult): SearchResult {
  return {
    ...result,
    listings: result.listings.map((listing) => {
      const geo = canonicalizeGeoPair(
        listing.city,
        listing.neighborhood || listing.district || undefined,
      );
      const neighborhood = geo.neighborhood ?? "";
      return {
        ...listing,
        city: geo.city,
        neighborhood,
        ...(listing.district ? { district: neighborhood || listing.district } : {}),
      };
    }),
  };
}

function projectVisibleDedup(result: SearchResult): SearchResult {
  const canonical = canonicalizeResultGeo(result);
  const collapsed = collapseStructuredDuplicateGroups(canonical.listings);
  return {
    ...canonical,
    listings: collapsed.listings,
  };
}

export async function searchListings(query: SearchQuery = {}): Promise<SearchResult> {
  // SEARCH-PROVIDER-PARITY-1 — every provider receives the same deterministic
  // structured intent. Provider selection must never change the meaning of q.
  const resolvedQuery = enrichSearchQueryWithTextIntent(query);

  if (getSearchProvider() === "typesense") {
    if (useTypesenseSearch()) {
      try {
        return projectVisibleDedup(await searchTypesense(resolvedQuery));
      } catch (error) {
        console.error("[search] Typesense failed, falling back to database:", error);
      }
    } else {
      console.warn("[search] SEARCH_PROVIDER=typesense but Typesense env is incomplete; using database fallback.");
    }
  }

  const fallback = projectVisibleDedup(await searchDatabase(resolvedQuery));
  return getSearchProvider() === "typesense"
    ? { ...fallback, source: "database_fallback" }
    : fallback;
}
