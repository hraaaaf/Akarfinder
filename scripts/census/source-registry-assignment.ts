import { createHash } from "node:crypto";

export type AssignmentEvidenceStatus =
  | "RESTRICTIVE_TERMS_FOUND"
  | "TERMS_FOUND_NO_EXPLICIT_PERMISSION"
  | "INSUFFICIENT_LEGAL_EVIDENCE"
  | "ACCESS_OR_FETCH_LIMITED";

export type RegistryDecisionClass =
  | "BLOCK_RESTRICTED"
  | "INTERNAL_DISCOVERY_PERMISSION_REQUIRED"
  | "INTERNAL_DISCOVERY_UNVERIFIED"
  | "INTERNAL_DISCOVERY_ACCESS_LIMITED";

export type SourceRegistryDecision = {
  domain: string;
  evidenceStatus: AssignmentEvidenceStatus;
  reviewTrack: string;
  decisionClass: RegistryDecisionClass;
  evidenceUrls: string[];
  robotsStatus: "allow_with_restrictions" | "sitemap_declared" | "unverified";
  structureScore: number;
  policyConfidenceScore: number;
  policyHash: string;
};

export type SourceRegistryAssignmentManifest = {
  schemaVersion: "data-1-6b-source-registry-assignment-v1";
  sourceEvidenceRunId: number;
  evidenceObservedAt: string;
  policyVersion: string;
  decisionMode: "conservative_no_activation";
  assignments: SourceRegistryDecision[];
};

export type ResolvedRegistryPolicy = {
  termsStatus: "reuse_restricted" | "permission_required" | "unverified";
  discoveryPolicy: "public_index_only" | "paused";
  detailFetchPolicy: "permission_required" | "legal_review_required" | "prohibited" | "paused";
  contentReusePolicy: "permission_required" | "prohibited" | "unknown";
  displayPolicy: "internal_signal_only" | "blocked";
  authorizationStatus: "permission_required" | "prohibited" | "unverified";
  acquisitionMode: "public_index_internal_only" | "blocked";
  allowedDiscoveryChannels: string[];
  machineGate: "internal_signal_only" | "blocked_invalid_no_bypass";
  ingestionGate: "internal_signal_only" | "blocked";
  displayGate: "hidden";
};

type PolicyEvidenceReview = {
  domain: string;
  evidenceStatus: AssignmentEvidenceStatus;
  reviewTrack: string;
  evidenceConfidenceScore: number;
  evidenceUrls: string[];
  robots: { status: string };
  technicalCapability: { score: number };
};

export type SourcePolicyEvidencePayload = { reviews: PolicyEvidenceReview[] };

type TechnicalAudit = {
  seed: { domain: string };
  technicalGate: string;
  robots: { status: string; sitemapUrls: string[] };
};

export type TechnicalCapabilityPayload = { audits: TechnicalAudit[] };

const ACTIVATING_VALUES = new Set([
  "authorized_partner",
  "authorized_detail_feed",
  "partner_feed",
  "partner_content",
  "allowed_bounded",
]);

function fail(message: string): never {
  throw new Error(`DATA-1.6B: ${message}`);
}

function normalizeDomain(value: string): string {
  const domain = value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (!domain || !domain.includes(".") || domain.includes("/") || domain.includes(" ")) fail(`invalid domain ${value}`);
  return domain;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function canonicalDecisionHash(decision: SourceRegistryDecision): string {
  const { policyHash: _ignored, ...withoutHash } = decision;
  return createHash("sha256").update(JSON.stringify(canonicalize(withoutHash))).digest("hex");
}

export function resolveRegistryPolicy(decision: SourceRegistryDecision): ResolvedRegistryPolicy {
  switch (decision.decisionClass) {
    case "BLOCK_RESTRICTED":
      return {
        termsStatus: "reuse_restricted",
        discoveryPolicy: "paused",
        detailFetchPolicy: "prohibited",
        contentReusePolicy: "prohibited",
        displayPolicy: "blocked",
        authorizationStatus: "prohibited",
        acquisitionMode: "blocked",
        allowedDiscoveryChannels: [],
        machineGate: "blocked_invalid_no_bypass",
        ingestionGate: "blocked",
        displayGate: "hidden",
      };
    case "INTERNAL_DISCOVERY_PERMISSION_REQUIRED":
      return {
        termsStatus: "permission_required",
        discoveryPolicy: "public_index_only",
        detailFetchPolicy: "permission_required",
        contentReusePolicy: "permission_required",
        displayPolicy: "internal_signal_only",
        authorizationStatus: "permission_required",
        acquisitionMode: "public_index_internal_only",
        allowedDiscoveryChannels: ["public_index", "commoncrawl"],
        machineGate: "internal_signal_only",
        ingestionGate: "internal_signal_only",
        displayGate: "hidden",
      };
    case "INTERNAL_DISCOVERY_ACCESS_LIMITED":
      return {
        termsStatus: "unverified",
        discoveryPolicy: "public_index_only",
        detailFetchPolicy: "paused",
        contentReusePolicy: "unknown",
        displayPolicy: "internal_signal_only",
        authorizationStatus: "unverified",
        acquisitionMode: "public_index_internal_only",
        allowedDiscoveryChannels: ["public_index", "commoncrawl"],
        machineGate: "internal_signal_only",
        ingestionGate: "internal_signal_only",
        displayGate: "hidden",
      };
    default:
      return {
        termsStatus: "unverified",
        discoveryPolicy: "public_index_only",
        detailFetchPolicy: "legal_review_required",
        contentReusePolicy: "unknown",
        displayPolicy: "internal_signal_only",
        authorizationStatus: "unverified",
        acquisitionMode: "public_index_internal_only",
        allowedDiscoveryChannels: ["public_index", "commoncrawl"],
        machineGate: "internal_signal_only",
        ingestionGate: "internal_signal_only",
        displayGate: "hidden",
      };
  }
}

function validateScore(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 20) fail(`${field} must be an integer in [0,20]`);
}

