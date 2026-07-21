import type { DynamicSearchProfileV2, Importance, NeighborhoodPreferenceKey, PreferenceDirection, ProfileConfidence, ProfileEvidenceSource, SearchObjective, IntendedUse } from "./types";

export type SearchProfileEvent =
  | { type: "objective"; value: SearchObjective }
  | { type: "uses"; values: IntendedUse[] }
  | { type: "budget"; purchase_max_mad?: number | null; rent_monthly_max_mad?: number | null; budget_flex_pct?: number }
  | { type: "cities"; values: string[] }
  | { type: "property"; property_types?: string[]; min_surface_m2?: number | null; min_bedrooms?: number | null; required_features?: string[]; works_accepted?: boolean | null }
  | { type: "preference"; key: NeighborhoodPreferenceKey; direction: PreferenceDirection; importance: Importance; target?: number | null; source?: ProfileEvidenceSource; confidence?: ProfileConfidence }
  | { type: "priorities"; values: string[] }
  | { type: "tourism_tolerance"; max: number | null };

function clean(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].slice(0, 50);
}

function nonNegative(value: number | null | undefined): number | null | undefined {
  if (value == null) return value;
  if (!Number.isFinite(value) || value < 0) throw new Error("PROFILE_NUMERIC_VALUE_INVALID");
  return value;
}

function signal<T>(value: T, now: string, source: ProfileEvidenceSource = "explicit", confidence: ProfileConfidence = "high") {
  return { value, source, confidence, updated_at: now };
}

export function applySearchProfileEvent(profile: DynamicSearchProfileV2, event: SearchProfileEvent, now = new Date().toISOString()): DynamicSearchProfileV2 {
  const next = structuredClone(profile);
  next.updated_at = now;
  switch (event.type) {
    case "objective": next.objective = signal(event.value, now); break;
    case "uses": next.intended_uses = signal([...new Set(event.values)], now); break;
    case "budget":
      if ("purchase_max_mad" in event) next.budget.purchase_max_mad = nonNegative(event.purchase_max_mad) ?? null;
      if ("rent_monthly_max_mad" in event) next.budget.rent_monthly_max_mad = nonNegative(event.rent_monthly_max_mad) ?? null;
      if (event.budget_flex_pct != null) {
        if (event.budget_flex_pct < 0 || event.budget_flex_pct > 50) throw new Error("PROFILE_BUDGET_FLEX_INVALID");
        next.budget.budget_flex_pct = event.budget_flex_pct;
      }
      break;
    case "cities": next.location.preferred_cities = clean(event.values); break;
    case "property":
      if (event.property_types) next.property.property_types = clean(event.property_types);
      if ("min_surface_m2" in event) next.property.min_surface_m2 = nonNegative(event.min_surface_m2) ?? null;
      if ("min_bedrooms" in event) next.property.min_bedrooms = nonNegative(event.min_bedrooms) ?? null;
      if (event.required_features) next.property.required_features = clean(event.required_features);
      if ("works_accepted" in event) next.property.works_accepted = event.works_accepted ?? null;
      break;
    case "preference": {
      if (event.target != null && (event.target < 0 || event.target > 10)) throw new Error("PROFILE_PREFERENCE_TARGET_INVALID");
      const source = event.source ?? "explicit";
      const confidence = event.confidence ?? (source === "behavioral_inference" ? "low" : "high");
      next.neighborhood_preferences = [
        ...next.neighborhood_preferences.filter((p) => p.key !== event.key),
        { key: event.key, direction: event.direction, importance: event.importance, target: event.target ?? null, signal: signal(true, now, source, confidence) },
      ];
      break;
    }
    case "priorities": next.priorities = clean(event.values); break;
    case "tourism_tolerance":
      if (event.max != null && (event.max < 0 || event.max > 10)) throw new Error("PROFILE_TOURISM_TOLERANCE_INVALID");
      next.tolerances.tourism_intensity_max = event.max;
      break;
  }
  return next;
}

export function profileIsSearchReady(profile: DynamicSearchProfileV2): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!profile.objective) missing.push("objective");
  if (!profile.intended_uses?.value.length) missing.push("intended_uses");
  if (!profile.location.preferred_cities.length && !profile.location.preferred_neighborhoods.length) missing.push("location");
  if (["buy", "invest", "new_build"].includes(profile.objective?.value ?? "") && profile.budget.purchase_max_mad == null) missing.push("purchase_budget");
  if (profile.objective?.value === "rent" && profile.budget.rent_monthly_max_mad == null) missing.push("rent_budget");
  return { ready: missing.length === 0, missing };
}

export function deriveNeighborhoodPreferenceWeights(profile: DynamicSearchProfileV2): Record<string, number> {
  const base: Record<Importance, number> = { low: 1, medium: 2, high: 4, must: 8 };
  const out: Record<string, number> = {};
  for (const p of profile.neighborhood_preferences) {
    const confidence = p.signal.confidence === "high" ? 1 : p.signal.confidence === "medium" ? 0.75 : 0.4;
    const source = p.signal.source === "explicit" ? 1 : p.signal.source === "companion_derived" ? 0.85 : 0.5;
    out[p.key] = base[p.importance] * confidence * source;
  }
  return out;
}
