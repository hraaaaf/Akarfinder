import { normalizePublicResultSimilarityInput } from "./normalize";
import { computePairwisePublicResultSimilarity } from "./similarity-score";
import { buildInternalSimilaritySummary, isPublicResultSimilarityPossible } from "./similarity-policy";
import type {
  PublicResultSimilarityGroup,
  PublicResultSimilarityInput,
  PublicResultSimilarityInternalSummary,
  PublicResultSimilaritySummary,
} from "./types";

function mergeReasons(summaries: PublicResultSimilarityInternalSummary[]): string[] {
  const merged = new Set<string>();
  for (const summary of summaries) {
    for (const reason of summary.similar_reasons_public) {
      merged.add(reason);
    }
  }
  return [...merged].slice(0, 4);
}

export function groupPublicResultsBySimilarity(
  inputs: PublicResultSimilarityInput[],
): PublicResultSimilarityGroup[] {
  if (inputs.length === 0) return [];

  const normalized = inputs.map(normalizePublicResultSimilarityInput);
  const adjacency = new Map<string, Set<string>>();
  const pairSummaries = new Map<string, PublicResultSimilarityInternalSummary[]>();

  for (const input of inputs) {
    adjacency.set(input.id, new Set<string>());
    pairSummaries.set(input.id, []);
  }

  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const left = normalized[i];
      const right = normalized[j];
      const pair = computePairwisePublicResultSimilarity(left, right);
      if (!isPublicResultSimilarityPossible(pair)) continue;

      adjacency.get(left.id)?.add(right.id);
      adjacency.get(right.id)?.add(left.id);
      pairSummaries.get(left.id)?.push(buildInternalSimilaritySummary(pair, 1));
      pairSummaries.get(right.id)?.push(buildInternalSimilaritySummary(pair, 1));
    }
  }

  const visited = new Set<string>();
  const groups: PublicResultSimilarityGroup[] = [];

  for (const input of inputs) {
    if (visited.has(input.id)) continue;
    const related = adjacency.get(input.id);
    if (!related || related.size === 0) continue;

    const queue = [input.id];
    const groupIds: string[] = [];
    visited.add(input.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      groupIds.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    const groupId = `public-similar-${groups.length + 1}`;
    const summaries: Record<string, PublicResultSimilarityInternalSummary> = {};
    for (const resultId of groupIds) {
      const localSummaries = pairSummaries.get(resultId) ?? [];
      const maxScore = localSummaries.reduce(
        (max, summary) => Math.max(max, summary.similarity_score),
        0,
      );
      const thresholdDetails = localSummaries[0]?.threshold_details ?? {
        same_city: false,
        compatible_transaction_type: false,
        compatible_property_type: false,
        strong_signal_count: 0,
      };

      summaries[resultId] = {
        similar_possible: true,
        similar_count: groupIds.length - 1,
        similar_public_label: "Résultat similaire possible",
        similar_reasons_public: mergeReasons(localSummaries),
        similarity_score: maxScore,
        similarity_group_id: groupId,
        raw_similarity_signals: [
          ...new Set(localSummaries.flatMap((summary) => summary.raw_similarity_signals)),
        ],
        threshold_details: thresholdDetails,
      };
    }

    groups.push({
      group_id: groupId,
      result_ids: groupIds,
      summaries,
    });
  }

  return groups;
}

export function buildPublicResultSimilaritySummaries(
  inputs: PublicResultSimilarityInput[],
): Record<string, PublicResultSimilaritySummary> {
  const groups = groupPublicResultsBySimilarity(inputs);
  const summaries: Record<string, PublicResultSimilaritySummary> = {};

  for (const input of inputs) {
    summaries[input.id] = {
      similar_possible: false,
      similar_reasons_public: [],
    };
  }

  for (const group of groups) {
    for (const resultId of group.result_ids) {
      const summary = group.summaries[resultId];
      summaries[resultId] = {
        similar_possible: summary.similar_possible,
        similar_count: summary.similar_count,
        similar_public_label: summary.similar_public_label,
        similar_reasons_public: summary.similar_reasons_public,
      };
    }
  }

  return summaries;
}
