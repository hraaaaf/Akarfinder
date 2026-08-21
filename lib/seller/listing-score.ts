export const AKARFINDER_SELLER_SCORE_MIN_PUBLISH = 60;
export const AKARFINDER_SELLER_MIN_PHOTOS = 3;

export type SellerScoreLabel =
  | "À compléter"
  | "Correcte"
  | "Bonne annonce"
  | "Très complète"
  | "Excellente fiche";

export type SellerScoreDimensionKey =
  | "essentials"
  | "details"
  | "media"
  | "location"
  | "trust";

export type SellerScoreInput = {
  propertyType?: string | null;
  transactionType?: "sale" | "rent" | null;
  city?: string | null;
  neighborhood?: string | null;
  residenceName?: string | null;
  privateAddress?: string | null;
  locationLandmark?: string | null;
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
  contactComplete?: boolean | null;
  legalStatusDeclared?: string | null;
  documentsAvailable?: boolean | null;
  verifiedDocumentsCount?: number | null;
  acceptedPhotoCount?: number | null;
};

export type SellerScoreDimension = {
  key: SellerScoreDimensionKey;
  label: string;
  score: number;
  max: number;
};

export type SellerScoreResult = {
  score: number;
  label: SellerScoreLabel;
  dimensions: SellerScoreDimension[];
  nextAction: string | null;
};

type WeightedCheck = {
  complete: boolean;
  weight: number;
  suggestion: string;
};

const text = (value: string | null | undefined) => value?.trim() ?? "";
const positive = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
const nonNegative = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const knownBoolean = (value: boolean | null | undefined) => typeof value === "boolean";

function normalizePropertyType(value: string | null | undefined) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function propertyProfile(value: string | null | undefined) {
  const type = normalizePropertyType(value);
  if (type.includes("terrain") || type.includes("land")) return "land" as const;
  if (type.includes("bureau") || type.includes("office") || type.includes("commercial") || type.includes("entrepot")) {
    return "professional" as const;
  }
  return "residential" as const;
}

function weightedScore(checks: WeightedCheck[], max: number) {
  const denominator = checks.reduce((sum, item) => sum + item.weight, 0);
  if (!denominator) return { score: 0, suggestions: [] as { gain: number; label: string }[] };
  const present = checks.reduce((sum, item) => sum + (item.complete ? item.weight : 0), 0);
  const score = Math.round((present / denominator) * max);
  const suggestions = checks
    .filter((item) => !item.complete)
    .map((item) => ({ gain: Math.max(1, Math.round((item.weight / denominator) * max)), label: item.suggestion }));
  return { score, suggestions };
}

function mediaPoints(count: number) {
  if (count >= 10) return 20;
  if (count >= 8) return 18;
  if (count >= 6) return 15;
  if (count >= 3) return 10;
  if (count >= 1) return 5;
  return 0;
}

export function sellerScoreLabel(score: number): SellerScoreLabel {
  if (score >= 90) return "Excellente fiche";
  if (score >= 80) return "Très complète";
  if (score >= 60) return "Bonne annonce";
  if (score >= 40) return "Correcte";
  return "À compléter";
}

