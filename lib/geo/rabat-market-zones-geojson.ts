import { RABAT_MARKET_ZONES_CANARY } from "@/lib/geo/rabat-market-zones-canary";
import { validateMarketZoneRecord, type MarketZoneRecord } from "@/lib/geo/market-zone-registry";

const EXPECTED_ZONE_IDS = new Set([
  "market_zone_rabat_agdal",
  "market_zone_rabat_hay_riad",
  "market_zone_rabat_souissi",
  "market_zone_rabat_centre",
]);

export type RabatMarketZonesGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    properties: {
      zoneId: string;
      slug: string;
      displayName: string;
      semanticType: "market_zone";
      officialBoundary: false;
      canonicalNeighborhoodIds: readonly string[];
      areaKm2: number;
      publicationStatus: "canary" | "published";
    };
    geometry: MarketZoneRecord["geometry"];
  }>;
};

export type RabatMarketZonesGeoJsonDecision =
  | { enabled: false; reason: "incomplete_pilot" | "shadow_or_unreviewed" | "invalid_record" }
  | { enabled: true; reason: "reviewed_market_zones"; collection: RabatMarketZonesGeoJson };

export function decideRabatMarketZonesGeoJson(
  records: readonly MarketZoneRecord[] = RABAT_MARKET_ZONES_CANARY,
): RabatMarketZonesGeoJsonDecision {
  const ids = new Set(records.map((zone) => zone.id));
  if (records.length !== EXPECTED_ZONE_IDS.size || ids.size !== EXPECTED_ZONE_IDS.size ||
      [...EXPECTED_ZONE_IDS].some((id) => !ids.has(id))) {
    return { enabled: false, reason: "incomplete_pilot" };
  }

  if (records.some((zone) => zone.publicationStatus === "shadow" || !zone.reviewed)) {
    return { enabled: false, reason: "shadow_or_unreviewed" };
  }

  if (records.some((zone) => validateMarketZoneRecord(zone).length > 0)) {
    return { enabled: false, reason: "invalid_record" };
  }

  return {
    enabled: true,
    reason: "reviewed_market_zones",
    collection: {
      type: "FeatureCollection",
      features: records.map((zone) => ({
        type: "Feature",
        id: zone.id,
        properties: {
          zoneId: zone.id,
          slug: zone.slug,
          displayName: zone.displayName,
          semanticType: zone.semanticType,
          officialBoundary: zone.officialBoundary,
          canonicalNeighborhoodIds: zone.canonicalNeighborhoodIds,
          areaKm2: zone.areaKm2,
          publicationStatus: zone.publicationStatus as "canary" | "published",
        },
        geometry: zone.geometry,
      })),
    },
  };
}
