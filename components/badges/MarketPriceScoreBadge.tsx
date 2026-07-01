"use client";

import type { Listing } from "@/lib/listings/types";
import { getMarketPriceScoreDisplay } from "@/lib/market/market-price-score-display";

type Variant = "light" | "dark";

type MarketPriceScoreBadgeProps = {
  listing: Pick<Listing, "city" | "neighborhood" | "property_type" | "surface_m2" | "price">;
  variant?: Variant;
  className?: string;
};

const LIGHT_TONES: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

const DARK_TONES: Record<string, string> = {
  success: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300",
  info: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  warning: "border-amber-400/30 bg-amber-400/12 text-amber-200",
  danger: "border-rose-400/30 bg-rose-400/12 text-rose-300",
};

export function MarketPriceScoreBadge({
  listing,
  variant = "light",
  className = "",
}: MarketPriceScoreBadgeProps) {
  const display = getMarketPriceScoreDisplay({
    city: listing.city,
    neighborhood: listing.neighborhood,
    property_type: listing.property_type,
    surface_m2: listing.surface_m2,
    total_price_mad: listing.price,
  });

  if (!display) return null;

  const toneClass = variant === "dark" ? DARK_TONES[display.tone] : LIGHT_TONES[display.tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-bold ${toneClass} ${className}`}
      title={display.title}
      aria-label={display.title}
    >
      {display.label}
    </span>
  );
}

