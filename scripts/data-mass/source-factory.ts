import {
  rankDomainReservoirs,
  type DomainReservoirSummary,
  type DomainRole,
} from "./reservoir-qualification";

export type ReviewCohort = "HIGH_YIELD" | "MID_YIELD" | "LONG_TAIL";
export type ReviewDecision =
  | "POLICY_COMPATIBLE"
  | "CANONICAL_LINK_ONLY"
  | "INTERNAL_ONLY"
  | "PERMISSION_REQUIRED"
  | "PROHIBITED"
  | "HOLD";
export type EvidenceState = "NOT_REVIEWED" | "OBSERVED_REGISTRY_ONLY";
export type ReviewStatus = "UNREVIEWED";

export interface SourceFactoryEvidenceSlots {
  identity: EvidenceState;
  moroccoMarketRelevance: EvidenceState;
  robots: EvidenceState;
  terms: EvidenceState;
  permissionsReuse: EvidenceState;
  sitemapStructure: EvidenceState;
  freshness: EvidenceState;
}

export interface SourceFactoryRegistrySnapshot {
  registryStatus: DomainReservoirSummary["registryStatus"];
  authorizationStatus: string | null;
  displayPolicy: string | null;
  displayGate: string | null;
  acquisitionMode: string | null;
  ingestionGate: string | null;
  evidenceState: EvidenceState;
}

export interface SourceFactoryYieldSnapshot {
  urlRepresentations: number;
  likelyRealEstateUrls: number;
  likelyMoroccoRealEstateUrls: number;
  likelyMoroccoListingDetailUrls: number;
  realEstateShare: number;
  moroccoShareOfRealEstate: number;
  duplicateSignalRows: number;
  detectedCities: DomainReservoirSummary["detectedCities"];
}

export interface SourceFactoryDossier {
  schemaVersion: "MASS_2A_V1";
  rank: number;
  reviewCohort: ReviewCohort;
  sourceDomain: string;
  sourceRole: DomainRole;
  mass1Queue: "SOURCE_FACTORY";
  reviewPriorityScore: number;
  reviewPriorityBasis: "MASS_1_MASS_POTENTIAL_SCORE_ONLY";
  yield: SourceFactoryYieldSnapshot;
  registrySnapshot: SourceFactoryRegistrySnapshot;
  evidence: SourceFactoryEvidenceSlots;
  reviewStatus: ReviewStatus;
  proposedDecision: ReviewDecision;
  decisionReasons: string[];
  permissionInferred: false;
  publicActivableNow: false;
}

export interface SourceFactoryBatch {
  schemaVersion: "MASS_2A_V1";
  generatedFrom: "MASS_1_SOURCE_FACTORY_QUEUE";
  dossiers: SourceFactoryDossier[];
  summary: {
    totalDomains: number;
    highYieldDomains: number;
    midYieldDomains: number;
    longTailDomains: number;
    totalUrlRepresentations: number;
    totalLikelyMoroccoRealEstateUrls: number;
    totalLikelyMoroccoListingDetailUrls: number;
    permissionInferredCount: 0;
    publicActivableNowCount: 0;
    nonHoldDecisionCount: 0;
  };
}

function cohortForRank(rank: number): ReviewCohort {
  if (rank <= 20) return "HIGH_YIELD";
  if (rank <= 50) return "MID_YIELD";
  return "LONG_TAIL";
}

function registryEvidenceState(row: DomainReservoirSummary): EvidenceState {
  return row.registryStatus === "REGISTERED" ? "OBSERVED_REGISTRY_ONLY" : "NOT_REVIEWED";
}

function emptyEvidence(): SourceFactoryEvidenceSlots {
  return {
    identity: "NOT_REVIEWED",
    moroccoMarketRelevance: "NOT_REVIEWED",
    robots: "NOT_REVIEWED",
    terms: "NOT_REVIEWED",
    permissionsReuse: "NOT_REVIEWED",
    sitemapStructure: "NOT_REVIEWED",
    freshness: "NOT_REVIEWED",
  };
}

