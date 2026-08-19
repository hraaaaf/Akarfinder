import type { CityMarketIntelligencePayload } from "@/lib/map/city-market-intelligence-payload";

export type MarketHeatmapFeatureProperties = {
  marketMode: CityMarketIntelligencePayload["mode"];
  marketMetricValue: number | null;
  marketFillColor: string;
  marketNeutral: boolean;
  marketSampleCount: number;
  marketReliability: string | null;
};

function featureDistrictSlug(feature: GeoJSON.Feature): string | null {
  const value = feature.properties?.neighborhoodCanonicalId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function decorateGeometryWithMarketIntelligence(
  geometry: GeoJSON.FeatureCollection,
  payload: CityMarketIntelligencePayload,
): GeoJSON.FeatureCollection {
  const metricByDistrict = new Map(payload.districts.map((district) => [district.districtSlug, district]));

  return {
    ...geometry,
    features: geometry.features.map((feature) => {
      const districtSlug = featureDistrictSlug(feature);
      const metric = districtSlug ? metricByDistrict.get(districtSlug) : undefined;
      const marketProperties: MarketHeatmapFeatureProperties = {
        marketMode: payload.mode,
        marketMetricValue: metric?.metricValue ?? null,
        marketFillColor: metric?.fillColor ?? payload.legend.neutralColor,
        marketNeutral: metric?.neutral ?? true,
        marketSampleCount: metric?.sampleCount ?? 0,
        marketReliability: metric?.reliability ?? null,
      };
      return {
        ...feature,
        properties: {
          ...(feature.properties ?? {}),
          ...marketProperties,
        },
      };
    }),
  };
}

export function heatmapFeatureHasObservedMetric(feature: GeoJSON.Feature): boolean {
  return feature.properties?.marketNeutral === false && Number.isFinite(feature.properties?.marketMetricValue);
}
