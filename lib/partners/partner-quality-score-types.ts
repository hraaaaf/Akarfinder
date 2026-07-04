// PARTNER-QUALITY-SCORING-POLICY-1
// Internal scoring types for partner listing quality.
// Central rule: AkarFinder never scores the "truth" of a listing.
// These scores measure quality, structure, authorization and exploitability
// of a partner listing. They are internal signals — the only public output
// is the existing PartnerListingPublicLabel set.

import type {
  PartnerListingPublicLabel,
  PartnerListingQualityLevel,
  PartnerPropertyType,
  PartnerTransactionType,
} from "./partner-listing-types";

// Authorization source hierarchy — internal only.
// web_external results always stay source-original previews (no image,
// no contact); first_party is AkarFinder's own structured content.
export type PartnerAuthorizationSource =
  | "web_external"
  | "partner_authorized"
  | "agency_partner"
  | "agency_premium"
  | "promoter_partner"
  | "first_party";

// User search profile hints — optional, used only to modulate
// search_relevance_score. Never displayed.
export type SearchUserProfile =
  | "solo"
  | "couple"
  | "family"
  | "mre"
  | "investor"
  | "student"
  | "retired"
  | "company"
  | "other";

// Minimal search intent shape used for relevance scoring.
// Every field is optional: an unspecified criterion never penalizes.
export interface PartnerSearchIntent {
  transaction?: PartnerTransactionType;
  city?: string;
  district?: string;
  property_type?: PartnerPropertyType;
  budget_max?: number;
  min_surface_m2?: number;
  profile?: SearchUserProfile;
}

export type PartnerFreshnessTier = "recent" | "stale" | "unknown";

// Composite result — all scores are integers in [0, 100].
export interface PartnerQualityScores {
  search_relevance_score: number | null;
  partner_listing_quality_score: number;
  authorization_score: number;
  location_completeness_score: number;
  freshness_score: number;
  freshness_tier: PartnerFreshnessTier;
  quality_level: PartnerListingQualityLevel;
  public_label: PartnerListingPublicLabel;
}
