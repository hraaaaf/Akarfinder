export const DYNAMIC_SEARCH_PROFILE_VERSION = "2.0" as const;

export type SearchObjective = "buy" | "rent" | "invest" | "new_build" | "compare" | "explore";
export type IntendedUse =
  | "primary_residence"
  | "secondary_residence"
  | "long_term_rental_investment"
  | "short_term_rental_investment"
  | "pied_a_terre"
  | "student_housing"
  | "family_housing"
  | "retirement"
  | "professional_use"
  | "land_development";

export type ProfileEvidenceSource = "explicit" | "behavioral_inference" | "companion_derived";
export type ProfileConfidence = "high" | "medium" | "low";
export type Importance = "low" | "medium" | "high" | "must";
export type PreferenceDirection = "prefer_high" | "prefer_low" | "target" | "avoid";

export type ProfileSignal<T> = {
  value: T;
  source: ProfileEvidenceSource;
  confidence: ProfileConfidence;
  updated_at: string;
};

export type SearchLocationProfile = {
  preferred_cities: string[];
  preferred_neighborhoods: Array<{ city: string; neighborhood: string }>;
  excluded_neighborhoods: Array<{ city: string; neighborhood: string }>;
  anchors: Array<{ label: string; city?: string; latitude?: number; longitude?: number; max_minutes?: number }>;
  flexible_radius: boolean;
};

export type SearchBudgetProfile = {
  purchase_max_mad: number | null;
  rent_monthly_max_mad: number | null;
  down_payment_mad: number | null;
  budget_flex_pct: number;
};

export type SearchPropertyConstraints = {
  property_types: string[];
  min_surface_m2: number | null;
  max_surface_m2: number | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  required_features: string[];
  excluded_features: string[];
  new_only: boolean | null;
  works_accepted: boolean | null;
};

export type AbsoluteConstraint = {
  key: string;
  operator: "eq" | "neq" | "gte" | "lte" | "in" | "not_in";
  value: string | number | boolean | string[];
  reason?: string;
};

export type NeighborhoodPreferenceKey =
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

export type NeighborhoodPreference = {
  key: NeighborhoodPreferenceKey;
  direction: PreferenceDirection;
  target?: number | null;
  importance: Importance;
  signal: ProfileSignal<true>;
};

export type SearchToleranceProfile = {
  tourism_intensity_max: number | null;
  commute_minutes_max: number | null;
  renovation_tolerance: "none" | "light" | "major" | "unknown";
  location_flexibility: "strict" | "adjacent" | "city_wide" | "regional";
  price_flexibility: "strict" | "small" | "moderate";
};

export type UsefulPersonalContext = {
  children_count?: ProfileSignal<number>;
  accessibility_need?: ProfileSignal<boolean>;
  mre_context?: ProfileSignal<boolean>;
  student_context?: ProfileSignal<boolean>;
  corporate_context?: ProfileSignal<boolean>;
  remote_work?: ProfileSignal<boolean>;
  freeform_facts: Record<string, ProfileSignal<string | number | boolean>>;
};

export type DynamicSearchProfileV2 = {
  version: typeof DYNAMIC_SEARCH_PROFILE_VERSION;
  objective: ProfileSignal<SearchObjective> | null;
  intended_uses: ProfileSignal<IntendedUse[]> | null;
  personal_context: UsefulPersonalContext;
  location: SearchLocationProfile;
  budget: SearchBudgetProfile;
  property: SearchPropertyConstraints;
  absolute_constraints: AbsoluteConstraint[];
  neighborhood_preferences: NeighborhoodPreference[];
  priorities: string[];
  tolerances: SearchToleranceProfile;
  updated_at: string;
};

export function createEmptyDynamicSearchProfileV2(now = new Date().toISOString()): DynamicSearchProfileV2 {
  return {
    version: "2.0",
    objective: null,
    intended_uses: null,
    personal_context: { freeform_facts: {} },
    location: { preferred_cities: [], preferred_neighborhoods: [], excluded_neighborhoods: [], anchors: [], flexible_radius: true },
    budget: { purchase_max_mad: null, rent_monthly_max_mad: null, down_payment_mad: null, budget_flex_pct: 0 },
    property: { property_types: [], min_surface_m2: null, max_surface_m2: null, min_bedrooms: null, max_bedrooms: null, required_features: [], excluded_features: [], new_only: null, works_accepted: null },
    absolute_constraints: [],
    neighborhood_preferences: [],
    priorities: [],
    tolerances: { tourism_intensity_max: null, commute_minutes_max: null, renovation_tolerance: "unknown", location_flexibility: "city_wide", price_flexibility: "strict" },
    updated_at: now,
  };
}
