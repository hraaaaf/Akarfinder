import type { Listing } from "@/lib/listings/types";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { isMarketIndexReadEnabled } from "@/lib/market-index/market-index-feature-flags";
import {
  buildObservedPriceHistory,
  type CertifiedAkarEstimate,
  type PriceHistoryModel,
} from "@/lib/property-detail/akar-estimate-history";
import { SupabaseObservedPriceHistoryRepository } from "@/lib/property-detail/akar-estimate-history-repository";

export type AkarEstimateHistoryRuntime = {
  history: PriceHistoryModel;
  estimate: CertifiedAkarEstimate | null;
};

export async function buildAkarEstimateHistoryRuntime(
  listing: Listing,
  options: { env?: NodeJS.ProcessEnv; onError?: (error: unknown) => void } = {},
): Promise<AkarEstimateHistoryRuntime> {
  const env = options.env ?? process.env;
  const unavailable: AkarEstimateHistoryRuntime = {
    history: buildObservedPriceHistory([]),
    estimate: null,
  };

  if (!isMarketIndexReadEnabled(env)) return unavailable;

  try {
    const repository = new SupabaseObservedPriceHistoryRepository(getSupabaseServerClient());
    return {
      history: await repository.findForListingId(listing.id),
      // ANN-L9 deliberately stays fail-closed until a calibrated model artifact
      // and its versioned holdout publication policy are available at runtime.
      estimate: null,
    };
  } catch (error) {
    options.onError?.(error);
    return unavailable;
  }
}
