// PARTNER-QUALITY-SCORING-POLICY-1
// Pure internal scoring logic for partner listings.
// Central rule: AkarFinder does not score the "truth" of a listing.
// It scores quality, structure, authorization and exploitability.
// No score here is ever displayed as-is; the only public output is the
// PartnerListingPublicLabel already defined in partner-listing-quality.ts.
// Forbidden public terms remain governed by
// FORBIDDEN_PARTNER_PUBLIC_LABEL_TERMS.

import type { PartnerListingStandard } from "./partner-listing-types";
import {
  canDisplayPartnerFloorPlan,
  getPartnerListingPublicLabel,
  getPartnerListingQualityLevel,
  hasMinimumStandardFields,
} from "./partner-listing-quality";
import type {
  PartnerAuthorizationSource,
  PartnerFreshnessTier,
  PartnerQualityScores,
  PartnerSearchIntent,
} from "./partner-quality-score-types";

// ── authorization_score ─────────────────────────────────────────────
// Internal hierarchy of authorization/exploitability. web_external stays
// lowest: source-original preview only, no image, no contact, no gallery.
const AUTHORIZATION_SCORES: Record<PartnerAuthorizationSource, number> = {
  web_external: 10,
  partner_authorized: 60,
  agency_partner: 70,
  agency_premium: 85,
  promoter_partner: 85,
  first_party: 100,
};

export function scoreAuthorizationSource(source: PartnerAuthorizationSource): number {
  return AUTHORIZATION_SCORES[source];
}

export function resolveAuthorizationSource(
  listing: Partial<PartnerListingStandard>,
): PartnerAuthorizationSource {
  if (listing.authorization_status !== "partner_authorized") {
    return "web_external";
  }
  if (listing.partner_tier === "promoter_partner") return "promoter_partner";
  if (listing.partner_tier === "agency_premium") return "agency_premium";
  if (listing.partner_tier === "agency_partner") return "agency_partner";
  return "partner_authorized";
}

// ── search_relevance_score ──────────────────────────────────────────
// Weighted match between a search intent and a listing. An unspecified
// intent criterion never penalizes (counts as matched). A transaction
// mismatch is disqualifying for ranking purposes: the score is capped
// low so a non-relevant partner can never outrank a relevant result.
const RELEVANCE_WEIGHTS = {
  transaction: 30,
  city: 25,
  district: 10,
  property_type: 15,
  budget: 10,
  surface: 5,
  profile: 5,
} as const;

const TRANSACTION_MISMATCH_CAP = 20;

export function scoreSearchRelevance(
  listing: Partial<PartnerListingStandard>,
  intent: PartnerSearchIntent,
): number {
  let score = 0;

  const transactionMatches = matchesTransaction(listing, intent);
  if (transactionMatches) score += RELEVANCE_WEIGHTS.transaction;

  if (!intent.city || equalsLoose(listing.city, intent.city)) {
    score += RELEVANCE_WEIGHTS.city;
  }
  if (!intent.district || equalsLoose(listing.district, intent.district)) {
    score += RELEVANCE_WEIGHTS.district;
  }
  if (!intent.property_type || listing.property_type === intent.property_type) {
    score += RELEVANCE_WEIGHTS.property_type;
  }
  if (matchesBudget(listing, intent)) score += RELEVANCE_WEIGHTS.budget;
  if (matchesSurface(listing, intent)) score += RELEVANCE_WEIGHTS.surface;
  if (matchesProfile(listing, intent)) score += RELEVANCE_WEIGHTS.profile;

  if (!transactionMatches) {
    return Math.min(score, TRANSACTION_MISMATCH_CAP);
  }
  return score;
}

function matchesTransaction(
  listing: Partial<PartnerListingStandard>,
  intent: PartnerSearchIntent,
): boolean {
  if (!intent.transaction) return true;
  if (listing.transaction_type === intent.transaction) return true;
  // Buying intent also accepts new-build inventory; the reverse is false:
  // an explicit "new" search does not match a resale listing, and a rent
  // search never matches sale or new.
  if (intent.transaction === "sale" && listing.transaction_type === "new") return true;
  return false;
}

function matchesBudget(
  listing: Partial<PartnerListingStandard>,
  intent: PartnerSearchIntent,
): boolean {
  if (!isPositive(intent.budget_max)) return true;
  const budgetMax = Number(intent.budget_max);
  if (listing.price_display_mode === "exact" && isPositive(listing.price_amount)) {
    return Number(listing.price_amount) <= budgetMax;
  }
  if (listing.price_display_mode === "range" && isPositive(listing.price_range_min)) {
    return Number(listing.price_range_min) <= budgetMax;
  }
  // on_request or missing price: no positive budget signal.
  return false;
}

function matchesSurface(
  listing: Partial<PartnerListingStandard>,
  intent: PartnerSearchIntent,
): boolean {
  if (!isPositive(intent.min_surface_m2)) return true;
  return isPositive(listing.surface_m2)
    && Number(listing.surface_m2) >= Number(intent.min_surface_m2);
}