export function calculateAkarFinderSellerScore(input: SellerScoreInput): SellerScoreResult {
  const profile = propertyProfile(input.propertyType);

  const essentialsChecks: WeightedCheck[] = [
    { complete: Boolean(text(input.propertyType)), weight: 5, suggestion: "Choisir le type de bien" },
    { complete: Boolean(input.transactionType), weight: 3, suggestion: "Confirmer la transaction" },
    { complete: Boolean(text(input.city)), weight: 4, suggestion: "Ajouter la ville" },
    { complete: Boolean(text(input.neighborhood)), weight: 3, suggestion: "Préciser le quartier" },
    { complete: positive(input.surface), weight: 5, suggestion: "Ajouter la surface" },
    { complete: positive(input.price), weight: 4, suggestion: "Ajouter le prix" },
    { complete: Boolean(text(input.condition)), weight: 2, suggestion: "Préciser l’état du bien" },
  ];

  if (profile === "residential") {
    essentialsChecks.push(
      { complete: nonNegative(input.bedrooms), weight: 2, suggestion: "Préciser les chambres" },
      { complete: nonNegative(input.bathrooms), weight: 2, suggestion: "Préciser les salles de bain" },
    );
  }

  const detailsChecks: WeightedCheck[] =
    profile === "land"
      ? [
          { complete: Boolean(text(input.landConstructibleStatus)), weight: 3, suggestion: "Préciser le statut constructible" },
          { complete: Boolean(text(input.zoningType)), weight: 2, suggestion: "Préciser le zonage ou l’usage" },
          { complete: positive(input.frontageM), weight: 2, suggestion: "Ajouter la façade" },
          { complete: positive(input.roadAccessWidthM), weight: 2, suggestion: "Ajouter la largeur d’accès" },
          { complete: knownBoolean(input.utilitiesWater), weight: 1, suggestion: "Préciser l’accès à l’eau" },
          { complete: knownBoolean(input.utilitiesElectricity), weight: 1, suggestion: "Préciser l’électricité" },
          { complete: knownBoolean(input.utilitiesSewer), weight: 1, suggestion: "Préciser l’assainissement" },
        ]
      : profile === "professional"
        ? [
            { complete: nonNegative(input.floorNumber), weight: 2, suggestion: "Préciser l’étage" },
            { complete: positive(input.frontageM), weight: 2, suggestion: "Ajouter la façade" },
            { complete: positive(input.ceilingHeightM), weight: 2, suggestion: "Ajouter la hauteur sous plafond" },
            { complete: Boolean(text(input.orientation)), weight: 1, suggestion: "Préciser l’orientation" },
            { complete: knownBoolean(input.hasParking), weight: 1, suggestion: "Préciser le parking" },
            { complete: knownBoolean(input.hasAirConditioning), weight: 1, suggestion: "Préciser la climatisation" },
            { complete: knownBoolean(input.hasSecurity), weight: 1, suggestion: "Préciser la sécurité" },
          ]
        : [
            { complete: nonNegative(input.rooms), weight: 2, suggestion: "Préciser le nombre de pièces" },
            { complete: nonNegative(input.floorNumber), weight: 2, suggestion: "Préciser l’étage" },
            { complete: Boolean(text(input.orientation)), weight: 2, suggestion: "Ajouter l’orientation" },
            { complete: Boolean(text(input.viewType)), weight: 1, suggestion: "Préciser la vue" },
            { complete: positive(input.constructionYear), weight: 1, suggestion: "Ajouter l’année de construction" },
            { complete: knownBoolean(input.hasParking), weight: 1, suggestion: "Préciser le parking" },
            { complete: knownBoolean(input.hasElevator), weight: 1, suggestion: "Préciser l’ascenseur" },
            { complete: knownBoolean(input.hasTerrace), weight: 1, suggestion: "Préciser la terrasse" },
            { complete: knownBoolean(input.hasBalcony), weight: 1, suggestion: "Préciser le balcon" },
            { complete: knownBoolean(input.hasEquippedKitchen), weight: 1, suggestion: "Préciser la cuisine équipée" },
            { complete: knownBoolean(input.hasAirConditioning), weight: 1, suggestion: "Préciser la climatisation" },
            { complete: knownBoolean(input.isFurnished), weight: 1, suggestion: "Préciser si le bien est meublé" },
          ];

  if (profile === "residential" && ["villa", "maison", "riad"].some((token) => normalizePropertyType(input.propertyType).includes(token))) {
    detailsChecks.push(
      { complete: knownBoolean(input.hasGarden), weight: 1, suggestion: "Préciser le jardin" },
      { complete: knownBoolean(input.hasPool), weight: 1, suggestion: "Préciser la piscine" },
      { complete: knownBoolean(input.hasGarage), weight: 1, suggestion: "Préciser le garage" },
    );
  }

  detailsChecks.push(
    { complete: text(input.title).length >= 12, weight: 2, suggestion: "Écrire un titre précis" },
    { complete: text(input.description).length >= 80, weight: 3, suggestion: "Décrire les points forts du bien" },
  );

  const essentials = weightedScore(essentialsChecks, 30);
  const details = weightedScore(detailsChecks, 20);

  const photos = Math.max(0, Math.trunc(input.acceptedPhotoCount ?? 0));
  const media = mediaPoints(photos);

  const locationChecks: WeightedCheck[] = [
    { complete: Boolean(text(input.city)), weight: 2, suggestion: "Ajouter la ville" },
    { complete: Boolean(text(input.neighborhood)), weight: 2, suggestion: "Ajouter le quartier" },
    {
      complete: Boolean(text(input.residenceName) || text(input.locationLandmark)),
      weight: 2,
      suggestion: "Ajouter une résidence ou un repère utile",
    },
    {
      complete: Boolean(text(input.privateAddress)),
      weight: 4,
      suggestion: "Ajouter l’adresse privée pour améliorer la précision",
    },
  ];
  const location = weightedScore(locationChecks, 10);

  const trustChecks: WeightedCheck[] = [
    { complete: input.contactComplete === true, weight: 4, suggestion: "Compléter l’identité et le contact" },
    { complete: Boolean(text(input.legalStatusDeclared)), weight: 4, suggestion: "Déclarer le statut juridique du bien" },
    { complete: input.documentsAvailable === true, weight: 4, suggestion: "Indiquer les documents disponibles" },
    {
      complete: Math.max(0, input.verifiedDocumentsCount ?? 0) > 0,
      weight: 8,
      suggestion: "Faire vérifier les documents disponibles",
    },
  ];
  const trust = weightedScore(trustChecks, 20);

  const dimensions: SellerScoreDimension[] = [
    { key: "essentials", label: "Données essentielles", score: essentials.score, max: 30 },
    { key: "details", label: "Caractéristiques", score: details.score, max: 20 },
    { key: "media", label: "Médias", score: media, max: 20 },
    { key: "location", label: "Localisation", score: location.score, max: 10 },
    { key: "trust", label: "Confiance / documents", score: trust.score, max: 20 },
  ];

  const score = Math.min(100, dimensions.reduce((sum, dimension) => sum + dimension.score, 0));
  const suggestions = [
    ...essentials.suggestions,
    ...details.suggestions,
    ...(photos < 10
      ? [{ gain: photos < 3 ? 10 - media : photos < 6 ? 15 - media : photos < 8 ? 18 - media : 20 - media, label: photos < 3 ? "Ajouter au moins 3 bonnes photos" : "Ajouter davantage de photos utiles" }]
      : []),
    ...location.suggestions,
    ...trust.suggestions,
  ].filter((item) => item.gain > 0).sort((a, b) => b.gain - a.gain);

  return {
    score,
    label: sellerScoreLabel(score),
    dimensions,
    nextAction: suggestions[0]?.label ?? null,
  };
}

