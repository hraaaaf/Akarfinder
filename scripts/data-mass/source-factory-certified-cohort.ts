import {
  buildSourceFactoryDossiers,
  type ReviewCohort,
  type SourceFactoryBatch,
} from "./source-factory";
import type { DomainReservoirSummary } from "./reservoir-qualification";

export interface CertifiedSourceFactoryCohortEntry {
  rank: number;
  sourceDomain: string;
  massPotentialScore: number;
}

export interface CertifiedSourceFactoryCohortManifest {
  schemaVersion: "MASS_2A_CERTIFIED_COHORT_V1";
  source: "MASS_1_CERTIFIED_ARTIFACT";
  mass1Head: string;
  mass1RunId: number;
  mass1ArtifactId: number;
  mass1ArtifactDigest: string;
  mass1GeneratedAt: string;
  certifiedDiscoveryRowsRead: number;
  certifiedSourceFactoryDomains: number;
  cohort: CertifiedSourceFactoryCohortEntry[];
}

export interface CertifiedCohortDrift {
  postSnapshotAddedLiveSourceFactoryDomains: string[];
  certifiedDomainsNoLongerLiveSourceFactory: string[];
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function cohortForRank(rank: number): ReviewCohort {
  if (rank <= 20) return "HIGH_YIELD";
  if (rank <= 50) return "MID_YIELD";
  return "LONG_TAIL";
}

export function assertCertifiedSourceFactoryCohort(
  manifest: CertifiedSourceFactoryCohortManifest,
): void {
  if (manifest.schemaVersion !== "MASS_2A_CERTIFIED_COHORT_V1") {
    throw new Error(`Unexpected MASS-2A cohort schema: ${manifest.schemaVersion}`);
  }
  if (manifest.source !== "MASS_1_CERTIFIED_ARTIFACT") {
    throw new Error(`Unexpected MASS-2A cohort source: ${manifest.source}`);
  }
  if (manifest.certifiedSourceFactoryDomains !== manifest.cohort.length) {
    throw new Error(
      `Certified cohort count mismatch: manifest=${manifest.certifiedSourceFactoryDomains} cohort=${manifest.cohort.length}`,
    );
  }

  const seen = new Set<string>();
  for (let index = 0; index < manifest.cohort.length; index += 1) {
    const row = manifest.cohort[index];
    if (row.rank !== index + 1) {
      throw new Error(`Certified cohort rank drift at ${row.sourceDomain}: ${row.rank} !== ${index + 1}`);
    }
    const domain = normalizeDomain(row.sourceDomain);
    if (!domain) throw new Error(`Empty certified cohort domain at rank ${row.rank}`);
    if (seen.has(domain)) throw new Error(`Duplicate certified cohort domain: ${domain}`);
    seen.add(domain);
    if (!Number.isFinite(row.massPotentialScore) || row.massPotentialScore < 0) {
      throw new Error(`Invalid certified MASS-1 score for ${domain}: ${row.massPotentialScore}`);
    }
  }
}

export function buildSourceFactoryDossiersFromCertifiedCohort(
  liveRows: DomainReservoirSummary[],
  manifest: CertifiedSourceFactoryCohortManifest,
): SourceFactoryBatch {
  assertCertifiedSourceFactoryCohort(manifest);

  const liveByDomain = new Map<string, DomainReservoirSummary>();
  for (const row of liveRows) {
    const domain = normalizeDomain(row.sourceDomain);
    if (liveByDomain.has(domain)) throw new Error(`Duplicate live MASS summary domain: ${domain}`);
    liveByDomain.set(domain, row);
  }

  const lockedRows = manifest.cohort.map((entry) => {
    const domain = normalizeDomain(entry.sourceDomain);
    const live = liveByDomain.get(domain);
    if (!live) throw new Error(`Certified MASS-1 domain missing from live summaries: ${domain}`);

    return {
      ...live,
      sourceDomain: domain,
      massQueue: "SOURCE_FACTORY" as const,
      massPotentialScore: entry.massPotentialScore,
      publicActivableNow: false as const,
    };
  });

  const built = buildSourceFactoryDossiers(lockedRows);
  const dossierByDomain = new Map(
    built.dossiers.map((dossier) => [normalizeDomain(dossier.sourceDomain), dossier] as const),
  );

  const dossiers = manifest.cohort.map((entry) => {
    const domain = normalizeDomain(entry.sourceDomain);
    const dossier = dossierByDomain.get(domain);
    if (!dossier) throw new Error(`Certified MASS-1 dossier missing after build: ${domain}`);
    return {
      ...dossier,
      rank: entry.rank,
      reviewCohort: cohortForRank(entry.rank),
      reviewPriorityScore: entry.massPotentialScore,
    };
  });

  return {
    ...built,
    dossiers,
    summary: {
      ...built.summary,
      totalDomains: dossiers.length,
      highYieldDomains: dossiers.filter((row) => row.reviewCohort === "HIGH_YIELD").length,
      midYieldDomains: dossiers.filter((row) => row.reviewCohort === "MID_YIELD").length,
      longTailDomains: dossiers.filter((row) => row.reviewCohort === "LONG_TAIL").length,
    },
  };
}

export function diffCertifiedSourceFactoryCohort(
  liveSourceFactoryRows: DomainReservoirSummary[],
  manifest: CertifiedSourceFactoryCohortManifest,
): CertifiedCohortDrift {
  assertCertifiedSourceFactoryCohort(manifest);
  const certified = new Set(manifest.cohort.map((row) => normalizeDomain(row.sourceDomain)));
  const live = new Set(liveSourceFactoryRows.map((row) => normalizeDomain(row.sourceDomain)));

  return {
    postSnapshotAddedLiveSourceFactoryDomains: [...live]
      .filter((domain) => !certified.has(domain))
      .sort(),
    certifiedDomainsNoLongerLiveSourceFactory: [...certified]
      .filter((domain) => !live.has(domain))
      .sort(),
  };
}
