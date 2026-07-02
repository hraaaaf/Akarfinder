// MUBAWAB-DEPTH-EXPANSION-1
// Orchestrates a multi-city, multi-category, paginated Mubawab collection
// through the existing pipeline: scrape -> clean -> ingest -> enrich.
//
// Usage: npm run mubawab:expand
// Env vars: MUBAWAB_MAX_LIST_PAGES, MUBAWAB_MAX_DETAILS,
//           MUBAWAB_DELAY_MIN_SECONDS, MUBAWAB_DELAY_MAX_SECONDS

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { ScrapedListingP0 } from "./scrapers/types.js";
import { runMubawabDepthExpansion, readMubawabExpansionConfig } from "./scrapers/sources/mubawab-depth-expansion.js";
import { ingestCleanListings } from "./scrapers/ingest-clean-listings.js";
import { enrichAll } from "./scrapers/enrich-p6.js";
import { getLocalDbCounts } from "./nightly-ingestion-runner.js";
import { logger } from "./scrapers/utils/logger.js";
import { getThirdPartyIngestionGuard, printBlockedSummary } from "./scrapers/utils/motor-purity-guard.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "scrapers/output");
const CLEAN_PATH = join(OUTPUT_DIR, "mubawab-expansion-clean-listings.json");
const REPORT_PATH = join(__dirname, "..", "docs", "MUBAWAB_DEPTH_EXPANSION_LAST_RUN.json");

// Same PII guard as p0-run.ts buildCleanListings().
const PHONE_RE = /(\+212|0[5-7])\d{8}/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function buildCleanListings(listings: ScrapedListingP0[]): ScrapedListingP0[] {
  return listings.filter((l) => {
    if (!l.listing_url) return false;
    if (!l.title) return false;
    if (!l.source_name) return false;
    if (l.price_mad != null && l.price_mad < 1000) return false;
    const text = `${l.description_snippet ?? ""} ${l.seller_name ?? ""}`;
    if (PHONE_RE.test(text) || EMAIL_RE.test(text)) return false;
    return true;
  });
}

export type MubawabExpansionRunResult = {
  blocked: boolean;
  created: number;
  updated: number;
  errors: number;
};

export async function runMubawabExpansionCli(): Promise<MubawabExpansionRunResult> {
  const guard = getThirdPartyIngestionGuard({
    scriptName: "mubawab:expand",
    requireMubawabExpansionFlag: true,
  });
  if (guard.blocked) {
    logger.warn(guard.message);
    printBlockedSummary();
    return {
      blocked: true,
      created: 0,
      updated: 0,
      errors: 0,
    };
  }
  logger.step("AkarFinder — Mubawab depth expansion");
  const config = readMubawabExpansionConfig();
  logger.info(
    `Config: max_list_pages_per_combo=${config.max_list_pages_per_combo} max_details=${config.max_details} ` +
      `delay=${config.delay_min_ms / 1000}-${config.delay_max_ms / 1000}s`
  );

  const before = getLocalDbCounts();
  logger.info(`property_listings before: ${before.property_listings}`);

  const result = await runMubawabDepthExpansion(config);

  const cleanListings = buildCleanListings(result.listings);
  const rejected = result.listings.length - cleanListings.length;

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(CLEAN_PATH, JSON.stringify(cleanListings, null, 2), "utf8");

  logger.step("Mubawab expansion — scrape summary");
  console.log(`  List pages opened   : ${result.list_pages_opened}`);
  console.log(`  Detail pages opened : ${result.detail_pages_opened}`);
  console.log(`  Listings discovered : ${result.listings.length}`);
  console.log(`  Listings valid      : ${cleanListings.length}`);
  console.log(`  Rejected (PII/price/missing) : ${rejected}`);
  console.log(`  Errors              : ${result.errors.length}`);
  console.log("  Combos:");
  for (const c of result.combos) {
    console.log(
      `    - ${c.city} / ${c.category}: status=${c.status} pages=${c.list_pages_opened} discovered=${c.listings_discovered}` +
        (c.stop_reason ? ` reason="${c.stop_reason}"` : "")
    );
  }

  const ingestStats = await ingestCleanListings({ cleanPath: CLEAN_PATH });

  logger.step("Mubawab expansion — ingest summary");
  console.log(`  Created (property_listings) : ${ingestStats.insertedProperty}`);
  console.log(`  Updated (property_listings) : ${ingestStats.updatedProperty}`);
  console.log(`  Duplicates skipped (dedup)  : ${ingestStats.skipped}`);
  console.log(`  Ingest errors               : ${ingestStats.errors}`);

  logger.step("Mubawab expansion — enrich");
  enrichAll();

  const after = getLocalDbCounts();
  logger.info(`property_listings after: ${after.property_listings}`);

  const report = {
    started_at: new Date().toISOString(),
    config,
    combos: result.combos,
    list_pages_opened: result.list_pages_opened,
    detail_pages_opened: result.detail_pages_opened,
    listings_discovered: result.listings.length,
    listings_valid: cleanListings.length,
    rejected,
    scrape_errors: result.errors.length,
    created: ingestStats.insertedProperty,
    updated: ingestStats.updatedProperty,
    duplicates_skipped: ingestStats.skipped,
    ingest_errors: ingestStats.errors,
    property_listings_before: before.property_listings,
    property_listings_after: after.property_listings,
    listing_sources_before: before.listing_sources,
    listing_sources_after: after.listing_sources,
  };
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  logger.info(`Report written to ${REPORT_PATH}`);

  return {
    blocked: false,
    created: ingestStats.insertedProperty,
    updated: ingestStats.updatedProperty,
    errors: ingestStats.errors + result.errors.length,
  };
}

const isCli = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  runMubawabExpansionCli().catch((e) => {
    logger.error(e instanceof Error ? e.stack ?? e.message : String(e));
    process.exitCode = 1;
  });
}
