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

const ALLOWED_PROPERTY_TYPES = new Set([
  "apartment",
  "villa",
  "land",
  "office",
  "commercial",
  "house",
  "studio",
  "riad",
]);

function strongTransactionEvidence(row: DbListingRow): "sale" | "rent" | null {
  const title = row.title?.toLowerCase() ?? "";
  const url = row.listing_url?.toLowerCase() ?? "";

  const titleSale = /(?:^|\W)(?:vente|vendu|à vendre|a vendre)(?:\W|$)/u.test(title);
  const urlSale = /\/(?:vente|vendre|achat|buy)(?:\/|[-_])/u.test(url);
  const titleRent = /(?:^|\W)(?:location|loué|loue|à louer|a louer)(?:\W|$)/u.test(title);
  const urlRent = /\/(?:location|louer|rent)(?:\/|[-_])/u.test(url);

  if (titleSale && urlSale && !titleRent && !urlRent) return "sale";
  if (titleRent && urlRent && !titleSale && !urlSale) return "rent";
  return null;
}

function singleExplicitTitleSurfaceM2(row: DbListingRow): number | null {
  const title = row.title ?? "";
  const values = Array.from(
    title.matchAll(/([0-9]{1,3}(?:[ .,'’][0-9]{3})+|[0-9]{1,7})\s*m(?:²|2)(?=[^0-9]|$)/giu),
  )
    .map((match) => Number(match[1].replace(/[^0-9]/g, "")))
    .filter((value) => Number.isFinite(value) && value >= 8 && value <= 10_000_000);

  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] : null;
}

function strongPropertyTypeEvidence(row: DbListingRow): string | null {
  const title = row.title?.toLowerCase() ?? "";
  const url = row.listing_url?.toLowerCase() ?? "";

  const rules: Array<[string, RegExp, RegExp]> = [
    ["land", /(?:^|\W)(?:terrain|lot de terrain|ferme)(?:\W|$)/u, /(?:\/|[-_])(?:terrain|terrains)(?:\/|[-_])/u],
    ["villa", /(?:^|\W)villa(?:\W|$)/u, /(?:\/|[-_])(?:villa|villas)(?:\/|[-_])/u],
    ["studio", /(?:^|\W)studio(?:\W|$)/u, /(?:\/|[-_])(?:studio|studios)(?:\/|[-_])/u],
    ["office", /(?:^|\W)(?:bureau|plateau bureau)(?:\W|$)/u, /(?:\/|[-_])(?:bureau|bureaux)(?:\/|[-_])/u],
    ["commercial", /(?:^|\W)(?:local commercial|commerce|magasin)(?:\W|$)/u, /(?:\/|[-_])(?:local|locaux|commerce|commercial|magasin)(?:\/|[-_])/u],
    ["riad", /(?:^|\W)riad(?:\W|$)/u, /(?:\/|[-_])(?:riad|riads)(?:\/|[-_])/u],
    ["apartment", /(?:^|\W)(?:appartement|appart)(?:\W|$)/u, /(?:\/|[-_])(?:appartement|appartements)(?:\/|[-_])/u],
    ["house", /(?:^|\W)maison(?:\W|$)/u, /(?:\/|[-_])(?:maison|maisons)(?:\/|[-_])/u],
  ];

  for (const [type, titleRe, urlRe] of rules) {
    if (titleRe.test(title) && urlRe.test(url)) return type;
  }
  return null;
}

function hasUnsupportedRentalCadence(row: DbListingRow): boolean {
  if (row.transaction_type?.trim().toLowerCase() !== "rent") return false;
  const text = `${row.title ?? ""} ${row.description_snippet ?? ""}`.toLowerCase();
  return /(?:par\s+jour|\/jour|journalier|journali[eè]re|par\s+nuit|nuit[eé]e|par\s+semaine|\/semaine|weekly|daily)/u.test(text);
}

function singleExplicitTitleSalePriceMad(row: DbListingRow): number | null {
  if (row.transaction_type?.trim().toLowerCase() !== "sale") return null;
  const title = row.title ?? "";
  if (/(?:mad|dhs?|dh|dirhams?)\s*(?:\/|par)\s*m(?:²|2)/iu.test(title)) return null;

  const values = Array.from(
    title.matchAll(/([0-9]{1,3}(?:[ .,'’][0-9]{3})+|[0-9]{3,10})\s*(?:-\s*)?(?:mad|dhs?|dh|dirhams?)/giu),
  )
    .map((match) => Number(match[1].replace(/[^0-9]/g, "")))
    .filter((value) => Number.isFinite(value) && value >= 10_000 && value <= 500_000_000);

  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] : null;
}

export function hasStrongSemanticIntegrityConflict(row: DbListingRow): boolean {
  const tx = row.transaction_type?.trim().toLowerCase() ?? "";
  const type = row.property_type?.trim().toLowerCase() ?? "";

  if (!["sale", "rent", "new"].includes(tx)) return true;
  if (!ALLOWED_PROPERTY_TYPES.has(type)) return true;

  const strongTx = strongTransactionEvidence(row);
  if (strongTx && tx !== strongTx) return true;

  const strongType = strongPropertyTypeEvidence(row);
  if (
    strongType &&
    type !== strongType &&
    !(strongType === "studio" && type === "apartment") &&
    !(strongType === "villa" && type === "house") &&
    !(strongType === "house" && type === "villa") &&
    !(strongType === "riad" && (type === "house" || type === "villa"))
  ) {
    return true;
  }

  if (row.surface_m2 != null) {
    if (row.surface_m2 < 8) return true;
    if (type === "land" && row.surface_m2 > 10_000_000) return true;
    if (type !== "land" && row.surface_m2 > 10_000) return true;

    const explicitTitleSurface = singleExplicitTitleSurfaceM2(row);
    if (explicitTitleSurface != null && explicitTitleSurface !== row.surface_m2) return true;
  }

  if (row.rooms_count != null && (row.rooms_count < 0 || row.rooms_count > 50)) return true;
  if (row.bedrooms_count != null && (row.bedrooms_count < 0 || row.bedrooms_count > 30)) return true;
  if (row.bathrooms_count != null && (row.bathrooms_count < 0 || row.bathrooms_count > 20)) return true;

  if (hasUnsupportedRentalCadence(row)) return true;

  if (row.price_mad != null) {
    if (row.price_mad > 500_000_000) return true;
    if (tx === "sale" && row.price_mad < 10_000) return true;
    if (tx === "rent" && row.price_mad < 100) return true;

    const explicitTitleSalePrice = singleExplicitTitleSalePriceMad(row);
    if (explicitTitleSalePrice != null && explicitTitleSalePrice !== row.price_mad) return true;
  }

  return false;
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
  if (hasStrongSemanticIntegrityConflict(row)) return false;
  return canPublishDbRowToPublicSurface(row) || canPublishPersistedExternalListing(row);
}
