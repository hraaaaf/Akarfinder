import type { DynamicSearchProfileV2 } from "@/lib/search-profile-v2/types";

/**
 * Deterministic Companion → Search hand-off.
 *
 * Search-supported constraints are sent through canonical structured params.
 * Richer profile data is preserved in namespaced `profile_*` params so the
 * guided intent is never silently discarded while Search/Mon Projet consume
 * progressively more of Dynamic Search Profile V2.
 */
export function companionProfileToSearchParams(profile: DynamicSearchProfileV2): URLSearchParams {
  const params = new URLSearchParams();
  const objective = profile.objective?.value;

  if (objective === "rent") params.set("transaction_type", "rent");
  else if (objective === "new_build") params.set("transaction_type", "new");
  else if (objective === "buy" || objective === "invest") params.set("transaction_type", "buy");

  const city = profile.location.preferred_cities[0];
  if (city) params.set("city", city);
  if (profile.location.preferred_cities.length > 1) {
    params.set("profile_cities", profile.location.preferred_cities.join(","));
  }

  const neighborhood = profile.location.preferred_neighborhoods[0]?.neighborhood;
  if (neighborhood) params.set("q", neighborhood);
  if (profile.location.preferred_neighborhoods.length > 0) {
    params.set(
      "profile_neighborhoods",
      profile.location.preferred_neighborhoods
        .map((item) => `${item.city}:${item.neighborhood}`)
        .join("|"),
    );
  }
  if (profile.location.excluded_neighborhoods.length > 0) {
    params.set(
      "profile_excluded_neighborhoods",
      profile.location.excluded_neighborhoods
        .map((item) => `${item.city}:${item.neighborhood}`)
        .join("|"),
    );
  }

  const propertyType = profile.property.property_types[0];
  if (propertyType) params.set("property_type", propertyType);
  if (profile.property.property_types.length > 1) {
    params.set("profile_property_types", profile.property.property_types.join(","));
  }

  const budgetMax = objective === "rent"
    ? profile.budget.rent_monthly_max_mad
    : profile.budget.purchase_max_mad;
  if (budgetMax != null) params.set("max_price", String(budgetMax));
  if (profile.budget.down_payment_mad != null) {
    params.set("profile_down_payment", String(profile.budget.down_payment_mad));
  }
  if (profile.budget.budget_flex_pct > 0) {
    params.set("profile_budget_flex_pct", String(profile.budget.budget_flex_pct));
  }

  if (profile.property.min_surface_m2 != null) {
    params.set("min_surface", String(profile.property.min_surface_m2));
  }
  if (profile.property.max_surface_m2 != null) {
    params.set("max_surface", String(profile.property.max_surface_m2));
  }
  if (profile.property.min_bedrooms != null) {
    params.set("min_bedrooms", String(profile.property.min_bedrooms));
  }
  if (profile.property.max_bedrooms != null) {
    params.set("max_bedrooms", String(profile.property.max_bedrooms));
  }
  if (profile.property.required_features.length > 0) {
    params.set("profile_required_features", profile.property.required_features.join(","));
  }
  if (profile.property.excluded_features.length > 0) {
    params.set("profile_excluded_features", profile.property.excluded_features.join(","));
  }
  if (profile.property.new_only != null) {
    params.set("profile_new_only", profile.property.new_only ? "1" : "0");
  }
  if (profile.property.works_accepted != null) {
    params.set("profile_works_accepted", profile.property.works_accepted ? "1" : "0");
  }

  if (profile.intended_uses?.value.length) {
    params.set("profile_intended_uses", profile.intended_uses.value.join(","));
  }
  if (profile.neighborhood_preferences.length > 0) {
    params.set(
      "profile_neighborhood_preferences",
      profile.neighborhood_preferences
        .map((preference) => `${preference.key}:${preference.direction}:${preference.importance}`)
        .join("|"),
    );
  }
  if (profile.priorities.length > 0) {
    params.set("profile_priorities", profile.priorities.join(","));
  }

  params.set("profile_version", profile.version);
  params.set("guided", "1");
  return params;
}
