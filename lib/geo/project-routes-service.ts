import { buildGeoTruth, isExactGeoTruth } from "@/lib/geo/geo-truth";
import { createLivingHereProviderRegistry } from "@/lib/geo/living-here-service";
import { executeProviderFailover } from "@/lib/geo/provider-failover";
import type { GeoCoordinate, GeoTravelMode } from "@/lib/geo/provider-contracts";
import type { Listing } from "@/lib/listings/types";
import {
  buildProjectRoutesModel,
  type ProjectRoutingObservation,
  type ProjectRoutesModel,
} from "@/lib/property-detail/project-routes";
import type { SearchLocationProfile } from "@/lib/search-profile-v2/types";

type FetchLike = typeof fetch;
type RuntimeEnv = Record<string, string | undefined>;

const PROJECT_ROUTE_TIMEOUT_MS = 4_500;

const timedFetch: FetchLike = (input, init) => fetch(input, {
  ...init,
  signal: AbortSignal.timeout(PROJECT_ROUTE_TIMEOUT_MS),
});

function destinationsFromAnchors(anchors: SearchLocationProfile["anchors"]): GeoCoordinate[] {
  const seen = new Set<string>();
  const destinations: GeoCoordinate[] = [];
  for (const anchor of anchors) {
    if (!Number.isFinite(anchor.latitude) || !Number.isFinite(anchor.longitude)) continue;
    const latitude = anchor.latitude!;
    const longitude = anchor.longitude!;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) continue;
    const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    destinations.push({ latitude, longitude });
  }
  return destinations;
}

export async function buildProjectRoutesForListing(
  listing: Listing,
  anchors: SearchLocationProfile["anchors"],
  options: { env?: RuntimeEnv; fetchImpl?: FetchLike } = {},
): Promise<ProjectRoutesModel> {
  const geo = buildGeoTruth(listing);
  const destinations = destinationsFromAnchors(anchors);
  if (!isExactGeoTruth(geo) || destinations.length === 0) {
    return buildProjectRoutesModel({ geo, anchors });
  }

  const registry = createLivingHereProviderRegistry(options.env ?? process.env, options.fetchImpl ?? timedFetch);
  const observations: ProjectRoutingObservation[] = [];

  for (const mode of ["walking", "driving"] as const satisfies readonly GeoTravelMode[]) {
    const outcome = await executeProviderFailover(
      registry.routingMatrix,
      (provider) => provider.matrix({ origin: geo, destinations, mode }),
      () => new Date(),
    );
    observations.push({ mode, result: outcome.result });
  }

  return buildProjectRoutesModel({ geo, anchors, observations });
}
