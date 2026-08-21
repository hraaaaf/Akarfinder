import { PROPERTY_SCHEMA_VERSION, type CanonicalPropertyType } from "@/lib/property-schema/core";
import {
  calculateAkarFinderSellerScore,
  type SellerScoreInput,
} from "@/lib/seller/listing-score";

export const SELLER_PROPERTY_DRAFT_VERSION = "2.0" as const;
export const SELLER_PROPERTY_DRAFT_SCHEMA_VERSION = PROPERTY_SCHEMA_VERSION;

export type SellerPropertyDraftInput = {
  transactionType?: "sale" | "rent" | null;
  city?: string | null;
  neighborhood?: string | null;
  residenceName?: string | null;
  privateAddress?: string | null;
  locationLandmark?: string | null;
  propertyType?: string | null;
  surface?: number | null;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  rooms?: number | null;
  floorNumber?: number | null;
  condition?: string | null;
  orientation?: string | null;
  viewType?: string | null;
  constructionYear?: number | null;
  hasElevator?: boolean | null;
  hasParking?: boolean | null;
  hasGarage?: boolean | null;
  hasTerrace?: boolean | null;
  hasBalcony?: boolean | null;
  hasGarden?: boolean | null;
  hasPool?: boolean | null;
  hasEquippedKitchen?: boolean | null;
  hasAirConditioning?: boolean | null;
  hasHeating?: boolean | null;
  hasSecurity?: boolean | null;
  hasConcierge?: boolean | null;
  hasGatedAccess?: boolean | null;
  isFurnished?: boolean | null;
  landConstructibleStatus?: string | null;
  zoningType?: string | null;
  frontageM?: number | null;
  roadAccessWidthM?: number | null;
  utilitiesWater?: boolean | null;
  utilitiesElectricity?: boolean | null;
  utilitiesSewer?: boolean | null;
  ceilingHeightM?: number | null;
  title?: string | null;
  description?: string | null;
  negotiable?: boolean | null;
  monthlyCharges?: number | null;
  legalStatusDeclared?: string | null;
  documentsAvailable?: boolean | null;
  contactComplete?: boolean | null;
};

export type SellerDeclaredFacts = Record<string, string | number | boolean>;

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

function cleanText(value: unknown, max = 300): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, max) : null;
}

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function optionalBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function optionalTransaction(value: unknown): "sale" | "rent" | null {
  return value === "sale" || value === "rent" ? value : null;
}

export function canonicalizeSellerPropertyType(value: string | null | undefined): CanonicalPropertyType | null {
  const cleaned = cleanText(value)?.toLocaleLowerCase("fr");
  if (!cleaned) return null;
  return PROPERTY_TYPE_ALIASES[cleaned] ?? "other";
}

