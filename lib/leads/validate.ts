// P11D — server-side lead payload validation. Pure functions, no I/O.
import type { LeadApiPayload } from "./types";

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateLeadPayload(body: unknown): ValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Payload invalide." };
  }

  const b = body as Record<string, unknown>;
  const profile = b.profile;

  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return { ok: false, error: "Profil manquant." };
  }

  const p = profile as Record<string, unknown>;

  if (p.consentContact !== true) {
    return { ok: false, error: "Consentement de contact requis (consentContact)." };
  }

  if (p.consentIndicatif !== true) {
    return { ok: false, error: "Consentement indicatif requis (consentIndicatif)." };
  }

  const phone = p.phone;
  if (typeof phone !== "string" || normalizePhone(phone).length < 8) {
    return { ok: false, error: "Numéro de téléphone/WhatsApp requis (8 caractères minimum)." };
  }

  const channel = b.source_channel;
  if (channel !== undefined && typeof channel !== "string") {
    return { ok: false, error: "source_channel invalide." };
  }

  return { ok: true };
}

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s\-().]/g, "");
}

// Safe extraction of payload — returns null if structurally invalid
export function extractLeadPayload(body: unknown): LeadApiPayload | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (!b.profile || typeof b.profile !== "object") return null;
  return {
    profile: b.profile as LeadApiPayload["profile"],
    source_channel: typeof b.source_channel === "string" ? b.source_channel : "onboarding",
    source_page: typeof b.source_page === "string" ? b.source_page : undefined,
    listing_id: typeof b.listing_id === "string" ? b.listing_id : undefined,
  };
}
