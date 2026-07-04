// SERP-RESULT-QUALITY-DEGROUPING-1
// Detects source category/listing pages and English-language pages so the
// ranking and diversification pipeline can deprioritize them without
// discarding real coverage when nothing better is available.

import type { SearchGatewayNormalizedResult } from "./search-gateway-types";

// Title patterns typical of source category pages: "23 Apartments for rent in
// Agadir", "Appartements à vendre à Casablanca", "X Villas for sale in Y".
const CATEGORY_TITLE_PATTERNS: RegExp[] = [
  /^\d+\s+.*\b(for sale|for rent|à vendre|à louer|en vente|en location)\b.*\b(in|à|au|dans)\b/i,
  /\b(apartments?|villas?|appartements?|maisons?|studios?|terrains?|biens?)\s+(for sale|for rent|à vendre|à louer|en vente|en location)\b/i,
  // Bare "N + property type + in/à + City" listing-count title, even without
  // an explicit transaction verb (still a category/search page, not a listing).
  /^\d+\s+(apartments?|villas?|appartements?|maisons?|studios?|terrains?|biens?)\b/i,
];

// URL path segments typical of source category/search pages rather than a
// single listing.
const CATEGORY_URL_PATTERNS: RegExp[] = [
  /\/acheter\/immo-/i,
  /\/louer\/immo-/i,
  /\/location-/i,
  /\/vente-/i,
  /\/location\/apartment\//i,
  /\/location\/villa\//i,
  /\/fr-ma\/location\//i,
  /\/en\/acheter\//i,
  /\/en\/louer\//i,
];

export function isSourceCategoryPage(title: string, url: string): boolean {
  return (
    CATEGORY_TITLE_PATTERNS.some((pattern) => pattern.test(title)) ||
    CATEGORY_URL_PATTERNS.some((pattern) => pattern.test(url))
  );
}

// English-language result detection — /en/ URL segment or an English
// "for sale"/"for rent" title pattern. Never used to remove a result, only
// to deprioritize it when a French/comparable alternative exists.
const ENGLISH_URL_PATTERNS: RegExp[] = [/\/en\//i, /\/en-/i];
const ENGLISH_TITLE_PATTERN = /\b(for sale|for rent)\b/i;

export function isEnglishResult(title: string, url: string): boolean {
  return (
    ENGLISH_URL_PATTERNS.some((pattern) => pattern.test(url)) ||
    ENGLISH_TITLE_PATTERN.test(title)
  );
}

export function isSourceCategoryPageResult(
  result: Pick<SearchGatewayNormalizedResult, "title" | "original_url">
): boolean {
  return isSourceCategoryPage(result.title ?? "", result.original_url ?? "");
}

export function isEnglishResultEntry(
  result: Pick<SearchGatewayNormalizedResult, "title" | "original_url">
): boolean {
  return isEnglishResult(result.title ?? "", result.original_url ?? "");
}
