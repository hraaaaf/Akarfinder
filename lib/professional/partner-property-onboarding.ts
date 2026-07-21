import { PROPERTY_SCHEMA_VERSION, type CanonicalPropertyType } from "@/lib/property-schema/core";

export const PARTNER_PROPERTY_ONBOARDING_VERSION = "1.0" as const;
export const PARTNER_PROPERTY_ONBOARDING_SCHEMA_VERSION = PROPERTY_SCHEMA_VERSION;

export type PartnerOnboardingFieldCategory = "required" | "conditional" | "valued" | "derived";
export type PartnerOnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type PartnerDeclaredFacts = Record<string, unknown>;

export type PartnerOnboardingFieldRule = {
  path: string;
  step: PartnerOnboardingStep;
  category: PartnerOnboardingFieldCategory;
  weight: number;
  propertyTypes?: CanonicalPropertyType[];
  when?: (facts: PartnerDeclaredFacts) => boolean;
};

export const PARTNER_ONBOARDING_STEPS = [
  { step: 1, key: "identity", label: "Identité du bien" },
  { step: 2, key: "use_potential", label: "Usage & potentiel" },
  { step: 3, key: "location_environment", label: "Localisation & environnement" },
  { step: 4, key: "characteristics_lifestyle", label: "Caractéristiques & mode de vie" },
  { step: 5, key: "investment_costs", label: "Investissement & coûts" },
  { step: 6, key: "media_projection", label: "Médias & projection" },
  { step: 7, key: "transparency_publication", label: "Transparence, vérification & publication" },
] as const;

// This is the guided partner surface, not the whole Property Schema.
// The canonical schema remains exhaustive; only context-relevant fields are displayed.
export const PARTNER_ONBOARDING_FIELD_RULES: readonly PartnerOnboardingFieldRule[] = [
  { path: "classification.property_type", step: 1, category: "required", weight: 5 },
  { path: "offer.transaction_type", step: 1, category: "required", weight: 5 },
  { path: "offer.title", step: 1, category: "required", weight: 4 },
  { path: "offer.price_amount", step: 1, category: "required", weight: 5 },
  { path: "classification.market_segment", step: 1, category: "required", weight: 3 },
  { path: "classification.construction_status", step: 1, category: "conditional", weight: 3, when: (f) => f["classification.market_segment"] === "new_build" || f["classification.market_segment"] === "off_plan" },

  { path: "classification.usage_type", step: 2, category: "required", weight: 4 },
  { path: "classification.occupancy_status", step: 2, category: "valued", weight: 1 },
  { path: "condition.condition", step: 2, category: "required", weight: 4 },
  { path: "condition.renovation_status", step: 2, category: "valued", weight: 1 },
  { path: "land.zoning_type", step: 2, category: "conditional", weight: 4, propertyTypes: ["land"] },
  { path: "land.constructible_status", step: 2, category: "conditional", weight: 5, propertyTypes: ["land"] },

  { path: "location.city", step: 3, category: "required", weight: 5 },
  { path: "location.neighborhood", step: 3, category: "required", weight: 5 },
  { path: "location.sub_neighborhood", step: 3, category: "valued", weight: 1 },
  { path: "location.residence_name", step: 3, category: "valued", weight: 1 },
  { path: "location.address_display", step: 3, category: "valued", weight: 1 },
  { path: "location.latitude", step: 3, category: "valued", weight: 1 },
  { path: "location.longitude", step: 3, category: "valued", weight: 1 },
  { path: "location.geo_precision", step: 3, category: "derived", weight: 0 },

  { path: "surfaces.surface_total_m2", step: 4, category: "required", weight: 5, propertyTypes: ["apartment", "villa", "house", "studio", "duplex", "riad", "office", "commercial"] },
  { path: "surfaces.surface_land_m2", step: 4, category: "conditional", weight: 5, propertyTypes: ["villa", "house", "land", "farm"] },
  { path: "layout.bedrooms_count", step: 4, category: "conditional", weight: 4, propertyTypes: ["apartment", "villa", "house", "studio", "duplex", "riad"] },
  { path: "layout.bathrooms_count", step: 4, category: "valued", weight: 2, propertyTypes: ["apartment", "villa", "house", "studio", "duplex", "riad"] },
  { path: "building.floor_number", step: 4, category: "conditional", weight: 2, propertyTypes: ["apartment", "studio", "duplex", "office", "commercial"] },
  { path: "features.has_elevator", step: 4, category: "conditional", weight: 2, propertyTypes: ["apartment", "studio", "duplex", "office"] },
  { path: "features.has_parking", step: 4, category: "valued", weight: 2 },
  { path: "features.has_terrace", step: 4, category: "valued", weight: 1 },
  { path: "features.has_balcony", step: 4, category: "valued", weight: 1 },
  { path: "features.has_garden", step: 4, category: "valued", weight: 1, propertyTypes: ["villa", "house", "riad", "farm"] },
  { path: "features.has_pool", step: 4, category: "valued", weight: 1, propertyTypes: ["villa", "house", "riad", "farm"] },

  { path: "offer.monthly_charges", step: 5, category: "valued", weight: 2 },
  { path: "offer.syndic_fee", step: 5, category: "valued", weight: 2 },
  { path: "offer.agency_fee", step: 5, category: "valued", weight: 1 },
  { path: "offer.deposit_amount", step: 5, category: "conditional", weight: 2, when: (f) => f["offer.transaction_type"] === "rent" },
  { path: "offer.negotiable_declared", step: 5, category: "valued", weight: 1 },
  { path: "intelligence.price_per_m2", step: 5, category: "derived", weight: 0 },
  { path: "intelligence.market_position", step: 5, category: "derived", weight: 0 },

  { path: "media.primary_image", step: 6, category: "required", weight: 4 },
  { path: "media.gallery", step: 6, category: "valued", weight: 2 },
  { path: "media.floor_plan", step: 6, category: "valued", weight: 1 },
  { path: "media.video", step: 6, category: "valued", weight: 1 },
  { path: "media.rights_confirmed", step: 6, category: "required", weight: 5 },

  { path: "legal.title_status", step: 7, category: "required", weight: 5 },
  { path: "legal.title_deed_available", step: 7, category: "valued", weight: 3 },
  { path: "legal.legal_documents_available", step: 7, category: "valued", weight: 2 },
  { path: "offer.availability_status", step: 7, category: "required", weight: 5 },
  { path: "transparency.declaration_confirmed", step: 7, category: "required", weight: 5 },
  { path: "transparency.publication_authorized", step: 7, category: "required", weight: 5 },
  { path: "legal.documents_verified_count", step: 7, category: "derived", weight: 0 },
] as const;

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function applies(rule: PartnerOnboardingFieldRule, propertyType: CanonicalPropertyType, facts: PartnerDeclaredFacts): boolean {
  if (rule.propertyTypes && !rule.propertyTypes.includes(propertyType)) return false;
  if (rule.when && !rule.when(facts)) return false;
  return true;
}

