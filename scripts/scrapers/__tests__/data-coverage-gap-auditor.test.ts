import assert from "node:assert/strict";
import test from "node:test";
import {
  auditCoverageSegment,
  buildCoverageAuditReport,
  renderCoverageAuditMarkdown,
  type CoverageSegmentInput,
} from "../../coverage/coverage-gap-auditor";

const measuredAt = "2026-08-06T16:00:00.000Z";

function segment(
  overrides: Partial<CoverageSegmentInput> = {},
): CoverageSegmentInput {
  return {
    source: "example.ma",
    segmentKey: "casablanca:apartment:sale",
    categoryUrl: "https://example.ma/casablanca/appartements/vente",
    announcedResults: 2,
    discoveredUrls: [
      "https://example.ma/listing/1",
      "https://example.ma/listing/2",
    ],
    listingUrls: [
      "https://example.ma/listing/1",
      "https://example.ma/listing/2",
    ],
    pagesObserved: 1,
    paginationCapDetected: false,
    evidence: ["category counter", "crawl manifest"],
    measuredAt,
    ...overrides,
  };
}

test("marks exact listing coverage as complete", () => {
  const result = auditCoverageSegment(segment());

  assert.equal(result.status, "complete");
  assert.equal(result.coverageRatio, 1);
  assert.equal(result.gapCount, 0);
  assert.equal(result.partitionRequired, false);
});

test("detects a measurable gap and only requires partition with cap evidence", () => {
  const withoutCap = auditCoverageSegment(
    segment({
      announcedResults: 10,
      paginationCapDetected: false,
    }),
  );
  const withCap = auditCoverageSegment(
    segment({
      announcedResults: 10,
      paginationCapDetected: true,
    }),
  );

  assert.equal(withoutCap.status, "gap");
  assert.equal(withoutCap.coverageRatio, 0.2);
  assert.equal(withoutCap.gapCount, 8);
  assert.equal(withoutCap.partitionRequired, false);
  assert.equal(withCap.partitionRequired, true);
});

test("deduplicates URLs before measuring listing coverage", () => {
  const result = auditCoverageSegment(
    segment({
      announcedResults: 2,
      discoveredUrls: [
        "https://example.ma/listing/1#gallery",
        "https://example.ma/listing/1/",
        "https://example.ma/listing/2",
      ],
      listingUrls: [
        "https://example.ma/listing/1",
        "https://example.ma/listing/1#details",
        "https://example.ma/listing/2",
      ],
    }),
  );

  assert.equal(result.discoveredUrls, 3);
  assert.equal(result.uniqueUrls, 2);
  assert.equal(result.listingUrls, 2);
  assert.equal(result.status, "complete");
});

test("keeps coverage unknown when the source counter is unavailable", () => {
  const result = auditCoverageSegment(
    segment({ announcedResults: null }),
  );

  assert.equal(result.status, "unknown");
  assert.equal(result.coverageRatio, null);
  assert.equal(result.gapCount, null);
  assert.equal(result.partitionRequired, false);
});

test("marks impossible counts as inconsistent", () => {
  const aboveAnnounced = auditCoverageSegment(
    segment({ announcedResults: 1 }),
  );
  const observedAgainstZero = auditCoverageSegment(
    segment({ announcedResults: 0, listingUrls: [] }),
  );

  assert.equal(aboveAnnounced.status, "inconsistent");
  assert.equal(aboveAnnounced.coverageRatio, null);
  assert.equal(observedAgainstZero.status, "inconsistent");
});

test("rejects listing URLs absent from discovery evidence", () => {
  assert.throws(
    () =>
      auditCoverageSegment(
        segment({
          discoveredUrls: ["https://example.ma/listing/1"],
          listingUrls: ["https://example.ma/listing/2"],
        }),
      ),
    /subset of discoveredUrls/,
  );
});

test("aggregates coverage with weighted totals, excluding unknown and inconsistent segments", () => {
  const report = buildCoverageAuditReport(
    [
      segment({
        source: "small.ma",
        segmentKey: "small",
        announcedResults: 2,
      }),
      segment({
        source: "large.ma",
        segmentKey: "large",
        announcedResults: 100,
        discoveredUrls: ["https://large.ma/listing/1"],
        listingUrls: ["https://large.ma/listing/1"],
        paginationCapDetected: true,
      }),
      segment({
        source: "unknown.ma",
        segmentKey: "unknown",
        announcedResults: null,
      }),
      segment({
        source: "broken.ma",
        segmentKey: "broken",
        announcedResults: 1,
      }),
    ],
    measuredAt,
  );

  assert.equal(report.summary.announcedResults, 102);
  assert.equal(report.summary.listingUrls, 3);
  assert.equal(report.summary.coverageRatio, 0.029412);
  assert.equal(report.summary.gapCount, 99);
  assert.equal(report.summary.completeSegments, 1);
  assert.equal(report.summary.gapSegments, 1);
  assert.equal(report.summary.unknownSegments, 1);
  assert.equal(report.summary.inconsistentSegments, 1);
  assert.equal(report.summary.partitionRequiredSegments, 1);
});

test("produces deterministic sorted JSON and Markdown", () => {
  const report = buildCoverageAuditReport(
    [
      segment({ source: "z.ma", segmentKey: "z" }),
      segment({ source: "a.ma", segmentKey: "a" }),
    ],
    measuredAt,
  );
  const markdown = renderCoverageAuditMarkdown(report);

  assert.deepEqual(
    report.segments.map(({ source }) => source),
    ["a.ma", "z.ma"],
  );
  assert.match(markdown, /Weighted coverage \| 100\.00%/);
  assert.ok(markdown.indexOf("| a.ma |") < markdown.indexOf("| z.ma |"));
  assert.equal(renderCoverageAuditMarkdown(report), markdown);
});
