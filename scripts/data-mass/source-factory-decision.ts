import type { ReviewDecision, SourceFactoryDossier, SourceFactoryYieldSnapshot } from "./source-factory";

export type SourceFactoryChannel =
  | "NONE"
  | "CANONICAL_LINK"
  | "INTERNAL_SIGNAL"
  | "PUBLIC_SITEMAP"
  | "COMMON_CRAWL"
  | "DIRECT_FETCH"
  | "PARTNER_FEED"
  | "OWNER_SUBMISSION";

export type SourceFactoryEvidenceKind =
  | "SOURCE_IDENTITY"
  | "MOROCCO_MARKET_RELEVANCE"
  | "ROBOTS"
  | "TERMS"
  | "RIGHTS_OR_PERMISSION"
  | "SITEMAP_OR_STRUCTURE"
  | "FRESHNESS"
  | "REGISTRY_SNAPSHOT";

export type SourceFactoryEvidenceAssertion = "SUPPORTS" | "CONTRADICTS" | "OBSERVATION_ONLY";

export interface SourceFactoryEvidenceRecord {
  kind: SourceFactoryEvidenceKind;
  reference: string;
  observedAt: string;
  expiresAt?: string | null;
  assertion: SourceFactoryEvidenceAssertion;
  decision?: ReviewDecision | null;
  channels?: SourceFactoryChannel[];
  note?: string | null;
}

export interface SourceFactoryDecisionInput {
  sourceDomain: string;
  decision: ReviewDecision;
  allowedChannels: SourceFactoryChannel[];
  rationale: string;
  evidence: SourceFactoryEvidenceRecord[];
}

export interface SourceFactoryDecisionEvaluation {
  schemaVersion: "MASS_2A_DECISION_V1";
  sourceDomain: string;
  reviewedAt: string | null;
  requestedDecision: ReviewDecision;
  decision: ReviewDecision;
  decisionAccepted: boolean;
  allowedChannels: SourceFactoryChannel[];
  potentialVolume: SourceFactoryYieldSnapshot;
  rationale: string | null;
  evidence: SourceFactoryEvidenceRecord[];
  gateReasons: string[];
  registryPreviewEligible: boolean;
  permissionInferred: false;
  publicActivableNow: false;
  registryWriteAllowed: false;
}

const CHANNEL_ORDER: SourceFactoryChannel[] = [
  "NONE",
  "CANONICAL_LINK",
  "INTERNAL_SIGNAL",
  "PUBLIC_SITEMAP",
  "COMMON_CRAWL",
  "DIRECT_FETCH",
  "PARTNER_FEED",
  "OWNER_SUBMISSION",
];

const POLICY_EVIDENCE_KINDS = new Set<SourceFactoryEvidenceKind>([
  "TERMS",
  "RIGHTS_OR_PERMISSION",
  "REGISTRY_SNAPSHOT",
]);

const POLICY_COMPATIBLE_CHANNELS = new Set<SourceFactoryChannel>([
  "PUBLIC_SITEMAP",
  "COMMON_CRAWL",
  "DIRECT_FETCH",
  "PARTNER_FEED",
  "OWNER_SUBMISSION",
]);

