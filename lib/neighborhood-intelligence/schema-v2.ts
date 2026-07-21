export const NEIGHBORHOOD_INTELLIGENCE_SCHEMA_VERSION = "2.0" as const;

export type NeighborhoodConfidence = "high" | "medium" | "low" | "unknown";
export type NeighborhoodEvidenceKind = "objective" | "analysis" | "derived_score";
export type NeighborhoodSourceClass =
  | "official"
  | "operational_reference"
  | "secondary_benchmark"
  | "open_data"
  | "partner"
  | "market_observation";

export type NeighborhoodSourceRef = {
  id: string;
  source_name: string;
  source_class: NeighborhoodSourceClass;
  observed_at: string;
  url?: string | null;
  note?: string | null;
};

export type EvidenceValue<T> = {
  value: T | null;
  evidence_kind: NeighborhoodEvidenceKind;
  confidence: NeighborhoodConfidence;
  source_refs: string[];
  observed_at: string | null;
  method_version?: string | null;
};

export type RelativeStanding = "accessible" | "core_market" | "premium" | "prestige" | "unknown";
export type UrbanType =
  | "residential"
  | "residential_prime"
  | "mixed"
  | "commercial_mixed"
  | "tertiary_mixed"
  | "administrative"
  | "institutional"
  | "touristic"
  | "touristic_residential"
  | "coastal_residential"
  | "golf_gated_residential"
  | "heritage"
  | "periurban"
  | "industrial_residential"
  | "diplomatic_residential"
  | "student"
  | "other";

export type MorphologyType = "dense_urban" | "mid_density" | "low_density" | "villa_zone" | "periurban" | "mixed" | "unknown";
export type DevelopmentStage = "established" | "maturing" | "developing" | "new_programs" | "redeveloping" | "unknown";

export type NeighborhoodObjectiveFacts = {
  apartment_price_m2_mad: EvidenceValue<number>;
  villa_price_m2_mad: EvidenceValue<number>;
  city_apartment_price_m2_mad: EvidenceValue<number>;
  city_villa_price_m2_mad: EvidenceValue<number>;
  official_price_trend_pct: EvidenceValue<number>;
  official_transactions_trend_pct: EvidenceValue<number>;
  tram_access: EvidenceValue<boolean>;
  rail_access: EvidenceValue<boolean>;
  public_transport_access: EvidenceValue<number>;
  school_access: EvidenceValue<number>;
  healthcare_access: EvidenceValue<number>;
  commerce_access: EvidenceValue<number>;
  green_space_access: EvidenceValue<number>;
  beach_access: EvidenceValue<number>;
  distance_to_coast_km: EvidenceValue<number>;
  road_accessibility: EvidenceValue<number>;
  walkability_evidence: EvidenceValue<number>;
  nightlife_venue_density: EvidenceValue<number>;
  new_programs_presence: EvidenceValue<boolean>;
};

export type NeighborhoodAnalysis = {
  relative_standing: EvidenceValue<RelativeStanding>;
  dominant_urban_type: EvidenceValue<UrbanType>;
  secondary_urban_types: EvidenceValue<UrbanType[]>;
  morphology: EvidenceValue<MorphologyType>;
  development_stage: EvidenceValue<DevelopmentStage>;
  market_maturity: EvidenceValue<"mature" | "intermediate" | "emerging" | "unknown">;
  residential_intensity: EvidenceValue<number>;
  business_intensity: EvidenceValue<number>;
  administrative_intensity: EvidenceValue<number>;
  tourism_intensity_analysis: EvidenceValue<number>;
  student_intensity: EvidenceValue<number>;
  industrial_intensity: EvidenceValue<number>;
  heritage_intensity: EvidenceValue<number>;
  coastal_character: EvidenceValue<number>;
  rental_profile: EvidenceValue<"long_term" | "short_term" | "mixed" | "limited" | "unknown">;
  audience_signals: EvidenceValue<Array<"mre" | "expat" | "student" | "family" | "corporate">>;
  development_outlook: EvidenceValue<"stable" | "positive" | "uncertain" | "transforming" | "unknown">;
};

export type AkarNeighborhoodScoreKey =
  | "calmness"
  | "animation"
  | "family_fit"
  | "nightlife"
  | "commerce_access"
  | "school_access"
  | "public_transport"
  | "car_accessibility"
  | "walkability"
  | "greenery"
  | "coastal_lifestyle"
  | "tourism_intensity"
  | "centrality"
  | "long_term_rental_fit"
  | "short_term_rental_fit"
  | "student_fit"
  | "mre_fit"
  | "expat_fit"
  | "corporate_fit"
  | "development_momentum";

export type NeighborhoodScore = EvidenceValue<number> & { value: number | null };
export type AkarNeighborhoodScores = Record<AkarNeighborhoodScoreKey, NeighborhoodScore>;

export type NeighborhoodIntelligenceRecordV2 = {
  schema_version: typeof NEIGHBORHOOD_INTELLIGENCE_SCHEMA_VERSION;
  city: string;
  city_slug: string;
  neighborhood: string;
  neighborhood_slug: string;
  aliases: string[];
  objective_facts: NeighborhoodObjectiveFacts;
  analysis: NeighborhoodAnalysis;
  akar_scores: AkarNeighborhoodScores;
  sources: NeighborhoodSourceRef[];
  record_confidence: NeighborhoodConfidence;
  updated_at: string;
};

export const AKAR_NEIGHBORHOOD_SCORE_KEYS: readonly AkarNeighborhoodScoreKey[] = [
  "calmness","animation","family_fit","nightlife","commerce_access","school_access","public_transport","car_accessibility","walkability","greenery","coastal_lifestyle","tourism_intensity","centrality","long_term_rental_fit","short_term_rental_fit","student_fit","mre_fit","expat_fit","corporate_fit","development_momentum",
] as const;

export function emptyEvidence<T>(kind: NeighborhoodEvidenceKind = "objective"): EvidenceValue<T> {
  return { value: null, evidence_kind: kind, confidence: "unknown", source_refs: [], observed_at: null };
}

export function emptyNeighborhoodScores(): AkarNeighborhoodScores {
  return Object.fromEntries(AKAR_NEIGHBORHOOD_SCORE_KEYS.map((key) => [key, emptyEvidence<number>("derived_score")])) as AkarNeighborhoodScores;
}

export function assertNeighborhoodScore(score: number | null): number | null {
  if (score == null) return null;
  if (!Number.isFinite(score) || score < 0 || score > 10) throw new Error("Neighborhood scores must be between 0 and 10");
  return score;
}
