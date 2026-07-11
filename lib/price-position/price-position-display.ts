import type { Listing } from "@/lib/listings/types";
import { getMarketReference } from "@/lib/market/get-market-reference";

import { canShowIndicativePricePosition } from "./public-safety";
import type {
  PricePositionDisplay,
  PricePositionDecisionReason,
} from "./types";
import type { PricePositionDecisionInternal } from "./price-position-trace";

const PUBLIC_DESCRIPTION =
  "Ce repère aide à comparer l'information affichée. Il ne remplace pas la vérification sur la source originale.";

function toneForPosition(position: "coherent" | "high" | "low") {
  if (position === "high") return "warning";
  if (position === "low") return "success";
  return "info";
}

function labelForPosition(position: "coherent" | "high" | "low") {
  if (position === "high") return "Position relative supérieure";
  if (position === "low") return "Position relative inférieure";
  return "Position relative proche";
}

function reasonForDecision(
  position: "coherent" | "high" | "low",
  benchmarkLevel: "district" | "city",
): PricePositionDecisionReason {
  if (benchmarkLevel === "city") {
    if (position === "high") return "city_fallback_above_band";
    if (position === "low") return "city_fallback_below_band";
    return "city_fallback_near_band";
  }

  if (position === "high") return "district_reference_above_band";
  if (position === "low") return "district_reference_below_band";
  return "district_reference_near_band";
}

function buildPublicView(reference: NonNullable<ReturnType<typeof getMarketReference>>): PricePositionDisplay {
  const importantGap = Math.abs(reference.position_pct) >= 20;
  return {
    title: "Repère prix indicatif",
    label: labelForPosition(reference.position),
    description: PUBLIC_DESCRIPTION,
    note: importantGap ? "Écart indicatif important" : "Données indicatives, non officielles",
    tone: toneForPosition(reference.position),
    isImportantGap: importantGap,
  };
}

export function getIndicativePricePositionDecision(listing: Listing): PricePositionDecisionInternal | null {
  if (!canShowIndicativePricePosition(listing)) return null;

  const reference = getMarketReference(
    listing.city,
    listing.neighborhood,
    listing.property_type,
    listing.transaction_type === "rent" ? "rent" : "buy",
    listing.price_per_m2
  );

  if (!reference) return null;

  const publicView = buildPublicView(reference);
  const decisionReason = reasonForDecision(reference.position, reference.benchmark_level);
  const calculatedPricePerM2 = listing.price_per_m2;

  return {
    listing_id: String(listing.id),
    price: listing.price,
    surface: listing.surface_m2,
    calculated_price_per_m2: calculatedPricePerM2,
    property_type: listing.property_type,
    city: listing.city,
    district: listing.neighborhood ?? null,
    benchmark_id: reference.benchmark_id,
    benchmark_level: reference.benchmark_level,
    benchmark_value: reference.median_price_per_m2,
    benchmark_date: reference.benchmark_date,
    benchmark_methodology: reference.benchmark_methodology,
    benchmark_source_type: reference.benchmark_source_type,
    position_result: reference.position,
    decision_reason: decisionReason,
    fallback_applied: reference.fallback_applied,
    public_view: publicView,
  };
}

export function getIndicativePricePositionDisplay(listing: Listing): PricePositionDisplay | null {
  return getIndicativePricePositionDecision(listing)?.public_view ?? null;
}
