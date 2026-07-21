import type { ProfessionalOrganizationType } from "./types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CreateProfessionalOrganizationInput = {
  organization_type: ProfessionalOrganizationType;
  slug: string;
  legal_name: string;
  display_name: string;
  city?: string | null;
};

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
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

export function parseListingOwnershipClaim(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const candidate = Number((value as Record<string, unknown>).property_listing_id);
  if (!Number.isSafeInteger(candidate) || candidate <= 0) return null;
  return candidate;
}
