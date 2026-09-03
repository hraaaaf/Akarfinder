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
    | "implausible_sale_price"
    | "implausible_rent_price";
};

export type ContextualTransactionInput = {
  discovery_transactions: DiscoveryTransaction[];
  price_amount: number | null;
  price_on_request: boolean;
  property_type: CollectionListing["property_type"];
};

const APARTMENT_CONTEXTUAL_SALE_MIN_MAD = 100_000;
const APARTMENT_CONTEXTUAL_RENT_MAX_MAD = 100_000;

export function inferContextualTransaction(input: ContextualTransactionInput): ContextualTransactionDecision {
  const contexts = [...new Set(input.discovery_transactions)];
  if (contexts.length !== 1) {
    return { transaction: null, confidence: "missing", reason: "context_conflict" };
  }

  if (input.price_amount == null || input.price_on_request) {
    return { transaction: null, confidence: "missing", reason: "missing_numeric_price" };
  }

  // Contextual inference is calibrated only for apartments for now.
  // Other property types must remain explicit until live samples establish safe price ranges.
  if (input.property_type !== "apartment") {
    return { transaction: null, confidence: "missing", reason: "unsupported_property_type_for_contextual_inference" };
  }

  const transaction = contexts[0];
  if (transaction === "sale" && input.price_amount < APARTMENT_CONTEXTUAL_SALE_MIN_MAD) {
    return { transaction: null, confidence: "missing", reason: "implausible_sale_price" };
  }
  if (transaction === "rent" && input.price_amount > APARTMENT_CONTEXTUAL_RENT_MAX_MAD) {
    return { transaction: null, confidence: "missing", reason: "implausible_rent_price" };
  }

  return { transaction, confidence: "contextual", reason: "single_context_plausible_price" };
}

export function hasMoroccanCentimeMillionPriceLanguage(description: string | null): boolean {
  if (!description) return false;
  return /\bprix\b[^.\n]{0,80}\b\d{2,3}\s+millions?\b/iu.test(description);
}
