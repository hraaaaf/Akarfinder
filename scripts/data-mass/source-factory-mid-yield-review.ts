import type { ReviewDecision } from "./source-factory";

export type MidYieldDecision = Extract<ReviewDecision, "PERMISSION_REQUIRED" | "HOLD">;
export type MidYieldAcquisition =
  | "DIRECT_SOURCE_BLOCKED_BY_TERMS"
  | "DIRECT_SOURCE_NO_PUBLIC_REUSE_GRANT"
  | "DIRECT_SOURCE_UNRESOLVED_TERMS";
export type MidYieldTermsStatus =
  | "EXPLICIT_REUSE_RESTRICTION"
  | "NO_PUBLIC_REUSE_GRANT_FOUND"
  | "TERMS_UNRESOLVED";
export type MidYieldPublicIndexingMode = "CANONICAL_LINK_ONLY_CANDIDATE" | "UNRESOLVED";

export interface MidYieldReviewRecord {
  rank: number;
  sourceDomain: string;
  massPotentialScore: number;
  yield: {
    urlRepresentations: number;
    likelyMoroccoRealEstateUrls: number;
    likelyMoroccoListingDetailUrls: number;
  };
  decision: MidYieldDecision;
  sourceAcquisition: MidYieldAcquisition;
  termsStatus: MidYieldTermsStatus;
  publicIndexingMode: MidYieldPublicIndexingMode;
  identityUrl: string;
  termsUrl: string | null;
  rationale: string;
}

export interface MidYieldReviewManifest {
  schemaVersion: "MASS_2C_MID_YIELD_REVIEW_V1";
  reviewedAt: string;
  predecessor: {
    mass2bFinalHead: string;
    mass2bFinalRunId: number;
    mass2bFinalArtifactId: number;
    mass2bFinalArtifactDigest: string;
    mass2bMergeCommit: string;
    certifiedMidYieldDomains: 30;
  };
  doctrine: {
    model: "ATTRIBUTED_MINIMAL_INDEX";
    directSourceAcquisitionAndPublicIndexingAreSeparateAxes: true;
    sourceAttributionDoesNotOverrideSourceTerms: true;
    canonicalLinkOnlyIsCandidateUntilSeparateBaselineOrPermission: true;
    robotsOrSitemapNeverGrantPermission: true;
    noPhotosOrFullDescriptionsByDefault: true;
  };
  safety: {
    allowedChannels: "NONE_ONLY";
    sourceAttributionRequired: true;
    canonicalLinkCandidateRequiresSeparateBaseline: true;
    copyPhotosAllowed: false;
    copyDescriptionAllowed: false;
    directAcquisitionAllowed: false;
    permissionInferred: false;
    publicActivableNow: false;
    registryWriteAllowed: false;
    registrySnapshot: "UNREGISTERED_AT_REVIEW";
  };
  records: MidYieldReviewRecord[];
  summary: {
    domainsReviewed: 30;
    permissionRequired: 16;
    hold: 14;
    policyCompatible: 0;
    canonicalLinkApproved: 0;
    directAcquisitionAllowed: 0;
    canonicalLinkCandidates: 16;
    publicActivableNow: 0;
    registryWriteAllowed: 0;
    permissionInferred: 0;
  };
}

export interface CertifiedMidYieldEntry {
  rank: number;
  sourceDomain: string;
  massPotentialScore: number;
}

const EXPECTED_MASS2B_HEAD = "7af59953c4b3d0da11c5692dc97e455e2dfaa5b1";
const EXPECTED_MASS2B_RUN = 31642731238;
const EXPECTED_MASS2B_ARTIFACT = 9159540462;
const EXPECTED_MASS2B_ARTIFACT_DIGEST =
  "sha256:4e73419bbbfe032d4e66667a1612db20423aacea997e38b24d5ea6dbe40a1798";
