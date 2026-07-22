import type { DynamicSearchProfileV2 } from "@/lib/search-profile-v2/types";
import type { NeighborhoodIntelligenceRecordV2 } from "@/lib/neighborhood-intelligence/schema-v2";
import { computePropertyFit, type FitPropertyInput, type PropertyFitResult } from "./property-fit-engine";

export type PersonalizedRankingCandidate<T> = {
  item: T;
  property: FitPropertyInput;
  neighborhood: NeighborhoodIntelligenceRecordV2 | null;
  baseline_index: number;
};

export type PersonalizedRankedCandidate<T> = PersonalizedRankingCandidate<T> & {
  fit: PropertyFitResult;
};

/**
 * Personalized ranking is applied only after baseline relevance produced candidates.
 * It never reads commercial tier/badge fields and never mutates AkarScore/completeness.
 */
export function rankCandidatesByPersonalFit<T>(
  profile: DynamicSearchProfileV2,
  candidates: PersonalizedRankingCandidate<T>[],
): PersonalizedRankedCandidate<T>[] {
  return candidates
    .map((candidate) => ({ ...candidate, fit: computePropertyFit(profile, candidate.property, candidate.neighborhood) }))
    .sort((a, b) => {
      if (a.fit.eligible !== b.fit.eligible) return a.fit.eligible ? -1 : 1;
      const aScore = a.fit.score;
      const bScore = b.fit.score;
      if (aScore != null && bScore != null && aScore !== bScore) return bScore - aScore;
      if (aScore != null && bScore == null) return -1;
      if (aScore == null && bScore != null) return 1;
      return a.baseline_index - b.baseline_index;
    });
}
