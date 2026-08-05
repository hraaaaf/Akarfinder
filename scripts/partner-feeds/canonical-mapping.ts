import { PROPERTY_SCHEMA_VERSION } from "../../lib/property-schema/core.js";
import {
  prepareSellerPropertyDraft,
  type SellerDeclaredFacts,
} from "../../lib/seller/seller-property-draft.js";
import { calculateSellerReadiness } from "../../lib/seller/readiness.js";

export const PARTNER_CANONICAL_MAPPING_VERSION = "b3.4.3-v1" as const;

export type FeedIssueSeverity = "blocking" | "warning" | "info";
export type FeedValidationIssue = {
  severity: FeedIssueSeverity;
  field: string;
  code: string;
  message: string;
};

export type PartnerCanonicalPayload = {
  mapping_version: typeof PARTNER_CANONICAL_MAPPING_VERSION;
  schema_version: typeof PROPERTY_SCHEMA_VERSION;
  source_kind: "partner_declared";
  external_reference: string | null;
  declared_facts: SellerDeclaredFacts;
  weighted_completeness: number;
  required_missing: string[];
  structurally_useful: boolean;
  listing_readiness: {
    score: number;
    label: string;
    essentials_complete: boolean;
  };
  photo_count: number;
  accepted_photo_count: number;
  publication_eligible: false;
};

export type PartnerMappedRow = {
  canonical_payload: PartnerCanonicalPayload;
  validation_summary: {
    status: "invalid" | "warning" | "valid";
    issues: FeedValidationIssue[];
    blocking_count: number;
    warning_count: number;
    info_count: number;
  };
  row_status: "invalid" | "warning" | "valid";
  publication_eligible: false;
};

const ALIASES = {
  externalReference: ["external_reference", "reference", "ref", "id_annonce", "listing_id"],
  transactionType: ["transaction_type", "transaction", "vente_location", "operation", "intent"],
  propertyType: ["property_type", "type_bien", "type", "categorie", "category"],
  city: ["city", "ville", "localite"],
  neighborhood: ["neighborhood", "district", "quartier", "zone"],
  surface: ["surface_m2", "surface", "superficie", "surface_totale"],
  price: ["price_mad", "price", "prix", "montant"],
  bedrooms: ["bedrooms_count", "bedrooms", "chambres", "nombre_chambres"],
  bathrooms: ["bathrooms_count", "bathrooms", "salles_de_bain", "sdb"],
  condition: ["condition", "etat", "etat_bien"],
  description: ["description", "description_snippet", "commentaire", "details"],
  phone: ["contact_phone", "phone", "telephone", "tel"],
  photoCount: ["photo_count", "photos_count", "nombre_photos"],
  acceptedPhotoCount: ["accepted_photo_count", "valid_photos_count", "photos_valides"],
  imageUrls: ["image_urls", "images", "photos", "photo_urls"],
} as const;

type AliasKey = keyof typeof ALIASES;

function value(row: Record<string, string>, key: AliasKey): string {
  for (const alias of ALIASES[key]) {
    const found = row[alias];
    if (typeof found === "string" && found.trim()) return found.trim();
  }
  return "";
}