export function normalizeSellerPropertyDraftInput(value: unknown): SellerPropertyDraftInput {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    transactionType: optionalTransaction(raw.transactionType) ?? "sale",
    city: cleanText(raw.city, 120),
    neighborhood: cleanText(raw.neighborhood, 120),
    residenceName: cleanText(raw.residenceName, 160),
    privateAddress: cleanText(raw.privateAddress, 240),
    locationLandmark: cleanText(raw.locationLandmark, 160),
    propertyType: cleanText(raw.propertyType, 80),
    surface: positiveNumber(raw.surface),
    price: positiveNumber(raw.price),
    bedrooms: nonNegativeInteger(raw.bedrooms),
    bathrooms: nonNegativeInteger(raw.bathrooms),
    rooms: nonNegativeInteger(raw.rooms),
    floorNumber: nonNegativeInteger(raw.floorNumber),
    condition: cleanText(raw.condition, 100),
    orientation: cleanText(raw.orientation, 80),
    viewType: cleanText(raw.viewType, 100),
    constructionYear: nonNegativeInteger(raw.constructionYear),
    hasElevator: optionalBoolean(raw.hasElevator),
    hasParking: optionalBoolean(raw.hasParking),
    hasGarage: optionalBoolean(raw.hasGarage),
    hasTerrace: optionalBoolean(raw.hasTerrace),
    hasBalcony: optionalBoolean(raw.hasBalcony),
    hasGarden: optionalBoolean(raw.hasGarden),
    hasPool: optionalBoolean(raw.hasPool),
    hasEquippedKitchen: optionalBoolean(raw.hasEquippedKitchen),
    hasAirConditioning: optionalBoolean(raw.hasAirConditioning),
    hasHeating: optionalBoolean(raw.hasHeating),
    hasSecurity: optionalBoolean(raw.hasSecurity),
    hasConcierge: optionalBoolean(raw.hasConcierge),
    hasGatedAccess: optionalBoolean(raw.hasGatedAccess),
    isFurnished: optionalBoolean(raw.isFurnished),
    landConstructibleStatus: cleanText(raw.landConstructibleStatus, 100),
    zoningType: cleanText(raw.zoningType, 120),
    frontageM: positiveNumber(raw.frontageM),
    roadAccessWidthM: positiveNumber(raw.roadAccessWidthM),
    utilitiesWater: optionalBoolean(raw.utilitiesWater),
    utilitiesElectricity: optionalBoolean(raw.utilitiesElectricity),
    utilitiesSewer: optionalBoolean(raw.utilitiesSewer),
    ceilingHeightM: positiveNumber(raw.ceilingHeightM),
    title: cleanText(raw.title, 180),
    description: cleanText(raw.description, 2000),
    negotiable: optionalBoolean(raw.negotiable),
    monthlyCharges: nonNegativeNumber(raw.monthlyCharges),
    legalStatusDeclared: cleanText(raw.legalStatusDeclared, 120),
    documentsAvailable: optionalBoolean(raw.documentsAvailable),
    contactComplete: optionalBoolean(raw.contactComplete),
  };
}

function put(facts: SellerDeclaredFacts, key: string, value: string | number | boolean | null | undefined) {
  if (value !== null && value !== undefined && value !== "") facts[key] = value;
}

export function buildSellerDeclaredFacts(input: SellerPropertyDraftInput): SellerDeclaredFacts {
  const facts: SellerDeclaredFacts = {
    "offer.transaction_type": input.transactionType ?? "sale",
    "location.country": "Morocco",
  };

  const propertyType = canonicalizeSellerPropertyType(input.propertyType ?? undefined);
  put(facts, "classification.property_type", propertyType);
  put(facts, "location.city", cleanText(input.city));
  put(facts, "location.neighborhood", cleanText(input.neighborhood));
  put(facts, "location.residence_name", cleanText(input.residenceName));
  put(facts, "location.address_private", cleanText(input.privateAddress, 240));
  put(facts, "location.location_landmark", cleanText(input.locationLandmark));
  put(facts, "surfaces.surface_total_m2", positiveNumber(input.surface));
  put(facts, "offer.price_amount", positiveNumber(input.price));
  put(facts, "layout.bedrooms_count", nonNegativeInteger(input.bedrooms));
  put(facts, "layout.bathrooms_count", nonNegativeInteger(input.bathrooms));
  put(facts, "layout.rooms_count", nonNegativeInteger(input.rooms));
  put(facts, "building.floor_number", nonNegativeInteger(input.floorNumber));
  put(facts, "condition.condition", cleanText(input.condition));
  put(facts, "building.orientation", cleanText(input.orientation));
  put(facts, "building.view_type", cleanText(input.viewType));
  put(facts, "building.construction_year", nonNegativeInteger(input.constructionYear));
  put(facts, "features.has_elevator", optionalBoolean(input.hasElevator));
  put(facts, "features.has_parking", optionalBoolean(input.hasParking));
  put(facts, "features.has_garage", optionalBoolean(input.hasGarage));
  put(facts, "features.has_terrace", optionalBoolean(input.hasTerrace));
  put(facts, "features.has_balcony", optionalBoolean(input.hasBalcony));
  put(facts, "features.has_garden", optionalBoolean(input.hasGarden));
  put(facts, "features.has_pool", optionalBoolean(input.hasPool));
  put(facts, "features.has_equipped_kitchen", optionalBoolean(input.hasEquippedKitchen));
  put(facts, "features.has_air_conditioning", optionalBoolean(input.hasAirConditioning));
  put(facts, "features.has_heating", optionalBoolean(input.hasHeating));
  put(facts, "features.has_security", optionalBoolean(input.hasSecurity));
  put(facts, "features.has_concierge", optionalBoolean(input.hasConcierge));
  put(facts, "features.has_gated_access", optionalBoolean(input.hasGatedAccess));
  put(facts, "features.is_furnished", optionalBoolean(input.isFurnished));
  put(facts, "land.constructible_status", cleanText(input.landConstructibleStatus));
  put(facts, "land.zoning_type", cleanText(input.zoningType));
  put(facts, "surfaces.frontage_m", positiveNumber(input.frontageM));
  put(facts, "land.road_access_width_m", positiveNumber(input.roadAccessWidthM));
  put(facts, "land.utilities_water", optionalBoolean(input.utilitiesWater));
  put(facts, "land.utilities_electricity", optionalBoolean(input.utilitiesElectricity));
  put(facts, "land.utilities_sewer", optionalBoolean(input.utilitiesSewer));
  put(facts, "surfaces.ceiling_height_m", positiveNumber(input.ceilingHeightM));
  put(facts, "offer.title", cleanText(input.title, 180));
  put(facts, "offer.description", cleanText(input.description, 2000));
  put(facts, "offer.negotiable_declared", optionalBoolean(input.negotiable));
  put(facts, "offer.monthly_charges", nonNegativeNumber(input.monthlyCharges));
  put(facts, "legal.title_status", cleanText(input.legalStatusDeclared));
  put(facts, "legal.legal_documents_available", optionalBoolean(input.documentsAvailable));
  put(facts, "seller.contact_complete", optionalBoolean(input.contactComplete));

  return facts;
}

