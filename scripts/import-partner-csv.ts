#!/usr/bin/env tsx
// Partner CSV legacy compatibility validator.
//
// P5 boundary: direct writes from this legacy Light CSV path are disabled.
// The canonical write path must be PartnerListingV2 -> CanonicalPropertyV1.
// This command remains available in --dry-run mode to validate old CSV files.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { buildCanonicalFingerprint } from "./scrapers/utils/fingerprint.js";
import { logger } from "./scrapers/utils/logger.js";
import type { ScrapedListingP0 } from "./scrapers/types.js";

export const LEGACY_PARTNER_CSV_WRITE_STATUS = "disabled_p5_canonical_boundary" as const;

export const VALID_PROPERTY_TYPES = [
  "apartment", "villa", "land", "office", "commercial", "other",
] as const;
export const VALID_TRANSACTION_TYPES = ["sale", "rent"] as const;
export const INTERNAL_PARTNER_SOURCES: ReadonlySet<string> = new Set([]);
export const REQUIRED_HEADERS = [
  "title", "price_mad", "city", "property_type", "transaction_type", "source_name",
];
export const ALL_EXPECTED_HEADERS = [
  "title", "price_mad", "city", "district", "property_type", "transaction_type",
  "surface_m2", "rooms_count", "bedrooms_count", "bathrooms_count",
  "description_snippet", "seller_name", "source_name", "source_url",
];

export type PartnerCsvRow = Record<string, string>;
export type NormalizedPartnerListing = {
  title: string;
  price_mad: number;
  city: string;
  district: string | null;
  property_type: string;
  transaction_type: string;
  surface_m2: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  bathrooms_count: number | null;
  description_snippet: string | null;
  seller_name: string | null;
  source_name: string;
  source_url: string | null;
};
export type ValidationError = { line: number; title: string | null; reason: string };
export type ImportStats = {
  input_rows: number;
  valid_rows: number;
  rejected_rows: number;
  created_property_listings: number;
  updated_property_listings: number;
  created_listing_sources: number;
  updated_listing_sources: number;
  skipped_duplicates: number;
  rejection_reasons_count: Record<string, number>;
  rejections: ValidationError[];
};

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ""; }
    else if (ch === '\r' && content[i + 1] === '\n') { row.push(field); field = ""; rows.push(row); row = []; i += 1; }
    else if (ch === '\n') { row.push(field); field = ""; rows.push(row); row = []; }
    else field += ch;
  }
  if (row.length > 0 || field) { row.push(field); rows.push(row); }
  while (rows.length > 0 && rows[rows.length - 1].every((value) => value === "")) rows.pop();
  return rows;
}

const PHONE_RE = /(\+212|0[5-7])\d{8}/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const WHATSAPP_RE = /whatsapp|wa\.me|whats[\s._-]?app/i;
export function containsPii(text: string): boolean {
  return PHONE_RE.test(text) || EMAIL_RE.test(text) || WHATSAPP_RE.test(text);
}

