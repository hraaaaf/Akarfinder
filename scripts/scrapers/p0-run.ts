// P0 scraping runner.
//
// Goal of P0: prove the ingestion pipeline runs cleanly, safely and politely —
// NOT to collect volume. It must fail cleanly when a source blocks or changes
// its HTML, and always produce valid JSON output + an error log.
//
//   npm run scrape:p0
//
// Constraints honoured: public pages only, no login, no captcha bypass, no
// private API, no phone/email extraction, no image storage (images_count only),
// max 30 listings/source, 5–10s polite delay between sources, clear User-Agent,
// all errors saved to p0-errors.json.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  ScrapedListingP0,
  ScrapeError,
  SourceQualityEntry,
  SourceQualityReport,
  SourceResult,
} from "./types";
import { logger } from "./utils/logger";
import { safeDelay } from "./utils/safe-delay";
import { runAvito } from "./sources/avito";
import { runMubawab } from "./sources/mubawab";
import { runSarouty } from "./sources/sarouty";
import { AGENZ_STATUS, runAgenz } from "./sources/agenz";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "output");
const LISTINGS_PATH = join(OUTPUT_DIR, "p0-scraped-listings.json");
const CLEAN_PATH = join(OUTPUT_DIR, "p0-clean-listings.json");
const ERRORS_PATH = join(OUTPUT_DIR, "p0-errors.json");
const QUALITY_PATH = join(OUTPUT_DIR, "source-quality-report.json");

// Fields included in the per-source fill-rate report.
const FILL_RATE_FIELDS: (keyof ScrapedListingP0)[] = [
  "price_mad",
  "city",
  "district",
  "surface_m2",
  "rooms_count",
  "bedrooms_count",
  "bathrooms",
  "description_snippet",
  "seller_name",
  "images_count",
];

// Sources actually scraped in P0 (Agenz is excluded by policy).
const scrapeSources: { name: string; run: () => Promise<SourceResult> }[] = [
  { name: "avito", run: runAvito },
  { name: "mubawab", run: runMubawab },
  { name: "sarouty", run: runSarouty },
];

function buildQualityEntry(
  listings: ScrapedListingP0[],
  errorsForSource: ScrapeError[],
  attempted: number
): SourceQualityEntry {
  const succeeded = listings.length;
  const failed = attempted - succeeded;

  const fieldFillCount: Record<string, number> = {};
  for (const f of FILL_RATE_FIELDS) fieldFillCount[f] = 0;

  let totalImages = 0;
  let imageListings = 0;
  let totalScore = 0;

  for (const l of listings) {
    totalScore += l.data_completeness_score ?? 0;
    for (const f of FILL_RATE_FIELDS) {
      const v = l[f];
      if (v !== null && v !== undefined && v !== "") fieldFillCount[f]++;
    }
    if (l.images_count != null) {
      totalImages += l.images_count;
      imageListings++;
    }
  }

  const fieldFillRate: Record<string, number> = {};
  for (const f of FILL_RATE_FIELDS) {
    fieldFillRate[f] = succeeded > 0 ? Math.round((fieldFillCount[f] / succeeded) * 100) / 100 : 0;
  }

  const commonMissingFields = FILL_RATE_FIELDS.filter(
    (f) => fieldFillRate[f] !== undefined && fieldFillRate[f] < 0.5
  ) as string[];

  return {
    attempted,
    succeeded,
    failed,
    average_completeness_score: succeeded > 0 ? Math.round(totalScore / succeeded) : 0,
    field_fill_rate: fieldFillRate,
    average_images_count: imageListings > 0 ? Math.round(totalImages / imageListings) : null,
    common_missing_fields: commonMissingFields,
    errors_count: errorsForSource.length,
  };
}

function buildCleanListings(listings: ScrapedListingP0[]): ScrapedListingP0[] {
  const PHONE_RE = /(\+212|0[5-7])\d{8}/;
  const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  return listings.filter((l) => {
    if (!l.listing_url) return false;
    if (!l.title) return false;
    if (!l.source_name) return false;
    if (l.price_mad != null && l.price_mad < 1000) return false;
    // Guard: no phone/email leaking through description or seller
    const text = `${l.description_snippet ?? ""} ${l.seller_name ?? ""}`;
    if (PHONE_RE.test(text) || EMAIL_RE.test(text)) return false;
    // images_count only — no stored image URLs (already enforced at extraction)
    return true;
  });
}