function matchesProfile(
  listing: Partial<PartnerListingStandard>,
  intent: PartnerSearchIntent,
): boolean {
  if (!intent.profile) return true;
  if (intent.profile === "family") {
    return isPositive(listing.bedrooms) && Number(listing.bedrooms) >= 2;
  }
  if (intent.profile === "student" || intent.profile === "solo") {
    return listing.property_type === "apartment" || listing.property_type === "office"
      ? true
      : listing.property_type !== "villa";
  }
  // Other profiles carry no structural constraint at this stage.
  return true;
}

// ── partner_listing_quality_score ───────────────────────────────────
// Numeric counterpart of the quality level: how complete, structured and
// exploitable the listing is. Sums to 100.
const QUALITY_WEIGHTS = {
  minimum_fields: 25,
  location_exploitable: 10,
  price_signal: 10,
  surface: 5,
  photos_authorized: 10,
  floor_plan: 10,
  contact_authorized: 10,
  normalized_description: 5,
  recent_update: 10,
  proximity_allowed: 5,
} as const;

export function scorePartnerListingQuality(
  listing: Partial<PartnerListingStandard>,
  now: Date = new Date(),
): number {
  let score = 0;

  if (hasMinimumStandardFields(listing)) score += QUALITY_WEIGHTS.minimum_fields;
  if (typeof listing.location_level === "string" && nonEmpty(listing.approximate_area_label)) {
    score += QUALITY_WEIGHTS.location_exploitable;
  }
  if (hasAnyPriceSignal(listing)) score += QUALITY_WEIGHTS.price_signal;
  if (isPositive(listing.surface_m2)) score += QUALITY_WEIGHTS.surface;
  if (listing.photos_authorized === true && isPositive(listing.photo_count)) {
    score += QUALITY_WEIGHTS.photos_authorized;
  }
  if (canDisplayPartnerFloorPlan(listing)) score += QUALITY_WEIGHTS.floor_plan;
  if (listing.contact_authorized === true && listing.contact_mode !== "hidden") {
    score += QUALITY_WEIGHTS.contact_authorized;
  }
  if (nonEmpty(listing.normalized_description)) {
    score += QUALITY_WEIGHTS.normalized_description;
  }
  if (resolveFreshnessTier(listing.last_partner_update_at, now) === "recent") {
    score += QUALITY_WEIGHTS.recent_update;
  }
  if (listing.proximity_allowed === true) score += QUALITY_WEIGHTS.proximity_allowed;

  return score;
}

function hasAnyPriceSignal(listing: Partial<PartnerListingStandard>): boolean {
  if (listing.price_display_mode === "on_request") return true;
  if (isPositive(listing.price_amount)) return true;
  return isPositive(listing.price_range_min) && isPositive(listing.price_range_max);
}

// ── location_completeness_score ─────────────────────────────────────
const LOCATION_BASE_SCORES: Record<string, number> = {
  district_only: 40,
  approximate_zone: 60,
  exact_address_authorized: 90,
};

export function scoreLocationCompleteness(
  listing: Partial<PartnerListingStandard>,
): number {
  const base = typeof listing.location_level === "string"
    ? LOCATION_BASE_SCORES[listing.location_level] ?? 0
    : 0;

  let bonus = 0;
  if (listing.proximity_allowed === true) bonus += 4;
  if (listing.mobility_context_allowed === true) bonus += 3;
  if (listing.neighborhood_context_allowed === true) bonus += 3;

  return Math.min(base + bonus, 100);
}

// ── freshness_score ─────────────────────────────────────────────────
const FRESHNESS_SCORES: Record<PartnerFreshnessTier, number> = {
  recent: 100,
  stale: 40,
  unknown: 0,
};

const RECENT_UPDATE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export function resolveFreshnessTier(
  lastUpdateAt: string | undefined,
  now: Date = new Date(),
): PartnerFreshnessTier {
  if (!lastUpdateAt) return "unknown";
  const updatedAt = new Date(lastUpdateAt);
  if (Number.isNaN(updatedAt.getTime())) return "unknown";
  return now.getTime() - updatedAt.getTime() <= RECENT_UPDATE_WINDOW_MS
    ? "recent"
    : "stale";
}

export function scoreFreshness(
  lastUpdateAt: string | undefined,
  now: Date = new Date(),
): number {
  return FRESHNESS_SCORES[resolveFreshnessTier(lastUpdateAt, now)];
}

// ── composite ───────────────────────────────────────────────────────
export function computePartnerQualityScores(
  listing: Partial<PartnerListingStandard>,
  intent?: PartnerSearchIntent,
  now: Date = new Date(),
): PartnerQualityScores {
  const qualityLevel = getPartnerListingQualityLevel(listing, now);
  return {
    search_relevance_score: intent ? scoreSearchRelevance(listing, intent) : null,
    partner_listing_quality_score: scorePartnerListingQuality(listing, now),
    authorization_score: scoreAuthorizationSource(resolveAuthorizationSource(listing)),
    location_completeness_score: scoreLocationCompleteness(listing),
    freshness_score: scoreFreshness(listing.last_partner_update_at, now),
    freshness_tier: resolveFreshnessTier(listing.last_partner_update_at, now),
    quality_level: qualityLevel,
    public_label: getPartnerListingPublicLabel(qualityLevel),
  };
}

function equalsLoose(a: string | undefined, b: string): boolean {
  return typeof a === "string"
    && a.trim().toLowerCase() === b.trim().toLowerCase();
}

function isPositive(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function nonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