function trimStr(value: string | undefined): string { return (value ?? "").trim(); }
function toOptionalNumber(value: string | undefined): number | null {
  const cleaned = trimStr(value).replace(/[\s ]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
export function normalizePropertyType(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (value === "apartment" || value === "appartement") return "apartment";
  if (value === "villa" || value === "maison") return "villa";
  if (value === "land" || value === "terrain") return "land";
  if (value === "office" || value === "bureau") return "office";
  if (value === "commercial") return "commercial";
  if (value === "other" || value === "autre") return "other";
  return value;
}
export function normalizeTransactionType(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (value === "sale" || value === "vente") return "sale";
  if (value === "rent" || value === "location") return "rent";
  return value;
}
export function normalizePartnerCsvListing(row: PartnerCsvRow, fallbackSource?: string): NormalizedPartnerListing {
  return {
    title: trimStr(row.title),
    price_mad: toOptionalNumber(row.price_mad) ?? 0,
    city: trimStr(row.city),
    district: trimStr(row.district) || null,
    property_type: normalizePropertyType(trimStr(row.property_type)),
    transaction_type: normalizeTransactionType(trimStr(row.transaction_type)),
    surface_m2: toOptionalNumber(row.surface_m2),
    rooms_count: toOptionalNumber(row.rooms_count),
    bedrooms_count: toOptionalNumber(row.bedrooms_count),
    bathrooms_count: toOptionalNumber(row.bathrooms_count),
    description_snippet: trimStr(row.description_snippet) || null,
    seller_name: trimStr(row.seller_name) || null,
    source_name: trimStr(row.source_name) || (fallbackSource ?? ""),
    source_url: trimStr(row.source_url) || null,
  };
}

const SURFACE_REQUIRED_TYPES = new Set(["apartment", "villa"]);
export function validatePartnerCsvListing(listing: NormalizedPartnerListing, line: number): ValidationError | null {
  if (!listing.title || listing.title.length < 5) return { line, title: listing.title || null, reason: "title absent ou trop court (< 5 car.)" };
  if (!listing.price_mad || listing.price_mad < 1000) return { line, title: listing.title, reason: `price_mad absent ou < 1000 (valeur: ${listing.price_mad})` };
  if (!listing.city) return { line, title: listing.title, reason: "city absente" };
  if (!(VALID_PROPERTY_TYPES as readonly string[]).includes(listing.property_type)) return { line, title: listing.title, reason: `property_type invalide: "${listing.property_type}"` };
  if (!(VALID_TRANSACTION_TYPES as readonly string[]).includes(listing.transaction_type)) return { line, title: listing.title, reason: `transaction_type invalide: "${listing.transaction_type}"` };
  if (SURFACE_REQUIRED_TYPES.has(listing.property_type) && (listing.surface_m2 == null || listing.surface_m2 < 15)) {
    return { line, title: listing.title, reason: `surface_m2 invalide pour ${listing.property_type}` };
  }
  if (!listing.source_name) return { line, title: listing.title, reason: "source_name absent" };
  if (!listing.source_url && !INTERNAL_PARTNER_SOURCES.has(listing.source_name)) return { line, title: listing.title, reason: `source_url obligatoire pour source non interne: "${listing.source_name}"` };
  if (listing.description_snippet && containsPii(listing.description_snippet)) return { line, title: listing.title, reason: "description_snippet contient PII (téléphone/email/WhatsApp)" };
  if (listing.seller_name && containsPii(listing.seller_name)) return { line, title: listing.title, reason: "seller_name contient téléphone/email" };
  return null;
}

export function buildPartnerFingerprint(listing: NormalizedPartnerListing): string {
  const minimal = {
    city: listing.city,
    property_type: listing.property_type,
    transaction_type: listing.transaction_type,
    price_mad: listing.price_mad,
    surface_m2: listing.surface_m2,
    bedrooms_count: listing.bedrooms_count,
  } as unknown as ScrapedListingP0;
  return buildCanonicalFingerprint(minimal);
}
export function computePartnerCompletenessScore(listing: NormalizedPartnerListing): number {
  let score = 0;
  if (listing.title) score += 15;
  if (listing.price_mad > 0) score += 15;
  if (listing.city) score += 10;
  if (listing.district) score += 5;
  if (listing.property_type) score += 10;
  if (listing.transaction_type) score += 10;
  if (listing.surface_m2 != null) score += 15;
  if (listing.rooms_count != null) score += 5;
  if (listing.bedrooms_count != null) score += 5;
  if (listing.bathrooms_count != null) score += 5;
  if (listing.description_snippet) score += 5;
  return Math.min(score, 100);
}
export function buildListingUrl(listing: NormalizedPartnerListing, fingerprint: string): string {
  return listing.source_url || `partner://${listing.source_name}/${fingerprint}`;
}

function emptyStats(): ImportStats {
  return {
    input_rows: 0, valid_rows: 0, rejected_rows: 0,
    created_property_listings: 0, updated_property_listings: 0,
    created_listing_sources: 0, updated_listing_sources: 0,
    skipped_duplicates: 0, rejection_reasons_count: {}, rejections: [],
  };
}

export async function importPartnerCsv(opts: {
  filePath: string;
  sourceFallback?: string;
  dbPath?: string;
  dryRun?: boolean;
}): Promise<ImportStats> {
  const stats = emptyStats();
  let content: string;
  try { content = await readFile(opts.filePath, "utf8"); }
  catch (error) { logger.error(`Cannot read CSV file: ${error instanceof Error ? error.message : String(error)}`); return stats; }

  const rows = parseCsv(content);
  if (rows.length < 2) { logger.error("CSV has no data rows (empty or header-only)."); return stats; }
  const headers = rows[0].map((value) => value.trim().toLowerCase());
  const missingRequired = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingRequired.length > 0) { logger.error(`CSV missing required headers: ${missingRequired.join(", ")}`); return stats; }

  const dataRows = rows.slice(1);
  stats.input_rows = dataRows.length;
  for (let index = 0; index < dataRows.length; index += 1) {
    const rowObject: PartnerCsvRow = {};
    for (let column = 0; column < headers.length; column += 1) rowObject[headers[column]] = dataRows[index][column] ?? "";
    const listing = normalizePartnerCsvListing(rowObject, opts.sourceFallback);
    const error = validatePartnerCsvListing(listing, index + 2);
    if (error) {
      stats.rejected_rows += 1;
      stats.rejections.push(error);
      const key = error.reason.split(":")[0].trim();
      stats.rejection_reasons_count[key] = (stats.rejection_reasons_count[key] ?? 0) + 1;
    } else stats.valid_rows += 1;
  }

  if (opts.dryRun === true) {
    logger.info("[dry-run] Legacy CSV validated. No DB writes.");
    return stats;
  }

  throw new Error(
    "P5 canonical boundary: legacy Partner CSV direct DB writes are disabled. " +
    "Migrate the source through PartnerListingV2 -> CanonicalPropertyV1 before persistence.",
  );
}

function parseArgs(argv: string[]): { file: string | null; source: string | null; dryRun: boolean } {
  let file: string | null = null;
  let source: string | null = null;
  let dryRun = false;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--file" && argv[index + 1]) file = argv[++index];
    else if (argv[index] === "--source" && argv[index + 1]) source = argv[++index];
    else if (argv[index] === "--dry-run") dryRun = true;
  }
  return { file, source, dryRun };
}

async function main() {
  logger.step("AkarFinder — Partner CSV Legacy Validator");
  const { file, source, dryRun } = parseArgs(process.argv.slice(2));
  if (!file) {
    logger.error("Usage: npm run import:partner-csv -- --file ./data/imports/partner.csv [--source agence_x] --dry-run");
    process.exit(1);
  }
  const filePath = resolve(file);
  if (!existsSync(filePath)) { logger.error(`File not found: ${filePath}`); process.exit(1); }
  if (!dryRun) {
    logger.error("Direct legacy writes are disabled by the P5 canonical boundary. Use --dry-run for validation only.");
    process.exit(1);
  }
  const stats = await importPartnerCsv({ filePath, sourceFallback: source ?? undefined, dryRun: true });
  logger.step("Validation report");
  console.log(`  input_rows    : ${stats.input_rows}`);
  console.log(`  valid_rows    : ${stats.valid_rows}`);
  console.log(`  rejected_rows : ${stats.rejected_rows}`);
  if (stats.rejected_rows > 0 && stats.valid_rows === 0) process.exitCode = 1;
}

const isCli = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isCli) main().catch((error) => { logger.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
