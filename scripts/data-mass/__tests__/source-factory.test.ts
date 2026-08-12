import assert from "node:assert/strict";
import test from "node:test";

import { buildSourceFactoryDossiers } from "../source-factory";
import type { DomainReservoirSummary } from "../reservoir-qualification";

function row(
  sourceDomain: string,
  massPotentialScore: number,
  overrides: Partial<DomainReservoirSummary> = {},
): DomainReservoirSummary {
  return {
    sourceDomain,
    domainRole: "DIRECT_PORTAL",
    urlRepresentations: 100,
    likelyRealEstateUrls: 90,
    likelyListingDetailUrls: 40,
    likelyCategoryOrSearchUrls: 30,
    ambiguousUrls: 20,
    nonRealEstateUrls: 10,
    realEstateShare: 0.9,
    likelyDetailShare: 0.4,
    likelyMoroccoUrls: 80,
    foreignLikelyUrls: 0,
    geographyUnknownUrls: 20,
    likelyMoroccoRealEstateUrls: 75,
    likelyMoroccoListingDetailUrls: 30,
    moroccoShare: 0.8,
    moroccoShareOfRealEstate: 0.83,
    likelyMoroccoDetailShare: 0.4,
    saleLikelyMoroccoUrls: 30,
    rentLikelyMoroccoUrls: 30,
    bothTransactionLikelyMoroccoUrls: 5,
    unknownTransactionLikelyMoroccoUrls: 10,
    detectedCities: [{ city: "Rabat", urlRepresentations: 25 }],
    duplicateSignalRows: 2,
    duplicateSignalRatio: 0.02,
    registryStatus: "UNREGISTERED",
    authorizationStatus: null,
    displayPolicy: null,
    displayGate: null,
    acquisitionMode: null,
    ingestionGate: null,
    massQueue: "SOURCE_FACTORY",
    massPotentialScore,
    publicActivableNow: false,
    recommendedNextAction: "Review in MASS-2 Source Factory",
    ...overrides,
  };
}

test("creates exactly one fail-closed dossier per SOURCE_FACTORY domain", () => {
  const batch = buildSourceFactoryDossiers([
    row("a.ma", 100),
    row("b.ma", 90),
    row("c.ma", 80),
  ]);

  assert.equal(batch.dossiers.length, 3);
  assert.equal(new Set(batch.dossiers.map((d) => d.sourceDomain)).size, 3);
  for (const dossier of batch.dossiers) {
    assert.equal(dossier.proposedDecision, "HOLD");
    assert.equal(dossier.reviewStatus, "UNREVIEWED");
    assert.equal(dossier.permissionInferred, false);
    assert.equal(dossier.publicActivableNow, false);
    assert.equal(dossier.reviewPriorityBasis, "MASS_1_MASS_POTENTIAL_SCORE_ONLY");
    assert.ok(Object.values(dossier.evidence).every((state) => state === "NOT_REVIEWED"));
  }
  assert.equal(batch.summary.permissionInferredCount, 0);
  assert.equal(batch.summary.publicActivableNowCount, 0);
  assert.equal(batch.summary.nonHoldDecisionCount, 0);
});

test("preserves MASS-1 deterministic ranking and assigns 20/30/remainder cohorts", () => {
  const rows = Array.from({ length: 55 }, (_, index) =>
    row(`source-${String(index + 1).padStart(2, "0")}.ma`, 55 - index),
  ).reverse();
  const batch = buildSourceFactoryDossiers(rows);

  assert.equal(batch.dossiers[0]?.reviewPriorityScore, 55);
  assert.equal(batch.dossiers[54]?.reviewPriorityScore, 1);
  assert.equal(batch.summary.highYieldDomains, 20);
  assert.equal(batch.summary.midYieldDomains, 30);
  assert.equal(batch.summary.longTailDomains, 5);
  assert.equal(batch.dossiers[19]?.reviewCohort, "HIGH_YIELD");
  assert.equal(batch.dossiers[20]?.reviewCohort, "MID_YIELD");
  assert.equal(batch.dossiers[49]?.reviewCohort, "MID_YIELD");
  assert.equal(batch.dossiers[50]?.reviewCohort, "LONG_TAIL");
});

test("volume and priority can never grant permission", () => {
  const batch = buildSourceFactoryDossiers([
    row("huge-volume.ma", 10_000, {
      urlRepresentations: 1_000_000,
      likelyMoroccoRealEstateUrls: 999_999,
      likelyMoroccoListingDetailUrls: 900_000,
    }),
  ]);
  const dossier = batch.dossiers[0];
  assert.equal(dossier?.reviewPriorityScore, 10_000);
  assert.equal(dossier?.proposedDecision, "HOLD");
  assert.equal(dossier?.permissionInferred, false);
  assert.equal(dossier?.publicActivableNow, false);
});

test("registered restrictive policy is observed but never lifted", () => {
  const batch = buildSourceFactoryDossiers([
    row("restricted.ma", 100, {
      registryStatus: "REGISTERED",
      authorizationStatus: "prohibited",
      displayPolicy: "internal_signal_only",
      displayGate: "hidden",
      acquisitionMode: "internal_signal_only",
      ingestionGate: "internal_signal_only",
    }),
  ]);
  const dossier = batch.dossiers[0];
  assert.equal(dossier?.registrySnapshot.evidenceState, "OBSERVED_REGISTRY_ONLY");
  assert.equal(dossier?.registrySnapshot.authorizationStatus, "prohibited");
  assert.equal(dossier?.proposedDecision, "HOLD");
  assert.equal(dossier?.publicActivableNow, false);
});

test("rejects non-SOURCE_FACTORY rows", () => {
  assert.throws(
    () => buildSourceFactoryDossiers([row("measure.ma", 1, { massQueue: "MEASURE_ONLY" })]),
    /SOURCE_FACTORY rows only/,
  );
});

test("rejects duplicate domains rather than silently hiding upstream drift", () => {
  assert.throws(
    () => buildSourceFactoryDossiers([row("duplicate.ma", 2), row("duplicate.ma", 1)]),
    /Duplicate MASS-2A source domain/,
  );
});

test("aggregated yield is arithmetic only and does not alter review state", () => {
  const batch = buildSourceFactoryDossiers([
    row("a.ma", 2, { urlRepresentations: 10, likelyMoroccoRealEstateUrls: 8, likelyMoroccoListingDetailUrls: 5 }),
    row("b.ma", 1, { urlRepresentations: 20, likelyMoroccoRealEstateUrls: 12, likelyMoroccoListingDetailUrls: 4 }),
  ]);
  assert.equal(batch.summary.totalUrlRepresentations, 30);
  assert.equal(batch.summary.totalLikelyMoroccoRealEstateUrls, 20);
  assert.equal(batch.summary.totalLikelyMoroccoListingDetailUrls, 9);
  assert.ok(batch.dossiers.every((d) => d.proposedDecision === "HOLD" && !d.publicActivableNow));
});
