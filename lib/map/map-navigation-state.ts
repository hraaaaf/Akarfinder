import {
  resolveCityEntity,
  resolveNeighborhoodEntity,
} from "@/lib/geo/geo-entity-registry";

export const MAP_LAYER_EXPLORE = "explore" as const;
export type MapLayer = typeof MAP_LAYER_EXPLORE;

export type MapNavigationContext = {
  q?: string;
  transaction_type?: string;
  property_type?: string;
  min_price?: string;
  max_price?: string;
  min_surface?: string;
  max_surface?: string;
  mre?: string;
  sort?: string;
  project_id?: string;
};

export type MapNavigationState = MapNavigationContext & {
  city: string;
  district?: string;
  layer: MapLayer;
};

export type MapSearchParams = Record<string, string | string[] | undefined>;

const CONTEXT_KEYS = [
  "q",
  "transaction_type",
  "property_type",
  "min_price",
  "max_price",
  "min_surface",
  "max_surface",
  "mre",
  "sort",
  "project_id",
] as const satisfies ReadonlyArray<keyof MapNavigationContext>;

function pickFirst(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

function setIfPresent(params: URLSearchParams, key: string, value?: string): void {
  if (value?.trim()) params.set(key, value.trim());
}

export function parseMapNavigationState(params: MapSearchParams): MapNavigationState {
  const rawCity = pickFirst(params.city);
  const cityEntity = rawCity && rawCity !== "all" ? resolveCityEntity(rawCity) : null;
  const city = cityEntity?.slug ?? "all";

  const rawDistrict = pickFirst(params.district);
  const districtEntity = cityEntity && rawDistrict
    ? resolveNeighborhoodEntity(cityEntity.canonical_name, rawDistrict)
    : null;

  const context: MapNavigationContext = {};
  for (const key of CONTEXT_KEYS) {
    const value = pickFirst(params[key]);
    if (value) context[key] = value;
  }

  return {
    ...context,
    city,
    district: districtEntity?.slug,
    layer: MAP_LAYER_EXPLORE,
  };
}

export function mapNavigationStateFromUrlSearchParams(params: URLSearchParams): MapNavigationState {
  const record: MapSearchParams = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return parseMapNavigationState(record);
}

export function buildMapHref(state: MapNavigationState): string {
  const params = new URLSearchParams();
  if (state.city !== "all") params.set("city", state.city);
  if (state.city !== "all" && state.district) params.set("district", state.district);
  params.set("layer", MAP_LAYER_EXPLORE);
  for (const key of CONTEXT_KEYS) setIfPresent(params, key, state[key]);
  return `/map?${params.toString()}`;
}

export function buildMapSearchHref(state: MapNavigationState): string {
  const params = new URLSearchParams();
  const cityEntity = state.city !== "all" ? resolveCityEntity(state.city) : null;
  if (cityEntity) {
    params.set("city", cityEntity.canonical_name);
    if (state.district) {
      const districtEntity = resolveNeighborhoodEntity(cityEntity.canonical_name, state.district);
      if (districtEntity) params.set("district", districtEntity.canonical_name);
    }
  }

  for (const key of CONTEXT_KEYS) setIfPresent(params, key, state[key]);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

export function buildMapProjectHref(state: MapNavigationState): string {
  const params = new URLSearchParams();
  setIfPresent(params, "project_id", state.project_id);
  const query = params.toString();
  return query ? `/mon-projet/espace?${query}` : "/mon-projet/espace";
}

export function withMapLocation(
  state: MapNavigationState,
  city: string,
  district?: string,
): MapNavigationState {
  const cityEntity = city !== "all" ? resolveCityEntity(city) : null;
  if (!cityEntity) return { ...state, city: "all", district: undefined };
  const districtEntity = district
    ? resolveNeighborhoodEntity(cityEntity.canonical_name, district)
    : null;
  return {
    ...state,
    city: cityEntity.slug,
    district: districtEntity?.slug,
    layer: MAP_LAYER_EXPLORE,
  };
}
