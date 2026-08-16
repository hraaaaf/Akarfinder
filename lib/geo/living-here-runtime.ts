import { buildGeoTruth, isExactGeoTruth } from "@/lib/geo/geo-truth";
import {
  buildLivingHereModel,
  LIVING_HERE_ISOCHRONE_MINUTES,
  type LivingHereModel,
  type LivingHereRouteObservation,
  type LivingHereIsochroneObservation,
} from "@/lib/geo/living-here";
import { ConfiguredOverpassNearbyProvider } from "@/lib/geo/providers/configured-overpass";
import { ConfiguredValhallaProvider } from "@/lib/geo/providers/configured-valhalla";
import type { Listing } from "@/lib/listings/types";

const TARGET_CATEGORIES = [
  "education",
  "groceries",
  "health",
  "transport",
  "food",
  "green_sport",
  "worship",
  "banking",
  "parking",
  "shopping",
  "coast",
] as const;

async function mapWithConcurrency<T, R>(values: T[], limit: number, worker: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await worker(values[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => run()));
  return results;
}

export async function buildConfiguredLivingHere(listing: Listing): Promise<LivingHereModel | null> {
  if (process.env.ANN_L6_LIVING_HERE_ENABLED !== "true") return null;

  const geo = buildGeoTruth(listing);
  if (geo.availability === "unavailable" || geo.precision === "city_centroid") {
    return buildLivingHereModel({ geo, nearby: null });
  }

  const nearbyProvider = new ConfiguredOverpassNearbyProvider(process.env.AKAR_GEO_OVERPASS_ENDPOINT ?? null);
  const nearby = await nearbyProvider.nearby({
    origin: geo,
    categories: [...TARGET_CATEGORIES],
    radiusMeters: geo.availability === "exact" ? 1_800 : 2_500,
  });

  const provisional = buildLivingHereModel({ geo, nearby });
  if (!isExactGeoTruth(geo) || nearby.status !== "available" || provisional.pois.length === 0) {
    return provisional;
  }

  const navigation = new ConfiguredValhallaProvider(process.env.AKAR_GEO_VALHALLA_ENDPOINT ?? null);
  const routeTargets = provisional.pois.slice(0, 8);
  const routeJobs = routeTargets.flatMap((poi) => (["walking", "driving"] as const).map((mode) => ({ poi, mode })));
  const routes = await mapWithConcurrency(routeJobs, 4, async ({ poi, mode }): Promise<LivingHereRouteObservation> => ({
    poiId: poi.id,
    destination: poi.coordinate,
    result: await navigation.route({ origin: geo, destination: poi.coordinate, mode }),
  }));

  const isochrones = await mapWithConcurrency(
    [...LIVING_HERE_ISOCHRONE_MINUTES],
    3,
    async (minutes): Promise<LivingHereIsochroneObservation> => ({
      result: await navigation.isochrone({ origin: geo, minutes, mode: "walking" }),
    }),
  );

  return buildLivingHereModel({ geo, nearby, routes, isochrones });
}
