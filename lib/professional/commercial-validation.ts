import type { CanonicalPropertyType } from "@/lib/property-schema/core";
import { PARTNER_ONBOARDING_FIELD_RULES, type PartnerDeclaredFacts, type PartnerOnboardingStep } from "./partner-property-onboarding";
import type { ProfessionalActivationStatus, SourceAuthorizationStatus } from "./commercial-activation";

const PROPERTY_TYPES = new Set<CanonicalPropertyType>([
  "apartment","villa","house","studio","duplex","riad","land","office","commercial","warehouse","industrial","farm","building","other",
]);
const ALLOWED_DECLARED_PATHS = new Set(
  PARTNER_ONBOARDING_FIELD_RULES.filter((rule) => rule.category !== "derived").map((rule) => rule.path),
);

export function parseCreatePartnerSubmission(value: unknown): { property_type: CanonicalPropertyType; transaction_type: "sale" | "rent" } | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.property_type !== "string" || !PROPERTY_TYPES.has(raw.property_type as CanonicalPropertyType)) return null;
  if (raw.transaction_type !== "sale" && raw.transaction_type !== "rent") return null;
  return { property_type: raw.property_type as CanonicalPropertyType, transaction_type: raw.transaction_type };
}

function safeDeclaredValue(value: unknown): unknown {
  if (value == null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value) && value.length <= 50 && value.every((item) => ["string","number","boolean"].includes(typeof item))) return value;
  return undefined;
}

export function sanitizePartnerDeclaredFacts(value: unknown): PartnerDeclaredFacts | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result: PartnerDeclaredFacts = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (!ALLOWED_DECLARED_PATHS.has(key)) return null;
    const safe = safeDeclaredValue(rawValue);
    if (safe === undefined) return null;
    result[key] = safe;
  }
  return result;
}

export function parseSavePartnerSubmission(value: unknown): { declared_facts: PartnerDeclaredFacts; current_step: PartnerOnboardingStep } | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const currentStep = Number(raw.current_step);
  if (!Number.isInteger(currentStep) || currentStep < 1 || currentStep > 7) return null;
  const declaredFacts = sanitizePartnerDeclaredFacts(raw.declared_facts);
  if (!declaredFacts) return null;
  return { declared_facts: declaredFacts, current_step: currentStep as PartnerOnboardingStep };
}

export function parsePartnerMediaInput(value: unknown): {
  submission_id?: string;
  project_id?: string;
  media_type: "image" | "video" | "floor_plan" | "document";
  url: string;
  source_url?: string | null;
  rights_status: "allowed" | "partner_only" | "unknown" | "forbidden";
  publication_permission: "allowed" | "partner_only" | "forbidden" | "unknown";
  attribution?: string | null;
} | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const mediaTypes = ["image","video","floor_plan","document"];
  const rights = ["allowed","partner_only","unknown","forbidden"];
  if (!mediaTypes.includes(String(raw.media_type))) return null;
  if (!rights.includes(String(raw.rights_status)) || !rights.includes(String(raw.publication_permission))) return null;
  if (!!raw.submission_id === !!raw.project_id) return null;
  if (raw.submission_id != null && typeof raw.submission_id !== "string") return null;
  if (raw.project_id != null && typeof raw.project_id !== "string") return null;
  if (typeof raw.url !== "string") return null;
  try {
    const url = new URL(raw.url);
    if (url.protocol !== "https:") return null;
    if (raw.source_url != null) {
      const source = new URL(String(raw.source_url));
      if (source.protocol !== "https:") return null;
    }
  } catch { return null; }
  return {
    submission_id: raw.submission_id as string | undefined,
    project_id: raw.project_id as string | undefined,
    media_type: raw.media_type as "image" | "video" | "floor_plan" | "document",
    url: raw.url,
    source_url: raw.source_url == null ? null : String(raw.source_url),
    rights_status: raw.rights_status as "allowed" | "partner_only" | "unknown" | "forbidden",
    publication_permission: raw.publication_permission as "allowed" | "partner_only" | "forbidden" | "unknown",
    attribution: typeof raw.attribution === "string" ? raw.attribution : null,
  };
}

export function parseStaffActivationInput(value: unknown): {
  activation_status: ProfessionalActivationStatus;
  source_authorization_status: SourceAuthorizationStatus;
  validation_status?: "pending" | "validated" | "suspended" | "rejected";
  commercial_tier?: "none" | "partner" | "gold" | "premium";
} | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const activation = ["pending","onboarding","review","active","paused","rejected"];
  const source = ["none","pending","confirmed","revoked"];
  const validation = ["pending","validated","suspended","rejected"];
  const tiers = ["none","partner","gold","premium"];
  if (!activation.includes(String(raw.activation_status)) || !source.includes(String(raw.source_authorization_status))) return null;
  if (raw.validation_status != null && !validation.includes(String(raw.validation_status))) return null;
  if (raw.commercial_tier != null && !tiers.includes(String(raw.commercial_tier))) return null;
  return {
    activation_status: raw.activation_status as ProfessionalActivationStatus,
    source_authorization_status: raw.source_authorization_status as SourceAuthorizationStatus,
    ...(raw.validation_status ? { validation_status: raw.validation_status as "pending" | "validated" | "suspended" | "rejected" } : {}),
    ...(raw.commercial_tier ? { commercial_tier: raw.commercial_tier as "none" | "partner" | "gold" | "premium" } : {}),
  };
}
