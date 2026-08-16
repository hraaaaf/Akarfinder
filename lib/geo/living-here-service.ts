import type { Listing } from "@/lib/listings/types";
import { buildGeoTruth, isExactGeoTruth } from "@/lib/geo/geo-truth";
import {
  buildLivingHereModel,
  LIVING_HERE_ISOCHRONE_MINUTES,
  type LivingHereIsochroneObservation,
  type LivingHereModel,
  type LivingHerePoi,
  type LivingHereRouteObservation,
} from "@/lib/geo/living-here";
import type {
  GeoCoordinate,
  IsochroneProvider,
  NearbyProvider,
  RoutingMatrixProvider,
  RoutingProviderResult,
} from "@/lib/geo/provider-contracts";
import { executeProviderFailover } from "@/lib/geo/provider-failover";
import { resolveProviderOrder } from "@/lib/geo/provider-policy";
import { OverpassNearbyProvider } from "@/lib/geo/providers/overpass-nearby";
import { ValhallaRoutingProvider } from "@/lib/geo/providers/valhalla-routing";

export const LIVING_HERE_PROVIDER_CATEGORIES = [
  "education", "groceries", "health", "transport", "food", "green_sport",
  "worship", "banking", "parking", "shopping", "coast",
] as const;

const EXACT_RADIUS_METERS = 2_500;
const NEIGHBORHOOD_RADIUS_METERS = 3_000;
const MAX_ROUTED_POIS = 12;
const MAX_ROUTED_PER_CATEGORY = 2;
const PROVIDER_NETWORK_TIMEOUT_MS = 4_500;

type FetchLike = typeof fetch;
type RuntimeEnv = Record<string, string | undefined>;
type Clock = () => Date;

type ProviderRegistry = {
  nearby: NearbyProvider[];
  routingMatrix: RoutingMatrixProvider[];
  isochrone: IsochroneProvider[];
};

const timedFetch: FetchLike = (input, init) => fetch(input, {
  ...init,
  signal: AbortSignal.timeout(PROVIDER_NETWORK_TIMEOUT_MS),
});

function valhallaProvider(env: RuntimeEnv, fetchImpl?: FetchLike): ValhallaRoutingProvider {
  return new ValhallaRoutingProvider({
    endpoint: env.AKAR_GEO_VALHALLA_ENDPOINT ?? "",
    authorizationHeader: env.AKAR_GEO_VALHALLA_AUTHORIZATION,
    fetchImpl,
  });
}

export function createLivingHereProviderRegistry(
  env: RuntimeEnv = process.env,
  fetchImpl?: FetchLike,
): ProviderRegistry {
  const runtimeFetch = fetchImpl ?? timedFetch;
  const nearby = resolveProviderOrder("nearby", env).flatMap<NearbyProvider>((id) => {
    if (id !== "overpass") return [];
    return [new OverpassNearbyProvider({ endpoint: env.AKAR_GEO_OVERPASS_ENDPOINT ?? "", fetchImpl: runtimeFetch })];
  });
  const routingMatrix = resolveProviderOrder("routing", env).flatMap<RoutingMatrixProvider>((id) => {
    if (id !== "valhalla") return [];
    return [valhallaProvider(env, runtimeFetch)];
  });
  const isochrone = resolveProviderOrder("isochrone", env).flatMap<IsochroneProvider>((id) => {
    if (id !== "valhalla") return [];
    return [valhallaProvider(env, runtimeFetch)];
  });
  return { nearby, routingMatrix, isochrone };
}

