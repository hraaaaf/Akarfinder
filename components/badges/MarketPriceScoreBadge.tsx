"use client";

import type { Listing } from "@/lib/listings/types";
import { PricePositionBadge } from "@/components/price-position/PricePositionBadge";

type MarketPriceScoreBadgeProps = {
  listing: Listing;
  variant?: "light" | "dark";
  className?: string;
};

export function MarketPriceScoreBadge({
  listing,
  variant = "light",
  className = "",
}: MarketPriceScoreBadgeProps) {
  return <PricePositionBadge listing={listing} variant={variant} className={className} />;
}
