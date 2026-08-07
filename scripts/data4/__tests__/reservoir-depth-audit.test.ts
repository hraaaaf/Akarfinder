import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReservoirDepthReport,
  type InternalReservoirMetrics,
  type PublicReservoirEvidence,
} from "../reservoir-depth-audit";

const evidence: PublicReservoirEvidence[] = [
  {
    domain: "avito.ma",
    observedAt: "2026-08-07T14:58:00.000Z",
    homepageUrl: "https://www.avito.ma/",
    robotsUrl: "https://www.avito.ma/robots.txt",
    announcedInventory: null,
    announcedInventoryScope: "not observed",
    sitemapDeclared: true,
    observationNotes: ["bounded evidence"],
    auditRecommendation: "REGISTRY_REVIEW_BEFORE_SITEMAP_MEASUREMENT",
  },
  {
    domain: "mubawab.ma",
    observedAt: "2026-08-07T14:58:00.000Z",
    homepageUrl: "https://www.mubawab.ma/fr/",
    robotsUrl: "https://www.mubawab.ma/robots.txt",
    termsUrl: "https://www.mubawab.ma/fr/privacy",
    announcedInventory: 100000,
    announcedInventoryScope: "homepage total",
    sitemapDeclared: false,
    observationNotes: ["bounded evidence"],
    auditRecommendation: "PARTNERSHIP_OR_PUBLIC_INDEX_MEASUREMENT",
  },
];

function metric(domain: "avito.ma" | "mubawab.ma", overrides: Partial<InternalReservoirMetrics> = {}): InternalReservoirMetrics {
  return {
    domain,
    discoveryCandidateRows: 100,
    offerSeedRows: 1000,
    normalizedRows: 1000,
    normalizationUnavailableRows: 700,
    normalizationNormalizedRows: 250,
    normalizationPartialRows: 50,
    freshConfirmedRows: 100,
    technicalSearchRepresentationRows: 300,
    technicalDisplayEligibleRows: 200,
    quality: null,
    registry: {
      source_domain: domain,
      current_representation_count: 1000,
      discovery_policy: "public_index_only",
      detail_fetch_policy: "legal_review_required",
      content_reuse_policy: "unknown",
      display_policy: "internal_signal_only",
      authorization_status: "unverified",
      acquisition_mode: "public_index_internal_only",
      allowed_discovery_channels: ["public_index", "commoncrawl"],
      robots_status: "allow_with_restrictions",
      terms_status: "unverified",
      review_status: "current",
      machine_gate: "internal_signal_only",
      ingestion_gate: "internal_signal_only",
      display_gate: "hidden",
      reviewed_at: "2026-08-07T00:00:00Z",
      next_review_at: "2026-08-21T00:00:00Z",
      policy_version: "source_registry_v2",
    },
    sourceFreshness: {
      source_domain: domain,
      freshness_state: "current",
      publication_eligible: false,
      effective_machine_gate: "internal_signal_only",
      evaluated_at: "2026-08-07T00:00:00Z",
      freshness_deadline_at: "2026-08-21T00:00:00Z",
    },
    ...overrides,
  };
}

test("DATA-4.0 distinguishes technical displayability from policy activation", () => {
  const report = buildReservoirDepthReport(evidence, [metric("avito.ma"), metric("mubawab.ma")], "2026-08-07T15:00:00Z");
  assert.equal(report.summary.technicalDisplayEligibleRows, 400);
  assert.equal(report.summary.policyActivableRows, 0);
  assert.equal(report.sources.every((row) => row.policyActivableRows === 0), true);
  assert.equal(report.sources.every((row) => row.policyBlockedTechnicalDisplay === 200), true);
});

test("unknown Avito public inventory stays unknown instead of being estimated", () => {
  const report = buildReservoirDepthReport(evidence, [metric("avito.ma"), metric("mubawab.ma")]);
  const avito = report.sources.find((row) => row.domain === "avito.ma");
  assert.ok(avito);
  assert.equal(avito.publicInventoryObserved, false);
  assert.equal(avito.publicAnnouncedInventory, null);
  assert.equal(avito.normalizedToPublicRatio, null);
  assert.equal(avito.publicGapToNormalized, null);
});

test("observed Mubawab public inventory produces bounded depth ratios", () => {
  const report = buildReservoirDepthReport(evidence, [metric("avito.ma"), metric("mubawab.ma")]);
  const mubawab = report.sources.find((row) => row.domain === "mubawab.ma");
  assert.ok(mubawab);
  assert.equal(mubawab.normalizedToPublicRatio, 0.01);
  assert.equal(mubawab.publicGapToNormalized, 99000);
  assert.equal(mubawab.technicalDisplayToNormalizedRatio, 0.2);
  assert.equal(mubawab.unavailableNormalizationRatio, 0.7);
});

test("normalization bucket drift fails closed", () => {
  assert.throws(
    () => buildReservoirDepthReport(evidence, [metric("avito.ma", { normalizationUnavailableRows: 699 }), metric("mubawab.ma")]),
    /normalization buckets/,
  );
});

test("a visible authorized policy can expose only the technical-display subset", () => {
  const authorized = metric("avito.ma");
  authorized.registry = {
    ...authorized.registry,
    display_policy: "canonical_link_only",
    acquisition_mode: "public_sitemap_canonical_link",
    display_gate: "external_tail_link_only",
  };
  authorized.sourceFreshness = {
    ...authorized.sourceFreshness!,
    publication_eligible: true,
  };
  const report = buildReservoirDepthReport(evidence, [authorized, metric("mubawab.ma")]);
  assert.equal(report.sources.find((row) => row.domain === "avito.ma")?.policyActivableRows, 200);
});
