import { getDbProvider } from "@/lib/db/provider";
import type { ObservedMarketListing } from "@/lib/map/city-market-intelligence";
import { readNeonListingMarketObservations } from "@/lib/map/neon-listing-market-observations";
import { readSupabaseListingMarketObservations } from "@/lib/map/supabase-listing-market-observations";

/**
 * Explicitly select the only configured market provider. Never query Neon as
 * an invisible backup when Supabase has been selected as the primary source.
 * Keep the legacy Neon reader physically separate for rollback validation.
 */
export async function readListingMarketObservations(
  cityInput: string,
  targetSlugs: readonly string[],
): Promise<ObservedMarketListing[]> {
  const provider = getDbProvider();
  if (provider === "neon") {
    return readNeonListingMarketObservations(cityInput, targetSlugs);
  }
  if (provider === "supabase") {
    return readSupabaseListingMarketObservations(cityInput, targetSlugs);
  }
  throw new Error("market_observations_provider_unavailable");
}
