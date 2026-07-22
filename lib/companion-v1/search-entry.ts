import type { DynamicSearchProfileV2 } from "@/lib/search-profile-v2/types";

export function companionProfileToSearchParams(profile: DynamicSearchProfileV2): URLSearchParams {
  const params = new URLSearchParams();
  const objective = profile.objective?.value;
  if (objective === "rent") params.set("type", "rent");
  else if (objective === "new_build") params.set("type", "new");

  const city = profile.location.preferred_cities[0];
  if (city) params.set("city", city);

  const propertyType = profile.property.property_types[0];
  if (propertyType) params.set("property_type", propertyType);

  const budgetMax = objective === "rent"
    ? profile.budget.rent_monthly_max_mad
    : profile.budget.purchase_max_mad;
  if (budgetMax != null) params.set("budget_max", String(budgetMax));

  if (profile.property.min_surface_m2 != null) {
    params.set("surface_min", String(profile.property.min_surface_m2));
  }

  if (profile.property.min_bedrooms != null) {
    params.set("bedrooms_min", String(profile.property.min_bedrooms));
  }

  params.set("guided", "1");
  return params;
}
