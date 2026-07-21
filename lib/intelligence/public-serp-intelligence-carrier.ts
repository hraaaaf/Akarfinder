import type { Listing } from "../listings/types";
import type { PublicSerpIntelligenceSummaryV1 } from "./public-serp-intelligence-types";

type ListingWithPublicIntelligence = Listing & {
  public_intelligence?: PublicSerpIntelligenceSummaryV1;
};

export function attachPublicSerpIntelligenceSummary(
  listing: Listing,
  summary: PublicSerpIntelligenceSummaryV1,
): Listing {
  return { ...listing, public_intelligence: summary } as ListingWithPublicIntelligence;
}

export function getPublicSerpIntelligenceFromListing(
  listing: Listing,
): PublicSerpIntelligenceSummaryV1 | undefined {
  return (listing as ListingWithPublicIntelligence).public_intelligence;
}
