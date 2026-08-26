import type { SearchGatewayNormalizedResult } from "./search-gateway-types";

export const PRICE_TO_VERIFY_REASON = "price_to_verify";

export function isPriceToVerify(
  result: Pick<SearchGatewayNormalizedResult, "normalized_price_mad" | "display_eligibility_reason">,
): boolean {
  if (result.normalized_price_mad == null) return false;
  return (result.display_eligibility_reason ?? "")
    .split("|")
    .map((token) => token.trim())
    .includes(PRICE_TO_VERIFY_REASON);
}

export function formatPriceMad(value?: number | null): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} DH`;
}
