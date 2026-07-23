import { PROPERTY_SCHEMA_VERSION, type CanonicalPropertyType } from "@/lib/property-schema/core";

export const SELLER_PROPERTY_DRAFT_VERSION = "1.0" as const;
export const SELLER_PROPERTY_DRAFT_SCHEMA_VERSION = PROPERTY_SCHEMA_VERSION;

export type SellerPropertyDraftInput = {
  city?: string | null;
  neighborhood?: string | null;
  propertyType?: string | null;
  surface?: number | null;
  price?: number | null;
  bedrooms?: number | null;
  condition?: string | null;
};

export type SellerDeclaredFacts = Record<string, string | number | boolean>;

type FieldRule = {
  path: string;
  weight: number;
  required: boolean;
};

const DRAFT_RULES: readonly FieldRule[] = [
  { path: "classification.property_type", weight: 5, required: true },
  { path: "offer.transaction_type", weight: 5, required: true },
  { path: "location.city", weight: 5, required: true },
  { path: "surfaces.surface_total_m2", weight: 5, required: true },
  { path: "offer.price_amount", weight: 3, required: false },
  { path: "location.neighborhood", weight: 2, required: false },
  { path: "layout.bedrooms_count", weight: 2, required: false },
  { path: "condition.condition", weight: 2, required: false },
] as const;

const PROPERTY_TYPE_ALIASES: Record<string, CanonicalPropertyType> = {
  appartement: "apartment",
  apartment: "apartment",
  villa: "villa",
  maison: "house",
  house: "house",
  studio: "studio",
  duplex: "duplex",
  riad: "riad",
  terrain: "land",
  land: "land",
  bureau: "office",
  office: "office",
  local: "commercial",
  commercial: "commercial",
  entrepot: "warehouse",
  warehouse: "warehouse",
};

function cleanText(value: string | null | undefined, max = 160): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, max) : null;
}

function positiveNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function nonNegativeInteger(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

export function canonicalizeSellerPropertyType(value: string | null | undefined): CanonicalPropertyType | null {
  const cleaned = cleanText(value)?.toLocaleLowerCase("fr");
  if (!cleaned) return null;
  return PROPERTY_TYPE_ALIASES[cleaned] ?? "other";
}

export function buildSellerDeclaredFacts(input: SellerPropertyDraftInput): SellerDeclaredFacts {
  const facts: SellerDeclaredFacts = {
    "offer.transaction_type": "sale",
    "location.country": "Morocco",
  };

  const propertyType = canonicalizeSellerPropertyType(input.propertyType);
  const city = cleanText(input.city);
  const neighborhood = cleanText(input.neighborhood);
  const surface = positiveNumber(input.surface);
  const price = positiveNumber(input.price);
  const bedrooms = nonNegativeInteger(input.bedrooms);
  const condition = cleanText(input.condition);

  if (propertyType) facts["classification.property_type"] = propertyType;
  if (city) facts["location.city"] = city;
  if (neighborhood) facts["location.neighborhood"] = neighborhood;
  if (surface != null) facts["surfaces.surface_total_m2"] = surface;
  if (price != null) facts["offer.price_amount"] = price;
  if (bedrooms != null) facts["layout.bedrooms_count"] = bedrooms;
  if (condition) facts["condition.condition"] = condition;

  return facts;
}

export function computeSellerDraftCompleteness(facts: SellerDeclaredFacts): {
  score: number;
  required_missing: string[];
  weighted_present: number;
  weighted_total: number;
} {
  let weightedPresent = 0;
  let weightedTotal = 0;
  const requiredMissing: string[] = [];

  for (const rule of DRAFT_RULES) {
    weightedTotal += rule.weight;
    const value = facts[rule.path];
    const present = value !== undefined && value !== null && value !== "";
    if (present) weightedPresent += rule.weight;
    if (!present && rule.required) requiredMissing.push(rule.path);
  }

  return {
    score: weightedTotal ? Math.round((weightedPresent / weightedTotal) * 100) : 0,
    required_missing: requiredMissing,
    weighted_present: weightedPresent,
    weighted_total: weightedTotal,
  };
}

export function prepareSellerPropertyDraft(input: SellerPropertyDraftInput) {
  const declaredFacts = buildSellerDeclaredFacts(input);
  const completeness = computeSellerDraftCompleteness(declaredFacts);
  return {
    schema_version: SELLER_PROPERTY_DRAFT_SCHEMA_VERSION,
    declared_facts: declaredFacts,
    weighted_completeness: completeness.score,
    required_missing: completeness.required_missing,
    structurally_useful: completeness.required_missing.length === 0,
  };
}