function validateDecisionClass(decision: SourceRegistryDecision): void {
  if (decision.evidenceStatus === "RESTRICTIVE_TERMS_FOUND" && decision.decisionClass !== "BLOCK_RESTRICTED") {
    fail(`${decision.domain} restrictive evidence requires BLOCK_RESTRICTED`);
  }
  if (
    decision.evidenceStatus === "TERMS_FOUND_NO_EXPLICIT_PERMISSION" &&
    decision.decisionClass !== "INTERNAL_DISCOVERY_PERMISSION_REQUIRED"
  ) fail(`${decision.domain} terms-without-permission requires INTERNAL_DISCOVERY_PERMISSION_REQUIRED`);
  if (
    decision.evidenceStatus === "INSUFFICIENT_LEGAL_EVIDENCE" &&
    decision.decisionClass !== "INTERNAL_DISCOVERY_UNVERIFIED"
  ) fail(`${decision.domain} insufficient evidence requires INTERNAL_DISCOVERY_UNVERIFIED`);
  if (
    decision.evidenceStatus === "ACCESS_OR_FETCH_LIMITED" &&
    decision.decisionClass !== "INTERNAL_DISCOVERY_ACCESS_LIMITED"
  ) fail(`${decision.domain} access-limited evidence requires INTERNAL_DISCOVERY_ACCESS_LIMITED`);
}

function validateNoActivation(decision: SourceRegistryDecision): void {
  const policy = resolveRegistryPolicy(decision);
  const values = [
    policy.detailFetchPolicy,
    policy.displayPolicy,
    policy.authorizationStatus,
    policy.acquisitionMode,
    policy.machineGate,
    policy.ingestionGate,
    policy.displayGate,
  ];
  if (values.some((value) => ACTIVATING_VALUES.has(value))) fail(`${decision.domain} resolves to an activating Registry value`);
  if (policy.displayGate !== "hidden") fail(`${decision.domain} must remain hidden`);
}

export function validateAssignmentManifest(manifest: SourceRegistryAssignmentManifest): void {
  if (manifest.schemaVersion !== "data-1-6b-source-registry-assignment-v1") fail("unexpected schema version");
  if (manifest.sourceEvidenceRunId !== 31182352538) fail("must be pinned to certified DATA-1.6A run 31182352538");
  if (manifest.decisionMode !== "conservative_no_activation") fail("decisionMode must remain conservative_no_activation");
  if (manifest.policyVersion !== "source_registry_v2:data_1_6b_20260807") fail("unexpected policy version");
  if (!Number.isFinite(Date.parse(manifest.evidenceObservedAt))) fail("invalid evidenceObservedAt");
  if (manifest.assignments.length !== 19) fail(`expected 19 assignments, got ${manifest.assignments.length}`);

  const seen = new Set<string>();
  const counts = new Map<AssignmentEvidenceStatus, number>();
  for (const decision of manifest.assignments) {
    const domain = normalizeDomain(decision.domain);
    if (domain !== decision.domain) fail(`${decision.domain} is not canonical`);
    if (seen.has(domain)) fail(`duplicate assignment ${domain}`);
    seen.add(domain);
    if (decision.evidenceUrls.length < 1 || decision.evidenceUrls.some((url) => !url.startsWith("https://"))) {
      fail(`${domain} must carry at least one HTTPS evidence URL`);
    }
    validateScore(decision.structureScore, `${domain}.structureScore`);
    validateScore(decision.policyConfidenceScore, `${domain}.policyConfidenceScore`);
    if (!/^[a-f0-9]{64}$/.test(decision.policyHash)) fail(`${domain} has invalid policyHash`);
    if (canonicalDecisionHash(decision) !== decision.policyHash) fail(`${domain} policyHash does not match the explicit decision`);
    validateDecisionClass(decision);
    validateNoActivation(decision);
    counts.set(decision.evidenceStatus, (counts.get(decision.evidenceStatus) ?? 0) + 1);
  }

  const expected: Record<AssignmentEvidenceStatus, number> = {
    RESTRICTIVE_TERMS_FOUND: 1,
    TERMS_FOUND_NO_EXPLICIT_PERMISSION: 3,
    INSUFFICIENT_LEGAL_EVIDENCE: 11,
    ACCESS_OR_FETCH_LIMITED: 4,
  };
  for (const [status, count] of Object.entries(expected) as Array<[AssignmentEvidenceStatus, number]>) {
    if ((counts.get(status) ?? 0) !== count) fail(`expected ${count} ${status} assignments`);
  }
}

