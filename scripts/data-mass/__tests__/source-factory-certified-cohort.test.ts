import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";

import {
  assertCertifiedSourceFactoryCohort,
  buildSourceFactoryDossiersFromCertifiedCohort,
  diffCertifiedSourceFactoryCohort,
  type CertifiedSourceFactoryCohortManifest,
} from "../source-factory-certified-cohort";
import type { DomainReservoirSummary } from "../reservoir-qualification";

const MANIFEST_PATH = "data/data-mass-2a/mass-1-certified-source-factory.json";
const EXPECTED_HEAD = "0a2856e68b44bee6f7b398b5c314d53711d95a67";
const EXPECTED_ARTIFACT_DIGEST = "sha256:84333105c8edda9be5733184c42e2e1afc865109edb580a5ae1705219c1cd932";
const EXPECTED_COHORT_DIGEST = "sha256:5ea66f2505cd7aca7e13993f54485c4bcd519d9bb3117b8d0c95447914f83ab5";

function manifest(): CertifiedSourceFactoryCohortManifest {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as CertifiedSourceFactoryCohortManifest;
}

function canonicalCohortDigest(cohort: CertifiedSourceFactoryCohortManifest["cohort"]): string {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(cohort)).digest("hex")}`;
}

function row(
  sourceDomain: string,
  massPotentialScore: number,
  overrides: Partial<DomainReservoirSummary> = {},
): DomainReservoirSummary {
  return {
    sourceDomain,
    domainRole: "UNKNOWN",
    urlRepresentations: 30,
    likelyRealEstateUrls: 25,
    likelyListingDetailUrls: 10,
    likelyCategoryOrSearchUrls: 8,
    ambiguousUrls: 7,
    nonRealEstateUrls: 5,
    realEstateShare: 25 / 30,
    likelyDetailShare: 10 / 30,
    likelyMoroccoUrls: 24,
    foreignLikelyUrls: 0,
    geographyUnknownUrls: 6,
    likelyMoroccoRealEstateUrls: 22,
    likelyMoroccoListingDetailUrls: 8,
    moroccoShare: 0.8,
    moroccoShareOfRealEstate: 22 / 25,
    likelyMoroccoDetailShare: 8 / 22,
    saleLikelyMoroccoUrls: 8,
    rentLikelyMoroccoUrls: 8,
    bothTransactionLikelyMoroccoUrls: 2,
    unknownTransactionLikelyMoroccoUrls: 4,
    detectedCities: [{ city: "Rabat", urlRepresentations: 8 }],
    duplicateSignalRows: 0,
    duplicateSignalRatio: 0,
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

test("certified MASS-1 cohort is exactly the immutable 101-domain handoff", () => {
  const cohort = manifest();
  assertCertifiedSourceFactoryCohort(cohort);
  assert.equal(cohort.mass1Head, EXPECTED_HEAD);
  assert.equal(cohort.mass1RunId, 31557215870);
  assert.equal(cohort.mass1ArtifactId, 9126627714);
  assert.equal(cohort.mass1ArtifactDigest, EXPECTED_ARTIFACT_DIGEST);
  assert.equal(cohort.mass1SourceFactoryCohortDigest, EXPECTED_COHORT_DIGEST);
  assert.equal(canonicalCohortDigest(cohort.cohort), EXPECTED_COHORT_DIGEST);
  assert.equal(cohort.mass1GeneratedAt, "2026-08-12T02:45:47.595Z");
  assert.equal(cohort.certifiedDiscoveryRowsRead, 199381);
  assert.equal(cohort.certifiedSourceFactoryDomains, 101);
  assert.equal(cohort.cohort.length, 101);
  assert.equal(new Set(cohort.cohort.map((entry) => entry.sourceDomain)).size, 101);
  assert.deepEqual(cohort.cohort.map((entry) => entry.rank), Array.from({ length: 101 }, (_, i) => i + 1));
});

test("live reservoir additions do not silently expand the certified MASS-2A cohort", () => {
  const cohort = manifest();
  const live = cohort.cohort.map((entry) => row(entry.sourceDomain, entry.massPotentialScore + 500));
  live.push(row("post-snapshot-new-source.ma", 9999));

  const batch = buildSourceFactoryDossiersFromCertifiedCohort(live, cohort);
  assert.equal(batch.dossiers.length, 101);
  assert.equal(batch.summary.highYieldDomains, 20);
  assert.equal(batch.summary.midYieldDomains, 30);
  assert.equal(batch.summary.longTailDomains, 51);
  assert.equal(batch.dossiers.some((dossier) => dossier.sourceDomain === "post-snapshot-new-source.ma"), false);
  assert.deepEqual(
    batch.dossiers.map((dossier) => dossier.sourceDomain),
    cohort.cohort.map((entry) => entry.sourceDomain),
  );
  assert.deepEqual(
    batch.dossiers.map((dossier) => dossier.reviewPriorityScore),
    cohort.cohort.map((entry) => entry.massPotentialScore),
  );
});

test("current policy/queue drift is observed without dropping a certified domain", () => {
  const cohort = manifest();
  const live = cohort.cohort.map((entry) => row(entry.sourceDomain, entry.massPotentialScore));
  live[0] = row(cohort.cohort[0].sourceDomain, 0, {
    massQueue: "MEASURE_ONLY",
    registryStatus: "REGISTERED",
    authorizationStatus: "prohibited",
    displayPolicy: "internal_signal_only",
    displayGate: "hidden",
    acquisitionMode: "internal_signal_only",
    ingestionGate: "internal_signal_only",
  });

  const batch = buildSourceFactoryDossiersFromCertifiedCohort(live, cohort);
  const first = batch.dossiers[0];
  assert.equal(first.sourceDomain, cohort.cohort[0].sourceDomain);
  assert.equal(first.registrySnapshot.authorizationStatus, "prohibited");
  assert.equal(first.proposedDecision, "HOLD");
  assert.equal(first.publicActivableNow, false);
  assert.equal(first.permissionInferred, false);
});

test("missing certified domain blocks materialization", () => {
  const cohort = manifest();
  const live = cohort.cohort.slice(1).map((entry) => row(entry.sourceDomain, entry.massPotentialScore));
  assert.throws(
    () => buildSourceFactoryDossiersFromCertifiedCohort(live, cohort),
    /Certified MASS-1 domain missing from live summaries/,
  );
});

test("post-snapshot drift is measured separately from the frozen cohort", () => {
  const cohort = manifest();
  const live = cohort.cohort.slice(1).map((entry) => row(entry.sourceDomain, entry.massPotentialScore));
  live.push(row("post-snapshot-new-source.ma", 9999));

  const drift = diffCertifiedSourceFactoryCohort(live, cohort);
  assert.deepEqual(drift.postSnapshotAddedLiveSourceFactoryDomains, ["post-snapshot-new-source.ma"]);
  assert.deepEqual(drift.certifiedDomainsNoLongerLiveSourceFactory, [cohort.cohort[0].sourceDomain]);
});
