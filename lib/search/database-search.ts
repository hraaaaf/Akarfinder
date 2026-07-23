import { queryListings } from "@/lib/db";
import { assignDuplicateGroups } from "@/lib/listings/duplicate";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import { canPublishDbRowToPublicSearchSurface } from "@/lib/listings/public-listing-access";
import type { Listing } from "@/lib/listings/types";
import { attachPublicSerpIntelligenceToListing } from "@/lib/intelligence/public-serp-intelligence-v1";
import type { DbListingRow } from "@/lib/listings/db-listings";
import {
  canonicalizeCityName,
  canonicalizeGeoPair,
  getCitySearchVariants,
} from "@/lib/geo/geo-entity-registry";
import type { SearchQuery, SearchResult } from "./types";
import { computeRankingScore } from "./ranking";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

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
  const tokens = normalize(q.trim())
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !TEXT_STOP_WORDS.has(t) && !/^\d+$/.test(t));
  if (tokens.length === 0) return true;
  return tokens.every((token) => haystack.includes(token));
}

function toMappedPropertyType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const n = raw.trim().toLowerCase();
  if (n === "apartment" || n === "appartement") return "Appartement";
  if (n === "villa") return "Villa";
  if (n === "land" || n === "terrain") return "Terrain";
  if (n === "office" || n === "bureau") return "Bureau";
  if (n === "studio") return "Studio";
  if (n === "maison") return "Maison";
  return raw;
}

function toMappedTransactionType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const n = raw.trim().toLowerCase();
  if (n === "buy" || n === "sale" || n === "achat") return "buy";
  if (n === "rent" || n === "location") return "rent";
  if (n === "new" || n === "neuf") return "new";
  return raw;
}

function matchesFilters(listing: Listing, query: SearchQuery) {
  if (
    query.city &&
    normalize(canonicalizeCityName(listing.city)) !== normalize(canonicalizeCityName(query.city))
  ) {
    return false;
  }
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
      if (a.price == null && b.price == null) return 0;
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return sort === "price_asc" ? a.price - b.price : b.price - a.price;
    });
  }
  if (sort === "surface_desc") return copy.sort((a, b) => b.surface_m2 - a.surface_m2);
  return copy.sort((a, b) => {
    const scoreA = computeRankingScore(a, query ?? {});
    const scoreB = computeRankingScore(b, query ?? {});
    return scoreB - scoreA;
  });
}

function canonicalizeListingGeo(listing: Listing): Listing {
  const geo = canonicalizeGeoPair(
    listing.city,
    listing.neighborhood || listing.district || undefined,
  );
  const canonicalNeighborhood = geo.neighborhood ?? "";
  return {
    ...listing,
    city: geo.city,
    neighborhood: canonicalNeighborhood,
    ...(listing.district ? { district: canonicalNeighborhood || listing.district } : {}),
  };
}

function mapSearchRow(
  row: DbListingRow,
  duplicate?: Parameters<typeof mapDbRowToListing>[1],
): Listing {
  const listing = canonicalizeListingGeo(mapDbRowToListing(row, duplicate));
  return attachPublicSerpIntelligenceToListing(listing, {
    source_name: row.source_name ?? "",
    observed_at: row.updated_at,
  });
}

function mapSearchRows(rows: DbListingRow[]): Listing[] {
  if (rows.length === 0) return [];
  const allPersisted = rows.every(
    (row) => row.reliability_score != null && row.duplicate_score != null
  );
  if (allPersisted) return rows.map((row) => mapSearchRow(row));

  const partial = rows.map((row) => canonicalizeListingGeo(mapDbRowToListing(row)));
  const duplicateMap = assignDuplicateGroups(partial);
  return rows.map((row) => mapSearchRow(row, duplicateMap.get(String(row.id))));
}

