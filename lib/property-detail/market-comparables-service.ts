import type { Listing } from "@/lib/listings/types";
import {
  buildCertifiedComparableSet,
  type ComparableTransaction,
  type MarketComparableCandidate,
  type MarketComparableSet,
  type MarketComparableTarget,
} from "@/lib/property-detail/market-comparables";

export interface MarketComparableCandidateRepository {
  findCandidates(target: MarketComparableTarget): Promise<MarketComparableCandidate[]>;
}

function transactionType(value: Listing["transaction_type"]): ComparableTransaction | null {
  if (value === "buy" || value === "rent" || value === "new") return value;
  return null;
}

export function buildMarketComparableTarget(listing: Listing): MarketComparableTarget | null {
  const transaction = transactionType(listing.transaction_type);
  const city = listing.city?.trim();
  const propertyType = listing.property_type?.trim();
  if (!transaction || !city || !propertyType) return null;
  return {
    listingId: listing.id,
    city,
    neighborhood: listing.neighborhood?.trim() || listing.district?.trim() || null,
    propertyType,
    transactionType: transaction,
    priceMad: typeof listing.price === "number" && Number.isFinite(listing.price) && listing.price > 0
      ? listing.price
      : null,
    surfaceM2: typeof listing.surface_m2 === "number" && Number.isFinite(listing.surface_m2) && listing.surface_m2 > 0
      ? listing.surface_m2
      : null,
  };
}

function unavailableTarget(listing: Listing, now: Date): MarketComparableSet {
  return buildCertifiedComparableSet({
    target: {
      listingId: listing.id || "invalid",
      city: "",
      neighborhood: null,
      propertyType: "",
      transactionType: "buy",
      priceMad: null,
      surfaceM2: null,
    },
    candidates: [],
    now,
  });
}

export async function buildMarketComparablesForListing(
  listing: Listing,
  repository: MarketComparableCandidateRepository,
  options: { now?: Date; onError?: (error: unknown) => void } = {},
): Promise<MarketComparableSet> {
  const now = options.now ?? new Date();
  const target = buildMarketComparableTarget(listing);
  if (!target) return unavailableTarget(listing, now);

  try {
    const candidates = await repository.findCandidates(target);
    return buildCertifiedComparableSet({ target, candidates, now });
  } catch (error) {
    options.onError?.(error);
    return buildCertifiedComparableSet({ target, candidates: [], now });
  }
}
