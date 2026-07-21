import type { CanonicalOfferV1, CanonicalPropertyV1, CanonicalFact } from "./core";
import type { CanonicalProjectV1 } from "./project-schema-v1";

export interface ValidationIssueV1 {
  path: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResultV1 {
  valid: boolean;
  issues: ValidationIssueV1[];
}

const PHONE_RE = /(\+212|0[5-7])\d{8}/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function result(issues: ValidationIssueV1[]): ValidationResultV1 {
  return { valid: !issues.some((issue) => issue.severity === "error"), issues };
}

function push(issues: ValidationIssueV1[], path: string, code: string, message: string, severity: ValidationIssueV1["severity"] = "error") {
  issues.push({ path, code, message, severity });
}

function validatePositiveFact(issues: ValidationIssueV1[], path: string, field?: CanonicalFact<number>, allowZero = false) {
  const value = field?.value;
  if (value == null) return;
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    push(issues, path, "invalid_numeric_value", `${path} must be ${allowZero ? ">= 0" : "> 0"} when known`);
  }
}

export function validatePropertyIngestion(property: CanonicalPropertyV1): ValidationResultV1 {
  const issues: ValidationIssueV1[] = [];
  if (!property.property_id.trim()) push(issues, "property_id", "missing_identity", "property_id is required");
  if (property.schema_version !== "1.0") push(issues, "schema_version", "unsupported_version", "schema_version must be 1.0");

  validatePositiveFact(issues, "surfaces.surface_total_m2", property.facts.surfaces.surface_total_m2);
  validatePositiveFact(issues, "surfaces.surface_habitable_m2", property.facts.surfaces.surface_habitable_m2);
  validatePositiveFact(issues, "surfaces.surface_built_m2", property.facts.surfaces.surface_built_m2);
  validatePositiveFact(issues, "surfaces.surface_land_m2", property.facts.surfaces.surface_land_m2);
  validatePositiveFact(issues, "layout.rooms_count", property.facts.layout.rooms_count, true);
  validatePositiveFact(issues, "layout.bedrooms_count", property.facts.layout.bedrooms_count, true);
  validatePositiveFact(issues, "layout.bathrooms_count", property.facts.layout.bathrooms_count, true);

  const lat = property.facts.location.latitude?.value;
  const lng = property.facts.location.longitude?.value;
  if (lat != null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) push(issues, "location.latitude", "invalid_latitude", "latitude outside [-90, 90]");
  if (lng != null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) push(issues, "location.longitude", "invalid_longitude", "longitude outside [-180, 180]");
  if ((lat == null) !== (lng == null)) push(issues, "location", "partial_coordinates", "latitude and longitude must be provided together", "warning");

  return result(issues);
}

export function validateOfferIngestion(offer: CanonicalOfferV1): ValidationResultV1 {
  const issues: ValidationIssueV1[] = [];
  if (!offer.offer_id.trim()) push(issues, "offer_id", "missing_identity", "offer_id is required");
  if (!offer.property_id.trim()) push(issues, "property_id", "missing_property_identity", "property_id is required");
  if (!offer.source_id.trim()) push(issues, "source_id", "missing_source", "source_id is required");
  if (!offer.external_offer_id && !offer.canonical_source_url && !offer.source_url) {
    push(issues, "identity", "missing_offer_identity", "external_offer_id or source URL is required; title is never an identity fallback");
  }
  const price = offer.price_amount.value;
  if (offer.price_status === "valid" && (price == null || !Number.isFinite(price) || price <= 0)) {
    push(issues, "price_amount", "invalid_valid_price", "valid price requires a positive amount");
  }
  if (offer.price_status !== "valid" && price === 0) {
    push(issues, "price_amount", "false_zero_price", "0 must never represent an unknown or undisclosed price");
  }
  for (const [path, text] of [["title", offer.title.value], ["description", offer.description.value]] as const) {
    if (text && (PHONE_RE.test(text) || EMAIL_RE.test(text))) push(issues, path, "pii_in_public_text", `${path} contains phone/email PII`);
  }
  return result(issues);
}

export function validatePropertyPublication(property: CanonicalPropertyV1, offer: CanonicalOfferV1): ValidationResultV1 {
  const issues = [...validatePropertyIngestion(property).issues, ...validateOfferIngestion(offer).issues];
  if (property.facts.classification.property_type.value === "unknown") push(issues, "classification.property_type", "unknown_property_type", "public structured listing needs a known property type");
  if (!property.facts.location.city.value?.trim()) push(issues, "location.city", "missing_city", "public structured listing needs a city");
  if (offer.compliance_status !== "allowed") push(issues, "compliance_status", "publication_not_allowed", "offer must be explicitly allowed for structured publication");
  if (offer.offer_status !== "active") push(issues, "offer_status", "offer_not_active", "only active offers may be published");
  return result(issues);
}

export function validateProjectIngestion(project: CanonicalProjectV1): ValidationResultV1 {
  const issues: ValidationIssueV1[] = [];
  if (!project.project_id.trim()) push(issues, "project_id", "missing_identity", "project_id is required");
  if (!project.project_name.value?.trim()) push(issues, "project_name", "missing_name", "project_name is required");
  if (!project.location.city.value?.trim()) push(issues, "location.city", "missing_city", "project city is required");
  const min = project.inventory.min_price_mad?.value;
  const max = project.inventory.max_price_mad?.value;
  if (min != null && min <= 0) push(issues, "inventory.min_price_mad", "invalid_price", "project min price must be positive");
  if (max != null && max <= 0) push(issues, "inventory.max_price_mad", "invalid_price", "project max price must be positive");
  if (min != null && max != null && min > max) push(issues, "inventory", "invalid_price_range", "project min price cannot exceed max price");
  return result(issues);
}
