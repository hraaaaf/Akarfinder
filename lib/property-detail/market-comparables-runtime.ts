import type { Listing } from "@/lib/listings/types";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { isMarketIndexReadEnabled } from "@/lib/market-index/market-index-feature-flags";
import { SupabaseMarketComparableCandidateRepository } from "@/lib/property-detail/market-comparables-repository";
import { buildMarketComparablesForListing } from "@/lib/property-detail/market-comparables-service";
import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";

const emptyRepository = {
  async findCandidates() {
    return [];
  },
};

export async function buildMarketComparablesRuntime(
  listing: Listing,
  options: { now?: Date; onError?: (error: unknown) => void; env?: NodeJS.ProcessEnv } = {},
): Promise<MarketComparableSet> {
  const env = options.env ?? process.env;
  if (!isMarketIndexReadEnabled(env)) {
    return buildMarketComparablesForListing(listing, emptyRepository, { now: options.now });
  }

  try {
    const repository = new SupabaseMarketComparableCandidateRepository(getSupabaseServerClient());
    return await buildMarketComparablesForListing(listing, repository, options);
  } catch (error) {
    options.onError?.(error);
    return buildMarketComparablesForListing(listing, emptyRepository, { now: options.now });
  }
}
