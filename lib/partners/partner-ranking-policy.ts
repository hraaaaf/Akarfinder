// PARTNER-RANKING-POLICY-MVP-1
// Isolated partner ranking engine. NOT wired into the live Search Gateway:
// the gateway stays frozen (motor purity). This module is pure logic,
// demonstrated on /demo pages only.
//
// Absolute rule: relevance first, partner second, listing quality third,
// external source last. A non-relevant partner never passes a relevant
// result — partnership never buys ranking over relevance.

import type { PartnerListingStandard } from "./partner-listing-types";
import type {
  PartnerAuthorizationSource,
  PartnerSearchIntent,
} from "./partner-quality-score-types";
import {
  scoreAuthorizationSource,
  scorePartnerListingQuality,
  scoreSearchRelevance,
} from "./partner-quality-score";

// A candidate result entering the ranking. `descriptor` carries whatever
// structured facts are known about the result, for partners this is the
// partner listing standard; for web_external results it is the minimal
// normalized preview (transaction, city, property type...) — never more.
export interface PartnerRankingCandidate {
  id: string;
  source: PartnerAuthorizationSource;
  descriptor: Partial<PartnerListingStandard>;
}

export interface PartnerResultDisplayPolicy {
  canShowImage: boolean;
  canShowContact: boolean;
  canShowGallery: boolean;
  canShowEnrichedDetails: boolean;
  mustLinkOriginalSource: boolean;
}

export interface RankedPartnerResult extends PartnerRankingCandidate {
  relevance_score: number;
  authorization_score: number;
  listing_quality_score: number;
  is_relevant: boolean;
  is_partner: boolean;
  display: PartnerResultDisplayPolicy;
}

// ── relevance eligibility ───────────────────────────────────────────
// Hard filters: when the intent specifies a transaction, a property type
// or a city, a mismatch disqualifies the result from the relevant block,
// whatever its tier. A buy ("sale") intent accepts new-build inventory;
// the reverse is false, and rent never matches sale/new.
export function isRelevantForIntent(
  descriptor: Partial<PartnerListingStandard>,
  intent: PartnerSearchIntent,
): boolean {
  if (intent.transaction) {
    const t = descriptor.transaction_type;
    const transactionOk = t === intent.transaction
      || (intent.transaction === "sale" && t === "new");
    if (!transactionOk) return false;
  }
  if (intent.property_type && descriptor.property_type !== intent.property_type) {
    return false;
  }
  if (intent.city && !equalsLoose(descriptor.city, intent.city)) {
    return false;
  }
  return true;
}

// ── display rights ──────────────────────────────────────────────────
// web_external results always stay limited previews: no image, no contact,
// no gallery, original source link mandatory. Partner results may show
// enriched content only under explicit authorization flags.
export function getPartnerResultDisplayPolicy(
  source: PartnerAuthorizationSource,
  descriptor: Partial<PartnerListingStandard> = {},
): PartnerResultDisplayPolicy {
  if (source === "web_external") {
    return {
      canShowImage: false,
      canShowContact: false,
      canShowGallery: false,
      canShowEnrichedDetails: false,
      mustLinkOriginalSource: true,
    };
  }
  const photosAuthorized = descriptor.photos_authorized === true
    && typeof descriptor.photo_count === "number"
    && descriptor.photo_count > 0;
  return {
    canShowImage: photosAuthorized,
    canShowContact: descriptor.contact_authorized === true
      && descriptor.contact_mode !== "hidden",
    canShowGallery: photosAuthorized,
    canShowEnrichedDetails: true,
    mustLinkOriginalSource: false,
  };
}

// ── ranking ─────────────────────────────────────────────────────────
// Sort order (stable):
// 1. relevant results before non-relevant results — always.
// 2. within a relevance block: partner results before web_external.
// 3. then relevance score (desc).
// 4. then authorization score (desc) — promoter/premium above standard.
// 5. then listing quality score (desc).
export function rankPartnerResults(
  candidates: PartnerRankingCandidate[],
  intent: PartnerSearchIntent,
  now: Date = new Date(),
): RankedPartnerResult[] {
  const scored: RankedPartnerResult[] = candidates.map((candidate) => ({
    ...candidate,
    relevance_score: scoreSearchRelevance(candidate.descriptor, intent),
    authorization_score: scoreAuthorizationSource(candidate.source),
    listing_quality_score: candidate.source === "web_external"
      ? 0
      : scorePartnerListingQuality(candidate.descriptor, now),
    is_relevant: isRelevantForIntent(candidate.descriptor, intent),
    is_partner: candidate.source !== "web_external",
    display: getPartnerResultDisplayPolicy(candidate.source, candidate.descriptor),
  }));

  return scored.sort((a, b) => {
    if (a.is_relevant !== b.is_relevant) return a.is_relevant ? -1 : 1;
    if (a.is_partner !== b.is_partner) return a.is_partner ? -1 : 1;
    if (a.relevance_score !== b.relevance_score) {
      return b.relevance_score - a.relevance_score;
    }
    if (a.authorization_score !== b.authorization_score) {
      return b.authorization_score - a.authorization_score;
    }
    if (a.listing_quality_score !== b.listing_quality_score) {
      return b.listing_quality_score - a.listing_quality_score;
    }
    return a.id.localeCompare(b.id);
  });
}

function equalsLoose(a: string | undefined, b: string): boolean {
  return typeof a === "string"
    && a.trim().toLowerCase() === b.trim().toLowerCase();
}
