import { normalizePublicPropertyIndexText } from "./normalize-index-record";
import { clampPublicPropertyIndexLimit, normalizePublicPropertyIndexSearchQuery, tokenizePublicPropertyIndexQuery } from "./search-query";
import type { PublicPropertyIndexRecord, PublicPropertyIndexSearchQuery } from "./types";

function trigramSet(value: string): Set<string> {
  const normalized = `  ${normalizePublicPropertyIndexText(value)}  `;
  const trigrams = new Set<string>();
  for (let index = 0; index < normalized.length - 2; index += 1) {
    trigrams.add(normalized.slice(index, index + 3));
  }
  return trigrams;
}

export function trigramSimilarity(left: string, right: string): number {
  const leftSet = trigramSet(left);
  const rightSet = trigramSet(right);
  if (leftSet.size === 0 || rightSet.size === 0) return 0;

  let intersection = 0;
  for (const trigram of leftSet) {
    if (rightSet.has(trigram)) intersection += 1;
  }

  return intersection / Math.max(leftSet.size, rightSet.size);
}

function recordText(record: PublicPropertyIndexRecord): string {
  return normalizePublicPropertyIndexText(
    [
      record.title,
      record.short_snippet,
      record.inferred_city,
      record.inferred_neighborhood,
      record.inferred_property_type,
      record.inferred_transaction_type,
      record.source_host,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function scoreRecord(record: PublicPropertyIndexRecord, query: ReturnType<typeof normalizePublicPropertyIndexSearchQuery>): number {
  const haystack = recordText(record);
  const queryTokens = tokenizePublicPropertyIndexQuery(query.q);
  const city = normalizePublicPropertyIndexText(query.city ?? "");
  const neighborhood = normalizePublicPropertyIndexText(query.neighborhood ?? "");
  const propertyType = normalizePublicPropertyIndexText(query.property_type ?? "");
  const transactionType = normalizePublicPropertyIndexText(query.transaction_type ?? "");

  let score = 0;

  if (queryTokens.length > 0) {
    const tokenHits = queryTokens.filter((token) => haystack.includes(token)).length;
    score += tokenHits * 8;
    if (tokenHits === queryTokens.length) score += 24;
  }

  if (city) {
    const cityText = normalizePublicPropertyIndexText(record.inferred_city ?? record.source_host);
    if (cityText.includes(city)) score += 40;
    score += trigramSimilarity(city, cityText) * 28;
  }

  if (neighborhood) {
    const neighborhoodText = normalizePublicPropertyIndexText(record.inferred_neighborhood ?? record.title);
    if (neighborhoodText.includes(neighborhood)) score += 35;
    score += trigramSimilarity(neighborhood, neighborhoodText) * 30;
  }

  if (propertyType) {
    const propertyText = normalizePublicPropertyIndexText(record.inferred_property_type ?? "");
    if (propertyText.includes(propertyType)) score += 20;
    score += trigramSimilarity(propertyType, propertyText) * 12;
  }

  if (transactionType) {
    const transactionText = normalizePublicPropertyIndexText(record.inferred_transaction_type ?? "");
    if (transactionText.includes(transactionType)) score += 16;
    score += trigramSimilarity(transactionType, transactionText) * 10;
  }

  if (record.public_price != null && Number.isFinite(record.public_price)) score += 2;
  if (record.public_surface != null && Number.isFinite(record.public_surface)) score += 2;

  return score;
}

function compareObservedAtDesc(left: PublicPropertyIndexRecord, right: PublicPropertyIndexRecord): number {
  return new Date(right.observed_at).getTime() - new Date(left.observed_at).getTime();
}

export function searchPublicPropertyIndex(
  records: PublicPropertyIndexRecord[],
  query: PublicPropertyIndexSearchQuery = {},
): PublicPropertyIndexRecord[] {
  const normalized = normalizePublicPropertyIndexSearchQuery(query);
  const limit = clampPublicPropertyIndexLimit(normalized.limit);

  const filtered = records.filter((record) => {
    if (normalized.city) {
      const city = normalizePublicPropertyIndexText(record.inferred_city ?? "");
      const target = normalizePublicPropertyIndexText(normalized.city);
      if (!(city.includes(target) || trigramSimilarity(target, city) >= 0.35)) return false;
    }

    if (normalized.neighborhood) {
      const neighborhood = normalizePublicPropertyIndexText(record.inferred_neighborhood ?? "");
      const target = normalizePublicPropertyIndexText(normalized.neighborhood);
      if (!(neighborhood.includes(target) || trigramSimilarity(target, neighborhood) >= 0.35)) return false;
    }

    if (normalized.property_type) {
      const propertyType = normalizePublicPropertyIndexText(record.inferred_property_type ?? "");
      const target = normalizePublicPropertyIndexText(normalized.property_type);
      if (!(propertyType.includes(target) || trigramSimilarity(target, propertyType) >= 0.3)) return false;
    }

    if (normalized.transaction_type) {
      const transactionType = normalizePublicPropertyIndexText(record.inferred_transaction_type ?? "");
      const target = normalizePublicPropertyIndexText(normalized.transaction_type);
      if (!(transactionType.includes(target) || trigramSimilarity(target, transactionType) >= 0.3)) return false;
    }

    if (normalized.q?.trim()) {
      const haystack = recordText(record);
      const tokens = tokenizePublicPropertyIndexQuery(normalized.q);
      if (tokens.length > 0 && !tokens.every((token) => haystack.includes(token))) {
        const anyTokenHits = tokens.some((token) => haystack.includes(token));
        if (!anyTokenHits) return false;
      }
    }

    return true;
  });

  return filtered
    .map((record) => ({
      record,
      score: scoreRecord(record, normalized),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const observedAt = compareObservedAtDesc(left.record, right.record);
      if (observedAt !== 0) return observedAt;
      if ((right.record.observation_count ?? 0) !== (left.record.observation_count ?? 0)) {
        return (right.record.observation_count ?? 0) - (left.record.observation_count ?? 0);
      }
      return left.record.source_url.localeCompare(right.record.source_url);
    })
    .slice(0, limit)
    .map(({ record }) => record);
}
