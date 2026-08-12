import assert from "node:assert/strict";
import test from "node:test";

import { buildSourceFactoryDossiers } from "../source-factory";
import type { DomainReservoirSummary } from "../reservoir-qualification";

function row(index: number): DomainReservoirSummary {
  const score = 101 - index;
  return {
    sourceDomain: `mass2-${String(index).padStart(3, "0")}.ma`,
    domainRole: "DIRECT_PORTAL",
    urlRepresentations: 200 + score,
    likelyRealEstateUrls: 150 + score,
    likelyListingDetailUrls: 100 + score,
    likelyCategoryOrSearchUrls: 20,
    ambiguousUrls: 20,
    nonRealEstateUrls: 10,
    realEstateShare: 0.9,
    likelyDetailShare: 0.7,
    likelyMoroccoUrls: 140 + score,
    foreignLikelyUrls: 0,
    geographyUnknownUrls: 10,
    likelyMoroccoRealEstateUrls: 130 + score,
    likelyMoroccoListingDetailUrls: 90 + score,
    moroccoShare: 0.9,
    moroccoShareOfRealEstate: 0.9,
    likelyMoroccoDetailShare: 0.7,
    saleLikelyMoroccoUrls: 60,
    rentLikelyMoroccoUrls: 50,
    bothTransactionLikelyMoroccoUrls: 10,
    unknownTransactionLikelyMoroccoUrls: 10,
    detectedCities: [{ city: "Rabat", urlRepresentations: 50 }],
    duplicateSignalRows: 1,
    duplicateSignalRatio: 0.005,
    registryStatus: "UNREGISTERED",
    authorizationStatus: null,
    displayPolicy: null,
    displayGate: null,
    acquisitionMode: null,
    ingestionGate: null,
    massQueue: "SOURCE_FACTORY",
    massPotentialScore: score,
    publicActivableNow: false,
    recommendedNextAction: "Review in MASS-2 Source Factory",
  };
}

test("certified MASS-2 queue is exactly 101 domains split 20/30/51 and stays fail-closed", () => {
  const input = Array.from({ length: 101 }, (_, i) => row(i + 1));
  const forward = buildSourceFactoryDossiers(input);
  const reverse = buildSourceFactoryDossiers([...input].reverse());

  assert.equal(forward.summary.totalDomains, 101);
  assert.equal(forward.summary.highYieldDomains, 20);
  assert.equal(forward.summary.midYieldDomains, 30);
  assert.equal(forward.summary.longTailDomains, 51);
  assert.equal(forward.dossiers[19]?.reviewCohort, "HIGH_YIELD");
  assert.equal(forward.dossiers[20]?.reviewCohort, "MID_YIELD");
  assert.equal(forward.dossiers[49]?.reviewCohort, "MID_YIELD");
  assert.equal(forward.dossiers[50]?.reviewCohort, "LONG_TAIL");
  assert.equal(forward.dossiers[100]?.reviewCohort, "LONG_TAIL");

  assert.deepEqual(
    forward.dossiers.map((d) => d.sourceDomain),
    reverse.dossiers.map((d) => d.sourceDomain),
    "input ordering must not change the deterministic review order",
  );

  assert.ok(forward.dossiers.every((d) => d.reviewStatus === "UNREVIEWED"));
  assert.ok(forward.dossiers.every((d) => d.proposedDecision === "HOLD"));
  assert.ok(forward.dossiers.every((d) => d.permissionInferred === false));
  assert.ok(forward.dossiers.every((d) => d.publicActivableNow === false));
});