export function getVisiblePartnerOnboardingFields(
  step: PartnerOnboardingStep,
  propertyType: CanonicalPropertyType,
  facts: PartnerDeclaredFacts,
): PartnerOnboardingFieldRule[] {
  return PARTNER_ONBOARDING_FIELD_RULES.filter(
    (rule) => rule.step === step && rule.category !== "derived" && applies(rule, propertyType, facts),
  );
}

export function computePartnerOnboardingCompleteness(
  propertyType: CanonicalPropertyType,
  facts: PartnerDeclaredFacts,
): {
  score: number;
  required_missing: string[];
  weighted_present: number;
  weighted_total: number;
} {
  const eligible = PARTNER_ONBOARDING_FIELD_RULES.filter(
    (rule) => rule.category !== "derived" && applies(rule, propertyType, facts),
  );
  let weightedPresent = 0;
  let weightedTotal = 0;
  const requiredMissing: string[] = [];

  for (const rule of eligible) {
    weightedTotal += rule.weight;
    const present = hasValue(facts[rule.path]);
    if (present) weightedPresent += rule.weight;
    if (!present && rule.category === "required") requiredMissing.push(rule.path);
  }

  return {
    score: weightedTotal === 0 ? 0 : Math.round((weightedPresent / weightedTotal) * 100),
    required_missing: requiredMissing,
    weighted_present: weightedPresent,
    weighted_total: weightedTotal,
  };
}

export function canSubmitPartnerOnboardingForReview(
  propertyType: CanonicalPropertyType,
  facts: PartnerDeclaredFacts,
): { ok: boolean; score: number; required_missing: string[] } {
  const completeness = computePartnerOnboardingCompleteness(propertyType, facts);
  return {
    ok: completeness.required_missing.length === 0 && completeness.score >= 70,
    score: completeness.score,
    required_missing: completeness.required_missing,
  };
}
