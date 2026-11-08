/**
 * Private partner-feed pilot admission — NO DB IO and NO public publication.
 * The license review MUST come from a trusted internal approval process, not
 * from the feed vendor's JSON. This function does not authenticate signatures
 * or grant legal rights; it validates an already-reviewed evidence record.
 */
import { stageFeed, type FeedStagingResult } from "./staging.js";
import type { RawFeedRow } from "./schema.js";

export type ReviewedPartnerLicense = {
  sourceName: string; // partner-specific, never a portal or the shared "partner_csv" alias
  agreementSha256: string; // digest of a retained, signed document
  reviewerId: string; // actual approving human, internal identity
  reviewedAt: string;
  validFrom: string;
  validUntil: string;
  allowedOriginalDomains: readonly string[]; // must explicitly cover origin sites
  rights: {
    storeMetadata: boolean;
    showCommercialMetadata: boolean;
    redirectOriginal: boolean;
    upstreamRightsVerified: boolean;
    photographs: boolean;
  };
};

export type IndependentOfferCheck = {
  sourceId: string;
  sourceUrl: string;
  checkedAt: string;
  live: boolean;
  evidenceRef: string;
};

export type PilotAdmission = {
  status: "blocked" | "ready_private_staging";
  reasons: string[];
  staged: FeedStagingResult | null;
  picturesRetained: number;
};

function parseTimestamp(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value ?? "")) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function hostname(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

function hostAllowed(host: string, domains: readonly string[]): boolean {
  return domains.some((d) => {
    if (typeof d !== "string") return false;
    const domain = d.toLowerCase().trim().replace(/\.$/, "");
    return domain.includes(".") && (host === domain || host.endsWith("." + domain));
  });
}

/**
 * Only returns a PRIVATE in-memory staging result. Calling code must not
 * equate ready_private_staging with permission to publish or persist.
 * Do not expose license review or offer checks as untrusted API inputs.
 */
export function assessPartnerPilot(
  rows: readonly RawFeedRow[],
  license: ReviewedPartnerLicense | null,
  checks: readonly IndependentOfferCheck[],
  now: Date,
  maxRows = 1000,
): PilotAdmission {
  const block = (reason: string): PilotAdmission => ({
    status: "blocked", reasons: [reason], staged: null, picturesRetained: 0,
  });
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return block("clock_invalid");
  if (!license) return block("license_missing");
  if (!/^partner_[a-z0-9][a-z0-9_-]{2,63}$/.test(license.sourceName) || license.sourceName === "partner_csv") {
    return block("partner_specific_source_required");
  }
  if (typeof license.agreementSha256 !== "string" ||
      !/^[a-fA-F0-9]{64}$/.test(license.agreementSha256) ||
      typeof license.reviewerId !== "string" || !license.reviewerId.trim()) {
    return block("reviewed_signed_document_required");
  }
  const reviewed = parseTimestamp(license.reviewedAt);
  const from = parseTimestamp(license.validFrom);
  const until = parseTimestamp(license.validUntil);
  if (reviewed === null || from === null || until === null ||
      reviewed > nowMs || from > nowMs || until < nowMs || from >= until) {
    return block("license_not_currently_valid");
  }
  const rights = license.rights;
  if (!rights || typeof rights !== "object") return block("commercial_and_upstream_rights_not_verified");
  if (!rights.storeMetadata || !rights.showCommercialMetadata ||
      !rights.redirectOriginal || !rights.upstreamRightsVerified) {
    return block("commercial_and_upstream_rights_not_verified");
  }
  if (!Array.isArray(license.allowedOriginalDomains) || !license.allowedOriginalDomains.length) {
    return block("origin_domains_not_licensed");
  }
  if (!Number.isInteger(maxRows) || maxRows < 1 || rows.length < 1 || rows.length > maxRows) {
    return block("pilot_batch_out_of_bounds");
  }

  const checkById = new Map<string, IndependentOfferCheck>();
  for (const check of checks) {
    if (!check || typeof check.sourceId !== "string" || !check.sourceId.trim() ||
        typeof check.evidenceRef !== "string" || !check.evidenceRef.trim() ||
        checkById.has(check.sourceId)) {
      return block("offer_evidence_missing_or_ambiguous");
    }
    checkById.set(check.sourceId, check);
  }
  const seenIds = new Set<string>();
  for (const row of rows) {
    if (!row || row.source_name !== license.sourceName || typeof row.external_id !== "string" ||
        !row.external_id.trim() || seenIds.has(row.external_id)) {
      return block("source_identity_invalid_or_duplicate");
    }
    seenIds.add(row.external_id);
    if (row.update_signal) return block("removal_signals_require_separate_pipeline");
    const host = hostname(row.source_url ?? "");
    if (!host || typeof row.source_domain !== "string" || !row.source_domain.trim() ||
        !hostAllowed(host, license.allowedOriginalDomains) ||
        !hostAllowed(row.source_domain.toLowerCase().trim(), license.allowedOriginalDomains)) {
      return block("original_source_domain_not_authorized");
    }
    const check = checkById.get(row.external_id);
    const observed = check ? parseTimestamp(check.checkedAt) : null;
    const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
    if (!check || check.sourceUrl !== row.source_url || check.live !== true ||
        observed === null || observed > nowMs || nowMs - observed > maxAgeMs) {
      return block("independent_recent_offer_check_missing");
    }
  }

  // Feed-level assertions of image rights are insufficient on their own.
  const sanitized = rows.map((row) => ({
    ...row,
    images_rights_confirmed: rights.photographs === true && row.images_rights_confirmed === true,
  }));
  const staged = stageFeed(sanitized);
  if (staged.rejected_rows.length > 0 || staged.duplicate_count !== 0 ||
      staged.action_counts.create !== rows.length) {
    return block("feed_schema_or_identity_validation_failed");
  }
  return {
    status: "ready_private_staging",
    reasons: [],
    staged,
    picturesRetained: staged.staged.reduce((sum, item) => sum + item.row.image_urls.length, 0),
  };
}