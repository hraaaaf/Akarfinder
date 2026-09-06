import type { CollectionListing } from "./collection-adapter";

export type DiscoveryTransaction = "sale" | "rent";

export type ContextualTransactionDecision = {
  transaction: DiscoveryTransaction | null;
  confidence: "contextual" | "missing";
  reason:
    | "single_context_plausible_price"
    | "context_conflict"
    | "missing_numeric_price"
    | "unsupported_property_type_for_contextual_inference"
    | "unsupported_context_for_property_type"
    | "implausible_sale_price"
    | "implausible_rent_price";
};

export type ContextualTransactionInput = {
  discovery_transactions: DiscoveryTransaction[];
  price_amount: number | null;
  price_on_request: boolean;
  property_type: CollectionListing["property_type"];
};

type PriceCalibration = { sale_min_mad: number; rent_max_mad: number | null };

const CONTEXTUAL_PRICE_CALIBRATION: Partial<Record<NonNullable<CollectionListing["property_type"]>, PriceCalibration>> = {
  apartment: { sale_min_mad: 100_000, rent_max_mad: 100_000 },
  villa: { sale_min_mad: 100_000, rent_max_mad: 100_000 },
  house: { sale_min_mad: 100_000, rent_max_mad: 100_000 },
  commercial: { sale_min_mad: 100_000, rent_max_mad: 100_000 },
  land: { sale_min_mad: 100_000, rent_max_mad: null },
};

export function inferContextualTransaction(input: ContextualTransactionInput): ContextualTransactionDecision {
  const contexts = [...new Set(input.discovery_transactions)];
  if (contexts.length !== 1) {
    return { transaction: null, confidence: "missing", reason: "context_conflict" };
  }

  if (input.price_amount == null || input.price_on_request) {
    return { transaction: null, confidence: "missing", reason: "missing_numeric_price" };
  }

  const calibration = input.property_type ? CONTEXTUAL_PRICE_CALIBRATION[input.property_type] : undefined;
  if (!calibration) {
    return { transaction: null, confidence: "missing", reason: "unsupported_property_type_for_contextual_inference" };
  }

  const transaction = contexts[0];
  if (transaction === "sale" && input.price_amount < calibration.sale_min_mad) {
    return { transaction: null, confidence: "missing", reason: "implausible_sale_price" };
  }
  if (transaction === "rent") {
    if (calibration.rent_max_mad == null) {
      return { transaction: null, confidence: "missing", reason: "unsupported_context_for_property_type" };
    }
    if (input.price_amount > calibration.rent_max_mad) {
      return { transaction: null, confidence: "missing", reason: "implausible_rent_price" };
    }
  }

  return { transaction, confidence: "contextual", reason: "single_context_plausible_price" };
}

export function hasMoroccanCentimeMillionPriceLanguage(description: string | null): boolean {
  if (!description) return false;
  return /\bprix\b[^.\n]{0,80}\b\d{2,3}\s+millions?\b/iu.test(description);
}
