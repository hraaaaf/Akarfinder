// SEARCH-RANKING-INTENT-4 — Ranking lexicographique basé sur l'intention utilisateur
// Doctrine: pertinence structurée d'abord, critères libres ensuite, puis exploitabilité et qualité.
// N'utilise PAS duplicate_score ni duplicate_group_id.

import { getCitySearchVariants } from "@/lib/geo/geo-entity-registry";
import type { Listing } from "@/lib/listings/types";
import type { SearchQuery } from "./types";

const TEXT_STOP_WORDS = new Set([
  "a", "au", "aux", "de", "du", "des", "le", "la", "les",
  "en", "et", "ou", "un", "une", "par", "sur", "pour",
  "dh", "mad", "dirhams", "moins", "plus", "avec", "sans",
  "max", "maxi", "budget", "prix", "bien", "immobilier",
  "chambre", "salon", "surface", "m2", "m²", "maroc",
  "appartement", "vendre", "location", "louer",
]);

const PROPERTY_TYPE_QUERY_TERMS: Record<string, string[]> = {
  Appartement: ["appartement", "appart", "apartment"],
  Villa: ["villa"],
  Terrain: ["terrain", "land"],
  Bureau: ["bureau", "office"],
  Studio: ["studio"],
  Maison: ["maison", "house"],
};

const TRANSACTION_QUERY_TERMS: Record<string, string[]> = {
  buy: ["buy", "sale", "achat", "acheter", "vente", "vendre"],
  rent: ["rent", "location", "louer"],
  new: ["new", "neuf", "nouveau", "programme"],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenize(text?: string): Set<string> {
  if (!text) return new Set();
  return new Set(
    normalize(text)
      .split(/\W+/)
      .filter((w) => w.length >= 3 && !TEXT_STOP_WORDS.has(w) && !/^\d+$/.test(w))
  );
}

function addTokens(target: Set<string>, values: string[]) {
  for (const value of values) {
    for (const token of tokenize(value)) target.add(token);
  }
}

function getStructuredIntentTokens(query: SearchQuery): Set<string> {
  const tokens = new Set<string>();

  if (query.city) addTokens(tokens, getCitySearchVariants(query.city));

  const mappedPropertyType = mapPropertyType(query.property_type);
  if (mappedPropertyType) {
    addTokens(tokens, [mappedPropertyType, ...(PROPERTY_TYPE_QUERY_TERMS[mappedPropertyType] ?? [])]);
  }

  const mappedTransactionType = mapTransactionType(query.transaction_type);
  if (mappedTransactionType) {
    addTokens(tokens, [mappedTransactionType, ...(TRANSACTION_QUERY_TERMS[mappedTransactionType] ?? [])]);
  }

  return tokens;
}

function countResidualQueryMatches(text: string | undefined, query: SearchQuery): number {
  if (!text || !query.q) return 0;
  const textTokens = tokenize(text);
  const queryTokens = tokenize(query.q);
  const structuredTokens = getStructuredIntentTokens(query);
  let count = 0;

  for (const token of queryTokens) {
    if (structuredTokens.has(token)) continue;
    if (textTokens.has(token)) count++;
  }

  return count;
}

export type RankingBreakdown = {
  relevance: number;
  hasDisclosedPrice: boolean;
  quality: number;
  total: number;
};

/**
 * Split ranking into explicit layers instead of letting completeness compensate
 * for weak relevance. Structured intent is counted once through canonical fields;
 * only genuinely residual free-text criteria may add text/district relevance.
 */
export function computeRankingBreakdown(listing: Listing, query: SearchQuery): RankingBreakdown {
  let relevance = 0;

  // 1. CITY MATCH (40 points) — Highest priority
  if (query.city && normalize(listing.city || "") === normalize(query.city)) {
    relevance += 40;
  }

  // 2. DISTRICT / RESIDUAL LOCATION MATCH (35 points)
  // A city already inferred into query.city is excluded here, so a district such
  // as "Casablanca Finance City" cannot receive a second bonus for Casablanca.
  if (query.q && listing.district) {
    const matches = countResidualQueryMatches(listing.district, query);
    if (matches > 0) relevance += 35;
  }

  // 3. PROPERTY TYPE MATCH (20 points)
  if (query.property_type && listing.property_type) {
    const mapped = mapPropertyType(query.property_type);
    if (mapped && normalize(listing.property_type) === normalize(mapped)) {
      relevance += 20;
    }
  }

  // 4. TRANSACTION TYPE MATCH (15 points)
  if (query.transaction_type && listing.transaction_type) {
    const mapped = mapTransactionType(query.transaction_type);
    if (mapped && normalize(listing.transaction_type) === normalize(mapped)) {
      relevance += 15;
    }
  }

  // 5. RESIDUAL TEXT RELEVANCE (up to 15 points)
  // Terms already represented by city/type/transaction are removed to prevent
  // title repetition from outranking a more actionable result.
  if (query.q) {
    const haystack = [listing.title, listing.description_snippet]
      .filter(Boolean)
      .join(" ");
    const matches = countResidualQueryMatches(haystack, query);
    relevance += Math.min(15, matches * 2);
  }

  // Price is deliberately separated from generic completeness. At equal
  // relevance, a disclosed price makes a result materially more actionable.
  const hasDisclosedPrice = listing.price != null && listing.price > 0;

  // Remaining information quality. Price is excluded here because it is an
  // explicit tie-break layer above this score.
  let quality = 0;
  if (listing.title) quality++;
  if (listing.surface_m2 && listing.surface_m2 > 0) quality++;
  if (listing.city) quality++;
  if (listing.district) quality++;
  if (listing.description_snippet) quality++;

  if (listing.reliability_score) {
    quality += Math.max(0, Math.min(5, (listing.reliability_score - 50) / 10));
  }

  // Compatibility scalar for diagnostics/legacy consumers. Recommended sorting
  // must use compareRecommendedListings() so layers remain lexicographic.
  const total = relevance + (hasDisclosedPrice ? 1 : 0) + quality;

  return { relevance, hasDisclosedPrice, quality, total };
}

export function computeRankingScore(listing: Listing, query: SearchQuery): number {
  return computeRankingBreakdown(listing, query).total;
}

/**
 * Comparator for the default Search order.
 * - A genuinely more relevant result always wins.
 * - At equal relevance, a disclosed price wins over an undisclosed price.
 * - Remaining quality only breaks ties after those two layers.
 */
export function compareRecommendedListings(a: Listing, b: Listing, query: SearchQuery): number {
  const rankA = computeRankingBreakdown(a, query);
  const rankB = computeRankingBreakdown(b, query);

  if (rankA.relevance !== rankB.relevance) return rankB.relevance - rankA.relevance;
  if (rankA.hasDisclosedPrice !== rankB.hasDisclosedPrice) {
    return Number(rankB.hasDisclosedPrice) - Number(rankA.hasDisclosedPrice);
  }
  if (rankA.quality !== rankB.quality) return rankB.quality - rankA.quality;
  return 0;
}

function mapPropertyType(raw?: string): string | undefined {
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

function mapTransactionType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const n = raw.trim().toLowerCase();
  if (n === "buy" || n === "sale" || n === "achat") return "buy";
  if (n === "rent" || n === "location") return "rent";
  if (n === "new" || n === "neuf") return "new";
  return raw;
}
