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

function structuralUrlEvidence(row: DbListingRow): { transaction: "sale" | "rent" | null; propertyType: string | null } {
  const raw = row.listing_url ?? "";
  let path = "";
  try {
    path = decodeURIComponent(new URL(raw).pathname).toLowerCase();
  } catch {
    return { transaction: null, propertyType: null };
  }

  const segments = path.split("/").filter(Boolean);
  const host = (() => {
    try { return new URL(raw).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
  })();

  const mapType = (value: string | undefined): string | null => {
    const v = value ?? "";
    if (/^appart(?:ement|ements)?$/.test(v)) return "apartment";
    if (/^studios?$/.test(v)) return "studio";
    if (/^villas?$/.test(v) || v === "villas_et_riads") return "villa";
    if (/^maisons?$/.test(v)) return "house";
    if (/^terrains?$/.test(v)) return "land";
    if (/^bureaux?$/.test(v)) return "office";
    if (/^(?:local|locaux|commerce|commercial|magasin)s?$/.test(v) || v === "locaux-magasins") return "commercial";
    if (/^riads?$/.test(v)) return "riad";
    return null;
  };

  // Agenz: /annonces/immo-.../vente-appartements/... or location-villas/...
  if (host === "agenz.ma") {
    const route = segments.find((segment) => /^(?:vente|location)-/.test(segment));
    if (route) {
      const [tx, ...rest] = route.split("-");
      return {
        transaction: tx === "vente" ? "sale" : "rent",
        propertyType: mapType(rest.join("-")),
      };
    }
  }

  // MarocImmo: /fr/{vente|location}/{type}/...
  if (host === "marocimmo.com") {
    const i = segments.findIndex((segment) => segment === "vente" || segment === "location");
    if (i >= 0) return { transaction: segments[i] === "vente" ? "sale" : "rent", propertyType: mapType(segments[i + 1]) };
  }

  // Domio: /fr/{type}/{vendre|louer}/{city}/...
  if (host === "domio.ma") {
    const i = segments.findIndex((segment) => segment === "vendre" || segment === "louer");
    if (i > 0) return { transaction: segments[i] === "vendre" ? "sale" : "rent", propertyType: mapType(segments[i - 1]) };
  }

  // Mouldar: /fr/{achat|location}/{type}/...
  if (host === "mouldar.com") {
    const i = segments.findIndex((segment) => segment === "achat" || segment === "location" || segment === "rent");
    if (i >= 0) return { transaction: segments[i] === "achat" ? "sale" : "rent", propertyType: mapType(segments[i + 1]) };
  }

  // Masaken: /fr/immobilier-maroc/{vente|location}-{type}-...
  if (host === "masaken.ma") {
    const route = segments.find((segment) => /^(?:vente|location)-/.test(segment));
    if (route) {
      const parts = route.split("-");
      return { transaction: parts[0] === "vente" ? "sale" : "rent", propertyType: mapType(parts[1]) };
    }
  }

  // Sarouty: /plp/{acheter|louer}/{type}-...
  if (host === "sarouty.ma") {
    const i = segments.findIndex((segment) => segment === "acheter" || segment === "louer");
    if (i >= 0) {
      const typeToken = (segments[i + 1] ?? "").split("-")[0];
      return { transaction: segments[i] === "acheter" ? "sale" : "rent", propertyType: mapType(typeToken) };
    }
  }

  // Avito has a stable category path segment but no independent transaction segment.
  if (host === "avito.ma") {
    const type = segments.map(mapType).find(Boolean) ?? null;
    return { transaction: null, propertyType: type };
  }

  return { transaction: null, propertyType: null };
}

function primaryTitleTransaction(row: DbListingRow): "sale" | "rent" | null {
  const title = row.title?.toLowerCase() ?? "";
  const sale = /(?:^|\W)(?:vente|vendu|à vendre|a vendre)(?:\W|$)/u.test(title);
  const rent = /(?:^|\W)(?:location|loué|loue|à louer|a louer)(?:\W|$)/u.test(title);
  if (sale === rent) return null;
  return sale ? "sale" : "rent";
}

function primaryTitlePropertyType(row: DbListingRow): string | null {
  const title = row.title?.toLowerCase() ?? "";
  const rules: Array<[string, RegExp]> = [
    ["land", /^(?:terrain|lot de terrain|ferme)\b|\b(?:terrain|lot de terrain|ferme)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["villa", /^villa\b|\bvilla\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["studio", /^studio\b|\bstudio\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["office", /^(?:bureau|plateau bureau)\b|\b(?:bureau|plateau bureau)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["commercial", /^(?:local commercial|magasin|commerce)\b|\b(?:local commercial|magasin|commerce)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["riad", /^riad\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["apartment", /^(?:appartement|appart)\b|\b(?:appartement|appart)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["house", /^maison\b|\bmaison\s+(?:à|a)\s+(?:vendre|louer)\b/u],
  ];
  return rules.find(([, re]) => re.test(title))?.[0] ?? null;
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

export function hasStrongSemanticIntegrityConflict(row: DbListingRow): boolean {
  const tx = row.transaction_type?.trim().toLowerCase() ?? "";
  const type = row.property_type?.trim().toLowerCase() ?? "";

  if (!["sale", "rent", "new"].includes(tx)) return true;
  if (!ALLOWED_PROPERTY_TYPES.has(type)) return true;

  const titleTx = primaryTitleTransaction(row);
  const structuralTx = structuralUrlEvidence(row).transaction;
  if (titleTx && structuralTx && titleTx !== structuralTx) return true;
  if (titleTx && tx !== titleTx) return true;
  if (structuralTx && tx !== structuralTx) return true;

  const titleType = primaryTitlePropertyType(row);
  const structuralType = structuralUrlEvidence(row).propertyType;
  const typeEquivalent = (evidenceType: string | null): boolean =>
    evidenceType == null ||
    evidenceType === type ||
    (evidenceType === "studio" && type === "apartment") ||
    (evidenceType === "apartment" && type === "studio") ||
    (evidenceType === "villa" && type === "house") ||
    (evidenceType === "house" && type === "villa") ||
    (evidenceType === "riad" && (type === "house" || type === "villa"));

  if (titleType && structuralType && titleType !== structuralType) return true;
  if (!typeEquivalent(titleType)) return true;
  if (!typeEquivalent(structuralType)) return true;

  if (row.surface_m2 != null) {
    if (row.surface_m2 < 8) return true;
    if (type === "land" && row.surface_m2 > 10_000_000) return true;
    if (type !== "land" && row.surface_m2 > 10_000) return true;

    const explicitTitleSurface = singleExplicitTitleSurfaceM2(row);
    if (explicitTitleSurface != null && explicitTitleSurface !== row.surface_m2) return true;
  }

  if (row.rooms_count != null && row.rooms_count < 0) return true;
  if (row.bedrooms_count != null && row.bedrooms_count < 0) return true;
  if (row.bathrooms_count != null && row.bathrooms_count < 0) return true;

  const evidenceText = `${row.title ?? ""} ${row.description_snippet ?? ""}`;
  const explicitRooms = uniqueExplicitCount(evidenceText, "room");
  const explicitBedrooms = uniqueExplicitCount(evidenceText, "bedroom");
  const explicitBathrooms = uniqueExplicitCount(evidenceText, "bathroom");

  if (row.rooms_count != null && explicitRooms != null && row.rooms_count !== explicitRooms) return true;
  if (row.bedrooms_count != null && explicitBedrooms != null && row.bedrooms_count !== explicitBedrooms) return true;
  if (row.bathrooms_count != null && explicitBathrooms != null && row.bathrooms_count !== explicitBathrooms) return true;

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
