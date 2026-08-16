export type MarketZoneMetricRow = {
  zoneId: string;
  displayName: string;
  transactionType: string;
  areaKm2: number;
  listingCount: number;
  pricePerM2SampleCount: number;
  medianPricePerM2Mad: number | null;
  observedListingDensityPerKm2: number | null;
};

export function buildMarketZoneMetricRow(input: Omit<MarketZoneMetricRow, "observedListingDensityPerKm2">): MarketZoneMetricRow {
  const area = Number(input.areaKm2);
  const count = Number(input.listingCount);
  return {
    ...input,
    observedListingDensityPerKm2:
      Number.isFinite(area) && area > 0 && Number.isFinite(count) && count >= 0
        ? Number((count / area).toFixed(2))
        : null,
  };
}
