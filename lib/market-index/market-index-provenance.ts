// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — provenance validation.
// Enforces the mission's rule (section 10): OpenSERP data is always
// "persisted_openserp" (mapped to the public "external_web_result" display
// type by the UNCHANGED lib/listings/map-db-listing.ts) and can never be
// silently promoted to a partner-looking origin.

import type { OriginType } from "./market-index-types";
import { ALLOWED_ORIGIN_TYPES } from "./market-index-types";

export type ProvenanceValidationResult =
  | { valid: true; origin_type: OriginType }
  | { valid: false; reason: string };

export function validateOriginType(value: string | null | undefined): ProvenanceValidationResult {
  if (!value) {
    return { valid: false, reason: "origin_type is required" };
  }
  if (!ALLOWED_ORIGIN_TYPES.includes(value as OriginType)) {
    return { valid: false, reason: `origin_type "${value}" is not one of the allowed values` };
  }
  return { valid: true, origin_type: value as OriginType };
}

// The one hard rule this mission enforces at the code level, independent of
// whatever a future ingestion pipeline might attempt: an OpenSERP-sourced
// offer's origin_type may never be a partner-facing value.
const PARTNER_FACING_ORIGINS: readonly OriginType[] = ["partner_api", "partner_feed", "first_party_user"];

export function assertOpenSerpOriginIsNeverPartnerFacing(
  isOpenSerpProvider: boolean,
  originType: OriginType,
): void {
  if (isOpenSerpProvider && PARTNER_FACING_ORIGINS.includes(originType)) {
    throw new Error(
      `Refused: an OpenSERP-sourced offer cannot be assigned origin_type="${originType}" -- ` +
        `OpenSERP data must remain "persisted_openserp" and render as external_web_result, never as a partner listing.`,
    );
  }
}

export function isPersistedOpenSerp(originType: OriginType | null): boolean {
  return originType === "persisted_openserp";
}
