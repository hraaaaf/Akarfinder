import {
  metricUnitForMode,
  metricValueForMode,
  type CityMarketMetricRow,
  type MarketTransaction,
} from "@/lib/map/city-market-intelligence";
import { INTELLIGENCE_PALETTES } from "@/lib/map/intelligence-payload";
import {
  buildIntelligenceScale,
  type IntelligenceMode,
  type ReliabilityState,
} from "@/lib/map/intelligence-scale";

export type CityMarketIntelligenceDistrict = {
  districtSlug: string;
  displayName: string;
  mode: IntelligenceMode;
  transaction: MarketTransaction;
  metricValue: number | null;
  metricUnit: "MAD/m²" | "annonces/km²" | "annonces";
  sampleCount: number;
  reliability: ReliabilityState | null;
  runtimeResolved: boolean;
  neutral: boolean;
  classIndex: number | null;
  fillColor: string;
  freshnessStatus: string;
  snapshotVersion: string;
  areaKm2: number | null;
  areaBasis: CityMarketMetricRow["areaBasis"];
  marketMetrics: {
    priceMedianMadM2: number | null;
    priceSampleCount: number;
    priceReliability: ReliabilityState;
    listingCount: number | null;
    listingDensityKm2: number | null;
  };
};

export type CityMarketIntelligencePayload = {
  city: {
    slug: string;
    displayName: string;
  };
  mode: IntelligenceMode;
  transaction: MarketTransaction;
  observedMarketOnly: true;
  scaleMethod: "snapshot_quantiles_v1";
  legend: {
    availableCount: number;
    classCount: number;
    thresholds: number[];
    min: number | null;
    max: number | null;
    colors: string[];
    neutralColor: string;
  };
  districts: CityMarketIntelligenceDistrict[];
};

function colorsForClassCount(mode: IntelligenceMode, classCount: number): string[] {
  if (classCount <= 0) return [];
  const palette = INTELLIGENCE_PALETTES[mode];
  if (classCount === 1) return [palette[0]];
  return Array.from({ length: classCount }, (_, index) => {
    const paletteIndex = Math.round((index * (palette.length - 1)) / (classCount - 1));
    return palette[paletteIndex];
  });
}

export function buildCityMarketIntelligencePayload(input: {
  citySlug: string;
  cityDisplayName: string;
  metrics: readonly CityMarketMetricRow[];
  mode: IntelligenceMode;
  transaction: MarketTransaction;
}): CityMarketIntelligencePayload {
  const rows = input.metrics.filter((row) => row.transactionType === input.transaction);
  const scale = buildIntelligenceScale(
    input.mode,
    rows.map((row) => ({
      zoneId: row.districtSlug,
      value: metricValueForMode(row, input.mode),
      reliability: input.mode === "price" ? row.priceReliability : null,
    })),
  );
  const classByDistrict = new Map(scale.classes.map((entry) => [entry.zoneId, entry]));
  const colors = colorsForClassCount(input.mode, scale.legend.classCount);

  return {
    city: {
      slug: input.citySlug,
      displayName: input.cityDisplayName,
    },
    mode: input.mode,
    transaction: input.transaction,
    observedMarketOnly: true,
    scaleMethod: scale.legend.method,
    legend: {
      availableCount: scale.legend.availableCount,
      classCount: scale.legend.classCount,
      thresholds: scale.legend.thresholds,
      min: scale.legend.min,
      max: scale.legend.max,
      colors,
      neutralColor: INTELLIGENCE_PALETTES.neutral,
    },
    districts: rows.map((row) => {
      const classification = classByDistrict.get(row.districtSlug);
      const metricValue = metricValueForMode(row, input.mode);
      const neutral = classification?.neutral ?? true;
      const classIndex = classification?.classIndex ?? null;
      return {
        districtSlug: row.districtSlug,
        displayName: row.displayName,
        mode: input.mode,
        transaction: input.transaction,
        metricValue,
        metricUnit: metricUnitForMode(input.mode),
        sampleCount: input.mode === "price"
          ? row.pricePerM2SampleCount
          : row.listingCount ?? 0,
        reliability: input.mode === "price" ? row.priceReliability : null,
        runtimeResolved: row.runtimeResolved,
        neutral,
        classIndex,
        fillColor: neutral || classIndex == null
          ? INTELLIGENCE_PALETTES.neutral
          : colors[classIndex],
        freshnessStatus: row.freshnessStatus,
        snapshotVersion: row.snapshotVersion,
        areaKm2: row.areaKm2,
        areaBasis: row.areaBasis,
        marketMetrics: {
          priceMedianMadM2: row.medianPricePerM2Mad,
          priceSampleCount: row.pricePerM2SampleCount,
          priceReliability: row.priceReliability,
          listingCount: row.listingCount,
          listingDensityKm2: row.observedListingDensityPerKm2,
        },
      };
    }),
  };
}

export function formatCityMarketMetric(
  district: Pick<CityMarketIntelligenceDistrict, "metricValue" | "mode"> | null | undefined,
): string {
  const value = district?.metricValue;
  const mode = district?.mode;
  if (value == null || mode == null || !Number.isFinite(value)) return "Données insuffisantes";
  if (mode === "price") return `${Math.round(value).toLocaleString("fr-FR")} DH/m²`;
  if (mode === "density") {
    return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} annonces/km²`;
  }
  const rounded = Math.round(value);
  return `${rounded.toLocaleString("fr-FR")} annonce${rounded === 1 ? "" : "s"}`;
}
