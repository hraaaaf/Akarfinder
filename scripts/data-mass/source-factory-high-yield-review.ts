import type { ReviewDecision } from "./source-factory";

export type HighYieldDecision = Extract<ReviewDecision, "PERMISSION_REQUIRED" | "HOLD">;
export type HighYieldAcquisition =
  | "DIRECT_SOURCE_BLOCKED_BY_TERMS"
  | "DIRECT_SOURCE_NO_PUBLIC_REUSE_GRANT"
  | "DIRECT_SOURCE_UNRESOLVED_TERMS";
export type HighYieldTermsStatus =
  | "EXPLICIT_REUSE_RESTRICTION"
  | "NO_PUBLIC_REUSE_GRANT_FOUND"
  | "TERMS_UNRESOLVED"
  | "ROBOTS_BLOCKED_AND_TERMS_UNRESOLVED";
export type HighYieldPublicIndexingMode = "CANONICAL_LINK_ONLY_CANDIDATE" | "UNRESOLVED";

export interface HighYieldReviewRecord {
  rank: number;
  sourceDomain: string;
  massPotentialScore: number;
  yield: {
    urlRepresentations: number;
    likelyMoroccoRealEstateUrls: number;
    likelyMoroccoListingDetailUrls: number;
  };
  decision: HighYieldDecision;
  sourceAcquisition: HighYieldAcquisition;
  termsStatus: HighYieldTermsStatus;
  publicIndexingMode: HighYieldPublicIndexingMode;
  identityUrl: string;
  termsUrl: string | null;
  rationale: string;
}

export interface HighYieldReviewManifest {
  schemaVersion: "MASS_2B_HIGH_YIELD_REVIEW_V1";
  reviewedAt: string;
  predecessor: {
    mass2aFinalHead: string;
    mass2aFinalRunId: number;
    mass2aFinalArtifactId: number;
    mass2aFinalArtifactDigest: string;
    mass2aMergeCommit: string;
    certifiedHighYieldDomains: 20;
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
    canonicalLinkCandidateRequiresSeparateBaseline: true;
    sourceAttributionRequired: true;
    copyPhotosAllowed: false;
    copyDescriptionAllowed: false;
    directAcquisitionAllowed: false;
    permissionInferred: false;
    publicActivableNow: false;
    registryWriteAllowed: false;
    registrySnapshot: "UNREGISTERED_AT_REVIEW";
  };
  records: HighYieldReviewRecord[];
  summary: {
    domainsReviewed: number;
    permissionRequired: number;
    hold: number;
    policyCompatible: 0;
    canonicalLinkApproved: 0;
    directAcquisitionAllowed: 0;
    canonicalLinkCandidates: number;
    publicActivableNow: 0;
    registryWriteAllowed: 0;
    permissionInferred: 0;
  };
}

export interface CertifiedHighYieldEntry {
  rank: number;
  sourceDomain: string;
  massPotentialScore: number;
}

const EXPECTED_MASS2A_HEAD = "8d3bf2ecedd3c2ed05e8027e8b37b5799eb9ab48";
const EXPECTED_MASS2A_ARTIFACT_DIGEST =
  "sha256:2dbe6ce641471ae62e3e3e7caaa59274e3bb407305441154c5a5dd66b9d24a7d";
const EXPECTED_MASS2A_MERGE = "6cd7625b2ba8e7179ce556841f6306225ba1a3fa";

