export type CoverageStatus = "complete" | "gap" | "unknown" | "inconsistent";

export interface CoverageSegmentInput {
  source: string;
  segmentKey: string;
  categoryUrl: string;
  announcedResults: number | null;
  discoveredUrls: string[];
  listingUrls: string[];
  pagesObserved: number;
  paginationCapDetected: boolean;
  evidence?: string[];
  measuredAt: string;
}

export interface CoverageAuditOptions {
  completeTolerance?: number;
  partitionGapThreshold?: number;
}

export interface CoverageSegmentAudit {
  source: string;
  segmentKey: string;
  categoryUrl: string;
  announcedResults: number | null;
  discoveredUrls: number;
  uniqueUrls: number;
  listingUrls: number;
  pagesObserved: number;
  paginationCapDetected: boolean;
  coverageRatio: number | null;
  gapCount: number | null;
  status: CoverageStatus;
  partitionRequired: boolean;
  evidence: string[];
  measuredAt: string;
}

export interface CoverageAuditSummary {
  segments: number;
  completeSegments: number;
  gapSegments: number;
  unknownSegments: number;
  inconsistentSegments: number;
  announcedResults: number;
  listingUrls: number;
  coverageRatio: number | null;
  gapCount: number;
  partitionRequiredSegments: number;
}

export interface CoverageAuditReport {
  schemaVersion: "data-coverage-gap-audit/v1";
  generatedAt: string;
  summary: CoverageAuditSummary;
  segments: CoverageSegmentAudit[];
}

const DEFAULT_COMPLETE_TOLERANCE = 0;
const DEFAULT_PARTITION_GAP_THRESHOLD = 1;

function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer`);
  }
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("URLs must not be empty");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Invalid URL: ${trimmed}`);
  }

  url.hash = "";
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  return url.toString();
}

function uniqueNormalizedUrls(values: string[]): Set<string> {
  return new Set(values.map(normalizeUrl));
}

function roundRatio(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function validateInput(input: CoverageSegmentInput): void {
  if (!input.source.trim()) throw new Error("source is required");
  if (!input.segmentKey.trim()) throw new Error("segmentKey is required");
  normalizeUrl(input.categoryUrl);
  if (input.announcedResults !== null) {
    assertNonNegativeInteger(input.announcedResults, "announcedResults");
  }
  assertNonNegativeInteger(input.pagesObserved, "pagesObserved");
  if (!Number.isFinite(Date.parse(input.measuredAt))) {
    throw new Error("measuredAt must be an ISO-compatible timestamp");
  }
}

export function auditCoverageSegment(
  input: CoverageSegmentInput,
  options: CoverageAuditOptions = {},
): CoverageSegmentAudit {
  validateInput(input);

  const completeTolerance = options.completeTolerance ?? DEFAULT_COMPLETE_TOLERANCE;
  const partitionGapThreshold =
    options.partitionGapThreshold ?? DEFAULT_PARTITION_GAP_THRESHOLD;
  assertNonNegativeInteger(completeTolerance, "completeTolerance");
  assertNonNegativeInteger(partitionGapThreshold, "partitionGapThreshold");

  const discovered = uniqueNormalizedUrls(input.discoveredUrls);
  const listings = uniqueNormalizedUrls(input.listingUrls);

  for (const listingUrl of listings) {
    if (!discovered.has(listingUrl)) {
      throw new Error(`listingUrls must be a subset of discoveredUrls: ${listingUrl}`);
    }
  }

  const discoveredCount = input.discoveredUrls.length;
  const uniqueCount = discovered.size;
  const listingCount = listings.size;
  const announced = input.announcedResults;

  let status: CoverageStatus;
  let coverageRatio: number | null = null;
  let gapCount: number | null = null;

  if (announced === null) {
    status = "unknown";
  } else if (listingCount > announced || (announced === 0 && uniqueCount > 0)) {
    status = "inconsistent";
  } else {
    gapCount = Math.max(announced - listingCount, 0);
    coverageRatio = announced === 0 ? 1 : roundRatio(listingCount / announced);
    status = gapCount <= completeTolerance ? "complete" : "gap";
  }

  const partitionRequired =
    status === "gap" &&
    (gapCount ?? 0) >= partitionGapThreshold &&
    input.paginationCapDetected;

  return {
    source: input.source.trim(),
    segmentKey: input.segmentKey.trim(),
    categoryUrl: normalizeUrl(input.categoryUrl),
    announcedResults: announced,
    discoveredUrls: discoveredCount,
    uniqueUrls: uniqueCount,
    listingUrls: listingCount,
    pagesObserved: input.pagesObserved,
    paginationCapDetected: input.paginationCapDetected,
    coverageRatio,
    gapCount,
    status,
    partitionRequired,
    evidence: [...new Set((input.evidence ?? []).map((item) => item.trim()).filter(Boolean))].sort(),
    measuredAt: new Date(input.measuredAt).toISOString(),
  };
}

export function buildCoverageAuditReport(
  inputs: CoverageSegmentInput[],
  generatedAt: string,
  options: CoverageAuditOptions = {},
): CoverageAuditReport {
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new Error("generatedAt must be an ISO-compatible timestamp");
  }

  const segments = inputs
    .map((input) => auditCoverageSegment(input, options))
    .sort((a, b) =>
      a.source.localeCompare(b.source) || a.segmentKey.localeCompare(b.segmentKey),
    );

  const measurable = segments.filter(
    (segment) => segment.status === "complete" || segment.status === "gap",
  );
  const announcedResults = measurable.reduce(
    (sum, segment) => sum + (segment.announcedResults ?? 0),
    0,
  );
  const listingUrls = measurable.reduce((sum, segment) => sum + segment.listingUrls, 0);

  return {
    schemaVersion: "data-coverage-gap-audit/v1",
    generatedAt: new Date(generatedAt).toISOString(),
    summary: {
      segments: segments.length,
      completeSegments: segments.filter((segment) => segment.status === "complete").length,
      gapSegments: segments.filter((segment) => segment.status === "gap").length,
      unknownSegments: segments.filter((segment) => segment.status === "unknown").length,
      inconsistentSegments: segments.filter((segment) => segment.status === "inconsistent").length,
      announcedResults,
      listingUrls,
      coverageRatio:
        announcedResults === 0
          ? measurable.length > 0
            ? 1
            : null
          : roundRatio(listingUrls / announcedResults),
      gapCount: Math.max(announcedResults - listingUrls, 0),
      partitionRequiredSegments: segments.filter((segment) => segment.partitionRequired).length,
    },
    segments,
  };
}

