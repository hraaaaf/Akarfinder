import type {
  ProfessionalMembershipRole,
  ProfessionalOrganizationType,
} from "./types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEMBERSHIP_ROLES = new Set<ProfessionalMembershipRole>([
  "owner",
  "admin",
  "editor",
  "analyst",
  "lead_manager",
  "viewer",
]);

export type CreateProfessionalOrganizationInput = {
  organization_type: ProfessionalOrganizationType;
  slug: string;
  legal_name: string;
  display_name: string;
  city?: string | null;
};

export type AddProfessionalMemberInput = {
  user_id: string;
  role: ProfessionalMembershipRole;
};

export type UpdateProfessionalProfileInput = {
  display_name?: string;
  description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  city?: string | null;
  public_email?: string | null;
  public_phone?: string | null;
};

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function cleanOptionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return cleanText(value, max) ?? undefined;
}

function cleanOptionalHttpUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 500) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function normalizeProfessionalSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  if (slug.length < 3 || slug.length > 80 || !SLUG_RE.test(slug)) return null;
  return slug;
}

export function parseCreateProfessionalOrganizationInput(
  value: unknown,
): { ok: true; value: CreateProfessionalOrganizationInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "Payload invalide." };
  const raw = value as Record<string, unknown>;
  const organizationType = raw.organization_type;
  if (organizationType !== "agency" && organizationType !== "promoter") {
    return { ok: false, error: "Type d'organisation invalide." };
  }

  const slug = normalizeProfessionalSlug(raw.slug);
  if (!slug) return { ok: false, error: "Slug invalide." };

  const legalName = cleanText(raw.legal_name, 160);
  const displayName = cleanText(raw.display_name, 120);
  if (!legalName || !displayName) return { ok: false, error: "Nom légal et nom d'affichage requis." };

  const city = raw.city == null ? null : cleanText(raw.city, 100);
  if (raw.city != null && !city) return { ok: false, error: "Ville invalide." };

  return {
    ok: true,
    value: {
      organization_type: organizationType,
      slug,
      legal_name: legalName,
      display_name: displayName,
      city,
    },
  };
}

export function parseUpdateProfessionalProfileInput(value: unknown): UpdateProfessionalProfileInput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const result: UpdateProfessionalProfileInput = {};

  if (raw.display_name !== undefined) {
    const displayName = cleanText(raw.display_name, 120);
    if (!displayName) return null;
    result.display_name = displayName;
  }

  for (const [key, max] of [["description", 2000], ["city", 100], ["public_email", 200], ["public_phone", 80]] as const) {
    const cleaned = cleanOptionalText(raw[key], max);
    if (raw[key] !== undefined && cleaned === undefined) return null;
    if (cleaned !== undefined) result[key] = cleaned;
  }

  for (const key of ["logo_url", "website_url"] as const) {
    const cleaned = cleanOptionalHttpUrl(raw[key]);
    if (raw[key] !== undefined && cleaned === undefined) return null;
    if (cleaned !== undefined) result[key] = cleaned;
  }

  // Intentionally ignored/forbidden from self-service: validation_status,
  // commercial_tier, organization_type, created_by, public_visibility.
  const forbidden = ["validation_status", "commercial_tier", "organization_type", "created_by", "public_visibility"];
  if (forbidden.some((key) => raw[key] !== undefined)) return null;

  return Object.keys(result).length > 0 ? result : null;
}

export function parseListingOwnershipClaim(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const candidate = Number((value as Record<string, unknown>).property_listing_id);
  if (!Number.isSafeInteger(candidate) || candidate <= 0) return null;
  return candidate;
}

export function parseAddProfessionalMemberInput(value: unknown): AddProfessionalMemberInput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const userId = typeof raw.user_id === "string" ? raw.user_id.trim() : "";
  const role = raw.role as ProfessionalMembershipRole;
  if (!UUID_RE.test(userId) || !MEMBERSHIP_ROLES.has(role)) return null;
  return { user_id: userId, role };
}
