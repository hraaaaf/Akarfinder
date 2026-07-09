import type { PublicPropertyIndexSearchQuery } from "./types";
import { normalizePublicPropertyIndexText } from "./normalize-index-record";

export const PUBLIC_PROPERTY_INDEX_MAX_LIMIT = 100;

export function clampPublicPropertyIndexLimit(limit?: number): number {
  if (!Number.isFinite(limit as number)) return 20;
  const parsed = Math.trunc(limit ?? 20);
  return Math.min(Math.max(parsed, 1), PUBLIC_PROPERTY_INDEX_MAX_LIMIT);
}

export function normalizePublicPropertyIndexSearchQuery(
  query: PublicPropertyIndexSearchQuery = {},
): PublicPropertyIndexSearchQuery & { limit: number } {
  return {
    q: query.q?.trim() || undefined,
    city: query.city?.trim() || undefined,
    neighborhood: query.neighborhood?.trim() || undefined,
    property_type: query.property_type?.trim() || undefined,
    transaction_type: query.transaction_type?.trim() || undefined,
    limit: clampPublicPropertyIndexLimit(query.limit),
  };
}

export function tokenizePublicPropertyIndexQuery(value?: string): string[] {
  if (!value?.trim()) return [];

  return normalizePublicPropertyIndexText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token))
    .filter((token) => !["prix", "budget", "avec", "sans", "moins", "plus", "de", "du", "la", "le", "les"].includes(token));
}

export function buildPublicPropertyIndexSearchPlan(query: PublicPropertyIndexSearchQuery = {}): {
  normalized_query: string;
  fts_query: string;
  city_pattern?: string;
  neighborhood_pattern?: string;
  property_type?: string;
  transaction_type?: string;
  limit: number;
} {
  const normalized = normalizePublicPropertyIndexSearchQuery(query);
  const normalizedQuery = normalizePublicPropertyIndexText(normalized.q ?? "");
  return {
    normalized_query: normalizedQuery,
    fts_query: normalizedQuery,
    city_pattern: normalized.city ? normalizePublicPropertyIndexText(normalized.city) : undefined,
    neighborhood_pattern: normalized.neighborhood
      ? normalizePublicPropertyIndexText(normalized.neighborhood)
      : undefined,
    property_type: normalized.property_type,
    transaction_type: normalized.transaction_type,
    limit: normalized.limit,
  };
}