function formatRatio(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(2)}%`;
}

export function renderCoverageAuditMarkdown(report: CoverageAuditReport): string {
  const lines = [
    "# DATA-COVERAGE-1 — Coverage Gap Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "|---|---:|",
    `| Segments | ${report.summary.segments} |`,
    `| Complete | ${report.summary.completeSegments} |`,
    `| Gap | ${report.summary.gapSegments} |`,
    `| Unknown | ${report.summary.unknownSegments} |`,
    `| Inconsistent | ${report.summary.inconsistentSegments} |`,
    `| Announced results | ${report.summary.announcedResults} |`,
    `| Unique listing URLs | ${report.summary.listingUrls} |`,
    `| Weighted coverage | ${formatRatio(report.summary.coverageRatio)} |`,
    `| Gap count | ${report.summary.gapCount} |`,
    `| Partition required | ${report.summary.partitionRequiredSegments} |`,
    "",
    "## Segments",
    "",
    "| Source | Segment | Announced | Discovered | Unique | Listings | Coverage | Gap | Status | Pagination cap | Partition |",
    "|---|---|---:|---:|---:|---:|---:|---:|---|---|---|",
  ];

  for (const segment of report.segments) {
    lines.push(
      `| ${segment.source} | ${segment.segmentKey} | ${segment.announcedResults ?? "n/a"} | ${segment.discoveredUrls} | ${segment.uniqueUrls} | ${segment.listingUrls} | ${formatRatio(segment.coverageRatio)} | ${segment.gapCount ?? "n/a"} | ${segment.status} | ${segment.paginationCapDetected ? "yes" : "no"} | ${segment.partitionRequired ? "yes" : "no"} |`,
    );
  }

  lines.push("", "## Interpretation rules", "");
  lines.push(
    "- Coverage uses unique URLs classified as `LISTING`, not every discovered URL.",
    "- Missing announced counts remain `unknown`; no ratio is fabricated.",
    "- Aggregate coverage is weighted: total listings divided by total announced results.",
    "- `partitionRequired` needs both a measurable gap and pagination-cap evidence.",
    "- `inconsistent` segments are excluded from aggregate coverage.",
  );

  return `${lines.join("\n")}\n`;
}
