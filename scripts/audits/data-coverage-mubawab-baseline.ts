import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCoverageAuditReport,
  renderCoverageAuditMarkdown,
  type CoverageSegmentInput,
} from "../coverage/coverage-gap-auditor";

type ListingManifestRow = {
  listing_url?: unknown;
};

type MubawabRunReport = {
  config?: { max_details?: unknown };
  combos?: Array<{
    city?: unknown;
    category?: unknown;
    status?: unknown;
    list_pages_opened?: unknown;
    listings_discovered?: unknown;
  }>;
  listings_discovered?: unknown;
};

type CounterEvidence = {
  source: string;
  segmentKey: string;
  categoryUrl: string;
  announcedResults: number;
  observedAt: string;
  observationMethod: string;
  discoveryManifest: string;
  collectorRun: string;
  sourceSnapshot: {
    heading: string;
    counterText: string;
  };
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const outputDir = join(root, "artifacts/data-coverage/mubawab-casablanca-sale-2026-08-06");

function assertSafeNonNegativeInteger(value: unknown, field: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${field} must be a non-negative safe integer`);
  }
}

function isIndividualMubawabListing(rawUrl: string): boolean {
  const url = new URL(rawUrl);
  return url.hostname === "www.mubawab.ma" && /^\/fr\/(?:a|pa)\//.test(url.pathname);
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function main(): Promise<void> {
  const evidencePath = join(
    root,
    "docs/evidence/data-coverage/mubawab-casablanca-sale-2026-08-06.json",
  );
  const evidence = await readJson<CounterEvidence>(evidencePath);
  const manifestPath = join(root, evidence.discoveryManifest);
  const runPath = join(root, evidence.collectorRun);
  const manifest = await readJson<ListingManifestRow[]>(manifestPath);
  const run = await readJson<MubawabRunReport>(runPath);

  if (!Array.isArray(manifest)) throw new Error("Discovery manifest must be an array");
  assertSafeNonNegativeInteger(evidence.announcedResults, "announcedResults");
  if (!Number.isFinite(Date.parse(evidence.observedAt))) {
    throw new Error("observedAt must be an ISO-compatible timestamp");
  }

  const discoveredUrls = manifest.map((row, index) => {
    if (typeof row.listing_url !== "string" || row.listing_url.length === 0) {
      throw new Error(`Manifest row ${index} lacks listing_url`);
    }
    return row.listing_url;
  });
  const listingUrls = discoveredUrls.filter(isIndividualMubawabListing);
  const projectUrls = discoveredUrls.filter((rawUrl) => {
    const url = new URL(rawUrl);
    return url.hostname === "www.mubawab.ma" && /^\/fr\/p\//.test(url.pathname);
  });

  const combo = run.combos?.find(
    (candidate) => candidate.city === "Casablanca" && candidate.category === "vente (mixte)",
  );
  if (!combo) throw new Error("Casablanca sale combo is missing from collector report");
  assertSafeNonNegativeInteger(combo.list_pages_opened, "combo.list_pages_opened");
  assertSafeNonNegativeInteger(combo.listings_discovered, "combo.listings_discovered");
  assertSafeNonNegativeInteger(run.config?.max_details, "config.max_details");
  assertSafeNonNegativeInteger(run.listings_discovered, "listings_discovered");

  const collectorBudgetReached =
    run.listings_discovered >= run.config.max_details &&
    combo.listings_discovered >= run.config.max_details;

  const segment: CoverageSegmentInput = {
    source: evidence.source,
    segmentKey: evidence.segmentKey,
    categoryUrl: evidence.categoryUrl,
    announcedResults: evidence.announcedResults,
    discoveredUrls,
    listingUrls,
    pagesObserved: combo.list_pages_opened,
    paginationCapDetected: collectorBudgetReached,
    evidence: [
      `${evidence.observationMethod}: ${evidence.sourceSnapshot.heading} ${evidence.sourceSnapshot.counterText}`,
      `collector run: ${evidence.collectorRun}`,
      `discovery manifest: ${evidence.discoveryManifest}`,
      `collector max_details reached: ${collectorBudgetReached}`,
      `project landing pages excluded: ${projectUrls.length}`,
    ],
    measuredAt: evidence.observedAt,
  };

  const input = {
    generatedAt: evidence.observedAt,
    options: { completeTolerance: 0, partitionGapThreshold: 1 },
    segments: [segment],
  };
  const report = buildCoverageAuditReport(input.segments, input.generatedAt, input.options);

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(join(outputDir, "input.json"), `${JSON.stringify(input, null, 2)}\n`, "utf8"),
    writeFile(join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(join(outputDir, "report.md"), renderCoverageAuditMarkdown(report), "utf8"),
  ]);

  const segmentReport = report.segments[0];
  if (!segmentReport) throw new Error("Coverage report contains no segment");
  process.stdout.write(
    `${JSON.stringify({
      schemaVersion: report.schemaVersion,
      announcedResults: segmentReport.announcedResults,
      manifestRows: manifest.length,
      uniqueDiscoveredUrls: segmentReport.uniqueUrls,
      uniqueListingUrls: segmentReport.listingUrls,
      excludedProjectUrls: projectUrls.length,
      pagesObserved: segmentReport.pagesObserved,
      coverageRatio: segmentReport.coverageRatio,
      gapCount: segmentReport.gapCount,
      status: segmentReport.status,
      partitionRequired: segmentReport.partitionRequired,
      outputDir,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`DATA-COVERAGE-MUBAWAB-BASELINE failed: ${message}\n`);
  process.exitCode = 1;
});
