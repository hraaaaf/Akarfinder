import type { ExactGeoTruth } from "@/lib/geo/geo-truth";
import type {
  GeoCoordinate,
  GeoTravelMode,
  IsochroneProvider,
  IsochroneProviderResult,
  RoutingProvider,
  RoutingProviderResult,
} from "@/lib/geo/provider-contracts";

type FetchLike = typeof fetch;
const TTL_MS = 15 * 60 * 1000;

function costing(mode: GeoTravelMode): "pedestrian" | "auto" {
  return mode === "walking" ? "pedestrian" : "auto";
}

function evidence(providerId: string, now = Date.now()) {
  return {
    providerId,
    attribution: "Valhalla · © OpenStreetMap contributors",
    fetchedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
  };
}

export class ConfiguredValhallaProvider implements RoutingProvider, IsochroneProvider {
  readonly id = "valhalla-configured-v1";

  constructor(private readonly endpoint: string | null, private readonly fetchImpl: FetchLike = fetch) {}

  private url(path: string): string | null {
    if (!this.endpoint?.trim()) return null;
    try {
      return new URL(path, `${this.endpoint.replace(/\/$/, "")}/`).toString();
    } catch {
      return null;
    }
  }

  async route(input: {
    origin: ExactGeoTruth;
    destination: GeoCoordinate;
    mode: GeoTravelMode;
  }): Promise<RoutingProviderResult> {
    const url = this.url("route");
    if (!url) return { status: "unavailable", providerId: this.id, reason: "not_configured" };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    try {
      const response = await this.fetchImpl(url, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          locations: [
            { lat: input.origin.coordinate.latitude, lon: input.origin.coordinate.longitude },
            { lat: input.destination.latitude, lon: input.destination.longitude },
          ],
          costing: costing(input.mode),
          units: "kilometers",
        }),
      });
      if (!response.ok) return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
      const payload = await response.json() as { trip?: { summary?: { length?: number; time?: number } } };
      const lengthKm = Number(payload.trip?.summary?.length);
      const durationSeconds = Number(payload.trip?.summary?.time);
      if (!Number.isFinite(lengthKm) || lengthKm < 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return { status: "unavailable", providerId: this.id, reason: "empty" };
      }
      return {
        status: "available",
        evidence: evidence(this.id),
        route: { distanceMeters: Math.round(lengthKm * 1000), durationSeconds: Math.round(durationSeconds), mode: input.mode },
      };
    } catch {
      return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
    } finally {
      clearTimeout(timeout);
    }
  }

  async isochrone(input: {
    origin: ExactGeoTruth;
    minutes: number;
    mode: GeoTravelMode;
  }): Promise<IsochroneProviderResult> {
    const url = this.url("isochrone");
    if (!url) return { status: "unavailable", providerId: this.id, reason: "not_configured" };
    if (![5, 10, 15].includes(input.minutes)) {
      return { status: "unavailable", providerId: this.id, reason: "unsupported_origin" };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await this.fetchImpl(url, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          locations: [{ lat: input.origin.coordinate.latitude, lon: input.origin.coordinate.longitude }],
          costing: costing(input.mode),
          contours: [{ time: input.minutes }],
          polygons: true,
        }),
      });
      if (!response.ok) return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
      const geojson = await response.json() as unknown;
      if (!geojson || typeof geojson !== "object") return { status: "unavailable", providerId: this.id, reason: "empty" };
      return { status: "available", evidence: evidence(this.id), geojson, minutes: input.minutes, mode: input.mode };
    } catch {
      return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
    } finally {
      clearTimeout(timeout);
    }
  }
}
