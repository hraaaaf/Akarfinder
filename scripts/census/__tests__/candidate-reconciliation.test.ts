import assert from "node:assert/strict";
import test from "node:test";

import { buildCandidateReconciliationReport } from "../candidate-reconciliation";

test("reconciles Common Crawl hosts to their registered domain", () => {
  const report = buildCandidateReconciliationReport({
    generatedAt: "2026-08-07T10:00:00Z",
    commonCrawl: [
      {
        lane: "MA_TLD_REAL_ESTATE",
        domain: "immo.example.ma",
        registeredDomain: "example.ma",
        indexedPages: 100,
        realEstateSignalPages: 80,
        latestFetchAt: "2026-07-20T00:00:00Z",
      },
    ],
    reserve: [{ domain: "immo.example.ma", observedUrls: 12, lastSeenAt: "2026-08-01T00:00:00Z" }],
    registry: [{ sourceDomain: "example.ma", sourceName: "Example Immobilier", machineGate: "blocked_unverified" }],
  });

  assert.equal(report.reconciliation.domains, 1);
  assert.equal(report.reconciliation.b3AndCommonCrawl, 1);
  assert.equal(report.reconciliation.alreadyRegistered, 1);
  assert.deepEqual(report.candidates[0]?.hosts, ["example.ma", "immo.example.ma"]);
});

test("known aggregators are not promoted to primary-source candidates", () => {
  const report = buildCandidateReconciliationReport({
    generatedAt: "2026-08-07T10:00:00Z",
    commonCrawl: [
      {
        lane: "MA_TLD_REAL_ESTATE",
        domain: "immo.mitula.ma",
        registeredDomain: "mitula.ma",
        indexedPages: 100_000,
        realEstateSignalPages: 50_000,
        latestFetchAt: "2026-08-01T00:00:00Z",
      },
      {
        lane: "MA_TLD_REAL_ESTATE",
        domain: "rabatimmo.ma",
        registeredDomain: "rabatimmo.ma",
        indexedPages: 500,
        realEstateSignalPages: 450,
        latestFetchAt: "2026-08-01T00:00:00Z",
      },
    ],
    reserve: [],
    registry: [],
  });

  const mitula = report.candidates.find((candidate) => candidate.domain === "mitula.ma");
  const rabatImmo = report.candidates.find((candidate) => candidate.domain === "rabatimmo.ma");
  assert.equal(mitula?.primaryClass, "AGGREGATOR");
  assert.equal(rabatImmo?.primaryClass, "PRIMARY_SOURCE_CANDIDATE");
  assert.ok((rabatImmo?.score.sourcePrimarity ?? 0) > (mitula?.score.sourcePrimarity ?? 0));
});

test("known Moroccan portals are separated from likely first-party sources", () => {
  const report = buildCandidateReconciliationReport({
    generatedAt: "2026-08-07T10:00:00Z",
    commonCrawl: [
      {
        lane: "MA_TLD_REAL_ESTATE",
        domain: "sakane.ma",
        registeredDomain: "sakane.ma",
        indexedPages: 1000,
        realEstateSignalPages: 800,
        latestFetchAt: "2026-08-01T00:00:00Z",
      },
    ],
    reserve: [{ domain: "sakane.ma", observedUrls: 500 }],
    registry: [],
  });

  assert.equal(report.candidates[0]?.primaryClass, "PORTAL_CANDIDATE");
  assert.ok(report.candidates[0]?.classificationReasons.includes("known_real_estate_portal_marker"));
});

