import type { PublicResultSimilarityInternalSummary, PublicResultSimilarityPublicLabel, PublicResultSimilaritySignal } from "./types";
import type { PairwiseSimilarityResult } from "./similarity-score";

export const PUBLIC_SIMILAR_RESULT_LABEL: PublicResultSimilarityPublicLabel =
  "Résultat similaire possible";

function buildPublicReasons(signals: PublicResultSimilaritySignal[]): string[] {
  const reasons: string[] = [];
  if (signals.includes("same_city")) reasons.push("Même ville");
  if (signals.includes("same_property_type")) reasons.push("Type de bien proche");
  if (signals.includes("different_source_host")) reasons.push("Source différente à comparer");
  if (signals.includes("close_surface")) reasons.push("Surface proche");
  if (signals.includes("close_price")) reasons.push("Informations proches");
  if (signals.includes("same_neighborhood")) reasons.push("Quartier proche");
  if (signals.includes("same_source_host")) reasons.push("Comparer la source avant de contacter");
  return [...new Set(reasons)].slice(0, 4);
}

export function isPublicResultSimilarityPossible(result: PairwiseSimilarityResult): boolean {
  return (
    result.threshold_details.same_city &&
    result.threshold_details.compatible_transaction_type &&
    result.threshold_details.compatible_property_type &&
    result.threshold_details.strong_signal_count >= 2
  );
}

export function buildInternalSimilaritySummary(
  result: PairwiseSimilarityResult,
  similarCount: number,
  groupId?: string,
): PublicResultSimilarityInternalSummary {
  const similar_possible = isPublicResultSimilarityPossible(result);

  return {
    similar_possible,
    similar_count: similar_possible ? similarCount : undefined,
    similar_public_label: similar_possible ? PUBLIC_SIMILAR_RESULT_LABEL : undefined,
    similar_reasons_public: similar_possible ? buildPublicReasons(result.raw_similarity_signals) : [],
    similarity_score: result.similarity_score,
    similarity_group_id: similar_possible ? groupId : undefined,
    raw_similarity_signals: result.raw_similarity_signals,
    threshold_details: result.threshold_details,
  };
}
