// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — price semantics for the domain layer.
// Mirrors, and does not modify, the doctrine already enforced by formatPrice()
// (lib/listings/utils.ts, commit 5c94919): null/undefined/non-finite/<=0 is
// never a valid price. This module extends that doctrine with an explicit
// PriceStatus so the reason a price isn't shown is recorded, not just hidden.

import type { PriceStatus } from "./market-index-types";

export type PriceClassification = {
  status: PriceStatus;
  value: number | null;
};

// Ambiguous input shapes this classifier can recognise without inventing a
// number: a string containing a range ("500000-600000"), multiple numbers, or
// any non-numeric text that isn't a clean absence.
const RANGE_LIKE_RE = /\d\s*(?:-|–|à|to)\s*\d/i;

export function classifyPrice(raw: unknown): PriceClassification {
  if (raw === null || raw === undefined || raw === "") {
    return { status: "not_disclosed", value: null };
  }

  if (typeof raw === "string") {
    if (RANGE_LIKE_RE.test(raw)) {
      return { status: "ambiguous", value: null };
    }
    const parsed = Number(raw.replace(/[\s,]/g, ""));
    return classifyNumeric(parsed);
  }

  if (typeof raw === "number") {
    return classifyNumeric(raw);
  }

  return { status: "invalid", value: null };
}

function classifyNumeric(value: number): PriceClassification {
  if (!Number.isFinite(value)) {
    return { status: "invalid", value: null };
  }
  if (value <= 0) {
    return { status: "invalid", value: null };
  }
  return { status: "valid", value };
}

// Never invents a "best price" across sources/observations — this mission's
// domain layer has no function that compares two SourceOffers/Observations
// and picks a winner. Callers that need "the current price of this offer"
// must go through classifyPrice() on that one offer's own value only.
export function isDisplayablePrice(status: PriceStatus): status is "valid" {
  return status === "valid";
}

export function priceStatusToDisplayLabel(status: PriceStatus): string {
  if (status === "valid") {
    throw new Error("priceStatusToDisplayLabel() must not be called for a valid price -- format the number instead.");
  }
  return "Prix non communique";
}
