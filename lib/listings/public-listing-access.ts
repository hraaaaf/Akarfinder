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

  if (host === "marocimmo.com") {
    const i = segments.findIndex((segment) => segment === "vente" || segment === "location");
    if (i >= 0) return { transaction: segments[i] === "vente" ? "sale" : "rent", propertyType: mapType(segments[i + 1]) };
  }

  if (host === "domio.ma") {
    const i = segments.findIndex((segment) => segment === "vendre" || segment === "louer");
    if (i > 0) return { transaction: segments[i] === "vendre" ? "sale" : "rent", propertyType: mapType(segments[i - 1]) };
  }

  if (host === "mouldar.com") {
    const i = segments.findIndex((segment) => segment === "achat" || segment === "location" || segment === "rent");
    if (i >= 0) return { transaction: segments[i] === "achat" ? "sale" : "rent", propertyType: mapType(segments[i + 1]) };
  }

  if (host === "masaken.ma") {
    const route = segments.find((segment) => /^(?:vente|location)-/.test(segment));
    if (route) {
      const parts = route.split("-");
      return { transaction: parts[0] === "vente" ? "sale" : "rent", propertyType: mapType(parts[1]) };
    }
  }

  if (host === "sarouty.ma") {
    const i = segments.findIndex((segment) => segment === "acheter" || segment === "louer");
    if (i >= 0) {
      const typeToken = (segments[i + 1] ?? "").split("-")[0];
      return { transaction: segments[i] === "acheter" ? "sale" : "rent", propertyType: mapType(typeToken) };
    }
  }

  if (host === "avito.ma") {
    const categoryIndex = segments.findIndex((segment) =>
      /^(?:appartements?|maisons?|villas_et_riads|villas?|terrains?|bureaux?|local|locaux|commerce|commercial|magasins?|riads?|studios?)$/.test(segment),
    );
    return {
      transaction: null,
      propertyType: categoryIndex >= 0 ? mapType(segments[categoryIndex]) : null,
    };
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
  const title = row.title?.toLowerCase().trim() ?? "";

  const leading: Array<[string, RegExp]> = [
    ["land", /^(?:terrain|lot de terrain|ferme)\b/u],
    ["villa", /^villa\b/u],
    ["studio", /^studio\b/u],
    ["office", /^(?:bureau|plateau bureau)\b/u],
    ["commercial", /^(?:local commercial|magasin|commerce)\b/u],
    ["riad", /^riad\b/u],
    ["apartment", /^(?:appartement|appart)\b/u],
    ["house", /^maison\b/u],
  ];
  const leadingType = leading.find(([, re]) => re.test(title))?.[0];
  if (leadingType) return leadingType;

  const actionRules: Array<[string, RegExp]> = [
    ["land", /\b(?:terrain|lot de terrain|ferme)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["villa", /\bvilla\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["studio", /\bstudio\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["office", /\b(?:bureau|plateau bureau)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["commercial", /\b(?:local commercial|magasin|commerce)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["riad", /\briad\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["apartment", /\b(?:appartement|appart)\s+(?:à|a)\s+(?:vendre|louer)\b/u],
    ["house", /\bmaison\s+(?:à|a)\s+(?:vendre|louer)\b/u],
  ];
  const candidates = [...new Set(actionRules.filter(([, re]) => re.test(title)).map(([type]) => type))];
  return candidates.length === 1 ? candidates[0] : null;
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

function uniqueExplicitCount(text: string | null | undefined, kind: "bedroom" | "bathroom" | "room"): number | null {
  const raw = text ?? "";
  const patterns =
    kind === "bedroom"
      ? [
          /(?:chambres?|bedrooms?)\s*[:=-]?\s*(\d{1,3})(?!\d)/giu,
          /(\d{1,3})\s*chambres?/giu,
        ]
      : kind === "bathroom"
        ? [
            /(?:salle?s?\s*de\s*bain|sdb|bathrooms?)\s*[:=-]?\s*(\d{1,2})(?!\d)/giu,
            /(\d{1,2})\s*(?:salle?s?\s*de\s*bain|sdb)/giu,
          ]
        : [
            /(?:pi[eè]ces?|rooms?)\s*[:=-]?\s*(\d{1,3})(?!\d)/giu,
            /(\d{1,3})\s*pi[eè]ces?/giu,
            /(\d{1,3})\s*rooms?/giu,
          ];

  const values = patterns.flatMap((pattern) => {
    pattern.lastIndex = 0;
    return Array.from(raw.matchAll(pattern), (match) => Number(match[1]));
  }).filter((value) => Number.isFinite(value));

  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] : null;
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

export function canPublishDbRowToPublicSurface(row: DbListingRow): boolean {
  return canPublishStructuredListing(row.source_name ?? "");
}

export function canPublishDbRowToPublicSearchSurface(row: DbListingRow): boolean {
  if (hasStrongSemanticIntegrityConflict(row)) return false;
  return canPublishDbRowToPublicSurface(row) || canPublishPersistedExternalListing(row);
}
