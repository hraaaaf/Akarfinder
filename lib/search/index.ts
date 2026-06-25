import { searchDatabase } from "./database-search";
import { getSearchProvider, useTypesenseSearch } from "./provider";
import { searchTypesense } from "./typesense-search";
import type { SearchQuery, SearchResult } from "./types";

export type { SearchQuery, SearchResult };
export { getSearchProvider, isTypesenseConfigured } from "./provider";
export { mapListingToTypesenseDocument } from "./mapping";

export async function searchListings(query: SearchQuery = {}): Promise<SearchResult> {
  if (getSearchProvider() === "typesense") {
    if (useTypesenseSearch()) {
      try {
        return await searchTypesense(query);
      } catch (error) {
        console.error("[search] Typesense failed, falling back to database:", error);
      }
    } else {
      console.warn("[search] SEARCH_PROVIDER=typesense but Typesense env is incomplete; using database fallback.");
    }
  }

  const fallback = await searchDatabase(query);
  return getSearchProvider() === "typesense"
    ? { ...fallback, source: "database_fallback" }
    : fallback;
}
