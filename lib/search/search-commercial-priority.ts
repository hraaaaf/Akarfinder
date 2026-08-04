// SEARCH-COMMERCIAL-PRIORITY-V1
// Strict public SERP order after eligibility/filter matching:
//   1. premium promoter inventory
//   2. authorized agency/partner inventory
//   3. first-party user submissions
//   4. public indexed / observed inventory
//
// Unknown or incomplete metadata always fails closed to public_indexed.
// Within each category, the incoming relevance/price/quality order is preserved.

import type { Listing } from "@/lib/listings/types";
import { getSourceAccessType } from "@/lib/sources/source-access-registry";
import {
  collapseStructuredDuplicateGroups,
  getSearchTruthPresentation,
} from "@/lib/search/search-truth-tier";

export type SearchCommercialTier =
  | "promoter_premium"
  | "agency_partner"
  | "direct_user"
  | "public_indexed";

export type CommercialSearchPartition = {
  promoterPremium: Listing[];
  agencyPartner: Listing[];
  directUser: Listing[];
  publicIndexed: {
    analyzed: Listing[];
    partial: Listing[];
    observed: Listing[];
  };
  groupedRepresentations: number;
};

const PARTNER_BADGES = new Set(["premium_partner", "authorized_source"]);
const PARTNER_DISPLAY_TYPES = new Set(["partner_source", "authorized_source"]);
const PARTNER_COMMERCIAL_TIERS = new Set(["partner", "gold", "premium"]);

function normalize(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function isExplicitPromoter(listing: Listing): boolean {
  return (
    listing.source_type === "Promoteur" ||
    normalize(listing.partner_type) === "promoter" ||
    normalize(listing.organization_type) === "promoter" ||
    normalize(listing.partner_tier) === "promoter_partner"
  );
}

function isExplicitAgency(listing: Listing): boolean {
  return (
    listing.source_type === "Agence" ||
    normalize(listing.partner_type) === "agency" ||
    normalize(listing.organization_type) === "agency" ||
    normalize(listing.partner_tier) === "agency_premium" ||
    normalize(listing.partner_tier) === "agency_partner"
  );
}

function hasExplicitPartnerAuthorization(listing: Listing): boolean {
  const sourceAccessType = getSourceAccessType(listing.source_name ?? "");
  const explicitPartnerOrganization = isExplicitPromoter(listing) || isExplicitAgency(listing);
  const confirmedCommercialActivation =
    explicitPartnerOrganization &&
    PARTNER_COMMERCIAL_TIERS.has(normalize(listing.commercial_tier)) &&
    listing.partner_activation_status === "active" &&
    listing.source_authorization_status === "confirmed" &&
    listing.partner_validation_status === "validated";

  return (
    sourceAccessType === "partner_authorized" ||
    PARTNER_BADGES.has(normalize(listing.source_badge)) ||
    PARTNER_DISPLAY_TYPES.has(normalize(listing.source_display_type)) ||
    confirmedCommercialActivation ||
    (listing.source_access_level === "partner_full" && explicitPartnerOrganization) ||
    (
      listing.search_result_display_mode === "full_partner_listing" &&
      listing.original_source_required === false &&
      listing.can_show_contact === true
    )
  );
}

function isDirectFirstPartyListing(listing: Listing): boolean {
  return (
    normalize(listing.source_name) === "akarfinder" ||
    normalize(listing.acquisition_channel) === "first_party_user" ||
    normalize(listing.origin_type) === "first_party_user"
  );
}

export function getSearchCommercialTier(listing: Listing): SearchCommercialTier {
  const partnerAuthorized = hasExplicitPartnerAuthorization(listing);

  if (partnerAuthorized && isExplicitPromoter(listing)) {
    return "promoter_premium";
  }

  if (partnerAuthorized && isExplicitAgency(listing)) {
    return "agency_partner";
  }

  // A first-party submission remains in the user lane even if its display
  // permissions are rich. It only moves to a partner lane when the partner
  // organization itself is explicit.
  if (isDirectFirstPartyListing(listing)) {
    return "direct_user";
  }

  // A generic authorized feed (for example partner_csv) is a partner result,
  // but never a promoter unless promoter identity is explicit.
  if (partnerAuthorized) {
    return "agency_partner";
  }

  return "public_indexed";
}

/**
 * Stable category projection. The existing recommended/price order remains
 * authoritative inside each category.
 */
export function prioritizeCommercialSearchListings(listings: Listing[]): Listing[] {
  const buckets: Record<SearchCommercialTier, Listing[]> = {
    promoter_premium: [],
    agency_partner: [],
    direct_user: [],
    public_indexed: [],
  };

  for (const listing of listings) {
    buckets[getSearchCommercialTier(listing)].push(listing);
  }

  return [
    ...buckets.promoter_premium,
    ...buckets.agency_partner,
    ...buckets.direct_user,
    ...buckets.public_indexed,
  ];
}

/**
 * Public UI partition. Commercial priority is applied before deduplication so
 * a higher-priority authorized representation becomes the visible cluster
 * representative instead of an indexed copy that happened to rank first.
 */
export function partitionCommercialSearchListings(
  listings: Listing[],
): CommercialSearchPartition {
  const prioritized = prioritizeCommercialSearchListings(listings);
  const collapsed = collapseStructuredDuplicateGroups(prioritized);
  const promoterPremium: Listing[] = [];
  const agencyPartner: Listing[] = [];
  const directUser: Listing[] = [];
  const publicIndexed = {
    analyzed: [] as Listing[],
    partial: [] as Listing[],
    observed: [] as Listing[],
  };

  for (const listing of collapsed.listings) {
    const tier = getSearchCommercialTier(listing);
    if (tier === "promoter_premium") {
      promoterPremium.push(listing);
      continue;
    }
    if (tier === "agency_partner") {
      agencyPartner.push(listing);
      continue;
    }
    if (tier === "direct_user") {
      directUser.push(listing);
      continue;
    }

    const truthTier = getSearchTruthPresentation(listing).tier;
    publicIndexed[truthTier].push(listing);
  }

  return {
    promoterPremium,
    agencyPartner,
    directUser,
    publicIndexed,
    groupedRepresentations: collapsed.groupedRepresentations,
  };
}
