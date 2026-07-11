import type { Listing } from "@/lib/listings/types";

export type PricePositionTone = "success" | "info" | "warning";

export type PricePositionLabel =
  | "Position relative inférieure"
  | "Position relative proche"
  | "Position relative supérieure";

export type PricePositionDisplay = {
  title: "Repère prix indicatif";
  label: PricePositionLabel;
  description: string;
  note: string;
  tone: PricePositionTone;
  isImportantGap: boolean;
};

export type PricePositionDecisionReason =
  | "district_reference_below_band"
  | "district_reference_near_band"
  | "district_reference_above_band"
  | "city_fallback_below_band"
  | "city_fallback_near_band"
  | "city_fallback_above_band"
  | "insufficient_data"
  | "unsupported_property_type"
  | "benchmark_unavailable";

export type PricePositionListing = Pick<
  Listing,
  "city" | "neighborhood" | "price" | "price_per_m2" | "property_type" | "surface_m2" | "transaction_type"
>;

export type PricePositionPublicView = PricePositionDisplay;