export function validateEvidenceAlignment(
  manifest: SourceRegistryAssignmentManifest,
  policyEvidence: SourcePolicyEvidencePayload,
  technicalEvidence: TechnicalCapabilityPayload,
): void {
  validateAssignmentManifest(manifest);
  if (policyEvidence.reviews.length !== 19) fail(`expected 19 DATA-1.6A reviews, got ${policyEvidence.reviews.length}`);
  const policyByDomain = new Map(policyEvidence.reviews.map((review) => [normalizeDomain(review.domain), review]));
  const technicalByDomain = new Map(technicalEvidence.audits.map((audit) => [normalizeDomain(audit.seed.domain), audit]));

  for (const decision of manifest.assignments) {
    const review = policyByDomain.get(decision.domain);
    const technical = technicalByDomain.get(decision.domain);
    if (!review) fail(`${decision.domain} missing from DATA-1.6A evidence`);
    if (!technical || technical.technicalGate !== "CAPABILITY_REVIEW_READY") fail(`${decision.domain} missing from review-ready DATA-1.5 evidence`);
    if (review.evidenceStatus !== decision.evidenceStatus) fail(`${decision.domain} evidence status drift`);
    if (review.reviewTrack !== decision.reviewTrack) fail(`${decision.domain} review track drift`);
    const certifiedUrls = new Set(review.evidenceUrls);
    if (decision.evidenceUrls.some((url) => !certifiedUrls.has(url))) fail(`${decision.domain} contains an unproven evidence URL`);

    const expectedStructure = Math.max(0, Math.min(20, Math.round(review.technicalCapability.score / 5)));
    const expectedConfidence = Math.max(0, Math.min(20, Math.round(review.evidenceConfidenceScore / 5)));
    if (decision.structureScore !== expectedStructure) fail(`${decision.domain} structure score drift`);
    if (decision.policyConfidenceScore !== expectedConfidence) fail(`${decision.domain} policy confidence drift`);

    if (review.robots.status !== "PRESENT") {
      if (decision.robotsStatus !== "unverified") fail(`${decision.domain} cannot claim current robots evidence`);
    } else if (decision.robotsStatus === "sitemap_declared") {
      if (technical.robots.status !== "PRESENT" || technical.robots.sitemapUrls.length < 1) {
        fail(`${decision.domain} sitemap_declared is not supported by DATA-1.5 evidence`);
      }
    } else if (decision.robotsStatus !== "allow_with_restrictions") {
      fail(`${decision.domain} PRESENT robots must resolve to a bounded observed status`);
    }
  }
}

export function validateMigrationCoverage(migrationSql: string, manifest: SourceRegistryAssignmentManifest): void {
  validateAssignmentManifest(manifest);
  if (!migrationSql.includes("DATA-1.6B refuses to overwrite existing Source Registry rows")) fail("migration lacks concurrent-policy overwrite guard");
  if (/\bon\s+conflict\b/i.test(migrationSql)) fail("migration must never upsert over a concurrent Registry policy");
  if (!migrationSql.includes("DATA-1.6B safety invariant violated")) fail("migration lacks post-insert safety assertion");
  if (!migrationSql.includes("source_registry_v2:data_1_6b_20260807")) fail("migration policy version mismatch");
  for (const decision of manifest.assignments) {
    if (!migrationSql.includes(`'${decision.domain}'`)) fail(`${decision.domain} missing from migration`);
    if (!migrationSql.includes(`'${decision.policyHash}'`)) fail(`${decision.domain} policy hash missing from migration`);
  }
}