export type SellerDraftFacts = Record<string, string | number | boolean>;

function factString(facts: SellerDraftFacts, key: string) {
  const value = facts[key];
  return typeof value === "string" ? value : undefined;
}
function factNumber(facts: SellerDraftFacts, key: string) {
  const value = facts[key];
  return typeof value === "number" ? value : undefined;
}
function factBoolean(facts: SellerDraftFacts, key: string) {
  const value = facts[key];
  return typeof value === "boolean" ? value : undefined;
}

export function sellerScoreInputFromDeclaredFacts(
  facts: SellerDraftFacts,
  acceptedPhotoCount = 0,
  verifiedDocumentsCount = 0,
): SellerScoreInput {
  return {
    propertyType: factString(facts, "classification.property_type"),
    transactionType: factString(facts, "offer.transaction_type") as "sale" | "rent" | undefined,
    city: factString(facts, "location.city"),
    neighborhood: factString(facts, "location.neighborhood"),
    residenceName: factString(facts, "location.residence_name"),
    privateAddress: factString(facts, "location.address_private"),
    locationLandmark: factString(facts, "location.location_landmark"),
    surface: factNumber(facts, "surfaces.surface_total_m2"),
    price: factNumber(facts, "offer.price_amount"),
    bedrooms: factNumber(facts, "layout.bedrooms_count"),
    bathrooms: factNumber(facts, "layout.bathrooms_count"),
    rooms: factNumber(facts, "layout.rooms_count"),
    floorNumber: factNumber(facts, "building.floor_number"),
    condition: factString(facts, "condition.condition"),
    orientation: factString(facts, "building.orientation"),
    viewType: factString(facts, "building.view_type"),
    constructionYear: factNumber(facts, "building.construction_year"),
    hasElevator: factBoolean(facts, "features.has_elevator"),
    hasParking: factBoolean(facts, "features.has_parking"),
    hasGarage: factBoolean(facts, "features.has_garage"),
    hasTerrace: factBoolean(facts, "features.has_terrace"),
    hasBalcony: factBoolean(facts, "features.has_balcony"),
    hasGarden: factBoolean(facts, "features.has_garden"),
    hasPool: factBoolean(facts, "features.has_pool"),
    hasEquippedKitchen: factBoolean(facts, "features.has_equipped_kitchen"),
    hasAirConditioning: factBoolean(facts, "features.has_air_conditioning"),
    hasHeating: factBoolean(facts, "features.has_heating"),
    hasSecurity: factBoolean(facts, "features.has_security"),
    hasConcierge: factBoolean(facts, "features.has_concierge"),
    hasGatedAccess: factBoolean(facts, "features.has_gated_access"),
    isFurnished: factBoolean(facts, "features.is_furnished"),
    landConstructibleStatus: factString(facts, "land.constructible_status"),
    zoningType: factString(facts, "land.zoning_type"),
    frontageM: factNumber(facts, "surfaces.frontage_m"),
    roadAccessWidthM: factNumber(facts, "land.road_access_width_m"),
    utilitiesWater: factBoolean(facts, "land.utilities_water"),
    utilitiesElectricity: factBoolean(facts, "land.utilities_electricity"),
    utilitiesSewer: factBoolean(facts, "land.utilities_sewer"),
    ceilingHeightM: factNumber(facts, "surfaces.ceiling_height_m"),
    title: factString(facts, "offer.title"),
    description: factString(facts, "offer.description"),
    contactComplete: factBoolean(facts, "seller.contact_complete"),
    legalStatusDeclared: factString(facts, "legal.title_status"),
    documentsAvailable: factBoolean(facts, "legal.legal_documents_available"),
    verifiedDocumentsCount,
    acceptedPhotoCount,
  };
}

export type SellerPublicationGateInput = {
  facts: SellerDraftFacts;
  score: number;
  photoCount: number;
};

export function sellerPublicationGate(input: SellerPublicationGateInput) {
  const missing: string[] = [];
  const facts = input.facts;
  if (!factString(facts, "classification.property_type")) missing.push("type de bien");
  if (!factString(facts, "offer.transaction_type")) missing.push("transaction");
  if (!factString(facts, "location.city")) missing.push("ville");
  if (!positive(factNumber(facts, "surfaces.surface_total_m2"))) missing.push("surface");
  if (!positive(factNumber(facts, "offer.price_amount"))) missing.push("prix");
  if (factBoolean(facts, "seller.contact_complete") !== true) missing.push("contact");
  if (input.photoCount < AKARFINDER_SELLER_MIN_PHOTOS) missing.push("3 photos acceptées minimum");
  if (input.score < AKARFINDER_SELLER_SCORE_MIN_PUBLISH) missing.push(`score ${AKARFINDER_SELLER_SCORE_MIN_PUBLISH}/100 minimum`);

  return {
    eligible: missing.length === 0,
    missing,
  };
}