function assertSourceFactoryInput(rows: DomainReservoirSummary[]): void {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.massQueue !== "SOURCE_FACTORY") {
      throw new Error(`MASS-2A accepts SOURCE_FACTORY rows only: ${row.sourceDomain}:${row.massQueue}`);
    }
    if (seen.has(row.sourceDomain)) {
      throw new Error(`Duplicate MASS-2A source domain: ${row.sourceDomain}`);
    }
    seen.add(row.sourceDomain);
    if (row.publicActivableNow !== false) {
      throw new Error(`Upstream activation invariant violated for ${row.sourceDomain}`);
    }
  }
}

export function buildSourceFactoryDossiers(rows: DomainReservoirSummary[]): SourceFactoryBatch {
  assertSourceFactoryInput(rows);
  const ranked = rankDomainReservoirs(rows);

  const dossiers = ranked.map<SourceFactoryDossier>((row, index) => ({
    schemaVersion: "MASS_2A_V1",
    rank: index + 1,
    reviewCohort: cohortForRank(index + 1),
    sourceDomain: row.sourceDomain,
    sourceRole: row.domainRole,
    mass1Queue: "SOURCE_FACTORY",
    reviewPriorityScore: row.massPotentialScore,
    reviewPriorityBasis: "MASS_1_MASS_POTENTIAL_SCORE_ONLY",
    yield: {
      urlRepresentations: row.urlRepresentations,
      likelyRealEstateUrls: row.likelyRealEstateUrls,
      likelyMoroccoRealEstateUrls: row.likelyMoroccoRealEstateUrls,
      likelyMoroccoListingDetailUrls: row.likelyMoroccoListingDetailUrls,
      realEstateShare: row.realEstateShare,
      moroccoShareOfRealEstate: row.moroccoShareOfRealEstate,
      duplicateSignalRows: row.duplicateSignalRows,
      detectedCities: row.detectedCities,
    },
    registrySnapshot: {
      registryStatus: row.registryStatus,
      authorizationStatus: row.authorizationStatus,
      displayPolicy: row.displayPolicy,
      displayGate: row.displayGate,
      acquisitionMode: row.acquisitionMode,
      ingestionGate: row.ingestionGate,
      evidenceState: registryEvidenceState(row),
    },
    evidence: emptyEvidence(),
    reviewStatus: "UNREVIEWED",
    proposedDecision: "HOLD",
    decisionReasons: [
      "MASS_2A_ENGINE_ONLY",
      "EXTERNAL_SOURCE_EVIDENCE_NOT_REVIEWED",
      "VOLUME_AND_PRIORITY_DO_NOT_GRANT_PERMISSION",
    ],
    permissionInferred: false,
    publicActivableNow: false,
  }));

  const total = (key: keyof SourceFactoryYieldSnapshot) =>
    dossiers.reduce((sum, dossier) => {
      const value = dossier.yield[key];
      return typeof value === "number" ? sum + value : sum;
    }, 0);

  return {
    schemaVersion: "MASS_2A_V1",
    generatedFrom: "MASS_1_SOURCE_FACTORY_QUEUE",
    dossiers,
    summary: {
      totalDomains: dossiers.length,
      highYieldDomains: dossiers.filter((row) => row.reviewCohort === "HIGH_YIELD").length,
      midYieldDomains: dossiers.filter((row) => row.reviewCohort === "MID_YIELD").length,
      longTailDomains: dossiers.filter((row) => row.reviewCohort === "LONG_TAIL").length,
      totalUrlRepresentations: total("urlRepresentations"),
      totalLikelyMoroccoRealEstateUrls: total("likelyMoroccoRealEstateUrls"),
      totalLikelyMoroccoListingDetailUrls: total("likelyMoroccoListingDetailUrls"),
      permissionInferredCount: 0,
      publicActivableNowCount: 0,
      nonHoldDecisionCount: 0,
    },
  };
}
