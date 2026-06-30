import { queryListings } from "@/lib/db";
import { assignDuplicateGroups } from "@/lib/listings/duplicate";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import type { Listing } from "@/lib/listings/types";
import type { SearchQuery, SearchResult } from "./types";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Noise words we skip during tokenized text matching.
// Pure digits and short tokens (< 3 chars) are also skipped.
const TEXT_STOP_WORDS = new Set([
  "a", "au", "aux", "de", "du", "des", "le", "la", "les",
  "en", "et", "ou", "un", "une", "par", "sur", "pour",
  "dh", "mad", "dirhams", "moins", "plus", "avec", "sans",
  "max", "maxi", "budget", "prix",
]);

function matchesText(listing: Listing, q?: string) {
  if (!q?.trim()) return true;
  const haystack = normalize(
    [
      listing.title,
      listing.city,
      listing.neighborhood,
      listing.property_type,
      listing.source_name,
      listing.description_snippet,
    ]
      .filter(Boolean)
      .join(" ")
  );
  // Tokenized matching: every meaningful token must appear somewhere in haystack.
  // Tolerates word order, multi-field hits, and budget/stop words in the query.
  const tokens = normalize(q.trim())
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !TEXT_STOP_WORDS.has(t) && !/^\d+$/.test(t));
  if (tokens.length === 0) return true;
  return tokens.every((token) => haystack.includes(token));
}

function matchesFilters(listing: Listing, query: SearchQuery) {
  if (query.city && listing.city !== query.city) return false;
  if (query.property_type && listing.property_type !== query.property_type) return false;
  if (query.transaction_type && listing.transaction_type !== query.transaction_type) return false;
  if (
    query.minReliabilityScore != null &&
    listing.reliability_score < query.minReliabilityScore
  ) {
    return false;
  }
  if (query.reliability_badge && listing.reliability_badge !== query.reliability_badge) {
    return false;
  }
  return matchesText(listing, query.q);
}

function sortListings(listings: Listing[], sort?: string) {
  const copy = [...listings];
  if (sort === "price_asc") return copy.sort((a, b) => a.price - b.price);
  if (sort === "price_desc") return copy.sort((a, b) => b.price - a.price);
  if (sort === "surface_desc") return copy.sort((a, b) => b.surface_m2 - a.surface_m2);
  return copy.sort(
    (a, b) =>
      b.reliability_score - a.reliability_score ||
      (b.data_completeness_score ?? 0) - (a.data_completeness_score ?? 0)
  );
}

export async function searchDatabase(query: SearchQuery = {}): Promise<SearchResult> {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const offset = Math.max(query.offset ?? 0, 0);
  const base = await queryListings({ limit: 100, offset: 0 });

  const allPersisted = base.listings.every(
    (row) => row.reliability_score != null && row.duplicate_score != null
  );
  const listings = allPersisted
    ? base.listings.map((row) => mapDbRowToListing(row))
    : (() => {
        const partial = base.listings.map((row) => mapDbRowToListing(row));
        const duplicateMap = assignDuplicateGroups(partial);
        return base.listings.map((row) =>
          mapDbRowToListing(row, duplicateMap.get(String(row.id)))
        );
      })();

  const filtered = sortListings(
    listings.filter((listing) => matchesFilters(listing, query)),
    query.sort
  );

  return {
    listings: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
    source: "database",
    generated_at: new Date().toISOString(),
  };
}