function parseInstant(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function assertSafetyBoundary(manifest: HighYieldReviewManifest): void {
  const safety = manifest.safety;
  if (safety.allowedChannels !== "NONE_ONLY") throw new Error("ACTIVE_CHANNELS_FORBIDDEN");
  if (safety.canonicalLinkCandidateRequiresSeparateBaseline !== true) throw new Error("CANONICAL_LINK_BASELINE_REQUIRED");
  if (safety.sourceAttributionRequired !== true) throw new Error("SOURCE_ATTRIBUTION_REQUIRED");
  if (safety.copyPhotosAllowed !== false) throw new Error("COPY_PHOTOS_MUST_BE_FALSE");
  if (safety.copyDescriptionAllowed !== false) throw new Error("COPY_DESCRIPTION_MUST_BE_FALSE");
  if (safety.directAcquisitionAllowed !== false) throw new Error("DIRECT_ACQUISITION_MUST_BE_FALSE");
  if (safety.permissionInferred !== false) throw new Error("PERMISSION_MUST_NOT_BE_INFERRED");
  if (safety.publicActivableNow !== false) throw new Error("PUBLIC_ACTIVATION_MUST_BE_FALSE");
  if (safety.registryWriteAllowed !== false) throw new Error("REGISTRY_WRITE_MUST_BE_FALSE");
  if (safety.registrySnapshot !== "UNREGISTERED_AT_REVIEW") throw new Error("INVALID_REGISTRY_REVIEW_SNAPSHOT");
}

export function validateHighYieldReviewManifest(
  manifest: HighYieldReviewManifest,
  certifiedHighYield: CertifiedHighYieldEntry[],
  nowIso: string,
): void {
  if (manifest.schemaVersion !== "MASS_2B_HIGH_YIELD_REVIEW_V1") throw new Error("INVALID_SCHEMA_VERSION");
  if (manifest.predecessor.mass2aFinalHead !== EXPECTED_MASS2A_HEAD) throw new Error("MASS2A_HEAD_DRIFT");
  if (manifest.predecessor.mass2aFinalArtifactDigest !== EXPECTED_MASS2A_ARTIFACT_DIGEST) {
    throw new Error("MASS2A_ARTIFACT_DIGEST_DRIFT");
  }
  if (manifest.predecessor.mass2aMergeCommit !== EXPECTED_MASS2A_MERGE) throw new Error("MASS2A_MERGE_DRIFT");
  if (manifest.predecessor.certifiedHighYieldDomains !== 20) throw new Error("INVALID_CERTIFIED_HIGH_YIELD_COUNT");
  assertSafetyBoundary(manifest);

  if (certifiedHighYield.length !== 20) throw new Error(`CERTIFIED_HIGH_YIELD_COUNT:${certifiedHighYield.length}`);
  if (manifest.records.length !== 20) throw new Error(`REVIEW_RECORD_COUNT:${manifest.records.length}`);

  const reviewedAt = parseInstant(manifest.reviewedAt);
  const now = parseInstant(nowIso);
  if (reviewedAt === null || now === null || reviewedAt > now) throw new Error("INVALID_REVIEW_TIME");

  const seen = new Set<string>();
  for (let index = 0; index < manifest.records.length; index += 1) {
    const record = manifest.records[index];
    const expected = certifiedHighYield[index];

    if (record.rank !== index + 1 || expected.rank !== index + 1) throw new Error(`RANK_DRIFT:${record.sourceDomain}`);
    if (normalizeDomain(record.sourceDomain) !== normalizeDomain(expected.sourceDomain)) {
      throw new Error(`DOMAIN_DRIFT:${record.rank}:${record.sourceDomain}:${expected.sourceDomain}`);
    }
    if (record.massPotentialScore !== expected.massPotentialScore) throw new Error(`SCORE_DRIFT:${record.sourceDomain}`);
    if (seen.has(record.sourceDomain)) throw new Error(`DUPLICATE_DOMAIN:${record.sourceDomain}`);
    seen.add(record.sourceDomain);

    if (!record.identityUrl.trim() || !record.rationale.trim()) throw new Error(`${record.sourceDomain}:MISSING_REVIEW_EVIDENCE`);
    if (record.yield.urlRepresentations < 0 || record.yield.likelyMoroccoRealEstateUrls < 0 ||
        record.yield.likelyMoroccoListingDetailUrls < 0) {
      throw new Error(`${record.sourceDomain}:NEGATIVE_YIELD`);
    }

    if (record.decision === "PERMISSION_REQUIRED") {
      if (!record.termsUrl?.trim()) throw new Error(`${record.sourceDomain}:MISSING_TERMS_EVIDENCE`);
      if (record.publicIndexingMode !== "CANONICAL_LINK_ONLY_CANDIDATE") {
        throw new Error(`${record.sourceDomain}:INVALID_PERMISSION_REQUIRED_INDEX_MODE`);
      }
      if (record.sourceAcquisition === "DIRECT_SOURCE_UNRESOLVED_TERMS") {
        throw new Error(`${record.sourceDomain}:PERMISSION_REQUIRED_WITH_UNRESOLVED_TERMS`);
      }
      if (record.termsStatus === "TERMS_UNRESOLVED" || record.termsStatus === "ROBOTS_BLOCKED_AND_TERMS_UNRESOLVED") {
        throw new Error(`${record.sourceDomain}:INVALID_PERMISSION_REQUIRED_TERMS_STATUS`);
      }
    } else {
      if (record.termsUrl !== null) throw new Error(`${record.sourceDomain}:HOLD_MUST_NOT_CLAIM_TERMS_EVIDENCE`);
      if (record.publicIndexingMode !== "UNRESOLVED") throw new Error(`${record.sourceDomain}:HOLD_MUST_BE_UNRESOLVED`);
      if (record.sourceAcquisition !== "DIRECT_SOURCE_UNRESOLVED_TERMS") {
        throw new Error(`${record.sourceDomain}:HOLD_WITH_RESOLVED_ACQUISITION`);
      }
      if (record.termsStatus !== "TERMS_UNRESOLVED" &&
          record.termsStatus !== "ROBOTS_BLOCKED_AND_TERMS_UNRESOLVED") {
        throw new Error(`${record.sourceDomain}:HOLD_WITH_RESOLVED_TERMS`);
      }
    }
  }

  const permissionRequired = manifest.records.filter((record) => record.decision === "PERMISSION_REQUIRED").length;
  const hold = manifest.records.filter((record) => record.decision === "HOLD").length;
  const canonicalCandidates = manifest.records.filter(
    (record) => record.publicIndexingMode === "CANONICAL_LINK_ONLY_CANDIDATE",
  ).length;

  if (permissionRequired !== 17 || hold !== 3) throw new Error(`DECISION_DISTRIBUTION:${permissionRequired}:${hold}`);
  if (manifest.summary.domainsReviewed !== 20 ||
      manifest.summary.permissionRequired !== permissionRequired ||
      manifest.summary.hold !== hold ||
      manifest.summary.canonicalLinkCandidates !== canonicalCandidates) {
    throw new Error("SUMMARY_DRIFT");
  }
  if (manifest.summary.policyCompatible !== 0 || manifest.summary.canonicalLinkApproved !== 0 ||
      manifest.summary.directAcquisitionAllowed !== 0 || manifest.summary.publicActivableNow !== 0 ||
      manifest.summary.registryWriteAllowed !== 0 || manifest.summary.permissionInferred !== 0) {
    throw new Error("SUMMARY_SAFETY_BOUNDARY_VIOLATED");
  }
}
