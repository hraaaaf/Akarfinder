import { searchDatabase } from "./database-search";
import { getSearchProvider, useTypesenseSearch } from "./provider";
import { searchTypesense } from "./typesense-search";
import { canonicalizeGeoPair } from "@/lib/geo/geo-entity-registry";
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

export async function searchListings(query: SearchQuery = {}): Promise<SearchResult> {
  if (getSearchProvider() === "typesense") {
    if (useTypesenseSearch()) {
      try {
        return canonicalizeResultGeo(await searchTypesense(query));
      } catch (error) {
        console.error("[search] Typesense failed, falling back to database:", error);
      }
    } else {
      console.warn("[search] SEARCH_PROVIDER=typesense but Typesense env is incomplete; using database fallback.");
    }
  }

  const fallback = canonicalizeResultGeo(await searchDatabase(query));
  return getSearchProvider() === "typesense"
    ? { ...fallback, source: "database_fallback" }
    : fallback;
}
