import type { ExactGeoTruth, GeoTruth } from "@/lib/geo/geo-truth";

export type GeoProviderKind = "nearby" | "routing" | "isochrone" | "street_imagery";
export type GeoTravelMode = "walking" | "driving";

export const GEO_PROVIDER_EVIDENCE_MAX_TTL_MS = 24 * 60 * 60 * 1000;

export type GeoProviderEvidence = {
  providerId: string;
  attribution: string;
  fetchedAt: string;
  expiresAt: string | null;
};

export type GeoProviderUnavailable = {
  status: "unavailable";
  providerId: string;
  reason: "not_configured" | "unsupported_origin" | "upstream_error" | "empty" | "invalid_evidence";
};

export type GeoCoordinate = { latitude: number; longitude: number };

export type NearbyPoi = {
  id: string;
  name: string;
  category: string;
  coordinate: GeoCoordinate;
};

export type NearbyProviderResult =
  | { status: "available"; evidence: GeoProviderEvidence; pois: NearbyPoi[] }
  | GeoProviderUnavailable;

export type RouteMeasurement = {
  distanceMeters: number;
  durationSeconds: number;
  mode: GeoTravelMode;
};

export type RoutingProviderResult =
  | { status: "available"; evidence: GeoProviderEvidence; route: RouteMeasurement }
  | GeoProviderUnavailable;

export type RouteMatrixMeasurement = RouteMeasurement & {
  destination: GeoCoordinate;
};

export type RoutingMatrixProviderResult =
  | { status: "available"; evidence: GeoProviderEvidence; routes: RouteMatrixMeasurement[] }
  | GeoProviderUnavailable;

export type IsochroneProviderResult =
  | { status: "available"; evidence: GeoProviderEvidence; geojson: unknown; minutes: number; mode: GeoTravelMode }
  | GeoProviderUnavailable;

export type StreetImageryAsset = {
  id: string;
  coordinate: GeoCoordinate;
  capturedAt: string | null;
  thumbnailUrl: string | null;
  viewerUrl: string | null;
  creatorUsername?: string | null;
};

export type StreetImageryProviderResult =
  | { status: "available"; evidence: GeoProviderEvidence; assets: StreetImageryAsset[] }
  | GeoProviderUnavailable;

export interface NearbyProvider {
  readonly id: string;
  nearby(input: { origin: GeoTruth; categories: string[]; radiusMeters: number }): Promise<NearbyProviderResult>;
}

export interface RoutingProvider {
  readonly id: string;
  route(input: { origin: ExactGeoTruth; destination: GeoCoordinate; mode: GeoTravelMode }): Promise<RoutingProviderResult>;
}

export interface RoutingMatrixProvider {
  readonly id: string;
  matrix(input: { origin: ExactGeoTruth; destinations: GeoCoordinate[]; mode: GeoTravelMode }): Promise<RoutingMatrixProviderResult>;
}

export interface IsochroneProvider {
  readonly id: string;
  isochrone(input: { origin: ExactGeoTruth; minutes: number; mode: GeoTravelMode }): Promise<IsochroneProviderResult>;
}

export interface StreetImageryProvider {
  readonly id: string;
  nearbyImagery(input: { origin: GeoTruth; radiusMeters: number }): Promise<StreetImageryProviderResult>;
}

export function hasFreshProviderEvidence(
  evidence: GeoProviderEvidence | null | undefined,
  now = new Date(),
): boolean {
  if (!evidence?.providerId.trim() || !evidence.attribution.trim() || evidence.expiresAt == null) return false;
  const fetched = Date.parse(evidence.fetchedAt);
  if (Number.isNaN(fetched) || fetched > now.getTime()) return false;
  const expires = Date.parse(evidence.expiresAt);
  if (Number.isNaN(expires) || expires < now.getTime() || expires < fetched) return false;
  return expires - fetched <= GEO_PROVIDER_EVIDENCE_MAX_TTL_MS;
}
