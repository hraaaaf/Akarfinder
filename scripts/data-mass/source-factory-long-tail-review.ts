import type { ReviewDecision } from "./source-factory";

export type LongTailDecision = Extract<ReviewDecision, "PERMISSION_REQUIRED" | "HOLD">;
export type LongTailAcquisition =
  | "DIRECT_SOURCE_BLOCKED_BY_TERMS"
  | "DIRECT_SOURCE_UNRESOLVED_TERMS";
export type LongTailTermsStatus = "EXPLICIT_REUSE_RESTRICTION" | "TERMS_UNRESOLVED";
export type LongTailPublicIndexingMode = "CANONICAL_LINK_ONLY_CANDIDATE" | "UNRESOLVED";

export interface LongTailReviewRecord {
  rank: number;
  sourceDomain: string;
  massPotentialScore: number;
  decision: LongTailDecision;
  sourceAcquisition: LongTailAcquisition;
  termsStatus: LongTailTermsStatus;
  publicIndexingMode: LongTailPublicIndexingMode;
  identityUrl: string;
  termsUrl: string | null;
  rationale: string;
}

export interface LongTailReviewManifest {
  schemaVersion: "MASS_2D_LONG_TAIL_REVIEW_V1";
  reviewedAt: string;
  predecessor: {
    mass2cFinalHead: string;
    mass2cFinalRunId: number;
    mass2cFinalArtifactId: number;
    mass2cFinalArtifactDigest: string;
    mass2cMergeCommit: string;
    certifiedLongTailDomains: 51;
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
  records: LongTailReviewRecord[];
  summary: {
    domainsReviewed: 51;
    permissionRequired: 9;
    hold: 42;
    policyCompatible: 0;
    canonicalLinkApproved: 0;
    directAcquisitionAllowed: 0;
    canonicalLinkCandidates: 9;
    publicActivableNow: 0;
    registryWriteAllowed: 0;
    permissionInferred: 0;
    totalUrlRepresentations: 2028;
    totalLikelyMoroccoRealEstateUrls: 1889;
    totalLikelyMoroccoListingDetailUrls: 96;
  };
}

export interface CertifiedLongTailEntry {
  rank: number;
  sourceDomain: string;
  massPotentialScore: number;
}

const EXPECTED = {
  head: "26b4a294c4cc72786e23742dfd10f3ddb1d2f5f7",
  run: 31648964783,
  artifact: 9161926876,
  digest: "sha256:3fd5945febde8733fd3be1b1acc15d66b6c6c0a22a309d2f70532ba5cfb23a59",
  merge: "bc88c15fbc78d2c7ad4bf03faac6eab48d408e4f",
} as const;

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

export function validateLongTailReviewManifest(
  manifest: LongTailReviewManifest,
  certifiedLongTail: CertifiedLongTailEntry[],
  nowIso: string,
): void {
  if (manifest.schemaVersion !== "MASS_2D_LONG_TAIL_REVIEW_V1") throw new Error("INVALID_SCHEMA_VERSION");
  if (manifest.predecessor.mass2cFinalHead !== EXPECTED.head) throw new Error("MASS2C_HEAD_DRIFT");
  if (manifest.predecessor.mass2cFinalRunId !== EXPECTED.run) throw new Error("MASS2C_RUN_DRIFT");
  if (manifest.predecessor.mass2cFinalArtifactId !== EXPECTED.artifact) throw new Error("MASS2C_ARTIFACT_DRIFT");
  if (manifest.predecessor.mass2cFinalArtifactDigest !== EXPECTED.digest) throw new Error("MASS2C_DIGEST_DRIFT");
  if (manifest.predecessor.mass2cMergeCommit !== EXPECTED.merge) throw new Error("MASS2C_MERGE_DRIFT");
  if (manifest.predecessor.certifiedLongTailDomains !== 51) throw new Error("INVALID_CERTIFIED_LONG_TAIL_COUNT");

  const reviewedAt = Date.parse(manifest.reviewedAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(reviewedAt) || !Number.isFinite(now) || reviewedAt > now) throw new Error("INVALID_REVIEW_TIME");

  const s = manifest.safety;
  if (
    s.allowedChannels !== "NONE_ONLY" ||
    !s.sourceAttributionRequired ||
    !s.canonicalLinkCandidateRequiresSeparateBaseline ||
    s.copyPhotosAllowed ||
    s.copyDescriptionAllowed ||
    s.directAcquisitionAllowed ||
    s.permissionInferred ||
    s.publicActivableNow ||
    s.registryWriteAllowed ||
    s.registrySnapshot !== "UNREGISTERED_AT_REVIEW"
  ) throw new Error("SAFETY_BOUNDARY_VIOLATED");

  if (certifiedLongTail.length !== 51 || manifest.records.length !== 51) throw new Error("LONG_TAIL_COUNT_DRIFT");
  const seen = new Set<string>();
  for (let i = 0; i < 51; i += 1) {
    const record = manifest.records[i];
    const expected = certifiedLongTail[i];
    const expectedRank = i + 51;
    if (record.rank !== expectedRank || expected.rank !== expectedRank) throw new Error(`RANK_DRIFT:${record.sourceDomain}`);
    if (normalizeDomain(record.sourceDomain) !== normalizeDomain(expected.sourceDomain)) throw new Error(`DOMAIN_DRIFT:${record.sourceDomain}`);
    if (record.massPotentialScore !== expected.massPotentialScore) throw new Error(`SCORE_DRIFT:${record.sourceDomain}`);
    if (seen.has(record.sourceDomain)) throw new Error(`DUPLICATE_DOMAIN:${record.sourceDomain}`);
    seen.add(record.sourceDomain);
    if (!record.identityUrl.trim() || !record.rationale.trim()) throw new Error(`${record.sourceDomain}:MISSING_EVIDENCE`);
    if (record.decision === "PERMISSION_REQUIRED") {
      if (!record.termsUrl?.trim()) throw new Error(`${record.sourceDomain}:MISSING_TERMS`);
      if (record.publicIndexingMode !== "CANONICAL_LINK_ONLY_CANDIDATE") throw new Error(`${record.sourceDomain}:INDEX_MODE_DRIFT`);
      if (record.sourceAcquisition !== "DIRECT_SOURCE_BLOCKED_BY_TERMS" || record.termsStatus !== "EXPLICIT_REUSE_RESTRICTION") {
        throw new Error(`${record.sourceDomain}:PERMISSION_BOUNDARY_DRIFT`);
      }
    } else if (
      record.termsUrl !== null ||
      record.publicIndexingMode !== "UNRESOLVED" ||
      record.sourceAcquisition !== "DIRECT_SOURCE_UNRESOLVED_TERMS" ||
      record.termsStatus !== "TERMS_UNRESOLVED"
    ) throw new Error(`${record.sourceDomain}:HOLD_BOUNDARY_VIOLATED`);
  }

  const pr = manifest.records.filter((r) => r.decision === "PERMISSION_REQUIRED").length;
  const hold = manifest.records.filter((r) => r.decision === "HOLD").length;
  const candidates = manifest.records.filter((r) => r.publicIndexingMode === "CANONICAL_LINK_ONLY_CANDIDATE").length;
  if (pr !== 9 || hold !== 42 || candidates !== 9) throw new Error(`DECISION_DISTRIBUTION:${pr}:${hold}:${candidates}`);
  const summary = manifest.summary;
  if (
    summary.domainsReviewed !== 51 || summary.permissionRequired !== 9 || summary.hold !== 42 ||
    summary.canonicalLinkCandidates !== 9 || summary.totalUrlRepresentations !== 2028 ||
    summary.totalLikelyMoroccoRealEstateUrls !== 1889 || summary.totalLikelyMoroccoListingDetailUrls !== 96 ||
    summary.policyCompatible !== 0 || summary.canonicalLinkApproved !== 0 || summary.directAcquisitionAllowed !== 0 ||
    summary.publicActivableNow !== 0 || summary.registryWriteAllowed !== 0 || summary.permissionInferred !== 0
  ) throw new Error("SUMMARY_DRIFT");
}
