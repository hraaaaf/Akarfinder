import type { CanonicalPropertyType, CanonicalTransactionType, MarketSegment } from "./core";

export type OnboardingInputType = "text" | "textarea" | "number" | "boolean" | "select" | "date" | "media";
export type OnboardingFieldGroup = "identity" | "location" | "pricing" | "surfaces" | "layout" | "building" | "features" | "condition" | "land" | "legal" | "media";

export interface OnboardingFieldV1 {
  key: string;
  label: string;
  group: OnboardingFieldGroup;
  input: OnboardingInputType;
  required: boolean;
  options?: string[];
  property_types?: CanonicalPropertyType[];
  transaction_types?: CanonicalTransactionType[];
  market_segments?: MarketSegment[];
  help?: string;
}

export interface OnboardingContextV1 {
  property_type: CanonicalPropertyType;
  transaction_type: CanonicalTransactionType;
  market_segment: MarketSegment;
}

const BASE: OnboardingFieldV1[] = [
  { key: "external_offer_id", label: "Identifiant de l'annonce", group: "identity", input: "text", required: true },
  { key: "property_type", label: "Type de bien", group: "identity", input: "select", required: true },
  { key: "transaction_type", label: "Transaction", group: "identity", input: "select", required: true, options: ["sale", "rent"] },
  { key: "market_segment", label: "Marché", group: "identity", input: "select", required: true, options: ["resale", "new_build", "off_plan", "unknown"] },
  { key: "city", label: "Ville", group: "location", input: "text", required: true },
  { key: "district", label: "Quartier / secteur", group: "location", input: "text", required: false },
  { key: "price_status", label: "Statut du prix", group: "pricing", input: "select", required: true, options: ["valid", "not_disclosed", "on_request"] },
  { key: "price_amount", label: "Prix", group: "pricing", input: "number", required: false, help: "Laisser vide si le prix n'est pas communiqué. Jamais 0 pour signifier inconnu." },
  { key: "surface_total_m2", label: "Surface principale", group: "surfaces", input: "number", required: false },
  { key: "title", label: "Titre", group: "identity", input: "text", required: true },
  { key: "description", label: "Description", group: "identity", input: "textarea", required: false },
  { key: "availability_status", label: "Disponibilité", group: "identity", input: "select", required: true, options: ["available", "upcoming", "reserved", "sold", "rented", "unknown"] },
];

