#!/usr/bin/env tsx
// Partner CSV import — lightweight pipeline for agency/promoter listings.
//
// Usage:
//   npm run import:partner-csv -- --file ./data/imports/partner.csv --source agence_x
//
// What it does:
//   1. Reads and parses the CSV file
//   2. Validates each row (headers, required fields, PII)
//   3. Normalises types / values
//   4. Upserts into property_listings + listing_sources (via canonical_fingerprint)
//   5. Inserts into raw_listings for audit trail
//   6. Writes a JSON report to data/imports/reports/

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { openDb, jsonify, DEFAULT_DB_PATH } from "./scrapers/db/client.js";
import { buildCanonicalFingerprint } from "./scrapers/utils/fingerprint.js";
import { logger } from "./scrapers/utils/logger.js";
import type { ScrapedListingP0 } from "./scrapers/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(process.cwd(), "data/imports/reports");

// ─── Constants ────────────────────────────────────────────────────────────────

export const VALID_PROPERTY_TYPES = [
  "apartment", "villa", "land", "office", "commercial", "other",
] as const;

export const VALID_TRANSACTION_TYPES = ["sale", "rent"] as const;

// Sources that don't require a source_url (internal partner agreements).
// Add source_name values here as partners are onboarded without public URLs.
export const INTERNAL_PARTNER_SOURCES: ReadonlySet<string> = new Set([
  // e.g. "agence_x_internal"
]);

export const REQUIRED_HEADERS = [
  "title", "price_mad", "city", "property_type",
  "transaction_type", "source_name",
];

export const ALL_EXPECTED_HEADERS = [
  "title", "price_mad", "city", "district", "property_type",
  "transaction_type", "surface_m2", "rooms_count", "bedrooms_count",
  "bathrooms_count", "description_snippet", "seller_name",
  "source_name", "source_url",
];

// ─── Types ────────────────────────────────────────────────────────────────────

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

export type ValidationError = {
  line: number;
  title: string | null;
  reason: string;
};

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

// ─── CSV parser ───────────────────────────────────────────────────────────────

// Minimal RFC-4180 CSV parser — handles quoted fields with embedded commas.
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = content.length;

  while (i < len) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote: "" → single "
        if (content[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = "";
      } else if (ch === '\r' && content[i + 1] === '\n') {
        row.push(field); field = "";
        rows.push(row); row = [];
        i++; // skip \n
      } else if (ch === '\n') {
        row.push(field); field = "";
        rows.push(row); row = [];
      } else {
        field += ch;
      }
    }
    i++;
  }

  // Last row (no trailing newline)
  if (row.length > 0 || field) {
    row.push(field);
    rows.push(row);
  }

  // Remove fully empty trailing rows
  while (rows.length > 0 && rows[rows.length - 1].every((f) => f === "")) {
    rows.pop();
  }

  return rows;
}

// ─── PII guards (mirrors ingest-clean-listings.ts) ───────────────────────────

const PHONE_RE = /(\+212|0[5-7])\d{8}/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const WHATSAPP_RE = /whatsapp|wa\.me|whats[\s._-]?app/i;

