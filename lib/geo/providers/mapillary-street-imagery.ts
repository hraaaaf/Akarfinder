import type {
  GeoCoordinate,
  GeoProviderEvidence,
  StreetImageryAsset,
  StreetImageryProvider,
  StreetImageryProviderResult,
} from "@/lib/geo/provider-contracts";

const MAPILLARY_ATTRIBUTION = "Mapillary";
const DEFAULT_EVIDENCE_TTL_MS = 60 * 60 * 1000;
const MAX_EVIDENCE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RADIUS_METERS = 2_000;
const MAX_RESULTS = 30;
const EARTH_RADIUS_METERS = 6_371_008.8;

type FetchLike = typeof fetch;

type MapillaryGeometry = {
  type?: string;
  coordinates?: unknown;
};

type MapillaryImage = {
  id?: string | number;
  computed_geometry?: MapillaryGeometry;
  geometry?: MapillaryGeometry;
  captured_at?: string | number | null;
  thumb_1024_url?: string | null;
};

type MapillaryResponse = {
  data?: MapillaryImage[];
};

export type MapillaryStreetImageryProviderOptions = {
  endpoint: string;
  accessToken: string;
  fetchImpl?: FetchLike;
  evidenceTtlMs?: number;
  attribution?: string;
  now?: () => Date;
};

function finiteCoordinate(latitude: unknown, longitude: unknown): GeoCoordinate | null {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function geometryCoordinate(image: MapillaryImage): GeoCoordinate | null {
  const geometry = image.computed_geometry ?? image.geometry;
  if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
    return null;
  }
  const longitude = geometry.coordinates[0];
  const latitude = geometry.coordinates[1];
  return finiteCoordinate(latitude, longitude);
}

function validHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function capturedAtIso(value: MapillaryImage["captured_at"]): string | null {
  if (value == null) return null;
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function radians(value: number): number {
  return value * Math.PI / 180;
}

function distanceMeters(a: GeoCoordinate, b: GeoCoordinate): number {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

function boundingBox(origin: GeoCoordinate, radiusMeters: number): string {
  const radius = Math.max(25, Math.min(Math.round(radiusMeters), MAX_RADIUS_METERS));
  const latDelta = radius / 111_320;
  const cosLat = Math.max(0.01, Math.cos(radians(origin.latitude)));
  const lonDelta = radius / (111_320 * cosLat);
  const minLon = Math.max(-180, origin.longitude - lonDelta);
  const minLat = Math.max(-90, origin.latitude - latDelta);
  const maxLon = Math.min(180, origin.longitude + lonDelta);
  const maxLat = Math.min(90, origin.latitude + latDelta);
  return [minLon, minLat, maxLon, maxLat].map((value) => value.toFixed(7)).join(",");
}

function evidence(providerId: string, attribution: string, ttlMs: number, now: Date): GeoProviderEvidence {
  const boundedTtl = Math.min(Math.max(ttlMs, 1), MAX_EVIDENCE_TTL_MS);
  return {
    providerId,
    attribution,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + boundedTtl).toISOString(),
  };
}

function imageAsset(image: MapillaryImage, origin: GeoCoordinate, radiusMeters: number): StreetImageryAsset | null {
  const id = image.id == null ? "" : String(image.id).trim();
  const coordinate = geometryCoordinate(image);
  if (!id || !coordinate) return null;
  const radius = Math.max(25, Math.min(Math.round(radiusMeters), MAX_RADIUS_METERS));
  if (distanceMeters(origin, coordinate) > radius) return null;

  return {
    id: `mapillary:${id}`,
    coordinate,
    capturedAt: capturedAtIso(image.captured_at),
    thumbnailUrl: validHttpUrl(image.thumb_1024_url),
    viewerUrl: `https://www.mapillary.com/app/?pKey=${encodeURIComponent(id)}`,
  };
}

export class MapillaryStreetImageryProvider implements StreetImageryProvider {
  readonly id = "mapillary";
  private readonly endpoint: string;
  private readonly accessToken: string;
  private readonly fetchImpl: FetchLike;
  private readonly evidenceTtlMs: number;
  private readonly attribution: string;
  private readonly now: () => Date;

  constructor(options: MapillaryStreetImageryProviderOptions) {
    this.endpoint = options.endpoint.trim().replace(/\/$/, "");
    this.accessToken = options.accessToken.trim();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.evidenceTtlMs = options.evidenceTtlMs ?? DEFAULT_EVIDENCE_TTL_MS;
    this.attribution = options.attribution?.trim() || MAPILLARY_ATTRIBUTION;
    this.now = options.now ?? (() => new Date());
  }

  async nearbyImagery(input: {
    origin: { coordinate: GeoCoordinate | null; availability: string; precision: string };
    radiusMeters: number;
  }): Promise<StreetImageryProviderResult> {
    if (!this.endpoint || !this.accessToken) {
      return { status: "unavailable", providerId: this.id, reason: "not_configured" };
    }
    if (
      !input.origin.coordinate ||
      (input.origin.precision !== "exact" && input.origin.precision !== "neighborhood_centroid") ||
      (input.origin.availability !== "exact" && input.origin.availability !== "context_only")
    ) {
      return { status: "unavailable", providerId: this.id, reason: "unsupported_origin" };
    }

    const radius = Math.max(25, Math.min(Math.round(input.radiusMeters), MAX_RADIUS_METERS));
    const url = new URL(`${this.endpoint}/images`);
    url.searchParams.set("bbox", boundingBox(input.origin.coordinate, radius));
    url.searchParams.set("fields", "id,computed_geometry,geometry,captured_at,thumb_1024_url");
    url.searchParams.set("limit", String(MAX_RESULTS));

    try {
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `OAuth ${this.accessToken}`,
        },
        cache: "no-store",
      });
      if (!response.ok) {
        return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
      }

      const payload = (await response.json()) as MapillaryResponse;
      const assets = (payload.data ?? [])
        .map((image) => imageAsset(image, input.origin.coordinate!, radius))
        .filter((asset): asset is StreetImageryAsset => asset != null);

      if (assets.length === 0) {
        return { status: "unavailable", providerId: this.id, reason: "empty" };
      }

      return {
        status: "available",
        evidence: evidence(this.id, this.attribution, this.evidenceTtlMs, this.now()),
        assets,
      };
    } catch {
      return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
    }
  }
}