export function computeSellerDraftCompleteness(facts: SellerDeclaredFacts): {
  score: number;
  required_missing: string[];
  weighted_present: number;
  weighted_total: number;
} {
  const propertyType = facts["classification.property_type"];
  const input: SellerScoreInput = {
    propertyType: typeof propertyType === "string" ? propertyType : undefined,
    transactionType: facts["offer.transaction_type"] === "rent" ? "rent" : "sale",
    city: typeof facts["location.city"] === "string" ? facts["location.city"] as string : undefined,
    neighborhood: typeof facts["location.neighborhood"] === "string" ? facts["location.neighborhood"] as string : undefined,
    surface: typeof facts["surfaces.surface_total_m2"] === "number" ? facts["surfaces.surface_total_m2"] as number : undefined,
    price: typeof facts["offer.price_amount"] === "number" ? facts["offer.price_amount"] as number : undefined,
    bedrooms: typeof facts["layout.bedrooms_count"] === "number" ? facts["layout.bedrooms_count"] as number : undefined,
    bathrooms: typeof facts["layout.bathrooms_count"] === "number" ? facts["layout.bathrooms_count"] as number : undefined,
    condition: typeof facts["condition.condition"] === "string" ? facts["condition.condition"] as string : undefined,
    contactComplete: facts["seller.contact_complete"] === true,
  };
  const result = calculateAkarFinderSellerScore(input);
  const required = [
    ["classification.property_type", facts["classification.property_type"]],
    ["offer.transaction_type", facts["offer.transaction_type"]],
    ["location.city", facts["location.city"]],
    ["surfaces.surface_total_m2", facts["surfaces.surface_total_m2"]],
    ["offer.price_amount", facts["offer.price_amount"]],
    ["seller.contact_complete", facts["seller.contact_complete"]],
  ].filter(([, value]) => value === undefined || value === null || value === "" || value === false).map(([key]) => String(key));

  return {
    score: result.score,
    required_missing: required,
    weighted_present: result.score,
    weighted_total: 100,
  };
}

export function prepareSellerPropertyDraft(input: SellerPropertyDraftInput) {
  const declaredFacts = buildSellerDeclaredFacts(input);
  const score = calculateAkarFinderSellerScore({
    ...input,
    acceptedPhotoCount: 0,
    verifiedDocumentsCount: 0,
  });
  const completeness = computeSellerDraftCompleteness(declaredFacts);

  return {
    schema_version: SELLER_PROPERTY_DRAFT_SCHEMA_VERSION,
    declared_facts: declaredFacts,
    weighted_completeness: score.score,
    required_missing: completeness.required_missing,
    structurally_useful: completeness.required_missing.length === 0,
  };
}
