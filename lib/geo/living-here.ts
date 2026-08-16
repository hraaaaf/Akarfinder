import { isExactGeoTruth, type GeoTruth } from "@/lib/geo/geo-truth";
import {
  hasFreshProviderEvidence,
  type GeoCoordinate,
  type GeoTravelMode,
  type IsochroneProviderResult,
  type NearbyProviderResult,
  type RoutingProviderResult,
} from "@/lib/geo/provider-contracts";

export const LIVING_HERE_VERSION = "1.0" as const;
export const LIVING_HERE_ISOCHRONE_MINUTES = [5, 10, 15] as const;

export type LivingHereCategory =
  | "education"
  | "groceries"
  | "health"
  | "transport"
  | "food"
  | "green_sport"
  | "worship"
  | "banking"
  | "parking"
  | "shopping"
  | "coast"
  | "other";

export const LIVING_HERE_CATEGORY_LABELS: Record<LivingHereCategory, string> = {
  education: "Écoles & crèches",
  groceries: "Courses & marchés",
  health: "Santé",
  transport: "Transports",
  food: "Cafés & restaurants",
  green_sport: "Parcs & sport",
  worship: "Mosquées",
  banking: "Banques",
  parking: "Parking",
  shopping: "Centres commerciaux",
  coast: "Plage & côte",
  other: "Autres lieux",
};

const CATEGORY_PRIORITY: Record<LivingHereCategory, number> = {
  education: 0,
  groceries: 1,
  health: 2,
  transport: 3,
  green_sport: 4,
  food: 5,
  worship: 6,
  banking: 7,
  parking: 8,
  shopping: 9,
  coast: 10,
  other: 11,
};

export type LivingHereRouteObservation = {
  poiId: string;
  destination: GeoCoordinate;
  result: RoutingProviderResult;
};

export type LivingHereIsochroneObservation = {
  result: IsochroneProviderResult;
};

export type LivingHereRoute = {
  mode: GeoTravelMode;
  distanceMeters: number;
  durationSeconds: number;
  providerId: string;
  attribution: string;
  observedAt: string;
};

export type LivingHerePoi = {
  id: string;
  name: string;
  category: LivingHereCategory;
  categoryLabel: string;
  coordinate: GeoCoordinate;
  confidence: "provider_verified";
  providerId: string;
  attribution: string;
  observedAt: string;
  routes: LivingHereRoute[];
};

export type LivingHereIsochrone = {
  minutes: 5 | 10 | 15;
  mode: GeoTravelMode;
  geojson: unknown;
  providerId: string;
  attribution: string;
  observedAt: string;
};

export type LivingHereModel = {
  version: typeof LIVING_HERE_VERSION;
  listingId: string;
  visibility: "full" | "context" | "hidden";
  reason:
    | "exact_verified"
    | "neighborhood_context_only"
    | "geo_too_coarse"
    | "geo_unavailable"
    | "provider_unavailable"
    | "no_verified_pois";
  origin: {
    coordinate: GeoCoordinate | null;
    displayMode: "exact_pin" | "neighborhood_context" | "hidden";
    exact: boolean;
  };
  canShowPreciseRouteTimes: boolean;
  pois: LivingHerePoi[];
  isochrones: LivingHereIsochrone[];
  attribution: string[];
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function classifyLivingHereCategory(raw: string): LivingHereCategory {
  const value = normalize(raw);
  if (/school|kindergarten|nursery|college|university|education|ecole|creche/.test(value)) return "education";
  if (/supermarket|marketplace|market|convenience|grocery|grocer|marche/.test(value)) return "groceries";
  if (/pharmacy|clinic|hospital|doctor|health|pharmacie|hopital|clinique/.test(value)) return "health";
  if (/bus|tram|train|station|transport|rail|ferry/.test(value)) return "transport";
  if (/cafe|restaurant|fast_food|food/.test(value)) return "food";
  if (/park|playground|sport|fitness|pitch|garden|green/.test(value)) return "green_sport";
  if (/mosque|place_of_worship|worship|mosquee/.test(value)) return "worship";
  if (/bank|atm|banque/.test(value)) return "banking";
  if (/parking/.test(value)) return "parking";
  if (/mall|shopping|department_store|centre_commercial/.test(value)) return "shopping";
  if (/beach|coast|shore|plage/.test(value)) return "coast";
  return "other";
}

function finiteCoordinate(value: GeoCoordinate | null | undefined): value is GeoCoordinate {
  return Boolean(
    value &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude) &&
      value.latitude >= -90 &&
      value.latitude <= 90 &&
      value.longitude >= -180 &&
      value.longitude <= 180,
  );
}

