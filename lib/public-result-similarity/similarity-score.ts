import type { PublicResultSimilaritySignal } from "./types";
import type { NormalizedPublicResultSimilarityInput } from "./normalize";

export type PairwiseSimilarityResult = {
  similarity_score: number;
  raw_similarity_signals: PublicResultSimilaritySignal[];
  threshold_details: {
    same_city: boolean;
    compatible_transaction_type: boolean;
    compatible_property_type: boolean;
    strong_signal_count: number;
  };
};

function arePricesClose(a?: number, b?: number): boolean {
  if (!a || !b) return false;
  const delta = Math.abs(a - b);
  const max = Math.max(a, b);
  return delta / max <= 0.12;
}

function areSurfacesClose(a?: number, b?: number): boolean {
  if (!a || !b) return false;
  return Math.abs(a - b) <= 15;
}

function getWordSet(text: string): Set<string> {
  return new Set(
    text
      .split(/\s+/)
      .filter((token) => token.length >= 4),
  );
}

function areTitlesSimilar(a: string, b: string): boolean {
  const aWords = getWordSet(a);
  const bWords = getWordSet(b);
  if (aWords.size === 0 || bWords.size === 0) return false;
  let overlap = 0;
  for (const word of aWords) {
    if (bWords.has(word)) overlap += 1;
  }
  return overlap >= 3;
}

export function computePairwisePublicResultSimilarity(
  left: NormalizedPublicResultSimilarityInput,
  right: NormalizedPublicResultSimilarityInput,
): PairwiseSimilarityResult {
  const raw_similarity_signals: PublicResultSimilaritySignal[] = [];

  const same_city = !!left.city && left.city === right.city;
  if (same_city) raw_similarity_signals.push("same_city");

  if (left.neighborhood && left.neighborhood === right.neighborhood) {
    raw_similarity_signals.push("same_neighborhood");
  }

  const compatible_transaction_type =
    !!left.transaction_type &&
    !!right.transaction_type &&
    left.transaction_type === right.transaction_type;
  if (compatible_transaction_type) raw_similarity_signals.push("same_transaction_type");

  const compatible_property_type =
    !!left.property_type &&
    !!right.property_type &&
    left.property_type === right.property_type;
  if (compatible_property_type) raw_similarity_signals.push("same_property_type");

  if (arePricesClose(left.price_mad, right.price_mad)) {
    raw_similarity_signals.push("close_price");
  }

  if (areSurfacesClose(left.surface_m2, right.surface_m2)) {
    raw_similarity_signals.push("close_surface");
  }

  if (areTitlesSimilar(left.title, right.title)) {
    raw_similarity_signals.push("similar_title");
  }

  if (left.source_host === right.source_host) {
    raw_similarity_signals.push("same_source_host");
  } else {
    raw_similarity_signals.push("different_source_host");
  }

  const strong_signal_count = raw_similarity_signals.filter((signal) =>
    ["same_neighborhood", "close_price", "close_surface", "similar_title"].includes(signal),
  ).length;

  let similarity_score = 0;
  if (same_city) similarity_score += 30;
  if (compatible_transaction_type) similarity_score += 15;
  if (compatible_property_type) similarity_score += 15;
  if (raw_similarity_signals.includes("same_neighborhood")) similarity_score += 15;
  if (raw_similarity_signals.includes("close_price")) similarity_score += 10;
  if (raw_similarity_signals.includes("close_surface")) similarity_score += 10;
  if (raw_similarity_signals.includes("similar_title")) similarity_score += 10;
  if (raw_similarity_signals.includes("different_source_host")) similarity_score += 5;

  return {
    similarity_score,
    raw_similarity_signals,
    threshold_details: {
      same_city,
      compatible_transaction_type,
      compatible_property_type,
      strong_signal_count,
    },
  };
}