function numberValue(raw: string): number | null {
  if (!raw) return null;
  const normalized = raw.replace(/[\s\u00a0]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function nonNegativeInteger(raw: string): number | null {
  const parsed = numberValue(raw);
  return parsed !== null && Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function transaction(raw: string): "sale" | "rent" | null {
  const normalized = raw.toLocaleLowerCase("fr").trim();
  if (["sale", "vente", "sell", "buy", "acheter"].includes(normalized)) return "sale";
  if (["rent", "location", "louer", "rental"].includes(normalized)) return "rent";
  return null;
}

function countImageUrls(raw: string): number {
  if (!raw) return 0;
  return raw.split(/[|,;\n]+/).map((item) => item.trim()).filter(Boolean).length;
}

function issue(
  issues: FeedValidationIssue[],
  severity: FeedIssueSeverity,
  field: string,
  code: string,
  message: string,
) {
  issues.push({ severity, field, code, message });
}

export function mapPartnerFeedRow(row: Record<string, string>): PartnerMappedRow {
  const issues: FeedValidationIssue[] = [];
  const externalReference = value(row, "externalReference") || null;
  const transactionType = transaction(value(row, "transactionType"));
  const surface = numberValue(value(row, "surface"));
  const price = numberValue(value(row, "price"));
  const bedrooms = nonNegativeInteger(value(row, "bedrooms"));
  const bathrooms = nonNegativeInteger(value(row, "bathrooms"));
  const description = value(row, "description");
  const phone = value(row, "phone");
  const imageUrlCount = countImageUrls(value(row, "imageUrls"));
  const declaredPhotoCount = nonNegativeInteger(value(row, "photoCount"));
  const declaredAcceptedPhotoCount = nonNegativeInteger(value(row, "acceptedPhotoCount"));
  const photoCount = Math.max(imageUrlCount, declaredPhotoCount ?? 0);
  const acceptedPhotoCount = Math.min(photoCount, declaredAcceptedPhotoCount ?? photoCount);

  const draft = prepareSellerPropertyDraft({
    city: value(row, "city"),
    neighborhood: value(row, "neighborhood"),
    propertyType: value(row, "propertyType"),
    surface,
    price,
    bedrooms,
    condition: value(row, "condition"),
  });

  const facts: SellerDeclaredFacts = { ...draft.declared_facts };
  if (transactionType) facts["offer.transaction_type"] = transactionType;
  if (bathrooms !== null) facts["layout.bathrooms_count"] = bathrooms;
  if (description) facts["description.public_text"] = description.slice(0, 5000);

  if (!externalReference) issue(issues, "blocking", "external_reference", "external_reference_missing", "Une référence partenaire stable est obligatoire.");
  if (!transactionType) issue(issues, "blocking", "transaction_type", "transaction_type_invalid", "La transaction doit être une vente ou une location.");
  for (const missing of draft.required_missing) issue(issues, "blocking", missing, "required_fact_missing", "Information essentielle manquante.");
  if (price === null || price <= 0) issue(issues, "warning", "offer.price_amount", "price_missing", "Ajouter le prix améliore la comparaison.");
  if (!value(row, "neighborhood")) issue(issues, "warning", "location.neighborhood", "neighborhood_missing", "Ajouter le quartier améliore la recherche locale.");
  if (description.length < 80) issue(issues, "warning", "description.public_text", "description_short", "Une description d’au moins 80 caractères améliore l’annonce.");
  if (photoCount < 3) issue(issues, "warning", "media.photos", "photo_count_low", "Ajouter au moins trois photos.");
  if (acceptedPhotoCount < 3) issue(issues, "warning", "media.photos", "photo_quality_low", "Ajouter au moins trois photos conformes.");
  if (!value(row, "condition")) issue(issues, "info", "condition.condition", "condition_missing", "L’état du bien n’est pas renseigné.");

  const readiness = calculateSellerReadiness({
    city: value(row, "city"),
    neighborhood: value(row, "neighborhood"),
    propertyType: value(row, "propertyType"),
    surface: surface ?? undefined,
    bedrooms: bedrooms ?? undefined,
    condition: value(row, "condition"),
    price: price ?? undefined,
    description,
    phone,
    photoCount,
    acceptedPhotoCount,
  });

  const blockingCount = issues.filter((item) => item.severity === "blocking").length;
  const warningCount = issues.filter((item) => item.severity === "warning").length;
  const infoCount = issues.filter((item) => item.severity === "info").length;
  const rowStatus = blockingCount > 0 ? "invalid" : warningCount > 0 ? "warning" : "valid";

  return {
    canonical_payload: {
      mapping_version: PARTNER_CANONICAL_MAPPING_VERSION,
      schema_version: PROPERTY_SCHEMA_VERSION,
      source_kind: "partner_declared",
      external_reference: externalReference,
      declared_facts: facts,
      weighted_completeness: draft.weighted_completeness,
      required_missing: draft.required_missing,
      structurally_useful: draft.structurally_useful && transactionType !== null && externalReference !== null,
      listing_readiness: {
        score: readiness.score,
        label: readiness.label,
        essentials_complete: readiness.essentialsComplete,
      },
      photo_count: photoCount,
      accepted_photo_count: acceptedPhotoCount,
      publication_eligible: false,
    },
    validation_summary: {
      status: rowStatus,
      issues,
      blocking_count: blockingCount,
      warning_count: warningCount,
      info_count: infoCount,
    },
    row_status: rowStatus,
    publication_eligible: false,
  };
}