const ROBOTS_RELEVANT_CHANNELS = new Set<SourceFactoryChannel>([
  "PUBLIC_SITEMAP",
  "COMMON_CRAWL",
  "DIRECT_FETCH",
]);

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function parseInstant(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeChannels(channels: SourceFactoryChannel[]): SourceFactoryChannel[] {
  const set = new Set(channels);
  return CHANNEL_ORDER.filter((channel) => set.has(channel));
}

function channelShapeReasons(decision: ReviewDecision, channels: SourceFactoryChannel[]): string[] {
  if (decision === "POLICY_COMPATIBLE") {
    if (channels.length === 0 || channels.some((channel) => !POLICY_COMPATIBLE_CHANNELS.has(channel))) {
      return ["INVALID_CHANNELS_FOR_POLICY_COMPATIBLE"];
    }
    return [];
  }
  if (decision === "CANONICAL_LINK_ONLY") {
    return channels.length === 1 && channels[0] === "CANONICAL_LINK"
      ? []
      : ["INVALID_CHANNELS_FOR_CANONICAL_LINK_ONLY"];
  }
  if (decision === "INTERNAL_ONLY") {
    return channels.length === 1 && channels[0] === "INTERNAL_SIGNAL"
      ? []
      : ["INVALID_CHANNELS_FOR_INTERNAL_ONLY"];
  }
  return channels.length === 1 && channels[0] === "NONE"
    ? []
    : ["NON_ACTIONABLE_DECISION_MUST_USE_NONE_CHANNEL"];
}

function currentEvidence(
  evidence: SourceFactoryEvidenceRecord[],
  reviewedAt: number,
): { evidence: SourceFactoryEvidenceRecord[]; reasons: string[] } {
  const current: SourceFactoryEvidenceRecord[] = [];
  const reasons = new Set<string>();

  for (const item of evidence) {
    if (!item.reference.trim()) {
      reasons.add(`INVALID_EVIDENCE_REFERENCE:${item.kind}`);
      continue;
    }
    const observedAt = parseInstant(item.observedAt);
    if (observedAt === null || observedAt > reviewedAt) {
      reasons.add(`INVALID_EVIDENCE_DATE:${item.kind}`);
      continue;
    }
    if (item.expiresAt) {
      const expiresAt = parseInstant(item.expiresAt);
      if (expiresAt === null) {
        reasons.add(`INVALID_EVIDENCE_EXPIRY:${item.kind}`);
        continue;
      }
      if (expiresAt <= reviewedAt) {
        reasons.add(`EXPIRED_EVIDENCE:${item.kind}`);
        continue;
      }
    }
    current.push(item);
  }

  if (current.some((item) => item.assertion === "CONTRADICTS")) {
    reasons.add("CONTRADICTORY_EVIDENCE");
  }

  return { evidence: current, reasons: [...reasons].sort() };
}

function hasKind(evidence: SourceFactoryEvidenceRecord[], kind: SourceFactoryEvidenceKind): boolean {
  return evidence.some((item) => item.kind === kind);
}

function supportsDecision(item: SourceFactoryEvidenceRecord, decision: ReviewDecision): boolean {
  return item.assertion === "SUPPORTS" && item.decision === decision;
}

/**
 * Validates a B/C/D auditor proposal. This function never interprets legal text:
 * the auditor must attach dated evidence and explicitly state what that evidence
 * supports. Missing, expired, contradictory or channel-incompatible proof falls
 * back to HOLD. robots.txt is operational evidence only and can never authorize
 * a channel by itself.
 */
export function evaluateSourceFactoryDecision(
  dossier: SourceFactoryDossier,
  input: SourceFactoryDecisionInput,
  reviewedAtIso: string,
): SourceFactoryDecisionEvaluation {
  const reasons = new Set<string>();
  const reviewedAt = parseInstant(reviewedAtIso);
  const channels = normalizeChannels(input.allowedChannels);

  if (reviewedAt === null) reasons.add("INVALID_REVIEW_DATE");
  if (normalizeDomain(input.sourceDomain) !== normalizeDomain(dossier.sourceDomain)) reasons.add("DOMAIN_MISMATCH");
  if (channels.length !== new Set(input.allowedChannels).size) reasons.add("DUPLICATE_CHANNELS");
  if (!input.rationale.trim() && input.decision !== "HOLD") reasons.add("MISSING_RATIONALE");
  for (const reason of channelShapeReasons(input.decision, channels)) reasons.add(reason);

  const checked = currentEvidence(input.evidence, reviewedAt ?? Number.NaN);
  for (const reason of checked.reasons) reasons.add(reason);

  if (input.decision !== "HOLD") {
    if (!hasKind(checked.evidence, "SOURCE_IDENTITY")) reasons.add("MISSING_SOURCE_IDENTITY_EVIDENCE");
    if (!hasKind(checked.evidence, "MOROCCO_MARKET_RELEVANCE")) reasons.add("MISSING_MOROCCO_MARKET_EVIDENCE");

    const policyProof = checked.evidence.filter((item) =>
      POLICY_EVIDENCE_KINDS.has(item.kind) && supportsDecision(item, input.decision));
    if (policyProof.length === 0) reasons.add("MISSING_POLICY_OR_RIGHTS_EVIDENCE");

    for (const channel of channels) {
      if (channel === "NONE") continue;
      const backed = policyProof.some((item) => (item.channels ?? []).includes(channel));
      if (!backed) reasons.add(`CHANNEL_NOT_BACKED_BY_POLICY_EVIDENCE:${channel}`);
    }

    if (channels.some((channel) => ROBOTS_RELEVANT_CHANNELS.has(channel)) && !hasKind(checked.evidence, "ROBOTS")) {
      reasons.add("MISSING_ROBOTS_OBSERVATION");
    }
    if (channels.includes("PUBLIC_SITEMAP") && !hasKind(checked.evidence, "SITEMAP_OR_STRUCTURE")) {
      reasons.add("MISSING_SITEMAP_OR_STRUCTURE_EVIDENCE");
    }
  }

  const explicitHold = input.decision === "HOLD";
  const accepted = !explicitHold && reasons.size === 0;
  const normalizedReviewedAt = reviewedAt === null ? null : new Date(reviewedAt).toISOString();

  return {
    schemaVersion: "MASS_2A_DECISION_V1",
    sourceDomain: dossier.sourceDomain,
    reviewedAt: normalizedReviewedAt,
    requestedDecision: input.decision,
    decision: accepted ? input.decision : "HOLD",
    decisionAccepted: accepted,
    allowedChannels: accepted ? channels : ["NONE"],
    potentialVolume: dossier.yield,
    rationale: input.rationale.trim() || null,
    evidence: input.evidence,
    gateReasons: accepted
      ? []
      : explicitHold && reasons.size === 0
        ? ["HOLD_BY_AUDITOR"]
        : [...reasons].sort(),
    registryPreviewEligible: accepted,
    permissionInferred: false,
    publicActivableNow: false,
    registryWriteAllowed: false,
  };
}