const CONDITIONAL: OnboardingFieldV1[] = [
  { key: "bedrooms_count", label: "Chambres", group: "layout", input: "number", required: false, property_types: ["apartment", "villa", "house", "studio", "duplex", "riad"] },
  { key: "rooms_count", label: "Pièces", group: "layout", input: "number", required: false, property_types: ["apartment", "villa", "house", "studio", "duplex", "riad", "office"] },
  { key: "bathrooms_count", label: "Salles de bain", group: "layout", input: "number", required: false, property_types: ["apartment", "villa", "house", "studio", "duplex", "riad"] },
  { key: "floor_number", label: "Étage", group: "building", input: "number", required: false, property_types: ["apartment", "studio", "duplex", "office", "commercial"] },
  { key: "floors_count", label: "Nombre d'étages", group: "building", input: "number", required: false, property_types: ["villa", "house", "riad", "building"] },
  { key: "has_elevator", label: "Ascenseur", group: "features", input: "boolean", required: false, property_types: ["apartment", "studio", "duplex", "office", "commercial"] },
  { key: "has_parking", label: "Parking", group: "features", input: "boolean", required: false },
  { key: "parking_spaces", label: "Places de parking", group: "features", input: "number", required: false },
  { key: "has_terrace", label: "Terrasse", group: "features", input: "boolean", required: false },
  { key: "terrace_m2", label: "Surface terrasse", group: "surfaces", input: "number", required: false },
  { key: "orientation", label: "Orientation", group: "building", input: "text", required: false },
  { key: "condition", label: "État du bien", group: "condition", input: "select", required: false },
  { key: "surface_built_m2", label: "Surface construite", group: "surfaces", input: "number", required: false, property_types: ["villa", "house", "riad", "building", "farm"] },
  { key: "surface_land_m2", label: "Surface du terrain", group: "surfaces", input: "number", required: false, property_types: ["villa", "house", "riad", "land", "farm", "industrial"] },
  { key: "has_garden", label: "Jardin", group: "features", input: "boolean", required: false, property_types: ["villa", "house", "riad", "farm"] },
  { key: "garden_m2", label: "Surface jardin", group: "surfaces", input: "number", required: false, property_types: ["villa", "house", "riad", "farm"] },
  { key: "has_pool", label: "Piscine", group: "features", input: "boolean", required: false, property_types: ["villa", "house", "riad", "farm", "apartment"] },
  { key: "has_garage", label: "Garage", group: "features", input: "boolean", required: false, property_types: ["villa", "house", "riad", "farm"] },
  { key: "garage_spaces", label: "Places de garage", group: "features", input: "number", required: false, property_types: ["villa", "house", "riad", "farm"] },
  { key: "zoning_type", label: "Zonage", group: "land", input: "text", required: false, property_types: ["land", "farm", "industrial"] },
  { key: "constructible_status", label: "Constructibilité", group: "land", input: "select", required: false, property_types: ["land", "farm"] },
  { key: "facade_count", label: "Nombre de façades", group: "land", input: "number", required: false, property_types: ["land", "villa", "house"] },
  { key: "road_access_width_m", label: "Largeur accès route", group: "land", input: "number", required: false, property_types: ["land", "farm", "industrial"] },
  { key: "utilities_water", label: "Raccordement eau", group: "land", input: "boolean", required: false, property_types: ["land", "farm"] },
  { key: "utilities_electricity", label: "Raccordement électricité", group: "land", input: "boolean", required: false, property_types: ["land", "farm"] },
  { key: "title_deed_available", label: "Titre disponible", group: "legal", input: "boolean", required: false },
  { key: "building_permit_status", label: "Permis de construire", group: "legal", input: "select", required: false, market_segments: ["new_build", "off_plan"] },
  { key: "expected_delivery_date", label: "Livraison prévue", group: "identity", input: "date", required: false, market_segments: ["new_build", "off_plan"] },
  { key: "monthly_charges", label: "Charges mensuelles", group: "pricing", input: "number", required: false, property_types: ["apartment", "studio", "duplex", "office", "commercial"] },
  { key: "syndic_fee", label: "Syndic", group: "pricing", input: "number", required: false, property_types: ["apartment", "studio", "duplex", "office", "commercial"] },
  { key: "deposit_amount", label: "Dépôt / caution", group: "pricing", input: "number", required: false, transaction_types: ["rent"] },
  { key: "media", label: "Photos / plans autorisés", group: "media", input: "media", required: false },
  { key: "media_rights_confirmed", label: "Droits média confirmés", group: "media", input: "boolean", required: true },
];

function applies(field: OnboardingFieldV1, context: OnboardingContextV1): boolean {
  if (field.property_types && !field.property_types.includes(context.property_type)) return false;
  if (field.transaction_types && !field.transaction_types.includes(context.transaction_type)) return false;
  if (field.market_segments && !field.market_segments.includes(context.market_segment)) return false;
  return true;
}

export function getDynamicOnboardingFields(context: OnboardingContextV1): OnboardingFieldV1[] {
  const fields = [...BASE, ...CONDITIONAL.filter((field) => applies(field, context))];
  if (fields.length > 45) {
    throw new Error(`Dynamic onboarding contract exceeded 45 fields (${fields.length})`);
  }
  return fields;
}

export const ONBOARDING_BASE_FIELD_COUNT = BASE.length;
export const ONBOARDING_MAX_FIELDS = 45;
