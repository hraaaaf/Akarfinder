import type { GeoTruth } from "@/lib/geo/geo-truth";
import {
  hasFreshProviderEvidence,
  type GeoCoordinate,
  type StreetImageryAsset,
  type StreetImageryProviderResult,
} from "@/lib/geo/provider-contracts";

const EARTH_RADIUS_METERS = 6_371_008.8;
export const STREET_REALITY_EXACT_MAX_DISTANCE_METERS = 250;
export const STREET_REALITY_NEIGHBORHOOD_MAX_DISTANCE_METERS = 600;
export const STREET_REALITY_MAX_ASSETS = 6;

export type StreetRealityAsset = {
  id: string;
  coordinate: GeoCoordinate;
  distanceMeters: number;
  capturedAt: string | null;
  thumbnailUrl: string | null;
  viewerUrl: string | null;
  creatorUsername: string | null;
};

export type StreetRealityModel = {
  visibility: "full" | "context" | "hidden";
  referenceKind: "property" | "neighborhood" | null;
  referenceLabel: string | null;
  providerId: string | null;
  attribution: string | null;
  observedAt: string | null;
  maxDistanceMeters: number | null;
  assets: StreetRealityAsset[];
};

function radians(value: number): number {
  return value * Math.PI / 180;
}

export function streetRealityDistanceMeters(a: GeoCoordinate, b: GeoCoordinate): number {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

function finiteCoordinate(value: GeoCoordinate): boolean {
  return Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180;
}

function validOptionalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizedAsset(
  asset: StreetImageryAsset,
  origin: GeoCoordinate,
  maxDistanceMeters: number,
): StreetRealityAsset | null {
  if (!asset.id.trim() || !finiteCoordinate(asset.coordinate)) return null;
  const distance = streetRealityDistanceMeters(origin, asset.coordinate);
  if (!Number.isFinite(distance) || distance < 0 || distance > maxDistanceMeters) return null;

  const thumbnailUrl = validOptionalUrl(asset.thumbnailUrl);
  const viewerUrl = validOptionalUrl(asset.viewerUrl);
  if (!thumbnailUrl && !viewerUrl) return null;

  const capturedAt = asset.capturedAt && !Number.isNaN(Date.parse(asset.capturedAt))
    ? new Date(asset.capturedAt).toISOString()
    : null;
  const creatorUsername = typeof asset.creatorUsername === "string" && asset.creatorUsername.trim().length > 0
    ? asset.creatorUsername.trim()
    : null;

  return {
    id: asset.id,
    coordinate: asset.coordinate,
    distanceMeters: Math.round(distance),
    capturedAt,
    thumbnailUrl,
    viewerUrl,
    creatorUsername,
  };
}

export function buildStreetRealityModel(input: {
  geo: GeoTruth;
  imagery: StreetImageryProviderResult | null;
  now?: Date;
}): StreetRealityModel {
  const hidden: StreetRealityModel = {
    visibility: "hidden",
    referenceKind: null,
    referenceLabel: null,
    providerId: null,
    attribution: null,
    observedAt: null,
    maxDistanceMeters: null,
    assets: [],
  };

  const { geo, imagery } = input;
  if (!geo.coordinate) return hidden;
  const exact = geo.availability === "exact" && geo.precision === "exact";
  const neighborhood = geo.availability === "context_only" && geo.precision === "neighborhood_centroid";
  if (!exact && !neighborhood) return hidden;
  if (!imagery || imagery.status !== "available") return hidden;
  if (!hasFreshProviderEvidence(imagery.evidence, input.now ?? new Date())) return hidden;
  if (imagery.evidence.providerId.trim().length === 0) return hidden;

  const maxDistanceMeters = exact
    ? STREET_REALITY_EXACT_MAX_DISTANCE_METERS
    : STREET_REALITY_NEIGHBORHOOD_MAX_DISTANCE_METERS;
  const assets = imagery.assets
    .map((asset) => normalizedAsset(asset, geo.coordinate!, maxDistanceMeters))
    .filter((asset): asset is StreetRealityAsset => asset != null)
    .sort((a, b) => a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id))
    .slice(0, STREET_REALITY_MAX_ASSETS);

  if (assets.length === 0) return hidden;

  return {
    visibility: exact ? "full" : "context",
    referenceKind: exact ? "property" : "neighborhood",
    referenceLabel: exact
      ? "Vue de rue à proximité du bien"
      : `Vue de rue à proximité${geo.neighborhood ? ` — ${geo.neighborhood}` : " du quartier"}`,
    providerId: imagery.evidence.providerId,
    attribution: imagery.evidence.attribution,
    observedAt: imagery.evidence.fetchedAt,
    maxDistanceMeters,
    assets,
  };
}