async function main() {
  logger.step("AkarFinder — P0 real-estate scraping (test mode)");
  logger.info("Sources: avito, mubawab, sarouty");
  logger.info(`Agenz: NOT scraped (status: ${AGENZ_STATUS})`);

  const allListings: ScrapedListingP0[] = [];
  const allErrors: ScrapeError[] = [];
  const countBySource: Record<string, number> = {};
  const resultBySource: Record<string, SourceResult> = {};

  for (let i = 0; i < scrapeSources.length; i += 1) {
    const source = scrapeSources[i];
    logger.step(`Source: ${source.name}`);

    let result: SourceResult;
    try {
      result = await source.run();
    } catch (e) {
      // A source must never crash the whole run.
      const message = e instanceof Error ? e.message : String(e);
      logger.error(`${source.name} crashed: ${message}`);
      result = {
        source: source.name,
        listings: [],
        errors: [
          { source: source.name, stage: "uncaught", message, at: new Date().toISOString() },
        ],
      };
    }

    countBySource[source.name] = result.listings.length;
    resultBySource[source.name] = result;
    allListings.push(...result.listings);
    allErrors.push(...result.errors);

    const avgScore =
      result.listings.length > 0
        ? Math.round(
            result.listings.reduce((s, l) => s + (l.data_completeness_score ?? 0), 0) /
              result.listings.length
          )
        : 0;

    logger.info(
      `${source.name}: ${result.listings.length} listing(s), ${result.errors.length} error(s)` +
        (result.skipped ? " [skipped]" : "") +
        (result.listings.length > 0 ? ` — avg completeness ${avgScore}/100` : "")
    );

    // Polite delay between sources (not after the last one).
    if (i < scrapeSources.length - 1) {
      logger.info("Waiting politely before the next source…");
      await safeDelay(5000, 10000);
    }
  }

  // Record the Agenz policy decision in the error/status log for traceability.
  const agenz = await runAgenz();
  allErrors.push(...agenz.errors);

  // Drop any entry without a listing_url.
  const cleanedListings = allListings.filter((l) => Boolean(l.listing_url));

  // P2: clean export (valid, PII-safe, price-plausible listings only).
  const cleanListings = buildCleanListings(cleanedListings);

  // P2: per-source quality report.
  const qualityReport: SourceQualityReport = {
    generated_at: new Date().toISOString(),
    sources: {},
  };
  for (const src of scrapeSources) {
    const res = resultBySource[src.name];
    const srcErrors = allErrors.filter((e) => e.source === src.name);
    qualityReport.sources[src.name] = buildQualityEntry(
      res?.listings ?? [],
      srcErrors,
      res?.listings.length ?? 0
    );
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(LISTINGS_PATH, JSON.stringify(cleanedListings, null, 2), "utf8");
  await writeFile(CLEAN_PATH, JSON.stringify(cleanListings, null, 2), "utf8");
  await writeFile(ERRORS_PATH, JSON.stringify(allErrors, null, 2), "utf8");
  await writeFile(QUALITY_PATH, JSON.stringify(qualityReport, null, 2), "utf8");

  // Terminal summary.
  const avgCompleteness =
    cleanedListings.length > 0
      ? Math.round(
          cleanedListings.reduce((sum, l) => sum + (l.data_completeness_score ?? 0), 0) /
            cleanedListings.length
        )
      : 0;

  logger.step("P0 summary");
  console.log(`  Total scraped    : ${cleanedListings.length}`);
  console.log(`  Total clean      : ${cleanListings.length}`);
  console.log("  By source        :");
  for (const name of Object.keys(countBySource)) {
    const entry = qualityReport.sources[name];
    const avg = entry?.average_completeness_score ?? 0;
    console.log(`    - ${name}: ${countBySource[name]} listing(s)${countBySource[name] > 0 ? ` (avg ${avg}/100)` : ""}`);
  }
  console.log(`    - agenz: 0 (status: ${AGENZ_STATUS})`);
  console.log(`  Avg completeness : ${avgCompleteness}/100`);
  console.log(`  Errors           : ${allErrors.length}`);
  console.log(`  Listings file    : ${LISTINGS_PATH}`);
  console.log(`  Clean file       : ${CLEAN_PATH}`);
  console.log(`  Quality report   : ${QUALITY_PATH}`);
  console.log(`  Errors file      : ${ERRORS_PATH}`);

  if (cleanedListings.length === 0) {
    logger.warn(
      "0 listings extracted. The pipeline ran and failed cleanly — sources may be " +
        "blocking the research bot, requiring JS rendering, or have changed their HTML."
    );
  }
}

main().catch(async (e) => {
  // Last-resort guard: still try to persist the error so output stays valid.
  const message = e instanceof Error ? e.stack || e.message : String(e);
  logger.error(`Fatal: ${message}`);
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(
      ERRORS_PATH,
      JSON.stringify(
        [{ source: "p0-run", stage: "fatal", message, at: new Date().toISOString() }],
        null,
        2
      ),
      "utf8"
    );
  } catch {
    // nothing else we can do
  }
  process.exitCode = 1;
});
