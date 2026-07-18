import { queryListings } from "@/lib/db";
import { assignDuplicateGroups } from "@/lib/listings/duplicate";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import { canPublishDbRowToPublicSearchSurface } from "@/lib/listings/public-listing-access";
import type { Listing } from "@/lib/listings/types";
import type { SearchQuery, SearchResult } from "./types";
import { computeRankingScore } from "./ranking";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
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

// Normalise property_type to the mapped UI label so that both raw DB values
// ("apartment") and UI values ("Appartement") work in matchesFilters.
function toMappedPropertyType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const n = raw.trim().toLowerCase();
  if (n === "apartment" || n === "appartement") return "Appartement";
  if (n === "villa") return "Villa";
  if (n === "land" || n === "terrain") return "Terrain";
  if (n === "office" || n === "bureau") return "Bureau";
  if (n === "studio") return "Studio";
  if (n === "maison") return "Maison";
  return raw; // pass-through unknown values
}

// Normalise transaction_type to the Listing model values ("buy"/"rent"/"new").
function toMappedTransactionType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const n = raw.trim().toLowerCase();
  if (n === "buy" || n === "sale" || n === "achat") return "buy";
  if (n === "rent" || n === "location") return "rent";
  if (n === "new" || n === "neuf") return "new";
  return raw;
}

function matchesFilters(listing: Listing, query: SearchQuery) {
  if (query.city && listing.city !== query.city) return false;
  if (query.property_type) {
    const mapped = toMappedPropertyType(query.property_type);
    if (mapped && listing.property_type !== mapped) return false;
  }
  if (query.transaction_type) {
    const mapped = toMappedTransactionType(query.transaction_type);
    if (mapped && listing.transaction_type !== mapped) return false;
  }
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

function sortListings(listings: Listing[], sort?: string, query?: SearchQuery) {
  const copy = [...listings];
  if (sort === "price_asc" || sort === "price_desc") {
    return copy.sort((a, b) => {
      // A listing with no disclosed price always sorts last.
      if (a.price == null && b.price == null) return 0;
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return sort === "price_asc" ? a.price - b.price : b.price - a.price;
    });
  }
  if (sort === "surface_desc") return copy.sort((a, b) => b.surface_m2 - a.surface_m2);

  // Default: intelligent ranking based on search intent
  // Priorise city, district, property type, transaction, text relevance, completeness
  return copy.sort((a, b) => {
    const scoreA = computeRankingScore(a, query ?? {});
    const scoreB = computeRankingScore(b, query ?? {});
    return scoreB - scoreA;
  });
}

export async function searchDatabase(query: SearchQuery = {}): Promise<SearchResult> {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const offset = Math.max(query.offset ?? 0, 0);

  // Push available filters to the DB layer for efficiency — avoids fetching
  // unneeded rows when the DB grows beyond 100 listings. The query always
  // over-fetches (limit=200) so client-side text-search can still apply
  // without being truncated. Price and surface filters are now handled server-side.
  const base = await queryListings({
    city: query.city,
    property_type: query.property_type,
    transaction_type: query.transaction_type,
    min_price: query.min_price,
    max_price: query.max_price,
    min_surface: query.min_surface,
    max_surface: query.max_surface,
    limit: 200,
    offset: 0,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[search:db] provider=database rows=${base.listings.length} total=${base.total}`,
      { city: query.city, property_type: query.property_type, transaction_type: query.transaction_type }
    );
  }

  // PUBLIC-READMODEL-AUTHORIZED-ONLY-1: discard rows whose source is not
  // first_party or partner_authorized before mapping (cheap pre-filter).
  const authorizedRows = base.listings.filter(canPublishDbRowToPublicSearchSurface);

  const allPersisted = authorizedRows.every(
    (row) => row.reliability_score != null && row.duplicate_score != null
  );
  const listings = allPersisted
    ? authorizedRows.map((row) => mapDbRowToListing(row))
    : (() => {
        const partial = authorizedRows.map((row) => mapDbRowToListing(row));
        const duplicateMap = assignDuplicateGroups(partial);
        return authorizedRows.map((row) =>
          mapDbRowToListing(row, duplicateMap.get(String(row.id)))
        );
      })();

  const filtered = sortListings(
    listings.filter((listing) => matchesFilters(listing, query)),
    query.sort,
    query
  );

  if (process.env.NODE_ENV !== "production") {
    console.log(`[search:db] after client-side filter: ${filtered.length} listings`);
  }

  return {
    listings: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
    source: "database",
    generated_at: new Date().toISOString(),
  };
}
