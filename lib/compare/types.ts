import type { Listing } from "@/lib/listings/types";
import type { ListingPriceComparison } from "@/lib/market/types";
import type { PackageScoreResult } from "@/lib/package-score/types";
import type { ProximityPoint } from "@/lib/proximity/types";

export const MAX_COMPARE_LISTINGS = 4;
export const MIN_COMPARE_LISTINGS = 2;

export type CompareStoredIds = string[];

export type CompareActionResult =
  | { ok: true; status: "added" | "removed" | "cleared"; ids: CompareStoredIds }
  | { ok: false; status: "limit_reached"; ids: CompareStoredIds };

export type CompareListingInsights = {
  listing: Listing;
  packageScore: PackageScoreResult;
  priceComparison: ListingPriceComparison;
  proximityPoints: ProximityPoint[];
  proximitySummary: string;
  sourceLabel: string;
  duplicatePossible: boolean;
  observedPriceLabel: string;
  observedPriceDeltaLabel: string | null;
  reliabilityLabel: string;
  imageMode: "real_image" | "preview_image" | "db_provider_thumbnail" | "fallback_visual";
};

export type CompareSummaryCard = {
  title: string;
  winnerId: string | null;
  winnerLabel: string;
  detail: string;
};

export type CompareSummary = {
  cards: CompareSummaryCard[];
  pointsToVerify: string[];
  disclaimer: string;
};
