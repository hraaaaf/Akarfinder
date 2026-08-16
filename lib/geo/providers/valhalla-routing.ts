import type { ExactGeoTruth } from "@/lib/geo/geo-truth";
import type {
  GeoCoordinate,
  GeoProviderEvidence,
  GeoTravelMode,
  IsochroneProvider,
  IsochroneProviderResult,
  RoutingMatrixProvider,
  RoutingMatrixProviderResult,
  RoutingProvider,
  RoutingProviderResult,
} from "@/lib/geo/provider-contracts";

const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
const DEFAULT_EVIDENCE_TTL_MS = 60 * 60 * 1000;

type FetchLike = typeof fetch;

export type ValhallaProviderOptions = {
  endpoint: string;
  fetchImpl?: FetchLike;
  evidenceTtlMs?: number;
  attribution?: string;
  authorizationHeader?: string;
};

type ValhallaRouteResponse = {
  trip?: {
    status?: number;
    units?: string;
    summary?: { time?: number; length?: number };
  };
};

type ValhallaMatrixResponse = {
  units?: string;
  sources_to_targets?: Array<Array<{
    distance?: number | null;
    time?: number | null;
    from_index?: number;
    to_index?: number;
  }>>;
};

type GeoJsonFeatureCollection = { type: "FeatureCollection"; features: unknown[] };

function costing(mode: GeoTravelMode): "pedestrian" | "auto" {
  return mode === "walking" ? "pedestrian" : "auto";
}

function endpointUrl(base: string, path: "route" | "sources_to_targets" | "isochrone"): string {
  return `${base.replace(/\/+$/, "")}/${path}`;
}

function providerEvidence(providerId: string, attribution: string, ttlMs: number, now: Date): GeoProviderEvidence {
  return {
    providerId,
    attribution,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + Math.min(Math.max(ttlMs, 1), 86_400_000)).toISOString(),
  };
}

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { type?: unknown; features?: unknown };
  return candidate.type === "FeatureCollection" && Array.isArray(candidate.features);
}

export class ValhallaRoutingProvider implements RoutingProvider, RoutingMatrixProvider, IsochroneProvider {
  readonly id = "valhalla";
  private readonly endpoint: string;
  private readonly fetchImpl: FetchLike;
  private readonly evidenceTtlMs: number;
  private readonly attribution: string;
  private readonly authorizationHeader: string | null;

  constructor(options: ValhallaProviderOptions) {
    this.endpoint = options.endpoint.trim();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.evidenceTtlMs = options.evidenceTtlMs ?? DEFAULT_EVIDENCE_TTL_MS;
    this.attribution = options.attribution?.trim() || OSM_ATTRIBUTION;
    this.authorizationHeader = options.authorizationHeader?.trim() || null;
  }

  private headers(): HeadersInit {
    return {
      "content-type": "application/json",
      accept: "application/json",
      ...(this.authorizationHeader ? { authorization: this.authorizationHeader } : {}),
    };
  }

  async route(input: {
    origin: ExactGeoTruth;
    destination: GeoCoordinate;
    mode: GeoTravelMode;
  }): Promise<RoutingProviderResult> {
    if (!this.endpoint) return { status: "unavailable", providerId: this.id, reason: "not_configured" };

    try {
      const response = await this.fetchImpl(endpointUrl(this.endpoint, "route"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          locations: [
            { lat: input.origin.coordinate.latitude, lon: input.origin.coordinate.longitude },
            { lat: input.destination.latitude, lon: input.destination.longitude },
          ],
          costing: costing(input.mode),
          units: "kilometers",
          directions_type: "none",
        }),
        cache: "no-store",
      });
      if (!response.ok) return { status: "unavailable", providerId: this.id, reason: "upstream_error" };