// SEARCH-INDEX-DEPTH-V1
// The old fallback fetched exactly 200 DB rows, then filtered/ranked locally.
// That made every query blind to row 201+ even when the index contained tens of
// thousands of offers. We now walk the structured DB result set in bounded
// chunks until a full public page is assembled (or a per-request scan budget is
// exhausted), and return a raw-index cursor so the client can continue from the
// exact row where scanning stopped. This removes the hard 200-row ceiling
// without loading the whole national corpus into one serverless invocation.
const DB_SCAN_BATCH_SIZE = 500;
const MAX_DB_ROWS_SCANNED_PER_REQUEST = 10_000;

export async function searchDatabase(query: SearchQuery = {}): Promise<SearchResult> {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const legacyOffset = Math.max(query.offset ?? 0, 0);
  const usingCursor = query.cursor != null;
  let scanCursor = Math.max(query.cursor ?? 0, 0);
  const targetMatches = usingCursor ? limit : legacyOffset + limit;
  const matchedListings: Listing[] = [];
  let rawTotal = 0;
  let scannedRows = 0;

  // Historical rows can contain accent/transliteration aliases (Temara/Témara,
  // Meknes/Meknès, etc.). When a canonical city has aliases, an exact DB filter
  // would hide valid rows. Until canonical backfill is complete, scan the bounded
  // public read-model and apply canonical identity matching after mapping.
  const cityVariants = query.city ? getCitySearchVariants(query.city) : [];
  const dbCityFilter = cityVariants.length <= 1 ? query.city : undefined;

  while (matchedListings.length < targetMatches && scannedRows < MAX_DB_ROWS_SCANNED_PER_REQUEST) {
    const batchStart = scanCursor;
    const base = await queryListings({
      city: dbCityFilter,
      property_type: query.property_type,
      transaction_type: query.transaction_type,
      min_price: query.min_price,
      max_price: query.max_price,
      min_surface: query.min_surface,
      max_surface: query.max_surface,
      limit: DB_SCAN_BATCH_SIZE,
      offset: batchStart,
    });

    rawTotal = base.total;
    if (base.listings.length === 0) break;

    const publishableRows = base.listings.filter(canPublishDbRowToPublicSearchSurface);
    const mappedById = new Map(
      mapSearchRows(publishableRows).map((listing) => [String(listing.id), listing])
    );

    let stoppedInsideBatch = false;
    for (let index = 0; index < base.listings.length; index += 1) {
      const row = base.listings[index];
      scanCursor = batchStart + index + 1;
      scannedRows += 1;

      if (!canPublishDbRowToPublicSearchSurface(row)) continue;
      const listing = mappedById.get(String(row.id));
      if (!listing || !matchesFilters(listing, query)) continue;
      matchedListings.push(listing);

      if (matchedListings.length >= targetMatches || scannedRows >= MAX_DB_ROWS_SCANNED_PER_REQUEST) {
        stoppedInsideBatch = true;
        break;
      }
    }

    if (stoppedInsideBatch) break;
    if (scanCursor >= rawTotal) break;
  }

  const sorted = sortListings(matchedListings, query.sort, query);
  const listings = usingCursor
    ? sorted.slice(0, limit)
    : sorted.slice(legacyOffset, legacyOffset + limit);
  const hasMore = scanCursor < rawTotal;

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[search:db] scanned=${scannedRows}/${rawTotal} matched=${matchedListings.length} returned=${listings.length} next_cursor=${hasMore ? scanCursor : "end"}`,
      { city: query.city, property_type: query.property_type, transaction_type: query.transaction_type }
    );
  }

  return {
    listings,
    // Exact structured DB total. Public/text filtering can reduce this number;
    // clients should use has_more/next_cursor for deep navigation rather than
    // assuming `total` equals the number of publishable text matches.
    total: rawTotal,
    limit,
    offset: usingCursor ? 0 : legacyOffset,
    next_cursor: hasMore ? scanCursor : null,
    has_more: hasMore,
    source: "database",
    generated_at: new Date().toISOString(),
  };
}