function haversineMeters(a: GeoCoordinate, b: GeoCoordinate): number {
  const radius = 6_371_000;
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const lat1 = rad(a.latitude);
  const lat2 = rad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function sameDestination(a: GeoCoordinate, b: GeoCoordinate): boolean {
  return haversineMeters(a, b) <= 5;
}

function routeIsUsable(
  geo: GeoTruth,
  poi: { id: string; coordinate: GeoCoordinate },
  observation: LivingHereRouteObservation,
  now: Date,
): observation is LivingHereRouteObservation & { result: Extract<RoutingProviderResult, { status: "available" }> } {
  if (!isExactGeoTruth(geo)) return false;
  if (observation.poiId !== poi.id || !sameDestination(observation.destination, poi.coordinate)) return false;
  if (observation.result.status !== "available") return false;
  if (!hasFreshProviderEvidence(observation.result.evidence, now)) return false;
  const { distanceMeters, durationSeconds } = observation.result.route;
  return Number.isFinite(distanceMeters) && distanceMeters >= 0 && Number.isFinite(durationSeconds) && durationSeconds > 0;
}

function validIsochroneMinutes(value: number): value is 5 | 10 | 15 {
  return LIVING_HERE_ISOCHRONE_MINUTES.includes(value as 5 | 10 | 15);
}

function dedupePois(
  pois: Array<LivingHerePoi & { internalDistanceMeters: number }>,
): LivingHerePoi[] {
  const accepted: Array<LivingHerePoi & { internalDistanceMeters: number }> = [];
  const seenIds = new Set<string>();

  for (const poi of pois) {
    if (seenIds.has(poi.id)) continue;
    const duplicate = accepted.some(
      (candidate) =>
        candidate.category === poi.category &&
        normalize(candidate.name) === normalize(poi.name) &&
        haversineMeters(candidate.coordinate, poi.coordinate) <= 80,
    );
    if (duplicate) continue;
    seenIds.add(poi.id);
    accepted.push(poi);
  }

  accepted.sort((a, b) => {
    const category = CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category];
    if (category !== 0) return category;
    const distance = a.internalDistanceMeters - b.internalDistanceMeters;
    if (distance !== 0) return distance;
    return a.name.localeCompare(b.name, "fr");
  });

  return accepted.map(({ internalDistanceMeters: _internalDistanceMeters, ...poi }) => poi);
}

