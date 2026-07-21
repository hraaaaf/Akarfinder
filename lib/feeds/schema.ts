// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#8/10) -- Direct Feeds Ingestion
// Capability. Canonical feed schema + strict validation for agency/promoter
// bulk feeds (CSV/JSON/XML). This is a CAPABILITY: no real partner is
// signed or announced as part of this mission. Reuses the project's
// existing pure normalizers in spirit (see scripts/import-partner-csv.ts,
// the legacy pre-Supabase pipeline) but with one deliberate difference:
// price is nullable here, matching project doctrine invariant #11 ("Prix
// absent: NULL / Prix non communique. Jamais faux 0 DH") -- the legacy
// pipeline's price_mad >= 1000 requirement does not hold for this mission.

export const VALID_PROPERTY_TYPES = ["apartment", "villa", "land", "office", "commercial", "other"] as const;
export type FeedPropertyType = (typeof VALID_PROPERTY_TYPES)[number];

export const VALID_TRANSACTION_TYPES = ["sale", "rent"] as const;
export type FeedTransactionType = (typeof VALID_TRANSACTION_TYPES)[number];

// A feed row can represent either a new/updated offer, or a signal that a
// previously-fed offer should be removed/unpublished. update_signal is
// absent (undefined) for a normal create-or-update row.
export type FeedUpdateSignal = "delete" | "unpublish";

// The canonical shape every parser (CSV/JSON/XML) must produce, before
// validation. Raw string/unknown values only -- normalization happens in
// validate.ts, not here.
export type RawFeedRow = {
  external_id: string | null;
  source_name: string;
  source_domain: string | null;
  source_url: string | null;
  transaction_type: string;
  property_type: string;
  title: string;
  description: string | null;
  city: string;
  district: string | null;
  price_mad: string | number | null;
  surface_m2: string | number | null;
  bedrooms_count: string | number | null;
  coordinates: { lat: number; lng: number } | null;
  image_urls: string[] | null;
  images_rights_confirmed: boolean;
  updated_at_source: string | null;
  update_signal: FeedUpdateSignal | null;
};

export type ValidatedFeedRow = {
  external_id: string | null;
  source_name: string;
  source_domain: string | null;
  source_url: string | null;
  transaction_type: FeedTransactionType;
  property_type: FeedPropertyType;
  title: string;
  description: string | null;
  city: string;
  district: string | null;
  price_mad: number | null;
  surface_m2: number | null;
  bedrooms_count: number | null;
  coordinates: { lat: number; lng: number } | null;
  image_urls: string[];
  updated_at_source: string | null;
  update_signal: FeedUpdateSignal | null;
};

export type FeedValidationError = {
  row_index: number;
  external_id: string | null;
  title: string | null;
  reason: string;
};

const PHONE_RE = /(\+212|0[5-7])\d{8}/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const WHATSAPP_RE = /whatsapp|wa\.me|whats[\s._-]?app/i;

export function containsPii(text: string): boolean {
  return PHONE_RE.test(text) || EMAIL_RE.test(text) || WHATSAPP_RE.test(text);
}

