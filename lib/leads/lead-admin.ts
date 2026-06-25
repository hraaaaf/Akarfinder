// P11D-D — Internal CRM helpers for the Pro leads inbox.
// Server-side only. Never import in client components.

export const ALLOWED_LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "visit_confirmed",
  "reschedule_requested",
  "archived",
] as const;

export type AllowedLeadStatus = (typeof ALLOWED_LEAD_STATUSES)[number];

export const ALLOWED_VISIT_STATUSES = [
  "pending",
  "contacted",
  "confirmed",
  "reschedule_requested",
  "cancelled",
  "archived",
] as const;

export type AllowedVisitStatus = (typeof ALLOWED_VISIT_STATUSES)[number];

/**
 * Validate the LEADS_ADMIN_TOKEN.
 * Returns true only if the token matches and is a non-empty string.
 */
export function validateLeadAdminToken(
  token: string | null | undefined
): boolean {
  const adminToken = process.env.LEADS_ADMIN_TOKEN;
  if (!adminToken || typeof adminToken !== "string" || adminToken.length < 8) {
    return false;
  }
  if (!token || typeof token !== "string") return false;
  return token === adminToken;
}

/**
 * Validate a lead status value.
 * Returns the normalized status string, or null if invalid.
 */
export function validateLeadStatusUpdate(
  status: unknown
): AllowedLeadStatus | null {
  if (typeof status !== "string") return null;
  const normalized = status.trim().toLowerCase() as AllowedLeadStatus;
  if ((ALLOWED_LEAD_STATUSES as readonly string[]).includes(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Validate a visit status value.
 * Returns the normalized status string, or null if invalid.
 */
export function validateVisitStatusUpdate(
  status: unknown
): AllowedVisitStatus | null {
  if (typeof status !== "string") return null;
  const normalized = status.trim().toLowerCase() as AllowedVisitStatus;
  if ((ALLOWED_VISIT_STATUSES as readonly string[]).includes(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Sanitize and trim internal notes.
 * Returns null for empty/non-string input. Truncates at 2000 chars.
 */
export function normalizeInternalNotes(notes: unknown): string | null {
  if (typeof notes !== "string") return null;
  const trimmed = notes.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 2000);
}

/**
 * Parse a follow-up date.
 * Accepts ISO date strings (YYYY-MM-DD or full ISO-8601).
 * Returns an ISO string or null if invalid.
 */
export function normalizeFollowUpDate(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Accept YYYY-MM-DD or full ISO-8601
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  visit_confirmed: "Visite confirmée",
  reschedule_requested: "Créneau à modifier",
  archived: "Archivé",
};

const VISIT_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  contacted: "Contacté",
  confirmed: "Confirmé",
  reschedule_requested: "Créneau à modifier",
  cancelled: "Annulé",
  archived: "Archivé",
};

/**
 * Map a lead status to its French display label.
 */
export function mapLeadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status] ?? status;
}

/**
 * Map a visit status to its French display label.
 */
export function mapVisitStatusLabel(status: string): string {
  return VISIT_STATUS_LABELS[status] ?? status;
}
