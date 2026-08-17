import {
  DYNAMIC_SEARCH_PROFILE_VERSION,
  type DynamicSearchProfileV2,
  type IntendedUse,
  type NeighborhoodPreferenceKey,
  type SearchObjective,
} from "@/lib/search-profile-v2/types";

const OBJECTIVES = new Set<SearchObjective>(["buy", "rent", "invest", "new_build", "compare", "explore"]);
const USES = new Set<IntendedUse>([
  "primary_residence", "secondary_residence", "long_term_rental_investment", "short_term_rental_investment",
  "pied_a_terre", "student_housing", "family_housing", "retirement", "professional_use", "land_development",
]);
const PREFERENCES = new Set<NeighborhoodPreferenceKey>([
  "calmness", "animation", "family_fit", "nightlife", "commerce_access", "school_access", "public_transport",
  "car_accessibility", "walkability", "greenery", "coastal_lifestyle", "tourism_intensity", "centrality",
  "long_term_rental_fit", "short_term_rental_fit", "student_fit", "mre_fit", "expat_fit", "corporate_fit",
  "development_momentum",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function nullableFinite(value: unknown): boolean {
  return value == null || (typeof value === "number" && Number.isFinite(value));
}

export function parseDynamicSearchProfileV2(value: unknown): DynamicSearchProfileV2 | null {
  const root = record(value);
  if (!root || root.version !== DYNAMIC_SEARCH_PROFILE_VERSION || typeof root.updated_at !== "string") return null;

  const location = record(root.location);
  const budget = record(root.budget);
  const property = record(root.property);
  const tolerances = record(root.tolerances);
  const personalContext = record(root.personal_context);
  if (!location || !budget || !property || !tolerances || !personalContext) return null;

  if (!stringArray(location.preferred_cities) || !Array.isArray(location.preferred_neighborhoods) || !Array.isArray(location.excluded_neighborhoods) || !Array.isArray(location.anchors) || typeof location.flexible_radius !== "boolean") return null;
  for (const anchor of location.anchors) {
    const a = record(anchor);
    if (!a || typeof a.label !== "string") return null;
    if (a.city != null && typeof a.city !== "string") return null;
    if (!nullableFinite(a.latitude) || !nullableFinite(a.longitude) || !nullableFinite(a.max_minutes)) return null;
  }

  if (!nullableFinite(budget.purchase_max_mad) || !nullableFinite(budget.rent_monthly_max_mad) || !nullableFinite(budget.down_payment_mad) || typeof budget.budget_flex_pct !== "number" || !Number.isFinite(budget.budget_flex_pct)) return null;
  if (!stringArray(property.property_types) || !nullableFinite(property.min_surface_m2) || !nullableFinite(property.max_surface_m2) || !nullableFinite(property.min_bedrooms) || !nullableFinite(property.max_bedrooms) || !stringArray(property.required_features) || !stringArray(property.excluded_features)) return null;
  if (property.new_only != null && typeof property.new_only !== "boolean") return null;
  if (property.works_accepted != null && typeof property.works_accepted !== "boolean") return null;

  const objective = root.objective;
  if (objective != null) {
    const signal = record(objective);
    if (!signal || typeof signal.value !== "string" || !OBJECTIVES.has(signal.value as SearchObjective)) return null;
  }
  const intendedUses = root.intended_uses;
  if (intendedUses != null) {
    const signal = record(intendedUses);
    if (!signal || !Array.isArray(signal.value) || !signal.value.every((item) => typeof item === "string" && USES.has(item as IntendedUse))) return null;
  }

  if (!Array.isArray(root.neighborhood_preferences)) return null;
  for (const pref of root.neighborhood_preferences) {
    const p = record(pref);
    if (!p || typeof p.key !== "string" || !PREFERENCES.has(p.key as NeighborhoodPreferenceKey)) return null;
  }
  if (!stringArray(root.priorities) || !Array.isArray(root.absolute_constraints)) return null;

  if (!nullableFinite(tolerances.tourism_intensity_max) || !nullableFinite(tolerances.commute_minutes_max)) return null;
  if (typeof tolerances.renovation_tolerance !== "string" || typeof tolerances.location_flexibility !== "string" || typeof tolerances.price_flexibility !== "string") return null;

  return value as DynamicSearchProfileV2;
}
