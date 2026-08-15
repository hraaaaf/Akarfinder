import rabatMarketZones from "@/data/geo/rabat-market-zones-v1.geojson";
import { geometryAreaKm2 } from "@/lib/geo/geometry-area";
import type { MarketZoneRecord } from "@/lib/geo/market-zone-registry";
import type { NeighborhoodGeometry } from "@/lib/geo/neighborhood-geometry-registry";

const RETRIEVED_AT = "2026-08-15T22:28:56.421Z";

const OSM_SOURCE = {
  provider: "OpenStreetMap contributors",
  dataset: "Geofabrik Morocco OSM PBF / OpenStreetMap",
  licenseId: "ODbL-1.0",
  licenseUrl: "https://www.openstreetmap.org/copyright",
  attribution: "© OpenStreetMap contributors",
  retrievedAt: RETRIEVED_AT,
} as const;

type ZoneFeature = {
  properties: {
    zoneId: string;
    slug: string;
    displayName: string;
    canonicalNeighborhoodIds: string[];
    sourceRelationId: number;
    derivationMethod: string;
    simplificationToleranceM: number;
    seed?: {
      provider: string;
      entityType?: string;
      entityId?: number;
      longitude: number;
      latitude: number;
    };
  };
  geometry: NeighborhoodGeometry;
};

const FEATURES = (rabatMarketZones as unknown as { features: ZoneFeature[] }).features;

function aliasesFor(zoneId: string): readonly string[] {
  if (zoneId === "market_zone_rabat_hay_riad") return ["Hay Ryad", "Hay Riyad", "Riad"];
  if (zoneId === "market_zone_rabat_centre") return ["Hassan", "Centre-ville", "Centre ville"];
  return [];
}

function notesFor(feature: ZoneFeature): readonly string[] {
  const notes = [
    "Zone analytique immobilière AkarFinder, non frontière administrative officielle.",
    `Géométrie source simplifiée avec tolérance topologique de ${feature.properties.simplificationToleranceM} m.`,
  ];

  if (feature.properties.derivationMethod === "osm_admin_container_voronoi_split_v1") {
    notes.push(
      "Agdal et Hay Riad partitionnent le conteneur administratif Agdal-Riyad par séparation Voronoï à deux graines, uniquement pour l'analyse marché.",
    );
  } else {
    notes.push(
      "La géométrie v1 reprend le conteneur administratif OSM comme enveloppe analytique AkarFinder sans revendiquer une limite officielle de quartier.",
    );
  }

  if (feature.properties.seed) {
    notes.push(
      `Graine de dérivation gelée: ${feature.properties.seed.provider} ${feature.properties.seed.entityType ?? "record"} ${feature.properties.seed.entityId ?? "n/a"} @ ${feature.properties.seed.longitude},${feature.properties.seed.latitude}.`,
    );
  }

  return notes;
}

export const RABAT_MARKET_ZONES_SHADOW: readonly MarketZoneRecord[] = FEATURES.map((feature) => ({
  version: "v1",
  id: feature.properties.zoneId,
  cityCanonicalId: "rabat",
  slug: feature.properties.slug,
  displayName: feature.properties.displayName,
  aliases: aliasesFor(feature.properties.zoneId),
  semanticType: "market_zone",
  officialBoundary: false,
  canonicalNeighborhoodIds: feature.properties.canonicalNeighborhoodIds,
  geometry: feature.geometry,
  areaKm2: geometryAreaKm2(feature.geometry),
  derivationMethod: feature.properties.derivationMethod,
  evidence: [
    {
      ...OSM_SOURCE,
      sourceUrl: `https://www.openstreetmap.org/relation/${feature.properties.sourceRelationId}`,
      sourceEntityType: "osm_relation",
      sourceEntityId: feature.properties.sourceRelationId,
    },
    {
      provider: "AkarFinder",
      dataset: "Rabat market-zone derivation metadata v1",
      sourceUrl: "https://github.com/hraaaaf/Akarfinder/blob/main/data/geo/rabat-market-zones-v1.geojson",
      retrievedAt: RETRIEVED_AT,
    },
  ],
  publicationStatus: "shadow",
  reviewed: false,
  notes: notesFor(feature),
}));

export function listRabatMarketZonesShadow(): readonly MarketZoneRecord[] {
  return RABAT_MARKET_ZONES_SHADOW;
}

export function rabatMarketZonesAreShadowOnly(): boolean {
  return RABAT_MARKET_ZONES_SHADOW.every((zone) => zone.publicationStatus === "shadow" && !zone.reviewed);
}
