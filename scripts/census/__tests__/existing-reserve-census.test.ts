import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildExistingReserveCensusReport,
  renderExistingReserveCensusMarkdown,
} from "../existing-reserve-census";

describe("DATA-1.2 Existing Reserve Census", () => {
  const rows = [
    {
      source_domain: "rabatimmo.ma",
      canonical_url: "https://rabatimmo.ma/a",
      provider: "openserp",
      last_seen_at: "2026-08-05T10:00:00Z",
      decision: "reserve_unregistered_source",
    },
    {
      source_domain: "rabatimmo.ma",
      canonical_url: "https://rabatimmo.ma/b",
      provider: "serper_mass_harvest",
      last_seen_at: "2026-08-05T11:00:00Z",
      decision: "reserve_unregistered_source",
    },
    {
      source_domain: "example.ma",
      canonical_url: "https://example.ma/property/1",
      provider: "openserp",
      last_seen_at: "2026-08-05T12:00:00Z",
      decision: "reserve_unregistered_source",
    },
    {
      source_domain: "facebook.com",
      canonical_url: "https://facebook.com/example",
      provider: "openserp",
      last_seen_at: "2026-08-05T13:00:00Z",
      decision: "reserve_unregistered_source",
    },
  ] as const;

  it("produces deterministic priority statistics without source authorization", () => {
    const report = buildExistingReserveCensusReport(
      [...rows],
      "2026-08-07T02:30:00+01:00",
    );

    assert.equal(report.rows, 4);
    assert.equal(report.domains, 3);
    assert.deepEqual(report.priorityStats, [
      { priority: "HIGH", domains: 1, observedUrls: 2 },
      { priority: "MEDIUM", domains: 1, observedUrls: 1 },
      { priority: "LOW", domains: 0, observedUrls: 0 },
      { priority: "NOISE", domains: 1, observedUrls: 1 },
    ]);

    assert.equal(report.candidates[0]!.domain, "rabatimmo.ma");
    assert.equal(report.candidates[0]!.reviewPriority, "HIGH");
    assert.equal(report.candidates[0]!.registryState, "UNREGISTERED");
    assert.equal(report.candidates[0]!.effectivePolicy, null);
    assert.equal(report.candidates.at(-1)!.reviewPriority, "NOISE");
  });

  it("renders a bounded review queue with an explicit policy gate", () => {
    const report = buildExistingReserveCensusReport(
      [...rows],
      "2026-08-07T02:30:00+01:00",
    );
    const markdown = renderExistingReserveCensusMarkdown(report, 2);

    assert.match(markdown, /Top 2 review candidates/);
    assert.match(markdown, /rabatimmo\.ma/);
    assert.match(markdown, /Discovery priority never grants ingestion or publication rights/);
    assert.doesNotMatch(markdown, /facebook\.com/);
  });

  it("rejects invalid top limits", () => {
    const report = buildExistingReserveCensusReport(
      [...rows],
      "2026-08-07T02:30:00+01:00",
    );
    assert.throws(() => renderExistingReserveCensusMarkdown(report, 0), /positive integer/);
  });
});
