import type { NeighborhoodIntelligenceRecordV2, AkarNeighborhoodScoreKey } from "@/lib/neighborhood-intelligence/schema-v2";
import type { DynamicSearchProfileV2, Importance } from "@/lib/search-profile-v2/types";

export const PROPERTY_FIT_ENGINE_VERSION = "1.0" as const;

export type FitPropertyInput = {
  id: string;
  city: string | null;
  neighborhood: string | null;
  property_type: string | null;
  price_mad: number | null;
  surface_m2: number | null;
  bedrooms: number | null;
  features: Record<string, boolean | null | undefined>;
};

export type FitComponent = {
  key: string;
  score: number;
  weight: number;
  explanation: string;
  source: "property" | "neighborhood";
};

export type PropertyFitResult = {
  version: typeof PROPERTY_FIT_ENGINE_VERSION;
  property_id: string;
  eligible: boolean;
  score: number | null;
  coverage: number;
  hard_mismatches: string[];
  strong_matches: string[];
  compromises: string[];
  unavailable: string[];
  components: FitComponent[];
};

const IMPORTANCE_WEIGHT: Record<Importance, number> = { low: 1, medium: 2, high: 4, must: 8 };

function profileSignalFactor(source: string, confidence: string): number {
  const sourceFactor = source === "explicit" ? 1 : source === "companion_derived" ? 0.85 : 0.5;
  const confidenceFactor = confidence === "high" ? 1 : confidence === "medium" ? 0.75 : 0.4;
  return sourceFactor * confidenceFactor;
}

function preferenceScore(value: number, direction: string, target?: number | null): number {
  const bounded = Math.max(0, Math.min(10, value));
  if (direction === "prefer_low" || direction === "avoid") return (10 - bounded) * 10;
  if (direction === "target" && target != null) return Math.max(0, 100 - Math.abs(bounded - target) * 10);
  return bounded * 10;
}

export function computePropertyFit(
  profile: DynamicSearchProfileV2,
  property: FitPropertyInput,
  neighborhood: NeighborhoodIntelligenceRecordV2 | null,
): PropertyFitResult {
  const components: FitComponent[] = [];
  const hard: string[] = [];
  const unavailable: string[] = [];
  let potentialWeight = 0;

  const add = (key: string, score: number, weight: number, explanation: string, source: "property"|"neighborhood") => {
    potentialWeight += weight;
    components.push({ key, score: Math.max(0, Math.min(100, score)), weight, explanation, source });
  };
  const missing = (key: string, weight: number) => { potentialWeight += weight; unavailable.push(key); };

  if (profile.property.property_types.length) {
    const weight = 8;
    if (!property.property_type) missing("property_type", weight);
    else if (!profile.property.property_types.includes(property.property_type)) { potentialWeight += weight; hard.push("Type de bien incompatible avec vos contraintes"); }
    else add("property_type", 100, weight, "Type de bien conforme", "property");
  }

  const budgetMax = profile.objective?.value === "rent" ? profile.budget.rent_monthly_max_mad : profile.budget.purchase_max_mad;
  if (budgetMax != null) {
    const weight = 8;
    if (property.price_mad == null) missing("price", weight);
    else {
      const allowed = budgetMax * (1 + profile.budget.budget_flex_pct / 100);
      if (property.price_mad > allowed) { potentialWeight += weight; hard.push("Budget maximum dépassé"); }
      else add("budget", property.price_mad <= budgetMax ? 100 : 70, weight, property.price_mad <= budgetMax ? "Dans le budget" : "Dans la marge de flexibilité budgétaire", "property");
    }
  }

  if (profile.property.min_surface_m2 != null) {
    const weight = 5;
    if (property.surface_m2 == null) missing("surface", weight);
    else if (property.surface_m2 < profile.property.min_surface_m2) { potentialWeight += weight; hard.push("Surface inférieure au minimum demandé"); }
    else add("surface", 100, weight, "Surface minimale respectée", "property");
  }

  if (profile.property.min_bedrooms != null) {
    const weight = 5;
    if (property.bedrooms == null) missing("bedrooms", weight);
    else if (property.bedrooms < profile.property.min_bedrooms) { potentialWeight += weight; hard.push("Nombre de chambres insuffisant"); }
    else add("bedrooms", 100, weight, "Nombre de chambres conforme", "property");
  }

  for (const feature of profile.property.required_features) {
    const weight = 4;
    const value = property.features[feature];
    if (value == null) missing(`feature:${feature}`, weight);
    else if (!value) { potentialWeight += weight; hard.push(`Équipement requis absent : ${feature}`); }
    else add(`feature:${feature}`, 100, weight, `Équipement requis présent : ${feature}`, "property");
  }

  if (profile.location.preferred_cities.length) {
    const weight = 4;
    if (!property.city) missing("city", weight);
    else if (profile.location.preferred_cities.includes(property.city)) add("city", 100, weight, "Ville recherchée", "property");
    else if (profile.tolerances.location_flexibility === "strict") { potentialWeight += weight; hard.push("Localisation hors zone stricte"); }
    else add("city", 40, weight, "Localisation hors zone préférée mais flexibilité autorisée", "property");
  }

  for (const preference of profile.neighborhood_preferences) {
    const weight = IMPORTANCE_WEIGHT[preference.importance] * profileSignalFactor(preference.signal.source, preference.signal.confidence);
    potentialWeight += weight;
    const evidence = neighborhood?.akar_scores[preference.key as AkarNeighborhoodScoreKey];
    if (!evidence || evidence.value == null || evidence.confidence === "unknown") {
      unavailable.push(`neighborhood:${preference.key}`);
      continue;
    }
    const score = preferenceScore(evidence.value, preference.direction, preference.target);
    components.push({ key: `neighborhood:${preference.key}`, score, weight, explanation: `${preference.key} évalué avec données de quartier`, source: "neighborhood" });
    if (preference.importance === "must" && score < 50) hard.push(`Préférence indispensable non satisfaite : ${preference.key}`);
  }

  if (profile.tolerances.tourism_intensity_max != null) {
    const weight = 5;
    potentialWeight += weight;
    const tourism = neighborhood?.akar_scores.tourism_intensity;
    if (!tourism || tourism.value == null || tourism.confidence === "unknown") unavailable.push("neighborhood:tourism_intensity_tolerance");
    else if (tourism.value > profile.tolerances.tourism_intensity_max) hard.push("Intensité touristique supérieure à votre tolérance");
    else components.push({ key: "tourism_tolerance", score: 100, weight, explanation: "Intensité touristique compatible", source: "neighborhood" });
  }

  const availableWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const weightedScore = availableWeight > 0 ? components.reduce((sum, c) => sum + c.score * c.weight, 0) / availableWeight : null;
  const coverage = potentialWeight > 0 ? Math.round((availableWeight / potentialWeight) * 100) : 0;
  const score = weightedScore == null ? null : Math.round(weightedScore);

  return {
    version: "1.0",
    property_id: property.id,
    eligible: hard.length === 0,
    score,
    coverage,
    hard_mismatches: [...new Set(hard)],
    strong_matches: components.filter((c) => c.score >= 80).map((c) => c.explanation),
    compromises: components.filter((c) => c.score >= 40 && c.score < 80).map((c) => c.explanation),
    unavailable: [...new Set(unavailable)],
    components,
  };
}
