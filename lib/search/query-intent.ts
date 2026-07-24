import { GEO_CITIES, normalizeGeoText } from "@/lib/geo/geo-entity-registry";
import type { SearchQuery } from "./types";

const PROPERTY_TYPE_PATTERNS: Array<{ type: NonNullable<SearchQuery["property_type"]>; terms: string[] }> = [
  { type: "Appartement", terms: ["appartement", "appart", "apartment"] },
  { type: "Villa", terms: ["villa"] },
  { type: "Terrain", terms: ["terrain", "land"] },
  { type: "Bureau", terms: ["bureau", "office"] },
  { type: "Studio", terms: ["studio"] },
  { type: "Maison", terms: ["maison", "house"] },
];

const TRANSACTION_PATTERNS: Array<{ type: NonNullable<SearchQuery["transaction_type"]>; terms: string[] }> = [
  { type: "new", terms: ["programme neuf", "immobilier neuf", "neuf", "nouveau projet"] },
  { type: "rent", terms: ["a louer", "location", "louer", "rent"] },
  // Do not infer the English bare word "sale": accent normalization turns the
  // Moroccan city "Salé" into "sale". Explicit transaction_type=sale remains
  // supported by the normal transaction filter contract.
  { type: "buy", terms: ["a vendre", "vente", "vendre", "acheter", "achat", "buy"] },
];

const RESIDUAL_STOP_WORDS = new Set([
  "a", "au", "aux", "de", "du", "des", "le", "la", "les", "un", "une",
  "en", "et", "ou", "pour", "sur", "avec", "sans", "dans",
]);

function containsNormalizedPhrase(text: string, phrase: string): boolean {
  const normalizedPhrase = normalizeGeoText(phrase);
  if (!normalizedPhrase) return false;
  return ` ${text} `.includes(` ${normalizedPhrase} `);
}

function inferCity(text: string): string | undefined {
  const candidates = GEO_CITIES.flatMap((city) =>
    [city.canonical_name, city.slug, ...city.aliases].map((label) => ({ city, label })),
  ).sort((a, b) => normalizeGeoText(b.label).length - normalizeGeoText(a.label).length);

  return candidates.find(({ label }) => containsNormalizedPhrase(text, label))?.city.canonical_name;
}

function inferPropertyType(text: string): SearchQuery["property_type"] {
  return PROPERTY_TYPE_PATTERNS.find(({ terms }) => terms.some((term) => containsNormalizedPhrase(text, term)))?.type;
}

function inferTransactionType(text: string): SearchQuery["transaction_type"] {
  return TRANSACTION_PATTERNS.find(({ terms }) => terms.some((term) => containsNormalizedPhrase(text, term)))?.type;
}

function addTokens(target: Set<string>, value: string) {
  for (const token of normalizeGeoText(value).split(/\s+/).filter(Boolean)) target.add(token);
}

function getCityLabels(rawCity: string): string[] {
  const normalized = normalizeGeoText(rawCity);
  const city = GEO_CITIES.find((candidate) =>
    [candidate.canonical_name, candidate.slug, ...candidate.aliases].some(
      (label) => normalizeGeoText(label) === normalized,
    ),
  );
  return city ? [city.canonical_name, city.slug, ...city.aliases] : [rawCity];
}

function getPropertyTypeLabels(rawType: string): string[] {
  const normalized = normalizeGeoText(rawType);
  const pattern = PROPERTY_TYPE_PATTERNS.find(
    ({ type, terms }) =>
      normalizeGeoText(type) === normalized || terms.some((term) => normalizeGeoText(term) === normalized),
  );
  return pattern ? [pattern.type, ...pattern.terms] : [rawType];
}

function getTransactionLabels(rawType: string): string[] {
  const normalized = normalizeGeoText(rawType);
  const pattern = TRANSACTION_PATTERNS.find(
    ({ type, terms }) =>
      normalizeGeoText(type) === normalized || terms.some((term) => normalizeGeoText(term) === normalized),
  );
  return pattern ? [pattern.type, ...pattern.terms] : [rawType];
}

/**
 * Keep only genuinely residual free-text criteria after city/property/transaction
 * have already been converted into structured filters. This prevents providers
 * such as Typesense from rewarding a title merely for repeating "Casablanca"
 * or "Appartement" after those dimensions have already matched canonically.
 */
export function getResidualSearchText(query: SearchQuery): string | undefined {
  const normalizedText = normalizeGeoText(query.q ?? "");
  if (!normalizedText) return undefined;

  const structuredTokens = new Set<string>();
  if (query.city) getCityLabels(query.city).forEach((label) => addTokens(structuredTokens, label));
  if (query.property_type) getPropertyTypeLabels(query.property_type).forEach((label) => addTokens(structuredTokens, label));
  if (query.transaction_type) getTransactionLabels(query.transaction_type).forEach((label) => addTokens(structuredTokens, label));

  const residual = normalizedText
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !structuredTokens.has(token) && !RESIDUAL_STOP_WORDS.has(token));

  return residual.length > 0 ? residual.join(" ") : undefined;
}

/**
 * Enrich a free-text Search query with deterministic structured intent.
 * Explicit filters always win. This is parsing only: it never fabricates a
 * location/type/transaction that is not literally present in the query text.
 */
export function enrichSearchQueryWithTextIntent(query: SearchQuery): SearchQuery {
  const normalizedText = normalizeGeoText(query.q ?? "");
  if (!normalizedText) return { ...query };

  return {
    ...query,
    city: query.city ?? inferCity(normalizedText),
    property_type: query.property_type ?? inferPropertyType(normalizedText),
    transaction_type: query.transaction_type ?? inferTransactionType(normalizedText),
  };
}