function sameCoordinate(a: GeoCoordinate, b: GeoCoordinate): boolean {
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

function selectRoutingCandidates(pois: LivingHerePoi[]): LivingHerePoi[] {
  const selected: LivingHerePoi[] = [];
  const counts = new Map<string, number>();
  for (const poi of pois) {
    if (selected.length >= MAX_ROUTED_POIS) break;
    const count = counts.get(poi.category) ?? 0;
    if (count >= MAX_ROUTED_PER_CATEGORY) continue;
    counts.set(poi.category, count + 1);
    selected.push(poi);
  }
  return selected;
}

async function collectMatrixRoutes(
  providers: RoutingMatrixProvider[],
  candidates: LivingHerePoi[],
  origin: Parameters<RoutingMatrixProvider["matrix"]>[0]["origin"],
  mode: "walking" | "driving",
  clock: Clock,
): Promise<LivingHereRouteObservation[]> {
  if (providers.length === 0 || candidates.length === 0) return [];
  const destinations = candidates.map((poi) => poi.coordinate);
  const outcome = await executeProviderFailover(
    providers,
    (provider) => provider.matrix({ origin, destinations, mode }),
    clock,
  );
  if (outcome.result.status !== "available") return [];

  const observations: LivingHereRouteObservation[] = [];
  for (const route of outcome.result.routes) {
    const poi = candidates.find((candidate) => sameCoordinate(candidate.coordinate, route.destination));
    if (!poi) continue;
    const result: RoutingProviderResult = {
      status: "available",
      evidence: outcome.result.evidence,
      route: { distanceMeters: route.distanceMeters, durationSeconds: route.durationSeconds, mode: route.mode },
    };
    observations.push({ poiId: poi.id, destination: poi.coordinate, result });
  }
  return observations;
}

async function collectIsochrones(
  providers: IsochroneProvider[],
  origin: Parameters<IsochroneProvider["isochrone"]>[0]["origin"],
  clock: Clock,
): Promise<LivingHereIsochroneObservation[]> {
  if (providers.length === 0) return [];
  const observations: LivingHereIsochroneObservation[] = [];
  for (const minutes of LIVING_HERE_ISOCHRONE_MINUTES) {
    const outcome = await executeProviderFailover(
      providers,
      (provider) => provider.isochrone({ origin, minutes, mode: "walking" }),
      clock,
    );
    observations.push({ result: outcome.result });
  }
  return observations;
}

export async function buildLivingHereForListing(
  listing: Listing,
  options: { env?: RuntimeEnv; fetchImpl?: FetchLike } = {},
): Promise<LivingHereModel> {
  const clock: Clock = () => new Date();
  const geo = buildGeoTruth(listing);

  if (geo.availability === "unavailable" || geo.precision === "city_centroid") {
    return buildLivingHereModel({ geo, nearby: null, now: clock() });
  }

  const registry = createLivingHereProviderRegistry(options.env ?? process.env, options.fetchImpl);
  const radiusMeters = isExactGeoTruth(geo) ? EXACT_RADIUS_METERS : NEIGHBORHOOD_RADIUS_METERS;
  const nearbyOutcome = await executeProviderFailover(
    registry.nearby,
    (provider) => provider.nearby({ origin: geo, categories: [...LIVING_HERE_PROVIDER_CATEGORIES], radiusMeters }),
    clock,
  );

  if (nearbyOutcome.result.status !== "available") {
    return buildLivingHereModel({ geo, nearby: nearbyOutcome.result, now: clock() });
  }

  const baseModel = buildLivingHereModel({ geo, nearby: nearbyOutcome.result, now: clock() });
  if (!isExactGeoTruth(geo) || baseModel.pois.length === 0) return baseModel;

  const candidates = selectRoutingCandidates(baseModel.pois);
  const [walkingRoutes, drivingRoutes, isochrones] = await Promise.all([
    collectMatrixRoutes(registry.routingMatrix, candidates, geo, "walking", clock),
    collectMatrixRoutes(registry.routingMatrix, candidates, geo, "driving", clock),
    collectIsochrones(registry.isochrone, geo, clock),
  ]);

  return buildLivingHereModel({
    geo,
    nearby: nearbyOutcome.result,
    routes: [...walkingRoutes, ...drivingRoutes],
    isochrones,
    now: clock(),
  });
}
