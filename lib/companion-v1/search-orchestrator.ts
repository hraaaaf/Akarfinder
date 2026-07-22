import type { NeighborhoodIntelligenceRecordV2 } from "@/lib/neighborhood-intelligence/schema-v2";
import { rankCandidatesByPersonalFit, type PersonalizedRankingCandidate } from "@/lib/property-fit-v1/personalized-ranking";
import { deriveNeighborhoodPreferenceWeights } from "@/lib/search-profile-v2/profile-engine";
import type { DynamicSearchProfileV2 } from "@/lib/search-profile-v2/types";

export type NeighborhoodCandidateScore = {
  city: string;
  neighborhood: string;
  eligible: boolean;
  score: number | null;
  coverage: number;
  unavailable: string[];
};

function scoreDimension(value: number, direction: string, target?: number | null): number {
  if (direction === "avoid" || direction === "prefer_low") return (10 - value) * 10;
  if (direction === "target" && target != null) return Math.max(0, 100 - Math.abs(value - target) * 10);
  return value * 10;
}

export function scoreNeighborhoodForProfile(profile: DynamicSearchProfileV2, neighborhood: NeighborhoodIntelligenceRecordV2): NeighborhoodCandidateScore {
  const weights = deriveNeighborhoodPreferenceWeights(profile);
  let availableWeight = 0;
  let potentialWeight = 0;
  let weighted = 0;
  const unavailable: string[] = [];
  let eligible = true;

  if (profile.location.preferred_cities.length && !profile.location.preferred_cities.includes(neighborhood.city) && profile.tolerances.location_flexibility === "strict") eligible = false;
  if (profile.location.excluded_neighborhoods.some((item) => item.city === neighborhood.city && item.neighborhood === neighborhood.neighborhood)) eligible = false;

  for (const preference of profile.neighborhood_preferences) {
    const weight = weights[preference.key] ?? 0;
    potentialWeight += weight;
    const evidence = neighborhood.akar_scores[preference.key];
    if (evidence.value == null || evidence.confidence === "unknown") { unavailable.push(preference.key); continue; }
    const score = scoreDimension(evidence.value, preference.direction, preference.target);
    weighted += score * weight;
    availableWeight += weight;
    if (preference.importance === "must" && score < 50) eligible = false;
  }

  if (profile.tolerances.tourism_intensity_max != null) {
    const evidence = neighborhood.akar_scores.tourism_intensity;
    potentialWeight += 5;
    if (evidence.value == null || evidence.confidence === "unknown") unavailable.push("tourism_intensity_tolerance");
    else {
      availableWeight += 5;
      const score = evidence.value <= profile.tolerances.tourism_intensity_max ? 100 : 0;
      weighted += score * 5;
      if (score === 0) eligible = false;
    }
  }

  return {
    city: neighborhood.city,
    neighborhood: neighborhood.neighborhood,
    eligible,
    score: availableWeight ? Math.round(weighted / availableWeight) : null,
    coverage: potentialWeight ? Math.round((availableWeight / potentialWeight) * 100) : 0,
    unavailable,
  };
}

export function rankNeighborhoodsForProfile(profile: DynamicSearchProfileV2, neighborhoods: NeighborhoodIntelligenceRecordV2[]): NeighborhoodCandidateScore[] {
  return neighborhoods.map((n) => scoreNeighborhoodForProfile(profile, n)).sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.score != null && b.score != null) return b.score - a.score;
    if (a.score != null) return -1;
    if (b.score != null) return 1;
    return a.neighborhood.localeCompare(b.neighborhood);
  });
}

export function executeCompanionPropertySearch<T>(profile: DynamicSearchProfileV2, candidates: PersonalizedRankingCandidate<T>[]) {
  const ranked = rankCandidatesByPersonalFit(profile, candidates);
  return {
    eligible: ranked.filter((item) => item.fit.eligible),
    eliminated: ranked.filter((item) => !item.fit.eligible).map((item) => ({ property_id: item.property.id, reasons: item.fit.hard_mismatches })),
  };
}
