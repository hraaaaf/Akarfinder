import type { Listing } from "@/lib/listings/types";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { SupabaseMarketComparableCandidateRepository } from "@/lib/property-detail/market-comparables-repository";
import { buildMarketComparablesForListing } from "@/lib/property-detail/market-comparables-service";
import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";

export async function buildMarketComparablesRuntime(
  listing: Listing,
  options: { now?: Date; onError?: (error: unknown) => void } = {},
): Promise<MarketComparableSet> {
  try {
    const repository = new SupabaseMarketComparableCandidateRepository(getSupabaseServerClient());
    return await buildMarketComparablesForListing(listing, repository, options);
  } catch (error) {
    options.onError?.(error);
    return buildMarketComparablesForListing(listing, {
      async findCandidates() {
        return [];
      },
    }, { now: options.now });
  }
}
