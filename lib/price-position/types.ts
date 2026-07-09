import type { Listing } from "@/lib/listings/types";

export type PricePositionTone = "success" | "info" | "warning";

export type PricePositionLabel =
  | "Positionnement indicatif bas"
  | "Positionnement indicatif proche"
  | "Positionnement indicatif haut";

export type PricePositionDisplay = {
  title: "Repère prix indicatif";
  label: PricePositionLabel;
  description: string;
  note: string;
  tone: PricePositionTone;
  isImportantGap: boolean;
};

export type PricePositionListing = Pick<
  Listing,
  "city" | "neighborhood" | "price" | "price_per_m2" | "property_type" | "surface_m2" | "transaction_type"
>;