const EXPECTED_MASS2B_MERGE = "97bb8c6a9596553d7e8794b5f3b06a71cd845d2f";
const EXPECTED_TOTALS = {
  urlRepresentations: 3026,
  likelyMoroccoRealEstateUrls: 1758,
  likelyMoroccoListingDetailUrls: 967,
} as const;

function parseInstant(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function assertSafetyBoundary(manifest: MidYieldReviewManifest): void {
  const safety = manifest.safety;
  if (safety.allowedChannels !== "NONE_ONLY") throw new Error("ACTIVE_CHANNELS_FORBIDDEN");
  if (!safety.sourceAttributionRequired || !safety.canonicalLinkCandidateRequiresSeparateBaseline) {
    throw new Error("INDEXING_SAFETY_MISSING");
  }
  if (
    safety.copyPhotosAllowed ||
    safety.copyDescriptionAllowed ||
    safety.directAcquisitionAllowed ||
    safety.permissionInferred ||
    safety.publicActivableNow ||
    safety.registryWriteAllowed
  ) {
    throw new Error("SAFETY_BOUNDARY_VIOLATED");
  }
  if (safety.registrySnapshot !== "UNREGISTERED_AT_REVIEW") throw new Error("REGISTRY_SNAPSHOT_DRIFT");
}

export function validateMidYieldReviewManifest(
  manifest: MidYieldReviewManifest,
  certifiedMidYield: CertifiedMidYieldEntry[],
  nowIso: string,
): void {
  if (manifest.schemaVersion !== "MASS_2C_MID_YIELD_REVIEW_V1") throw new Error("INVALID_SCHEMA_VERSION");
  if (manifest.predecessor.mass2bFinalHead !== EXPECTED_MASS2B_HEAD) throw new Error("MASS2B_HEAD_DRIFT");
  if (manifest.predecessor.mass2bFinalRunId !== EXPECTED_MASS2B_RUN) throw new Error("MASS2B_RUN_DRIFT");
  if (manifest.predecessor.mass2bFinalArtifactId !== EXPECTED_MASS2B_ARTIFACT) throw new Error("MASS2B_ARTIFACT_DRIFT");
  if (manifest.predecessor.mass2bFinalArtifactDigest !== EXPECTED_MASS2B_ARTIFACT_DIGEST) {
    throw new Error("MASS2B_ARTIFACT_DIGEST_DRIFT");
  }
  if (manifest.predecessor.mass2bMergeCommit !== EXPECTED_MASS2B_MERGE) throw new Error("MASS2B_MERGE_DRIFT");
  if (manifest.predecessor.certifiedMidYieldDomains !== 30) throw new Error("INVALID_CERTIFIED_MID_YIELD_COUNT");
  assertSafetyBoundary(manifest);

  if (certifiedMidYield.length !== 30) throw new Error(`CERTIFIED_MID_YIELD_COUNT:${certifiedMidYield.length}`);
  if (manifest.records.length !== 30) throw new Error(`REVIEW_RECORD_COUNT:${manifest.records.length}`);

  const reviewedAt = parseInstant(manifest.reviewedAt);
  const now = parseInstant(nowIso);
  if (reviewedAt === null || now === null || reviewedAt > now) throw new Error("INVALID_REVIEW_TIME");

  const seen = new Set<string>();
  for (let index = 0; index < 30; index += 1) {
    const record = manifest.records[index];
    const expected = certifiedMidYield[index];
    const expectedRank = index + 21;

    if (record.rank !== expectedRank || expected.rank !== expectedRank) throw new Error(`RANK_DRIFT:${record.sourceDomain}`);
    if (normalizeDomain(record.sourceDomain) !== normalizeDomain(expected.sourceDomain)) {
      throw new Error(`DOMAIN_DRIFT:${record.sourceDomain}`);
    }
    if (record.massPotentialScore !== expected.massPotentialScore) throw new Error(`SCORE_DRIFT:${record.sourceDomain}`);
    if (seen.has(record.sourceDomain)) throw new Error(`DUPLICATE_DOMAIN:${record.sourceDomain}`);
    seen.add(record.sourceDomain);

    if (!record.identityUrl.trim() || !record.rationale.trim()) throw new Error(`${record.sourceDomain}:MISSING_EVIDENCE`);
    if (
      record.yield.urlRepresentations < 0 ||
      record.yield.likelyMoroccoRealEstateUrls < 0 ||
      record.yield.likelyMoroccoListingDetailUrls < 0
    ) {
      throw new Error(`${record.sourceDomain}:NEGATIVE_YIELD`);
    }

    if (record.decision === "PERMISSION_REQUIRED") {
      if (!record.termsUrl?.trim()) throw new Error(`${record.sourceDomain}:MISSING_TERMS_EVIDENCE`);
      if (record.publicIndexingMode !== "CANONICAL_LINK_ONLY_CANDIDATE") {
        throw new Error(`${record.sourceDomain}:INDEX_MODE_DRIFT`);
      }
      if (record.sourceAcquisition === "DIRECT_SOURCE_UNRESOLVED_TERMS" || record.termsStatus === "TERMS_UNRESOLVED") {
        throw new Error(`${record.sourceDomain}:UNRESOLVED_PERMISSION_DECISION`);
      }
    } else {
      if (
        record.termsUrl !== null ||
        record.publicIndexingMode !== "UNRESOLVED" ||
        record.sourceAcquisition !== "DIRECT_SOURCE_UNRESOLVED_TERMS" ||
        record.termsStatus !== "TERMS_UNRESOLVED"
      ) {
        throw new Error(`${record.sourceDomain}:HOLD_BOUNDARY_VIOLATED`);
      }
    }
  }

  const permissionRequired = manifest.records.filter((record) => record.decision === "PERMISSION_REQUIRED").length;
  const hold = manifest.records.filter((record) => record.decision === "HOLD").length;
  const canonicalCandidates = manifest.records.filter(
    (record) => record.publicIndexingMode === "CANONICAL_LINK_ONLY_CANDIDATE",
  ).length;
  const totals = manifest.records.reduce(
    (sum, record) => ({
      urlRepresentations: sum.urlRepresentations + record.yield.urlRepresentations,
      likelyMoroccoRealEstateUrls: sum.likelyMoroccoRealEstateUrls + record.yield.likelyMoroccoRealEstateUrls,
      likelyMoroccoListingDetailUrls:
        sum.likelyMoroccoListingDetailUrls + record.yield.likelyMoroccoListingDetailUrls,
    }),
    { urlRepresentations: 0, likelyMoroccoRealEstateUrls: 0, likelyMoroccoListingDetailUrls: 0 },
  );

  if (permissionRequired !== 16 || hold !== 14 || canonicalCandidates !== 16) {
    throw new Error(`DECISION_DISTRIBUTION:${permissionRequired}:${hold}:${canonicalCandidates}`);
  }
  if (
    totals.urlRepresentations !== EXPECTED_TOTALS.urlRepresentations ||
    totals.likelyMoroccoRealEstateUrls !== EXPECTED_TOTALS.likelyMoroccoRealEstateUrls ||
    totals.likelyMoroccoListingDetailUrls !== EXPECTED_TOTALS.likelyMoroccoListingDetailUrls
  ) {
    throw new Error(`YIELD_TOTAL_DRIFT:${JSON.stringify(totals)}`);
  }

  const summary = manifest.summary;
  if (
    summary.domainsReviewed !== 30 ||
    summary.permissionRequired !== permissionRequired ||
    summary.hold !== hold ||
    summary.canonicalLinkCandidates !== canonicalCandidates
  ) {
    throw new Error("SUMMARY_DRIFT");
  }
  if (
    summary.policyCompatible !== 0 ||
    summary.canonicalLinkApproved !== 0 ||
    summary.directAcquisitionAllowed !== 0 ||
    summary.publicActivableNow !== 0 ||
    summary.registryWriteAllowed !== 0 ||
    summary.permissionInferred !== 0
  ) {
    throw new Error("SUMMARY_SAFETY_BOUNDARY_VIOLATED");
  }
}
