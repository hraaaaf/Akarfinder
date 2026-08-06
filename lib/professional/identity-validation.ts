import type { ConvertProfessionalActivationInput } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function optionalTrimmedString(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return undefined;
  return normalized;
}

export function parseProfessionalActivationConversionInput(
  activationRequestId: string,
  value: unknown,
): ConvertProfessionalActivationInput | null {
  if (!UUID_RE.test(activationRequestId) || !value || typeof value !== "object") return null;

  const payload = value as Record<string, unknown>;
  if (typeof payload.owner_user_id !== "string" || !UUID_RE.test(payload.owner_user_id)) return null;
  if (typeof payload.slug !== "string") return null;

  const slug = payload.slug.trim().toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length > 120) return null;

  const legalName = optionalTrimmedString(payload.legal_name, 240);
  const displayName = optionalTrimmedString(payload.display_name, 160);
  if (payload.legal_name !== undefined && legalName === undefined) return null;
  if (payload.display_name !== undefined && displayName === undefined) return null;

  return {
    activation_request_id: activationRequestId,
    owner_user_id: payload.owner_user_id,
    slug,
    legal_name: legalName,
    display_name: displayName,
  };
}
