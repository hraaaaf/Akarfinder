"use client";

import type { Listing } from "@/lib/listings/types";
import { getIndicativePricePositionDisplay } from "@/lib/price-position/price-position-display";

type Variant = "light" | "dark";

type PricePositionBadgeProps = {
  listing: Listing;
  variant?: Variant;
  className?: string;
};

const LIGHT_TONES: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

const DARK_TONES: Record<string, string> = {
  success: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300",
  info: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  warning: "border-amber-400/30 bg-amber-400/12 text-amber-200",
};

export function PricePositionBadge({ listing, variant = "light", className = "" }: PricePositionBadgeProps) {
  const display = getIndicativePricePositionDisplay(listing);
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