test("external generic real-estate brands require an explicit Morocco anchor for primary-source status", () => {
  const report = buildCandidateReconciliationReport({
    generatedAt: "2026-08-07T10:00:00Z",
    commonCrawl: [
      {
        lane: "MOROCCO_EXTERNAL_REAL_ESTATE",
        domain: "global-immo.com",
        registeredDomain: "global-immo.com",
        indexedPages: 2000,
        realEstateSignalPages: 500,
        latestFetchAt: "2026-08-01T00:00:00Z",
      },
      {
        lane: "MOROCCO_EXTERNAL_REAL_ESTATE",
        domain: "marrakechrealty.com",
        registeredDomain: "marrakechrealty.com",
        indexedPages: 500,
        realEstateSignalPages: 200,
        latestFetchAt: "2026-08-01T00:00:00Z",
      },
      {
        lane: "MOROCCO_EXTERNAL_REAL_ESTATE",
        domain: "professionalestate.com",
        registeredDomain: "professionalestate.com",
        indexedPages: 500,
        realEstateSignalPages: 200,
        latestFetchAt: "2026-08-01T00:00:00Z",
      },
    ],
    reserve: [],
    registry: [],
  });

  const globalImmo = report.candidates.find((candidate) => candidate.domain === "global-immo.com");
  const marrakechRealty = report.candidates.find((candidate) => candidate.domain === "marrakechrealty.com");
  const professionalEstate = report.candidates.find((candidate) => candidate.domain === "professionalestate.com");
  assert.equal(globalImmo?.primaryClass, "PORTAL_CANDIDATE");
  assert.ok(globalImmo?.classificationReasons.includes("real_estate_domain_without_morocco_primary_anchor"));
  assert.equal(marrakechRealty?.primaryClass, "PRIMARY_SOURCE_CANDIDATE");
  assert.ok(marrakechRealty?.classificationReasons.includes("explicit_morocco_primary_anchor"));
  assert.equal(professionalEstate?.primaryClass, "PORTAL_CANDIDATE");
});

test("registry geography can explicitly anchor an external first-party candidate to Morocco", () => {
  const report = buildCandidateReconciliationReport({
    generatedAt: "2026-08-07T10:00:00Z",
    commonCrawl: [],
    reserve: [{ domain: "exampleimmobilier.com", observedUrls: 20 }],
    registry: [
      {
        sourceDomain: "exampleimmobilier.com",
        sourceName: "Example Immobilier",
        primaryGeography: "Rabat-Salé",
        machineGate: "canonical_link_only",
      },
    ],
  });

  assert.equal(report.candidates[0]?.primaryClass, "PRIMARY_SOURCE_CANDIDATE");
  assert.ok(report.candidates[0]?.classificationReasons.includes("explicit_morocco_primary_anchor"));
});

test("never invents an effective policy candidate", () => {
  const report = buildCandidateReconciliationReport({
    generatedAt: "2026-08-07T10:00:00Z",
    commonCrawl: [],
    reserve: [{ domain: "leaderimmo.ma", observedUrls: 41 }],
    registry: [],
  });

  assert.equal(report.candidates[0]?.effectivePolicyCandidate, null);
  assert.equal(report.candidates[0]?.reviewState, "UNREVIEWED");
});

test("preserves existing registry policy evidence without converting it into a new policy", () => {
  const report = buildCandidateReconciliationReport({
    generatedAt: "2026-08-07T10:00:00Z",
    commonCrawl: [],
    reserve: [{ domain: "known.ma", observedUrls: 10 }],
    registry: [
      {
        sourceDomain: "known.ma",
        sourceName: "Known",
        authorizationStatus: "limited_public_facts",
        acquisitionMode: "public_index_internal_only",
        machineGate: "internal_signal_only",
        policyHash: "abc",
      },
    ],
  });

  const candidate = report.candidates[0];
  assert.equal(candidate?.registry.present, true);
  assert.equal(candidate?.reviewState, "EXISTING_REGISTRY");
  assert.equal(candidate?.registry.existingPolicies[0]?.machineGate, "internal_signal_only");
  assert.equal(candidate?.effectivePolicyCandidate, null);
});

test("reports exact source overlap buckets", () => {
  const report = buildCandidateReconciliationReport({
    generatedAt: "2026-08-07T10:00:00Z",
    commonCrawl: [
      {
        lane: "MA_TLD_REAL_ESTATE",
        domain: "both.ma",
        registeredDomain: "both.ma",
        indexedPages: 5,
        realEstateSignalPages: 5,
        latestFetchAt: null,
      },
      {
        lane: "MA_TLD_REAL_ESTATE",
        domain: "cc-only.ma",
        registeredDomain: "cc-only.ma",
        indexedPages: 3,
        realEstateSignalPages: 3,
        latestFetchAt: null,
      },
    ],
    reserve: [
      { domain: "both.ma", observedUrls: 2 },
      { domain: "b3-only.ma", observedUrls: 4 },
    ],
    registry: [],
  });

  assert.equal(report.reconciliation.domains, 3);
  assert.equal(report.reconciliation.b3AndCommonCrawl, 1);
  assert.equal(report.reconciliation.commonCrawlOnly, 1);
  assert.equal(report.reconciliation.b3Only, 1);
});
