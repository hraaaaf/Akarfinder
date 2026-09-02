import type { DynamicSearchProfileV2, Importance, NeighborhoodPreferenceKey, PreferenceDirection, ProfileConfidence, ProfileEvidenceSource, SearchObjective, IntendedUse } from "./types";

type SearchProfileAnchor = DynamicSearchProfileV2["location"]["anchors"][number];

export type SearchProfileEvent =
  | { type: "objective"; value: SearchObjective }
  | { type: "uses"; values: IntendedUse[] }
  | { type: "budget"; purchase_max_mad?: number | null; rent_monthly_max_mad?: number | null; budget_flex_pct?: number }
  | { type: "cities"; values: string[] }
  | { type: "anchors"; values: SearchProfileAnchor[] }
  | { type: "personal_context"; children_count?: number | null; accessibility_need?: boolean | null; mre_context?: boolean | null; student_context?: boolean | null; corporate_context?: boolean | null; remote_work?: boolean | null; source?: ProfileEvidenceSource; confidence?: ProfileConfidence }
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

function cleanAnchorText(value: unknown, max = 120): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") throw new Error("PROFILE_ANCHOR_TEXT_INVALID");
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > max) throw new Error("PROFILE_ANCHOR_TEXT_INVALID");
  return cleaned;
}

function normalizeAnchors(values: SearchProfileAnchor[]): SearchProfileAnchor[] {
  if (!Array.isArray(values)) throw new Error("PROFILE_ANCHOR_VALUES_INVALID");
  if (values.length > 10) throw new Error("PROFILE_ANCHOR_LIMIT_EXCEEDED");
  const normalized = values.map((value) => {
    if (!value || typeof value !== "object") throw new Error("PROFILE_ANCHOR_VALUE_INVALID");
    const label = cleanAnchorText(value.label)!;
    const city = cleanAnchorText(value.city, 120);
    const hasLat = value.latitude != null;
    const hasLng = value.longitude != null;
    if (hasLat !== hasLng) throw new Error("PROFILE_ANCHOR_COORDINATES_INCOMPLETE");
    if (hasLat && hasLng) {
      if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || value.latitude! < -90 || value.latitude! > 90 || value.longitude! < -180 || value.longitude! > 180) {
        throw new Error("PROFILE_ANCHOR_COORDINATES_INVALID");
      }
    }
    if (value.max_minutes != null && (!Number.isInteger(value.max_minutes) || value.max_minutes < 1 || value.max_minutes > 180)) {
      throw new Error("PROFILE_ANCHOR_MAX_MINUTES_INVALID");
    }
    return {
      label,
      ...(city ? { city } : {}),
      ...(hasLat && hasLng ? { latitude: value.latitude, longitude: value.longitude } : {}),
      ...(value.max_minutes != null ? { max_minutes: value.max_minutes } : {}),
    };
  });
  const seen = new Set<string>();
  return normalized.filter((value) => {
    const key = `${value.label.toLocaleLowerCase("fr")}|${value.latitude ?? ""}|${value.longitude ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function signal<T>(value: T, now: string, source: ProfileEvidenceSource = "explicit", confidence: ProfileConfidence = "high") {
  return { value, source, confidence, updated_at: now };
}

function contextSignalOptions(source: ProfileEvidenceSource | undefined, confidence: ProfileConfidence | undefined) {
  if (source != null && !(["explicit", "behavioral_inference", "companion_derived"] as const).includes(source)) {
    throw new Error("PROFILE_CONTEXT_SOURCE_INVALID");
  }
  if (confidence != null && !(["high", "medium", "low"] as const).includes(confidence)) {
    throw new Error("PROFILE_CONTEXT_CONFIDENCE_INVALID");
  }
  const resolvedSource = source ?? "explicit";
  return {
    source: resolvedSource,
    confidence: confidence ?? (resolvedSource === "behavioral_inference" ? "low" : "high"),
  } as const;
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
    case "anchors": next.location.anchors = normalizeAnchors(event.values); break;
    case "personal_context": {
      const { source, confidence } = contextSignalOptions(event.source, event.confidence);
      if ("children_count" in event) {
        if (event.children_count == null) delete next.personal_context.children_count;
        else {
          if (!Number.isInteger(event.children_count) || event.children_count < 0 || event.children_count > 20) throw new Error("PROFILE_CHILDREN_COUNT_INVALID");
          next.personal_context.children_count = signal(event.children_count, now, source, confidence);
        }
      }
      for (const key of ["accessibility_need", "mre_context", "student_context", "corporate_context", "remote_work"] as const) {
        if (!(key in event)) continue;
        const value = event[key];
        if (value == null) delete next.personal_context[key];
        else {
          if (typeof value !== "boolean") throw new Error("PROFILE_CONTEXT_BOOLEAN_INVALID");
          next.personal_context[key] = signal(value, now, source, confidence);
        }
      }
      break;
    }
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