export function containsPii(text: string): boolean {
  return PHONE_RE.test(text) || EMAIL_RE.test(text) || WHATSAPP_RE.test(text);
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

function trimStr(s: string | undefined): string {
  return (s ?? "").trim();
}

function toOptionalNumber(s: string | undefined): number | null {
  const cleaned = trimStr(s).replace(/[\s ]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function normalizePropertyType(raw: string): string {
  const n = raw.trim().toLowerCase();
  if (n === "apartment" || n === "appartement") return "apartment";
  if (n === "villa" || n === "maison") return "villa";
  if (n === "land" || n === "terrain") return "land";
  if (n === "office" || n === "bureau") return "office";
  if (n === "commercial") return "commercial";
  if (n === "other" || n === "autre") return "other";
  return n;
}

export function normalizeTransactionType(raw: string): string {
  const n = raw.trim().toLowerCase();
  if (n === "sale" || n === "vente") return "sale";
  if (n === "rent" || n === "location") return "rent";
  return n;
}

export function normalizePartnerCsvListing(
  row: PartnerCsvRow,
  fallbackSource?: string
): NormalizedPartnerListing {
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

// ─── Validator ────────────────────────────────────────────────────────────────

const SURFACE_REQUIRED_TYPES = new Set(["apartment", "villa"]);

export function validatePartnerCsvListing(
  listing: NormalizedPartnerListing,
  line: number
): ValidationError | null {
  if (!listing.title || listing.title.length < 5) {
    return { line, title: listing.title || null, reason: "title absent ou trop court (< 5 car.)" };
  }
  if (!listing.price_mad || listing.price_mad < 1000) {
    return { line, title: listing.title, reason: `price_mad absent ou < 1000 (valeur: ${listing.price_mad})` };
  }
  if (!listing.city) {
    return { line, title: listing.title, reason: "city absente" };
  }
  if (!(VALID_PROPERTY_TYPES as readonly string[]).includes(listing.property_type)) {
    return { line, title: listing.title, reason: `property_type invalide: "${listing.property_type}"` };
  }
  if (!(VALID_TRANSACTION_TYPES as readonly string[]).includes(listing.transaction_type)) {
    return { line, title: listing.title, reason: `transaction_type invalide: "${listing.transaction_type}"` };
  }
  if (SURFACE_REQUIRED_TYPES.has(listing.property_type)) {
    if (listing.surface_m2 == null) {
      return { line, title: listing.title, reason: `surface_m2 obligatoire pour ${listing.property_type}` };
    }
    if (listing.surface_m2 < 15) {
      return { line, title: listing.title, reason: `surface_m2 < 15 m² pour ${listing.property_type} (valeur: ${listing.surface_m2})` };
    }
  }
  if (!listing.source_name) {
    return { line, title: listing.title, reason: "source_name absent" };
  }
  if (!listing.source_url && !INTERNAL_PARTNER_SOURCES.has(listing.source_name)) {
    return { line, title: listing.title, reason: `source_url obligatoire pour source non interne: "${listing.source_name}"` };
  }
  // PII guards
  if (listing.description_snippet && containsPii(listing.description_snippet)) {
    return { line, title: listing.title, reason: "description_snippet contient PII (téléphone/email/WhatsApp)" };
  }
  if (listing.seller_name && containsPii(listing.seller_name)) {
    return { line, title: listing.title, reason: "seller_name contient téléphone/email" };
  }
  return null;
}

// ─── Fingerprint adapter ──────────────────────────────────────────────────────

export function buildPartnerFingerprint(listing: NormalizedPartnerListing): string {
  // buildCanonicalFingerprint only reads: city, property_type, transaction_type,
  // price_mad, surface_m2, bedrooms_count — the other fields are not accessed.
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

// ─── Completeness score ───────────────────────────────────────────────────────

export function computePartnerCompletenessScore(
  listing: NormalizedPartnerListing
): number {
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
  // Cap at 100
  return Math.min(score, 100);
}

// ─── Field confidence (partner data is "high" for CSV-provided fields) ────────

function buildPartnerFieldConfidence(listing: NormalizedPartnerListing) {
  return {
    price: listing.price_mad > 0 ? "high" : "missing",
    city: listing.city ? "high" : "missing",
    district: listing.district ? "medium" : "missing",
    surface: listing.surface_m2 != null ? "high" : "missing",
    rooms: listing.rooms_count != null ? "medium" : "missing",
    bedrooms: listing.bedrooms_count != null ? "medium" : "missing",
    bathrooms: listing.bathrooms_count != null ? "medium" : "missing",
    description: listing.description_snippet ? "medium" : "missing",
    seller: listing.seller_name ? "medium" : "missing",
  };
}

// ─── Listing URL for raw_listings + listing_sources ──────────────────────────

// listing_sources.listing_url must be unique. Use source_url if available,
// otherwise generate a deterministic synthetic URL from source_name + fingerprint.
export function buildListingUrl(
  listing: NormalizedPartnerListing,
  fingerprint: string
): string {
  if (listing.source_url) return listing.source_url;
  return `partner://${listing.source_name}/${fingerprint}`;
}

// ─── Main import function ─────────────────────────────────────────────────────

export async function importPartnerCsv(opts: {
  filePath: string;
  sourceFallback?: string;
  dbPath?: string;
  dryRun?: boolean;
}): Promise<ImportStats> {
  const { filePath, sourceFallback, dbPath = DEFAULT_DB_PATH, dryRun = false } = opts;

  const stats: ImportStats = {
    input_rows: 0,
    valid_rows: 0,
    rejected_rows: 0,
    created_property_listings: 0,
    updated_property_listings: 0,
    created_listing_sources: 0,
    updated_listing_sources: 0,
    skipped_duplicates: 0,
    rejection_reasons_count: {},
    rejections: [],
  };

  // 1. Read CSV
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(`Cannot read CSV file: ${msg}`);
    return stats;
  }

  // 2. Parse
  const rows = parseCsv(content);
  if (rows.length < 2) {
    logger.error("CSV has no data rows (empty or header-only).");
    return stats;
  }

  const headerRow = rows[0].map((h) => h.trim().toLowerCase());

  // 3. Validate headers
  const missingRequired = REQUIRED_HEADERS.filter((h) => !headerRow.includes(h));
  if (missingRequired.length > 0) {
    logger.error(`CSV missing required headers: ${missingRequired.join(", ")}`);
    logger.error(`Found headers: ${headerRow.join(", ")}`);
    return stats;
  }

  const dataRows = rows.slice(1);
  stats.input_rows = dataRows.length;

  // 4. Parse + validate each row
  const validListings: Array<{ listing: NormalizedPartnerListing; fingerprint: string; lineNum: number }> = [];

  for (let i = 0; i < dataRows.length; i++) {
    const lineNum = i + 2; // 1-indexed, +1 for header
    const rawRow = dataRows[i];

    // Map row to object using header
    const rowObj: PartnerCsvRow = {};
    for (let j = 0; j < headerRow.length; j++) {
      rowObj[headerRow[j]] = rawRow[j] ?? "";
    }

    const listing = normalizePartnerCsvListing(rowObj, sourceFallback);
    const err = validatePartnerCsvListing(listing, lineNum);

    if (err) {
      stats.rejected_rows++;
      stats.rejections.push(err);
      const key = err.reason.split(":")[0].trim();
      stats.rejection_reasons_count[key] = (stats.rejection_reasons_count[key] ?? 0) + 1;
    } else {
      stats.valid_rows++;
      validListings.push({ listing, fingerprint: buildPartnerFingerprint(listing), lineNum });
    }
  }

  if (dryRun) {
    logger.info("[dry-run] Skipping DB writes.");
    return stats;
  }

  if (validListings.length === 0) {
    logger.warn("No valid rows to import.");
    return stats;
  }

  // 5. Open DB
  const db = openDb(dbPath);

  // 6. Create scrape_run entry for audit trail
  const now = new Date().toISOString();
  const runResult = db.prepare(`
    INSERT INTO scrape_runs
      (started_at, finished_at, source_file, source_file_hash,
       sources_attempted, sources_succeeded,
       total_raw, total_clean, errors_count, quality_report_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    now, null,
    filePath, `partner-${Date.now()}`,
    jsonify([...new Set(validListings.map((v) => v.listing.source_name))]),
    jsonify([...new Set(validListings.map((v) => v.listing.source_name))]),
    validListings.length, validListings.length,
    stats.rejected_rows,
    null,
  );
  const runId = Number(runResult.lastInsertRowid);

  // 7. Prepare statements (mirrors ingest-clean-listings.ts)
  const insertRaw = db.prepare(`
    INSERT OR IGNORE INTO raw_listings
      (scrape_run_id, source_name, source_url, listing_url, raw_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  const upsertProperty = db.prepare(`
    INSERT INTO property_listings
      (canonical_fingerprint, title, price_mad, city, district,
       property_type, transaction_type, surface_m2,
       rooms_count, bedrooms_count, bathrooms_count,
       description_snippet, images_count, seller_name,
       data_completeness_score, field_confidence,
       built_surface_m2, plot_surface_m2, condition, property_age_range,
       orientation, floor_type, floors_count, garden_m2, terrace_m2,
       garage_spaces, has_pool, has_concierge, has_moroccan_living_room,
       has_european_living_room, has_equipped_kitchen, premium_features,
       created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(canonical_fingerprint) DO UPDATE SET
      title               = CASE WHEN excluded.data_completeness_score >
                                      property_listings.data_completeness_score
                                 THEN excluded.title
                                 ELSE property_listings.title END,
      price_mad           = COALESCE(excluded.price_mad, property_listings.price_mad),
      city                = COALESCE(excluded.city, property_listings.city),
      district            = COALESCE(excluded.district, property_listings.district),
      surface_m2          = COALESCE(excluded.surface_m2, property_listings.surface_m2),
      rooms_count         = COALESCE(excluded.rooms_count, property_listings.rooms_count),
      bedrooms_count      = COALESCE(excluded.bedrooms_count, property_listings.bedrooms_count),
      bathrooms_count     = COALESCE(excluded.bathrooms_count, property_listings.bathrooms_count),
      description_snippet = CASE WHEN excluded.data_completeness_score >
                                      property_listings.data_completeness_score
                                 THEN excluded.description_snippet
                                 ELSE property_listings.description_snippet END,
      seller_name         = COALESCE(excluded.seller_name, property_listings.seller_name),
      data_completeness_score = MAX(excluded.data_completeness_score,
                                    property_listings.data_completeness_score),
      field_confidence    = CASE WHEN excluded.data_completeness_score >=
                                      property_listings.data_completeness_score
                                 THEN excluded.field_confidence
                                 ELSE property_listings.field_confidence END,
      updated_at          = excluded.updated_at
  `);

  const getPropertyByFingerprint = db.prepare(
    "SELECT id, data_completeness_score FROM property_listings WHERE canonical_fingerprint = ?"
  );

  const upsertSource = db.prepare(`
    INSERT INTO listing_sources
      (property_listing_id, source_name, listing_url, source_url,
       first_seen_at, last_seen_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(listing_url) DO UPDATE SET
      last_seen_at = excluded.last_seen_at,
      is_active    = 1
  `);

  const getSourceByUrl = db.prepare(
    "SELECT id FROM listing_sources WHERE listing_url = ?"
  );

  // 8. Ingest in a single transaction
  try {
    db.exec("BEGIN");

    for (const { listing, fingerprint, lineNum } of validListings) {
      try {
        const listingUrl = buildListingUrl(listing, fingerprint);
        const completeness = computePartnerCompletenessScore(listing);
        const fieldConf = buildPartnerFieldConfidence(listing);

        // raw_listings — audit trail
        insertRaw.run(
          runId,
          listing.source_name,
          listing.source_url ?? null,
          listingUrl,
          JSON.stringify({ ...listing, _imported_from_csv: true, _line: lineNum }),
        );

        // property_listings — detect insert vs update
        const before = getPropertyByFingerprint.get(fingerprint) as
          | { id: number; data_completeness_score: number }
          | undefined;

        upsertProperty.run(
          fingerprint,
          listing.title,
          listing.price_mad,
          listing.city,
          listing.district ?? null,
          listing.property_type,
          listing.transaction_type,
          listing.surface_m2 ?? null,
          listing.rooms_count ?? null,
          listing.bedrooms_count ?? null,
          listing.bathrooms_count ?? null,
          listing.description_snippet ?? null,
          null,  // images_count — not in CSV
          listing.seller_name ?? null,
          completeness,
          jsonify(fieldConf),
          // P8A — not provided in basic partner CSV
          null, null, null, null, null, null, null, null, null, null,
          0, 0, 0, 0, 0, null,
          now, now,
        );

        if (!before) stats.created_property_listings++;
        else stats.updated_property_listings++;

        // listing_sources
        const propRow = getPropertyByFingerprint.get(fingerprint) as { id: number } | undefined;
        if (!propRow) { continue; }

        const srcBefore = getSourceByUrl.get(listingUrl) as { id: number } | undefined;

        upsertSource.run(
          propRow.id,
          listing.source_name,
          listingUrl,
          listing.source_url ?? null,
          now,
          now,
        );

        if (srcBefore) stats.updated_listing_sources++;
        else stats.created_listing_sources++;

      } catch {
        // Non-fatal per-row error — likely duplicate in same import batch
        stats.skipped_duplicates++;
      }
    }

    db.exec("COMMIT");

    // Update scrape_run with final counts
    db.prepare(
      `UPDATE scrape_runs SET finished_at = ?, total_raw = ?, total_clean = ?, errors_count = ? WHERE id = ?`
    ).run(
      new Date().toISOString(),
      stats.created_listing_sources,
      stats.valid_rows,
      stats.rejected_rows,
      runId,
    );

  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  } finally {
    db.close();
  }

  return stats;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { file: string | null; source: string | null; dryRun: boolean } {
  let file: string | null = null;
  let source: string | null = null;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file" && argv[i + 1]) { file = argv[++i]; }
    else if (argv[i] === "--source" && argv[i + 1]) { source = argv[++i]; }
    else if (argv[i] === "--dry-run") { dryRun = true; }
  }

  return { file, source, dryRun };
}

async function main() {
  logger.step("AkarFinder — Partner CSV Import");

  const { file, source, dryRun } = parseArgs(process.argv.slice(2));

  if (!file) {
    logger.error("Usage: npm run import:partner-csv -- --file ./data/imports/partner.csv [--source agence_x] [--dry-run]");
    process.exit(1);
  }

  const filePath = resolve(file);

  if (!existsSync(filePath)) {
    logger.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  if (dryRun) logger.info("[dry-run mode] No DB writes will occur.");
  if (source) logger.info(`Fallback source_name: ${source}`);
  logger.info(`File: ${filePath}`);

  const stats = await importPartnerCsv({ filePath, sourceFallback: source ?? undefined, dryRun });

  // Console report
  logger.step("Import report");
  console.log(`  input_rows                  : ${stats.input_rows}`);
  console.log(`  valid_rows                  : ${stats.valid_rows}`);
  console.log(`  rejected_rows               : ${stats.rejected_rows}`);
  console.log(`  created_property_listings   : ${stats.created_property_listings}`);
  console.log(`  updated_property_listings   : ${stats.updated_property_listings}`);
  console.log(`  created_listing_sources     : ${stats.created_listing_sources}`);
  console.log(`  updated_listing_sources     : ${stats.updated_listing_sources}`);
  console.log(`  skipped_duplicates          : ${stats.skipped_duplicates}`);

  if (stats.rejected_rows > 0) {
    console.log("\n  Rejections:");
    for (const r of stats.rejections) {
      const titleSnippet = r.title ? ` "${r.title.slice(0, 40)}"` : "";
      console.log(`    Line ${r.line}:${titleSnippet} — ${r.reason}`);
    }

    console.log("\n  Rejection reasons summary:");
    for (const [reason, count] of Object.entries(stats.rejection_reasons_count)) {
      console.log(`    ${reason}: ${count}`);
    }
  }

  // Write JSON report
  if (!dryRun) {
    try {
      await mkdir(REPORTS_DIR, { recursive: true });
      const reportPath = join(REPORTS_DIR, `partner-csv-import-${Date.now()}.json`);
      await writeFile(reportPath, JSON.stringify({ ...stats, file: filePath, imported_at: new Date().toISOString() }, null, 2), "utf8");
      logger.info(`Report saved: ${reportPath}`);
    } catch {
      // Non-fatal
    }
  }

  if (stats.rejected_rows > 0 && stats.valid_rows === 0) {
    process.exitCode = 1;
  }
}

const isCli = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main().catch((e) => {
    logger.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
