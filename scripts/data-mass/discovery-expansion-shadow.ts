import fs from "node:fs/promises";
import path from "node:path";
import { assertCertifiedSourceFactoryCohort, type CertifiedSourceFactoryCohortManifest } from "./source-factory-certified-cohort";
import type { DomainReservoirSummary } from "./reservoir-qualification";

const REPORT_PATH = process.env.DATA_MASS_5_MASS1_REPORT ?? ".tmp/data-mass-5/mass1/report.json";
const COHORT_PATH = process.env.DATA_MASS_5_COHORT_PATH ?? "data/data-mass-2a/mass-1-certified-source-factory.json";
const OUT_DIR = process.env.DATA_MASS_5_OUT_DIR ?? ".tmp/data-mass-5/results";

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function assertMass1ReadOnlyProof(proof: Record<string, unknown>): void {
  const expectedZero = ["databaseWrites", "ddlChanges", "policyChanges", "sourceNetworkRequests", "detailPageFetches", "publicRowsCreated"];
  if (proof.readOnly !== true) throw new Error("MASS_1_PREDECESSOR_NOT_READ_ONLY");
  for (const key of expectedZero) {
    if (proof[key] !== 0) throw new Error(`MASS_1_PREDECESSOR_${key.toUpperCase()}_NOT_ZERO`);
  }
  if (proof.unitOfCount !== "URL_REPRESENTATION") throw new Error("MASS_1_PREDECESSOR_UNIT_DRIFT");
}

async function main() {
  const report = JSON.parse(await fs.readFile(REPORT_PATH, "utf8")) as {
    proof: Record<string, unknown>;
    allDomains: DomainReservoirSummary[];
  };
  assertMass1ReadOnlyProof(report.proof);

  const cohort = JSON.parse(await fs.readFile(COHORT_PATH, "utf8")) as CertifiedSourceFactoryCohortManifest;
  assertCertifiedSourceFactoryCohort(cohort);

  const certified = new Set(cohort.cohort.map((row) => normalizeDomain(row.sourceDomain)));
  const currentSourceFactory = report.allDomains.filter((row) => row.massQueue === "SOURCE_FACTORY");
  const added = currentSourceFactory
    .filter((row) => !certified.has(normalizeDomain(row.sourceDomain)))
    .sort((a, b) => b.massPotentialScore - a.massPotentialScore || a.sourceDomain.localeCompare(b.sourceDomain));
  const retained = currentSourceFactory.filter((row) => certified.has(normalizeDomain(row.sourceDomain)));
  const liveDomains = new Set(currentSourceFactory.map((row) => normalizeDomain(row.sourceDomain)));
  const missing = cohort.cohort.map((row) => normalizeDomain(row.sourceDomain)).filter((domain) => !liveDomains.has(domain)).sort();

  if (added.some((row) => row.publicActivableNow !== false)) {
    throw new Error("MASS_5_ADDED_DOMAIN_PUBLIC_ACTIVATION_DRIFT");
  }

  const proof = {
    schemaVersion: "MASS_5_DISCOVERY_EXPANSION_SHADOW_V1",
    status: "PASS",
    mode: "shadow_read_only",
    predecessorReadOnlyProofVerified: true,
    baselineCertifiedDomains: cohort.certifiedSourceFactoryDomains,
    baselineMass1GeneratedAt: cohort.mass1GeneratedAt,
    currentSourceFactoryDomains: currentSourceFactory.length,
    retainedCertifiedSourceFactoryDomains: retained.length,
    postBaselineAddedSourceFactoryDomains: added.length,
    certifiedDomainsNoLongerCurrentSourceFactory: missing.length,
    addedUrlRepresentations: added.reduce((sum, row) => sum + row.urlRepresentations, 0),
    addedLikelyMoroccoRealEstateUrlRepresentations: added.reduce((sum, row) => sum + row.likelyMoroccoRealEstateUrls, 0),
    addedLikelyMoroccoListingDetailUrlRepresentations: added.reduce((sum, row) => sum + row.likelyMoroccoListingDetailUrls, 0),
    addedDomains: added.map((row) => ({
      sourceDomain: row.sourceDomain,
      domainRole: row.domainRole,
      massPotentialScore: row.massPotentialScore,
      urlRepresentations: row.urlRepresentations,
      likelyMoroccoRealEstateUrls: row.likelyMoroccoRealEstateUrls,
      likelyMoroccoListingDetailUrls: row.likelyMoroccoListingDetailUrls,
      registryStatus: row.registryStatus,
      publicActivableNow: row.publicActivableNow,
      recommendedNextAction: row.recommendedNextAction,
    })),
    missingCertifiedDomains: missing,
    sourceRegistryRemainsAuthoritative: true,
    discoveryExpansionGrantsAuthorization: false,
    publicActivableNow: false,
    databaseWrites: 0,
    registryWrites: 0,
    searchActivations: 0,
    sourceNetworkRequests: 0,
    detailPageFetches: 0,
    permissionsInferred: 0,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
