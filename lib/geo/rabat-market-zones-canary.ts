import { RABAT_MARKET_ZONES_SHADOW } from "@/lib/geo/rabat-market-zones-shadow";
import { validateMarketZoneRecord, type MarketZoneRecord } from "@/lib/geo/market-zone-registry";

const PRODUCT_REVIEW_NOTE = "Revue produit C1: option B approuvée le 2026-08-16 ; publication Canary analytique autorisée, sans revendication de frontière administrative officielle.";

export const RABAT_MARKET_ZONES_CANARY: readonly MarketZoneRecord[] = RABAT_MARKET_ZONES_SHADOW.map((zone) => ({
  ...zone,
  publicationStatus: "canary",
  reviewed: true,
  notes: [...zone.notes, PRODUCT_REVIEW_NOTE],
}));

export function rabatMarketZonesCanaryAreValid(): boolean {
  return RABAT_MARKET_ZONES_CANARY.length === 4 &&
    RABAT_MARKET_ZONES_CANARY.every((zone) =>
      zone.publicationStatus === "canary" &&
      zone.reviewed === true &&
      zone.officialBoundary === false &&
      validateMarketZoneRecord(zone).length === 0,
    );
}
