import type { RabatMarketZonesGeoJson } from "@/lib/geo/rabat-market-zones-geojson";
import type { MarketZoneMetricRow } from "@/lib/map/rabat-market-zone-metrics";
import {
  buildIntelligenceScale,
  type IntelligenceMode,
  type ReliabilityState,
} from "@/lib/map/intelligence-scale";

export const INTELLIGENCE_PALETTES = {
  price: ["#FDE6D8", "#F7B48A", "#ED7A55", "#C94A32"],
  density: ["#DBEAFE", "#93C5FD", "#3B82F6", "#1D4ED8"],
  listings: ["#DCFCE7", "#86EFAC", "#22C55E", "#15803D"],
  neutral: "#E5E7EB",
} as const;

export type IntelligenceMetricInput = MarketZoneMetricRow & {
  priceReliability?: ReliabilityState | null;
  freshnessStatus?: string | null;
  snapshotVersion?: string | null;
};

export type RabatIntelligenceGeoJson = {
  type: "FeatureCollection";
  properties: {
    mode: IntelligenceMode;
    transaction: string;
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
  };
  features: Array<RabatMarketZonesGeoJson["features"][number] & {
    properties: RabatMarketZonesGeoJson["features"][number]["properties"] & {
      mode: IntelligenceMode;
      transaction: string;
      metricValue: number | null;
      metricUnit: "MAD/m²" | "annonces/km²" | "annonces";
      sampleCount: number;
      reliability: ReliabilityState | null;
      neutral: boolean;
      classIndex: number | null;
      fillColor: string;
      freshnessStatus: string | null;
      snapshotVersion: string | null;
      marketMetrics: {
        priceMedianMadM2: number | null;
        priceSampleCount: number;
        priceReliability: ReliabilityState;
        listingCount: number;
        listingDensityKm2: number | null;
      };
    };
  }>;
};

function metricValue(mode: IntelligenceMode, row: IntelligenceMetricInput | undefined): number | null {
  if (!row) return null;
  if (mode === "price") return row.medianPricePerM2Mad;
  if (mode === "density") return row.observedListingDensityPerKm2;
  return row.listingCount;
}

function metricUnit(mode: IntelligenceMode): "MAD/m²" | "annonces/km²" | "annonces" {
  if (mode === "price") return "MAD/m²";
  if (mode === "density") return "annonces/km²";
  return "annonces";
}

function colorsForClassCount(mode: IntelligenceMode, classCount: number): string[] {
  if (classCount <= 0) return [];
  const palette = INTELLIGENCE_PALETTES[mode];
  if (classCount === 1) return [palette[0]];
  return Array.from({ length: classCount }, (_, index) => {
    const paletteIndex = Math.round((index * (palette.length - 1)) / (classCount - 1));
    return palette[paletteIndex];
  });
}

export function buildRabatIntelligenceGeoJson(input: {
  geometry: RabatMarketZonesGeoJson;
  metrics: readonly IntelligenceMetricInput[];
  mode: IntelligenceMode;
  transaction: string;
}): RabatIntelligenceGeoJson {
  const rows = input.metrics.filter((row) => row.transactionType === input.transaction);
  const rowByZone = new Map(rows.map((row) => [row.zoneId, row]));

  const scale = buildIntelligenceScale(
    input.mode,
    input.geometry.features.map((feature) => {
      const row = rowByZone.get(feature.properties.zoneId);
      return {
        zoneId: feature.properties.zoneId,
        value: metricValue(input.mode, row),
        reliability: input.mode === "price" ? row?.priceReliability ?? "insufficient" : null,
      };
    }),
  );
  const classByZone = new Map(scale.classes.map((entry) => [entry.zoneId, entry]));
  const colors = colorsForClassCount(input.mode, scale.legend.classCount);

  return {
    type: "FeatureCollection",
    properties: {
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
    },
    features: input.geometry.features.map((feature) => {
      const row = rowByZone.get(feature.properties.zoneId);
      const classification = classByZone.get(feature.properties.zoneId);
      const value = metricValue(input.mode, row);
      const neutral = classification?.neutral ?? true;
      const classIndex = classification?.classIndex ?? null;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          mode: input.mode,
          transaction: input.transaction,
          metricValue: value,
          metricUnit: metricUnit(input.mode),
          sampleCount: input.mode === "price" ? row?.pricePerM2SampleCount ?? 0 : row?.listingCount ?? 0,
          reliability: input.mode === "price" ? row?.priceReliability ?? "insufficient" : null,
          neutral,
          classIndex,
          fillColor: neutral || classIndex == null ? INTELLIGENCE_PALETTES.neutral : colors[classIndex],
          freshnessStatus: row?.freshnessStatus ?? null,
          snapshotVersion: row?.snapshotVersion ?? null,
          marketMetrics: {
            priceMedianMadM2: row?.medianPricePerM2Mad ?? null,
            priceSampleCount: row?.pricePerM2SampleCount ?? 0,
            priceReliability: row?.priceReliability ?? "insufficient",
            listingCount: row?.listingCount ?? 0,
            listingDensityKm2: row?.observedListingDensityPerKm2 ?? null,
          },
        },
      };
    }),
  };
}
