// SOURCE-ACCESS-REGISTRY-1
// Central source classification registry for AkarFinder.
//
// Doctrine (2026-07-02):
//   AkarFinder Phase 1 = moteur pur + intelligence quartier.
//   Only first_party and partner_authorized sources may be published as
//   structured AkarFinder listings.  All others are either external live
//   signals (Search Gateway, never persisted) or legacy frozen data.
//
// Usage:
//   import { getSourceAccessType, canPublishStructuredListing } from "@/lib/sources/source-access-registry";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SourceAccessType =
  | "first_party"         // AkarFinder-owned or internally produced data
  | "partner_authorized"  // Agency / promoter with explicit signed authorization
  | "public_external_live"// Search Gateway query-time only — never persisted to DB
  | "third_party_legacy"  // Scraped without explicit authorization — DB rows frozen
  | "benchmark_source";   // Price reference only — never becomes a listing

// ─── Registry ─────────────────────────────────────────────────────────────────
// Keys are lower-cased source_name values as stored in the DB or used in
// Search Gateway config.  Lookup is always case-insensitive (see getSourceAccessType).

const SOURCE_REGISTRY: Record<string, SourceAccessType> = {
  // ── First-party ──────────────────────────────────────────────────────────────
  akarfinder: "first_party",
  internal: "first_party",
  first_party: "first_party",
  own: "first_party",

  // ── Partner-authorized ───────────────────────────────────────────────────────
  // Add source_name values here only after explicit written authorization.
  partner_csv: "partner_authorized",
  // e.g. "agence_x_internal": "partner_authorized",

  // ── Third-party legacy (DB rows frozen by motor-purity-freeze) ───────────────
  // These sources were scraped without explicit authorization.
  // Their existing DB rows are frozen; no new ingestion allowed.
  mubawab: "third_party_legacy",
  avito: "third_party_legacy",
  sarouty: "third_party_legacy",

  // ── Search Gateway live sources (public_external_live) ───────────────────────
  // Query-time only — results are never persisted to the AkarFinder DB.
  // Each source has a _serper alias (via Serper API) and a bare alias for
  // runtime identification in Search Gateway normalized results.
  avito_serper: "public_external_live",
  sarouty_serper: "public_external_live",
  agenz_serper: "public_external_live",
  logic_immo_serper: "public_external_live",
  mubawab_serper: "public_external_live",
  yakeey_serper: "benchmark_source", // Yakeey via Serper = benchmark signal only
  serper: "public_external_live",
  search_gateway: "public_external_live",

  // Bare gateway IDs (agenz and logic-immo never had significant DB rows).
  agenz: "public_external_live",
  "logic-immo": "public_external_live",
  logic_immo: "public_external_live",

  // ── Benchmark-only sources ────────────────────────────────────────────────────
  // Never a listing source — price reference data only.
  yakeey: "benchmark_source",
};

// ─── Core lookup ──────────────────────────────────────────────────────────────

/**
 * Returns the access type for a source, falling back to "third_party_legacy"
 * for any unknown source to ensure unknown names are never auto-promoted.
 */
export function getSourceAccessType(sourceName: string): SourceAccessType {
  if (!sourceName || typeof sourceName !== "string") return "third_party_legacy";
  return SOURCE_REGISTRY[sourceName.toLowerCase().trim()] ?? "third_party_legacy";
}

// ─── Publishing guards ────────────────────────────────────────────────────────

/**
 * True only for first_party and partner_authorized sources.
 * Any other source must never appear as a full structured AkarFinder listing.
 */
export function canPublishStructuredListing(sourceName: string): boolean {
  const type = getSourceAccessType(sourceName);
  return type === "first_party" || type === "partner_authorized";
}

/**
 * True only for first_party and partner_authorized sources.
 * Determines whether a /listings/[id] internal detail page may be shown.
 */
export function canShowInternalListingDetail(sourceName: string): boolean {
  const type = getSourceAccessType(sourceName);
  return type === "first_party" || type === "partner_authorized";
}

// ─── Benchmark guard ──────────────────────────────────────────────────────────

/**
 * True for benchmark_source (Yakeey price reference) and first_party sources
 * that may produce price analytics.
 */
export function canUseAsBenchmark(sourceName: string): boolean {
  const type = getSourceAccessType(sourceName);
  return type === "benchmark_source" || type === "first_party";
}

// ─── Predicates ───────────────────────────────────────────────────────────────

export function isLegacyThirdPartySource(sourceName: string): boolean {
  return getSourceAccessType(sourceName) === "third_party_legacy";
}

export function isPublicExternalLiveSource(sourceName: string): boolean {
  return getSourceAccessType(sourceName) === "public_external_live";
}

export function isFirstPartySource(sourceName: string): boolean {
  return getSourceAccessType(sourceName) === "first_party";
}

export function isPartnerAuthorizedSource(sourceName: string): boolean {
  return getSourceAccessType(sourceName) === "partner_authorized";
}

export function isBenchmarkOnlySource(sourceName: string): boolean {
  return getSourceAccessType(sourceName) === "benchmark_source";
}

// ─── Registry introspection ───────────────────────────────────────────────────

/** Returns all registered source names for a given access type. */
export function getSourcesByType(type: SourceAccessType): string[] {
  return Object.entries(SOURCE_REGISTRY)
    .filter(([, t]) => t === type)
    .map(([name]) => name);
}
