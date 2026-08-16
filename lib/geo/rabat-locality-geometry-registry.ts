import { RABAT_MARKET_ZONES_CANARY } from "@/lib/geo/rabat-market-zones-canary";
import { validateMarketZoneRecord, type MarketZoneEvidenceSource } from "@/lib/geo/market-zone-registry";
import type { NeighborhoodGeometry } from "@/lib/geo/neighborhood-geometry-registry";
import { RABAT_ALL_PRODUCT_LOCALITIES } from "@/lib/geo/rabat-locality-registry";

export type RabatLocalityGeometryCertification = {
  localityId: string;
  sourceMarketZoneId: string;
  semanticType: "analytical_market_zone";
  officialBoundary: false;
  geometryStatus: "certified_polygon";
  certificationStatus: "certified_for_market_analytics";
  geometry: NeighborhoodGeometry;
  areaKm2: number;
  derivationMethod: string;
  evidence: readonly MarketZoneEvidenceSource[];
  c8PublicActivation: false;
};

export type RabatLocalityGeometryDecision =
  | { status: "certified"; certification: RabatLocalityGeometryCertification }
  | { status: "unresolved"; reason: "unknown_locality" | "no_certified_geometry" };

const LOCALITY_BY_ID = new Map(RABAT_ALL_PRODUCT_LOCALITIES.map((locality) => [locality.id, locality]));

export const RABAT_C8C_CERTIFIED_GEOMETRIES: readonly RabatLocalityGeometryCertification[] =
  RABAT_MARKET_ZONES_CANARY.flatMap((zone) => {
    if (
      zone.officialBoundary !== false ||
      zone.reviewed !== true ||
      (zone.publicationStatus !== "canary" && zone.publicationStatus !== "published") ||
      validateMarketZoneRecord(zone).length > 0
    ) {
      return [];
    }

    return zone.canonicalNeighborhoodIds.flatMap((localityId) => {
      const locality = LOCALITY_BY_ID.get(localityId);
      if (!locality || locality.taxonomy_status !== "certified") return [];

      return [{
        localityId,
        sourceMarketZoneId: zone.id,
        semanticType: "analytical_market_zone" as const,
        officialBoundary: false as const,
        geometryStatus: "certified_polygon" as const,
        certificationStatus: "certified_for_market_analytics" as const,
        geometry: zone.geometry,
        areaKm2: zone.areaKm2,
        derivationMethod: zone.derivationMethod,
        evidence: zone.evidence,
        c8PublicActivation: false as const,
      }];
    });
  });

const CERTIFIED_BY_LOCALITY = new Map(
  RABAT_C8C_CERTIFIED_GEOMETRIES.map((certification) => [certification.localityId, certification]),
);

export function getRabatLocalityGeometryDecision(localityId: string): RabatLocalityGeometryDecision {
  const locality = LOCALITY_BY_ID.get(localityId);
  if (!locality) return { status: "unresolved", reason: "unknown_locality" };
  const certification = CERTIFIED_BY_LOCALITY.get(localityId);
  if (!certification) return { status: "unresolved", reason: "no_certified_geometry" };
  return { status: "certified", certification };
}

export function listRabatC8CUnresolvedLocalityIds(): string[] {
  return RABAT_ALL_PRODUCT_LOCALITIES
    .filter((locality) => !CERTIFIED_BY_LOCALITY.has(locality.id))
    .map((locality) => locality.id);
}