function toOptionalNumber(v: string | number | null): number | null {
  if (v === null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = v.trim().replace(/[\s ]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function normalizePropertyType(raw: string): string {
  const n = raw.trim().toLowerCase();
  if (n === "apartment" || n === "appartement") return "apartment";
  if (n === "villa" || n === "maison") return "villa";
  if (n === "land" || n === "terrain") return "land";
  if (n === "office" || n === "bureau") return "office";
  if (n === "commercial") return "commercial";
  if (n === "other" || n === "autre") return "other";
  return n;
}

function normalizeTransactionType(raw: string): string {
  const n = raw.trim().toLowerCase();
  if (n === "sale" || n === "vente") return "sale";
  if (n === "rent" || n === "location") return "rent";
  return n;
}

const SURFACE_REQUIRED_TYPES = new Set<FeedPropertyType>(["apartment", "villa"]);

// Validates + normalizes ONE row. Returns either a ValidatedFeedRow or a
// FeedValidationError -- never both, never a partially-normalized row that
// silently drops the failure.
export function validateFeedRow(raw: RawFeedRow, rowIndex: number): ValidatedFeedRow | FeedValidationError {
  const title = (raw.title ?? "").trim();
  const err = (reason: string): FeedValidationError => ({ row_index: rowIndex, external_id: raw.external_id, title: title || null, reason });

  const sourceName = (raw.source_name ?? "").trim();
  if (!sourceName) return err("source_name absent");

  // Idempotence identity: partner+external_id is required UNLESS a
  // canonical source_url is present and can serve as a reliable fallback
  // identity. Never title alone -- see staging.ts computeFeedIdentityKey.
  // Checked BEFORE descriptive validation because a delete/unpublish
  // signal only needs to identify a listing, not re-describe it in full.
  const externalId = raw.external_id ? raw.external_id.trim() : null;
  if (!externalId && !raw.source_url) {
    return err("external_id absent ET source_url absent -- aucune identite fiable possible (jamais le titre seul)");
  }

  // A delete/unpublish signal is a "stop showing this" instruction -- the
  // partner feed that sends it often will not resend the full descriptive
  // payload (surface, price, etc.) for something they're taking down.
  // Only the identity fields above are mandatory; everything else is
  // best-effort and passed through as-is (not re-validated, not defaulted
  // to something that could look like real data).
  if (raw.update_signal === "delete" || raw.update_signal === "unpublish") {
    return {
      external_id: externalId,
      source_name: sourceName,
      source_domain: raw.source_domain ? raw.source_domain.trim().toLowerCase() : null,
      source_url: raw.source_url ? raw.source_url.trim() : null,
      transaction_type: normalizeTransactionType(raw.transaction_type ?? "") as FeedTransactionType,
      property_type: normalizePropertyType(raw.property_type ?? "") as FeedPropertyType,
      title: title || "(signal de suppression, sans titre)",
      description: raw.description ? raw.description.trim() : null,
      city: (raw.city ?? "").trim(),
      district: raw.district ? raw.district.trim() : null,
      price_mad: toOptionalNumber(raw.price_mad),
      surface_m2: toOptionalNumber(raw.surface_m2),
      bedrooms_count: toOptionalNumber(raw.bedrooms_count),
      coordinates: raw.coordinates,
      image_urls: [],
      updated_at_source: raw.updated_at_source,
      update_signal: raw.update_signal,
    };
  }

  if (!title || title.length < 5) return err("title absent ou trop court (< 5 caracteres)");
  if (containsPii(title)) return err("title contient une PII (telephone/email/WhatsApp)");

  const city = (raw.city ?? "").trim();
  if (!city) return err("city absente");

  const propertyType = normalizePropertyType(raw.property_type ?? "");
  if (!(VALID_PROPERTY_TYPES as readonly string[]).includes(propertyType)) {
    return err(`property_type invalide: "${raw.property_type}"`);
  }

  const transactionType = normalizeTransactionType(raw.transaction_type ?? "");
  if (!(VALID_TRANSACTION_TYPES as readonly string[]).includes(transactionType)) {
    return err(`transaction_type invalide: "${raw.transaction_type}"`);
  }

  const surfaceM2 = toOptionalNumber(raw.surface_m2);
  if (SURFACE_REQUIRED_TYPES.has(propertyType as FeedPropertyType)) {
    if (surfaceM2 === null) return err(`surface_m2 obligatoire pour ${propertyType}`);
    if (surfaceM2 < 9) return err(`surface_m2 invraisemblable (< 9 m2) pour ${propertyType}: ${surfaceM2}`);
  }

  const priceMad = toOptionalNumber(raw.price_mad);
  if (priceMad !== null && priceMad <= 0) {
    return err(`price_mad ne peut pas etre <= 0 -- utiliser null pour "prix non communique", jamais 0 (doctrine invariant #11)`);
  }

  const description = raw.description ? raw.description.trim() : null;
  if (description && containsPii(description)) return err("description contient une PII (telephone/email/WhatsApp)");

  if (raw.coordinates) {
    const { lat, lng } = raw.coordinates;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return err(`coordinates.lat hors bornes: ${lat}`);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return err(`coordinates.lng hors bornes: ${lng}`);
  }

  // Images: only kept if the feed explicitly asserts publication rights
  // (doctrine: "Aucune image source rehostee" without explicit droit).
  // Without confirmed rights, image URLs are dropped, not rejected -- the
  // row itself is still valid.
  const imageUrls = raw.images_rights_confirmed && raw.image_urls ? raw.image_urls.filter((u) => /^https?:\/\//i.test(u)) : [];

  return {
    external_id: externalId,
    source_name: sourceName,
    source_domain: raw.source_domain ? raw.source_domain.trim().toLowerCase() : null,
    source_url: raw.source_url ? raw.source_url.trim() : null,
    transaction_type: transactionType as FeedTransactionType,
    property_type: propertyType as FeedPropertyType,
    title,
    description,
    city,
    district: raw.district ? raw.district.trim() : null,
    price_mad: priceMad,
    surface_m2: surfaceM2,
    bedrooms_count: toOptionalNumber(raw.bedrooms_count),
    coordinates: raw.coordinates,
    image_urls: imageUrls,
    updated_at_source: raw.updated_at_source,
    update_signal: raw.update_signal,
  };
}

export function isValidationError(x: ValidatedFeedRow | FeedValidationError): x is FeedValidationError {
  return "reason" in x;
}
