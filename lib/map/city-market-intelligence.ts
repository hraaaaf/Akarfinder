import { evaluateMetricReliability } from "@/lib/map/market-metric-reliability";
import type { IntelligenceMode, ReliabilityState } from "@/lib/map/intelligence-scale";

export type MarketTransaction = "sale" | "rent";
export type MarketAreaBasis = "rabat_market_zone_shadow" | "casablanca_osm_shadow" | null;

export type MarketDistrictTarget = {
  districtSlug: string;
  displayName: string;
  runtimeResolved: boolean;
  areaKm2: number | null;
  areaBasis: MarketAreaBasis;
};

export type ObservedMarketListing = {
  districtSlug: string;
  transaction: MarketTransaction;
  canonicalKey: string;
  updatedAt: string | null;
  pricePerM2: number | null;
  fresh: boolean;
  sourceDomain: string;
};

export type CityMarketMetricRow = {
  districtSlug: string;
  displayName: string;
  transactionType: MarketTransaction;
  runtimeResolved: boolean;
  areaKm2: number | null;
  areaBasis: MarketAreaBasis;
  listingCount: number | null;
  pricePerM2SampleCount: number;
  medianPricePerM2Mad: number | null;
  observedListingDensityPerKm2: number | null;
  priceReliability: ReliabilityState;
  freshnessStatus: "fresh_confirmed" | "mixed" | "unconfirmed" | "unavailable";
  snapshotVersion: string;
};

function canonicalDedupKey(value: string): string {
  return value.trim().toLowerCase().replace(/\/+$/, "");
}

export function dedupeObservedMarketListings(
  rows: readonly ObservedMarketListing[],
): ObservedMarketListing[] {
  const sorted = [...rows].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
  const deduped = new Map<string, ObservedMarketListing>();
  for (const row of sorted) {
    const key = canonicalDedupKey(row.canonicalKey);
    if (!key || deduped.has(key)) continue;
    deduped.set(key, row);
  }
  return [...deduped.values()];
}

export function aggregateObservedDistrictMetrics(input: {
  targets: readonly MarketDistrictTarget[];
  rows: readonly ObservedMarketListing[];
  snapshotVersion: string;
}): CityMarketMetricRow[] {
  const rows = dedupeObservedMarketListings(input.rows);
  const output: CityMarketMetricRow[] = [];

  for (const target of input.targets) {
    for (const transaction of ["sale", "rent"] as const) {
      if (!target.runtimeResolved) {
        output.push({
          districtSlug: target.districtSlug,
          displayName: target.displayName,
          transactionType: transaction,
          runtimeResolved: false,
          areaKm2: target.areaKm2,
          areaBasis: target.areaBasis,
          listingCount: null,
          pricePerM2SampleCount: 0,
          medianPricePerM2Mad: null,
          observedListingDensityPerKm2: null,
          priceReliability: "insufficient",
          freshnessStatus: "unavailable",
          snapshotVersion: input.snapshotVersion,
        });
        continue;
      }

      const scoped = rows.filter(
        (row) => row.districtSlug === target.districtSlug && row.transaction === transaction,
      );
      const priceObservations = scoped.flatMap((row) => row.pricePerM2 != null && Number.isFinite(row.pricePerM2) && row.pricePerM2 > 0
        ? [{ value: row.pricePerM2, fresh: row.fresh, sourceDomain: row.sourceDomain }]
        : []);
      const reliability = evaluateMetricReliability({
        listingCount: scoped.length,
        observations: priceObservations,
      });
      const density = target.areaKm2 != null && Number.isFinite(target.areaKm2) && target.areaKm2 > 0
        ? Number((scoped.length / target.areaKm2).toFixed(2))
        : null;
      const freshnessStatus = scoped.length === 0
        ? "unconfirmed"
        : scoped.every((row) => row.fresh)
          ? "fresh_confirmed"
          : scoped.some((row) => row.fresh)
            ? "mixed"
            : "unconfirmed";

      output.push({
        districtSlug: target.districtSlug,
        displayName: target.displayName,
        transactionType: transaction,
        runtimeResolved: true,
        areaKm2: target.areaKm2,
        areaBasis: target.areaBasis,
        listingCount: scoped.length,
        pricePerM2SampleCount: reliability.sampleCount,
        medianPricePerM2Mad: reliability.median,
        observedListingDensityPerKm2: density,
        priceReliability: reliability.level,
        freshnessStatus,
        snapshotVersion: input.snapshotVersion,
      });
    }
  }

  return output;
}

export function metricValueForMode(
  row: CityMarketMetricRow | undefined,
  mode: IntelligenceMode,
): number | null {
  if (!row || !row.runtimeResolved) return null;
  if (mode === "price") return row.medianPricePerM2Mad;
  if (mode === "density") return row.observedListingDensityPerKm2;
  return row.listingCount;
}

export function metricUnitForMode(mode: IntelligenceMode): "MAD/m²" | "annonces/km²" | "annonces" {
  if (mode === "price") return "MAD/m²";
  if (mode === "density") return "annonces/km²";
  return "annonces";
}
