import { isExactGeoTruth, type GeoTruth } from "@/lib/geo/geo-truth";
import {
  hasFreshProviderEvidence,
  type GeoCoordinate,
  type GeoTravelMode,
  type RoutingMatrixProviderResult,
} from "@/lib/geo/provider-contracts";
import type { SearchLocationProfile } from "@/lib/search-profile-v2/types";

export type ProjectRouteStatus = "measured" | "unavailable";

export type ProjectRoute = {
  label: string;
  destination: GeoCoordinate;
  mode: GeoTravelMode;
  status: ProjectRouteStatus;
  distanceMeters: number | null;
  durationSeconds: number | null;
  maxMinutes: number | null;
  withinTarget: boolean | null;
  providerId: string | null;
  attribution: string | null;
  observedAt: string | null;
};

export type ProjectRoutesModel = {
  available: boolean;
  reason: "no_anchors" | "origin_not_exact" | "provider_unavailable" | "measured";
  routes: ProjectRoute[];
};

export type ProjectRoutingObservation = {
  mode: GeoTravelMode;
  result: RoutingMatrixProviderResult;
};

function validCoordinate(value: { latitude?: number; longitude?: number }): value is GeoCoordinate {
  return Number.isFinite(value.latitude) && Number.isFinite(value.longitude) &&
    value.latitude! >= -90 && value.latitude! <= 90 && value.longitude! >= -180 && value.longitude! <= 180;
}

function coordinateKey(value: GeoCoordinate): string {
  return `${value.latitude.toFixed(6)}:${value.longitude.toFixed(6)}`;
}

export function buildProjectRoutesModel(input: {
  geo: GeoTruth;
  anchors: SearchLocationProfile["anchors"];
  observations?: ProjectRoutingObservation[];
  now?: Date;
}): ProjectRoutesModel {
  const now = input.now ?? new Date();
  const anchors = input.anchors.filter((anchor) => anchor.label.trim() && validCoordinate(anchor));
  if (anchors.length === 0) return { available: false, reason: "no_anchors", routes: [] };

  const emptyRoutes = anchors.flatMap<ProjectRoute>((anchor) => (["walking", "driving"] as const).map((mode) => ({
    label: anchor.label.trim(),
    destination: { latitude: anchor.latitude!, longitude: anchor.longitude! },
    mode,
    status: "unavailable",
    distanceMeters: null,
    durationSeconds: null,
    maxMinutes: anchor.max_minutes ?? null,
    withinTarget: null,
    providerId: null,
    attribution: null,
    observedAt: null,
  })));

  if (!isExactGeoTruth(input.geo)) {
    return { available: false, reason: "origin_not_exact", routes: emptyRoutes };
  }

  const routeByModeAndDestination = new Map<string, Extract<RoutingMatrixProviderResult, { status: "available" }> ["routes"][number] & {
    evidence: Extract<RoutingMatrixProviderResult, { status: "available" }>["evidence"];
  }>();

  for (const observation of input.observations ?? []) {
    if (observation.result.status !== "available" || !hasFreshProviderEvidence(observation.result.evidence, now)) continue;
    for (const route of observation.result.routes) {
      if (!validCoordinate(route.destination)) continue;
      if (!Number.isFinite(route.distanceMeters) || route.distanceMeters < 0) continue;
      if (!Number.isFinite(route.durationSeconds) || route.durationSeconds <= 0) continue;
      routeByModeAndDestination.set(`${observation.mode}:${coordinateKey(route.destination)}`, {
        ...route,
        evidence: observation.result.evidence,
      });
    }
  }

  const routes = emptyRoutes.map((base) => {
    const measured = routeByModeAndDestination.get(`${base.mode}:${coordinateKey(base.destination)}`);
    if (!measured) return base;
    const maxMinutes = base.maxMinutes;
    return {
      ...base,
      status: "measured" as const,
      distanceMeters: measured.distanceMeters,
      durationSeconds: measured.durationSeconds,
      withinTarget: maxMinutes == null ? null : measured.durationSeconds <= maxMinutes * 60,
      providerId: measured.evidence.providerId,
      attribution: measured.evidence.attribution,
      observedAt: measured.evidence.fetchedAt,
    };
  });

  const measuredCount = routes.filter((route) => route.status === "measured").length;
  return measuredCount > 0
    ? { available: true, reason: "measured", routes }
    : { available: false, reason: "provider_unavailable", routes };
}
