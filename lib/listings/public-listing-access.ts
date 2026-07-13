// PUBLIC-READMODEL-AUTHORIZED-ONLY-1
// Guards for the public read-model: first_party and partner_authorized
// sources remain the only structured AkarFinder listings by default.
//
// OPENSERP-LISTING-QUALITY-REMEDIATION-2 adds a separate, opt-in publication
// lane for persisted OpenSERP results on public search surfaces only.

import {
  canPublishStructuredListing,
  getSourceAccessType,
} from "@/lib/sources/source-access-registry";
import type { Listing } from "@/lib/listings/types";
import type { DbListingRow } from "@/lib/listings/db-listings";
import { isPersistedOpenSerpListingsEnabled } from "@/lib/listings/persisted-openserp-feature";

type PersistedOpenSerpMetadata = {
  provider?: string;
  acquisition_provider?: string;
  publication_lane?: string;
  classification_lane?: string;
  source_domain?: string;
};

const PHONE_RE = /(\+212|0[5-7])\d{8}/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const ALLOWED_EXTERNAL_SOURCES = new Set([
  "1immo",
  "agenz",
  "avito",
  "barnes-marrakech",
  "kawtarimmobilier",
  "limmobiliersansfrontieres",
  "logic-immo",
  "logicimmo",
  "marocannonces",
  "marrakechrealty",
  "mouldar",
  "mubawab",
  "sarouty",
]);

function parseMetadata(fieldConfidence: string | null | undefined): PersistedOpenSerpMetadata | null {
  if (!fieldConfidence) return null;
  try {
    const parsed = JSON.parse(fieldConfidence) as PersistedOpenSerpMetadata;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function containsPii(value: string | null | undefined): boolean {
  if (!value) return false;
  return PHONE_RE.test(value) || EMAIL_RE.test(value);
}

function isSafeHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeExternalSourceName(sourceName: string | null | undefined): string | null {
  const normalized = sourceName?.toLowerCase().trim();
  if (!normalized) return null;
  if (normalized === "logic_immo") return "logic-immo";
  return normalized;
}

function isAllowedExternalSourceName(sourceName: string | null | undefined): boolean {
  const normalized = normalizeExternalSourceName(sourceName);
  if (!normalized || !ALLOWED_EXTERNAL_SOURCES.has(normalized)) return false;

  const accessType = getSourceAccessType(normalized);
  return accessType === "third_party_legacy" || accessType === "public_external_live";
}

function hasRequiredPersistedExternalFields(row: DbListingRow): boolean {
  return Boolean(
    row.title?.trim() &&
      row.city?.trim() &&
      row.transaction_type?.trim() &&
      row.property_type?.trim() &&
      row.listing_url?.trim(),
  );
}

export function canPublishPersistedExternalListing(
  row: DbListingRow,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!isPersistedOpenSerpListingsEnabled(env)) return false;

  const metadata = parseMetadata(row.field_confidence);
  if (!metadata) return false;
  if (metadata.provider !== "openserp" && metadata.acquisition_provider !== "openserp") return false;
  if (metadata.publication_lane !== "external_web_result") return false;
  if (metadata.classification_lane !== "individual_listing") return false;
  if (!isAllowedExternalSourceName(row.source_name)) return false;
  if (!hasRequiredPersistedExternalFields(row)) return false;
  if (!isSafeHttpUrl(row.listing_url) || !isSafeHttpUrl(row.source_url ?? row.listing_url)) return false;
  if (containsPii(row.title) || containsPii(row.description_snippet) || containsPii(row.seller_name)) return false;

  return true;
}

/**
 * Returns true only when the listing's source is first_party or
 * partner_authorized. All other sources remain suppressed from structured
 * public surfaces.
 */
export function canPublishListingToPublicSurface(listing: Listing): boolean {
  return canPublishStructuredListing(listing.source_name ?? "");
}

export function canPublishListingToPublicSearchSurface(listing: Listing): boolean {
  if (canPublishListingToPublicSurface(listing)) return true;

  return (
    isPersistedOpenSerpListingsEnabled() &&
    listing.source_badge === "external_web_result" &&
    listing.original_source_required === true &&
    Array.isArray(listing.allowed_ctas) &&
    listing.allowed_ctas.includes("view_original") &&
    isSafeHttpUrl(listing.listing_url) &&
    !containsPii(listing.title) &&
    !containsPii(listing.description_snippet)
  );
}

/**
 * Lightweight structured-only variant for use before mapDbRowToListing.
 */
export function canPublishDbRowToPublicSurface(row: DbListingRow): boolean {
  return canPublishStructuredListing(row.source_name ?? "");
}

export function canPublishDbRowToPublicSearchSurface(row: DbListingRow): boolean {
  return canPublishDbRowToPublicSurface(row) || canPublishPersistedExternalListing(row);
}
