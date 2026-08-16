import type { Listing } from "@/lib/listings/types";
import { buildGeoTruth } from "@/lib/geo/geo-truth";
import type { StreetImageryProvider } from "@/lib/geo/provider-contracts";
import { executeProviderFailover } from "@/lib/geo/provider-failover";
import { resolveProviderOrder } from "@/lib/geo/provider-policy";
import { MapillaryStreetImageryProvider } from "@/lib/geo/providers/mapillary-street-imagery";
import {
  buildStreetRealityModel,
  STREET_REALITY_EXACT_MAX_DISTANCE_METERS,
  STREET_REALITY_NEIGHBORHOOD_MAX_DISTANCE_METERS,
  type StreetRealityModel,
} from "@/lib/geo/street-reality";

const PROVIDER_NETWORK_TIMEOUT_MS = 4_500;
type FetchLike = typeof fetch;
type RuntimeEnv = Record<string, string | undefined>;
type Clock = () => Date;

type StreetRealityProviderRegistry = {
  streetImagery: StreetImageryProvider[];
};

const timedFetch: FetchLike = (input, init) => fetch(input, {
  ...init,
  signal: AbortSignal.timeout(PROVIDER_NETWORK_TIMEOUT_MS),
});

export function createStreetRealityProviderRegistry(
  env: RuntimeEnv = process.env,
  fetchImpl?: FetchLike,
): StreetRealityProviderRegistry {
  const runtimeFetch = fetchImpl ?? timedFetch;
  const streetImagery = resolveProviderOrder("street_imagery", env).flatMap<StreetImageryProvider>((id) => {
    if (id !== "mapillary") return [];
    return [new MapillaryStreetImageryProvider({
      endpoint: env.AKAR_GEO_MAPILLARY_ENDPOINT ?? "",
      accessToken: env.AKAR_GEO_MAPILLARY_ACCESS_TOKEN ?? "",
      fetchImpl: runtimeFetch,
    })];
  });
  return { streetImagery };
}

export async function buildStreetRealityForListing(
  listing: Listing,
  options: { env?: RuntimeEnv; fetchImpl?: FetchLike; now?: Date } = {},
): Promise<StreetRealityModel> {
  const clock: Clock = () => options.now ?? new Date();
  const geo = buildGeoTruth(listing);
  if (
    geo.availability === "unavailable" ||
    geo.precision === "city_centroid" ||
    !geo.coordinate
  ) {
    return buildStreetRealityModel({ geo, imagery: null, now: clock() });
  }

  const registry = createStreetRealityProviderRegistry(options.env ?? process.env, options.fetchImpl);
  const radiusMeters = geo.precision === "exact"
    ? STREET_REALITY_EXACT_MAX_DISTANCE_METERS
    : STREET_REALITY_NEIGHBORHOOD_MAX_DISTANCE_METERS;
  const outcome = await executeProviderFailover(
    registry.streetImagery,
    (provider) => provider.nearbyImagery({ origin: geo, radiusMeters }),
    clock,
  );

  return buildStreetRealityModel({ geo, imagery: outcome.result, now: clock() });
}