export function buildLivingHereModel(input: {
  geo: GeoTruth;
  nearby: NearbyProviderResult | null;
  routes?: LivingHereRouteObservation[];
  isochrones?: LivingHereIsochroneObservation[];
  now?: Date;
}): LivingHereModel {
  const { geo } = input;
  const now = input.now ?? new Date();

  const hidden = (reason: LivingHereModel["reason"]): LivingHereModel => ({
    version: LIVING_HERE_VERSION,
    listingId: geo.listingId,
    visibility: "hidden",
    reason,
    origin: { coordinate: null, displayMode: "hidden", exact: false },
    canShowPreciseRouteTimes: false,
    pois: [],
    isochrones: [],
    attribution: [],
  });

  if (geo.availability === "unavailable" || !finiteCoordinate(geo.coordinate)) {
    return hidden("geo_unavailable");
  }
  if (geo.precision === "city_centroid") return hidden("geo_too_coarse");

  const exact = isExactGeoTruth(geo);
  const visibility: LivingHereModel["visibility"] = exact ? "full" : "context";
  const baseReason: LivingHereModel["reason"] = exact ? "exact_verified" : "neighborhood_context_only";
  const nearby = input.nearby;

  if (nearby?.status !== "available" || !hasFreshProviderEvidence(nearby.evidence, now)) {
    return {
      ...hidden("provider_unavailable"),
      visibility,
      origin: {
        coordinate: geo.coordinate,
        displayMode: exact ? "exact_pin" : "neighborhood_context",
        exact,
      },
    };
  }

  const rawPois = nearby.pois
    .filter((poi) => poi.id.trim() && poi.name.trim() && finiteCoordinate(poi.coordinate))
    .map((poi) => {
      const category = classifyLivingHereCategory(poi.category);
      const routes = exact
        ? (input.routes ?? [])
            .filter((observation) => routeIsUsable(geo, poi, observation, now))
            .map((observation) => ({
              mode: observation.result.route.mode,
              distanceMeters: observation.result.route.distanceMeters,
              durationSeconds: observation.result.route.durationSeconds,
              providerId: observation.result.evidence.providerId,
              attribution: observation.result.evidence.attribution,
              observedAt: observation.result.evidence.fetchedAt,
            }))
            .sort((a, b) => a.mode.localeCompare(b.mode))
        : [];

      return {
        id: poi.id,
        name: poi.name.trim(),
        category,
        categoryLabel: LIVING_HERE_CATEGORY_LABELS[category],
        coordinate: poi.coordinate,
        confidence: "provider_verified" as const,
        providerId: nearby.evidence.providerId,
        attribution: nearby.evidence.attribution,
        observedAt: nearby.evidence.fetchedAt,
        routes,
        internalDistanceMeters: haversineMeters(geo.coordinate!, poi.coordinate),
      };
    });

  const pois = dedupePois(rawPois);
  if (pois.length === 0) {
    return {
      version: LIVING_HERE_VERSION,
      listingId: geo.listingId,
      visibility,
      reason: "no_verified_pois",
      origin: {
        coordinate: geo.coordinate,
        displayMode: exact ? "exact_pin" : "neighborhood_context",
        exact,
      },
      canShowPreciseRouteTimes: false,
      pois: [],
      isochrones: [],
      attribution: [nearby.evidence.attribution],
    };
  }

  const isochrones: LivingHereIsochrone[] = exact
    ? (input.isochrones ?? [])
        .flatMap(({ result }) => {
          if (
            result.status !== "available" ||
            !hasFreshProviderEvidence(result.evidence, now) ||
            !validIsochroneMinutes(result.minutes) ||
            result.geojson == null ||
            typeof result.geojson !== "object"
          ) {
            return [];
          }
          return [{
            minutes: result.minutes,
            mode: result.mode,
            geojson: result.geojson,
            providerId: result.evidence.providerId,
            attribution: result.evidence.attribution,
            observedAt: result.evidence.fetchedAt,
          }];
        })
        .sort((a, b) => a.minutes - b.minutes)
    : [];

  const attribution = Array.from(
    new Set([
      nearby.evidence.attribution,
      ...pois.flatMap((poi) => poi.routes.map((route) => route.attribution)),
      ...isochrones.map((isochrone) => isochrone.attribution),
    ].filter(Boolean)),
  );

  return {
    version: LIVING_HERE_VERSION,
    listingId: geo.listingId,
    visibility,
    reason: baseReason,
    origin: {
      coordinate: geo.coordinate,
      displayMode: exact ? "exact_pin" : "neighborhood_context",
      exact,
    },
    canShowPreciseRouteTimes: exact && pois.some((poi) => poi.routes.length > 0),
    pois,
    isochrones,
    attribution,
  };
}
