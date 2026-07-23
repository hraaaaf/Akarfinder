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
  { type: "buy", terms: ["a vendre", "vente", "acheter", "achat", "buy"] },
];

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