      const payload = (await response.json()) as ValhallaRouteResponse;
      const time = payload.trip?.summary?.time;
      const lengthKm = payload.trip?.summary?.length;
      if (
        payload.trip?.status !== 0 ||
        typeof time !== "number" || !Number.isFinite(time) || time <= 0 ||
        typeof lengthKm !== "number" || !Number.isFinite(lengthKm) || lengthKm < 0
      ) return { status: "unavailable", providerId: this.id, reason: "empty" };

      const now = new Date();
      return {
        status: "available",
        evidence: providerEvidence(this.id, this.attribution, this.evidenceTtlMs, now),
        route: { distanceMeters: Math.round(lengthKm * 1000), durationSeconds: Math.round(time), mode: input.mode },
      };
    } catch {
      return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
    }
  }

  async matrix(input: {
    origin: ExactGeoTruth;
    destinations: GeoCoordinate[];
    mode: GeoTravelMode;
  }): Promise<RoutingMatrixProviderResult> {
    if (!this.endpoint) return { status: "unavailable", providerId: this.id, reason: "not_configured" };
    if (input.destinations.length === 0) return { status: "unavailable", providerId: this.id, reason: "empty" };

    try {
      const response = await this.fetchImpl(endpointUrl(this.endpoint, "sources_to_targets"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          sources: [{ lat: input.origin.coordinate.latitude, lon: input.origin.coordinate.longitude }],
          targets: input.destinations.map((destination) => ({ lat: destination.latitude, lon: destination.longitude })),
          costing: costing(input.mode),
          units: "kilometers",
          verbose: true,
        }),
        cache: "no-store",
      });
      if (!response.ok) return { status: "unavailable", providerId: this.id, reason: "upstream_error" };

      const payload = (await response.json()) as ValhallaMatrixResponse;
      const row = payload.sources_to_targets?.[0] ?? [];
      const routes = row.flatMap((entry, index) => {
        const destinationIndex = Number.isInteger(entry.to_index) ? entry.to_index! : index;
        const destination = input.destinations[destinationIndex];
        if (
          !destination ||
          typeof entry.distance !== "number" || !Number.isFinite(entry.distance) || entry.distance < 0 ||
          typeof entry.time !== "number" || !Number.isFinite(entry.time) || entry.time <= 0
        ) return [];
        return [{
          destination,
          distanceMeters: Math.round(entry.distance * 1000),
          durationSeconds: Math.round(entry.time),
          mode: input.mode,
        }];
      });
      if (routes.length === 0) return { status: "unavailable", providerId: this.id, reason: "empty" };

      const now = new Date();
      return {
        status: "available",
        evidence: providerEvidence(this.id, this.attribution, this.evidenceTtlMs, now),
        routes,
      };
    } catch {
      return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
    }
  }

  async isochrone(input: {
    origin: ExactGeoTruth;
    minutes: number;
    mode: GeoTravelMode;
  }): Promise<IsochroneProviderResult> {
    if (!this.endpoint) return { status: "unavailable", providerId: this.id, reason: "not_configured" };
    if (![5, 10, 15].includes(input.minutes)) return { status: "unavailable", providerId: this.id, reason: "unsupported_origin" };

    try {
      const response = await this.fetchImpl(endpointUrl(this.endpoint, "isochrone"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          locations: [{ lat: input.origin.coordinate.latitude, lon: input.origin.coordinate.longitude }],
          costing: costing(input.mode),
          contours: [{ time: input.minutes }],
          polygons: true,
          denoise: 1,
        }),
        cache: "no-store",
      });
      if (!response.ok) return { status: "unavailable", providerId: this.id, reason: "upstream_error" };

      const payload = (await response.json()) as unknown;
      if (!isFeatureCollection(payload) || payload.features.length === 0) {
        return { status: "unavailable", providerId: this.id, reason: "empty" };
      }

      const now = new Date();
      return {
        status: "available",
        evidence: providerEvidence(this.id, this.attribution, this.evidenceTtlMs, now),
        geojson: payload,
        minutes: input.minutes,
        mode: input.mode,
      };
    } catch {
      return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
    }
  }
}
