import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { decorateGeometryWithMarketIntelligence } from "@/lib/map/city-market-heatmap";
import type { CityMarketIntelligencePayload } from "@/lib/map/city-market-intelligence-payload";
import type { IntelligenceMode } from "@/lib/map/intelligence-scale";

export const AKARFINDER_TERRITORIAL_SOURCE_ID = "akarfinder-neighborhood-geometry";
export const AKARFINDER_TERRITORIAL_FILL_LAYER_ID = "akarfinder-neighborhood-fill";
export const AKARFINDER_TERRITORIAL_LINE_LAYER_ID = "akarfinder-neighborhood-outline";
export const AKARFINDER_TERRITORIAL_LABEL_LAYER_ID = "akarfinder-neighborhood-label";
export const AKARFINDER_MARKET_MODE_EVENT = "akarfinder:market-mode";
export const AKARFINDER_TERRITORIAL_SELECT_EVENT = "akarfinder:territorial-select";
export const AKARFINDER_CITY_ADMIN_SOURCE_ID = "akarfinder-city-admin-boundaries";
export const AKARFINDER_CITY_ADMIN_FILL_LAYER_ID = "akarfinder-city-admin-fill";
export const AKARFINDER_CITY_ADMIN_GLOW_LAYER_ID = "akarfinder-city-admin-glow";
export const AKARFINDER_CITY_ADMIN_LINE_LAYER_ID = "akarfinder-city-admin-outline";

// A calm but deliberately differentiated territorial palette. Colors distinguish
// adjacent areas only; they do not encode price, quality, demand, or confidence.
export const AKARFINDER_TERRITORIAL_PALETTE = [
  "#B8D4FF",
  "#BFE5F0",
  "#C8E5D7",
  "#E6DFC0",
  "#EBD2C8",
  "#DDD2F1",
  "#C8D1EE",
  "#BFDDE4",
] as const;

const LIGHT_BASEMAP_BACKGROUND = "#EDF3F7";
const DARK_BASEMAP_BACKGROUND = "#071426";
const DEFAULT_NEUTRAL_HEATMAP = "#D8E1E8";
const CITY_ADMIN_BOUNDARY_URL = "/data/map/morocco-flagship-city-admin-boundaries.geojson";
const MARKET_BRIDGE_CLEANUPS = new WeakMap<MapLibreMap, () => void>();
const CITY_ADMIN_LAYER_REVISIONS = new WeakMap<MapLibreMap, number>();

type TerritorialLayerOptions = {
  marketIntelligence?: boolean;
  selectedNeighborhoodId?: string | null;
  neutralColor?: string;
};

type MarketModeEventDetail = {
  city: string;
  mode: IntelligenceMode;
  transaction: "sale" | "rent";
  district?: string | null;
};

type TerritorialSelectEventDetail = {
  city: string;
  district: string;
};

function mutedLayerPaint(theme: string | undefined) {
  const dark = theme === "dark";
  return {
    background: dark ? DARK_BASEMAP_BACKGROUND : LIGHT_BASEMAP_BACKGROUND,
    land: dark ? "#0A1A2F" : "#F1F5F8",
    water: dark ? "#0B2744" : "#DCEBF4",
    road: dark ? "#21354B" : "#D8E0E7",
    roadMajor: dark ? "#2D455F" : "#C9D3DC",
    label: dark ? "#8FA3B8" : "#7A8795",
  };
}

function removeAkarFinderCityAdminSurfaces(map: MapLibreMap): void {
  if (map.getLayer(AKARFINDER_CITY_ADMIN_LINE_LAYER_ID)) map.removeLayer(AKARFINDER_CITY_ADMIN_LINE_LAYER_ID);
  if (map.getLayer(AKARFINDER_CITY_ADMIN_GLOW_LAYER_ID)) map.removeLayer(AKARFINDER_CITY_ADMIN_GLOW_LAYER_ID);
  if (map.getLayer(AKARFINDER_CITY_ADMIN_FILL_LAYER_ID)) map.removeLayer(AKARFINDER_CITY_ADMIN_FILL_LAYER_ID);
  if (map.getSource(AKARFINDER_CITY_ADMIN_SOURCE_ID)) map.removeSource(AKARFINDER_CITY_ADMIN_SOURCE_ID);
}

function cityAdminSurfaceContractElement(): HTMLElement | null {
  return typeof document === "undefined"
    ? null
    : document.querySelector<HTMLElement>("[data-p4-map-canvas]");
}

function clearCityAdminSurfaceContract(): void {
  const canvas = cityAdminSurfaceContractElement();
  canvas?.removeAttribute("data-akarfinder-city-admin-surfaces");
  canvas?.removeAttribute("data-akarfinder-city-admin-feature-count");
  canvas?.removeAttribute("data-akarfinder-city-admin-meaning");
}

function shouldShowCityAdminSurfaces(): boolean {
  if (typeof window === "undefined" || window.location.pathname !== "/map") return false;
  const params = new URLSearchParams(window.location.search);
  const city = params.get("city");
  const layer = params.get("layer") ?? "explore";
  return (!city || city === "all") && layer === "explore";
}

async function syncAkarFinderCityAdminSurfaces(map: MapLibreMap, theme?: string): Promise<void> {
  const revision = (CITY_ADMIN_LAYER_REVISIONS.get(map) ?? 0) + 1;
  CITY_ADMIN_LAYER_REVISIONS.set(map, revision);
  removeAkarFinderCityAdminSurfaces(map);
  clearCityAdminSurfaceContract();

  if (!shouldShowCityAdminSurfaces()) return;

  try {
    const response = await fetch(CITY_ADMIN_BOUNDARY_URL, {
      credentials: "same-origin",
      cache: "force-cache",
    });
    if (!response.ok || CITY_ADMIN_LAYER_REVISIONS.get(map) !== revision) return;
    const geojson = await response.json() as GeoJSON.FeatureCollection;
    if (CITY_ADMIN_LAYER_REVISIONS.get(map) !== revision) return;

    const validFeatures = geojson.features.filter((feature) => {
      const properties = feature.properties ?? {};
      return properties.meaning === "identity-only"
        && properties.admin_level === 8
        && properties.osm_type === "relation"
        && (feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon");
    });
    if (validFeatures.length !== 6) {
      throw new Error(`expected 6 verified city admin surfaces, got ${validFeatures.length}`);
    }

    map.addSource(AKARFINDER_CITY_ADMIN_SOURCE_ID, {
      type: "geojson",
      data: geojson,
    });
    map.addLayer({
      id: AKARFINDER_CITY_ADMIN_FILL_LAYER_ID,
      type: "fill",
      source: AKARFINDER_CITY_ADMIN_SOURCE_ID,
      maxzoom: 8,
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": theme === "dark" ? 0.34 : 0.30,
      },
    });
    map.addLayer({
      id: AKARFINDER_CITY_ADMIN_GLOW_LAYER_ID,
      type: "line",
      source: AKARFINDER_CITY_ADMIN_SOURCE_ID,
      maxzoom: 8,
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 4.6, 5.5, 8, 9],
        "line-opacity": theme === "dark" ? 0.28 : 0.20,
        "line-blur": 2.6,
      },
    });
    map.addLayer({
      id: AKARFINDER_CITY_ADMIN_LINE_LAYER_ID,
      type: "line",
      source: AKARFINDER_CITY_ADMIN_SOURCE_ID,
      maxzoom: 8,
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 4.6, 1.4, 8, 2.5],
        "line-opacity": 0.96,
      },
    });

    const canvas = cityAdminSurfaceContractElement();
    canvas?.setAttribute("data-akarfinder-city-admin-surfaces", "active");
    canvas?.setAttribute("data-akarfinder-city-admin-feature-count", "6");
    canvas?.setAttribute("data-akarfinder-city-admin-meaning", "identity-only");
  } catch (error) {
    console.error("[AkarFinderMap:city-admin-surfaces]", error);
    removeAkarFinderCityAdminSurfaces(map);
    clearCityAdminSurfaceContract();
  }
}

export function applyAkarFinderBasemapTreatment(map: MapLibreMap, theme?: string): void {
  const palette = mutedLayerPaint(theme);
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", palette.background);
      } else if (layer.type === "fill" && /(water|ocean|river|lake)/.test(id)) {
        map.setPaintProperty(layer.id, "fill-color", palette.water);
        map.setPaintProperty(layer.id, "fill-opacity", 0.78);
      } else if (layer.type === "fill" && /(land|park|landcover|landuse)/.test(id)) {
        map.setPaintProperty(layer.id, "fill-color", palette.land);
        map.setPaintProperty(layer.id, "fill-opacity", 0.58);
      } else if (layer.type === "line" && /(motorway|trunk|primary)/.test(id)) {
        map.setPaintProperty(layer.id, "line-color", palette.roadMajor);
        map.setPaintProperty(layer.id, "line-opacity", 0.44);
      } else if (layer.type === "line" && /(road|street|highway)/.test(id)) {
        map.setPaintProperty(layer.id, "line-color", palette.road);
        map.setPaintProperty(layer.id, "line-opacity", 0.34);
      } else if (layer.type === "symbol") {
        map.setPaintProperty(layer.id, "text-color", palette.label);
        map.setPaintProperty(layer.id, "text-opacity", 0.58);
        if (map.getPaintProperty(layer.id, "icon-opacity") !== undefined) {
          map.setPaintProperty(layer.id, "icon-opacity", 0.34);
        }
        if (map.getPaintProperty(layer.id, "text-halo-color") !== undefined) {
          map.setPaintProperty(layer.id, "text-halo-color", darkOrLightHalo(theme));
        }
      }
    } catch {
      // Third-party styles do not expose identical paint properties on every layer.
    }
  }
  void syncAkarFinderCityAdminSurfaces(map, theme);
}

function darkOrLightHalo(theme?: string) {
  return theme === "dark" ? "#071426" : "#F8FAFC";
}

function mountStage(name: string, action: () => void): void {
  try {
    action();
  } catch (error) {
    console.error(`[AkarFinderMap:${name}]`, error);
    throw error;
  }
}

function semanticFillOpacity(
  selectedNeighborhoodId: string | null | undefined,
  theme?: string,
): ExpressionSpecification {
  const selected = selectedNeighborhoodId ?? "";
  return [
    "case",
    ["==", ["get", "neighborhoodCanonicalId"], selected], theme === "dark" ? 0.84 : 0.82,
    ["boolean", ["get", "marketNeutral"], true], theme === "dark" ? 0.18 : 0.16,
    theme === "dark" ? 0.62 : 0.58,
  ];
}

function semanticLineColor(
  selectedNeighborhoodId: string | null | undefined,
  theme?: string,
): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "neighborhoodCanonicalId"], selectedNeighborhoodId ?? ""],
    "#0B63CE",
    theme === "dark" ? "#D9E8FA" : "#FFFFFF",
  ];
}

function semanticLineWidth(
  selectedNeighborhoodId: string | null | undefined,
): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "neighborhoodCanonicalId"], selectedNeighborhoodId ?? ""],
    3.4,
    1.25,
  ];
}

function geometryCitySlug(geojson: GeoJSON.FeatureCollection): string | null {
  for (const feature of geojson.features) {
    const city = feature.properties?.cityCanonicalId;
    if (typeof city === "string" && city.trim()) return city.trim().toLowerCase();
  }
  return null;
}

function currentMarketModeFromLocation(): MarketModeEventDetail {
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const layer = params.get("layer");
  const mode: IntelligenceMode = layer === "density" ? "density" : layer === "listings" ? "listings" : "price";
  return {
    city: String(params.get("city") ?? "casablanca").toLowerCase(),
    mode,
    transaction: params.get("transaction_type") === "rent" ? "rent" : "sale",
    district: params.get("district"),
  };
}

export function updateAkarFinderTerritorialSelection(
  map: MapLibreMap,
  selectedNeighborhoodId: string | null | undefined,
  theme?: string,
): void {
  if (map.getLayer(AKARFINDER_TERRITORIAL_FILL_LAYER_ID)) {
    map.setPaintProperty(
      AKARFINDER_TERRITORIAL_FILL_LAYER_ID,
      "fill-opacity",
      semanticFillOpacity(selectedNeighborhoodId, theme),
    );
  }
  if (map.getLayer(AKARFINDER_TERRITORIAL_LINE_LAYER_ID)) {
    map.setPaintProperty(
      AKARFINDER_TERRITORIAL_LINE_LAYER_ID,
      "line-color",
      semanticLineColor(selectedNeighborhoodId, theme),
    );
    map.setPaintProperty(
      AKARFINDER_TERRITORIAL_LINE_LAYER_ID,
      "line-width",
      semanticLineWidth(selectedNeighborhoodId),
    );
  }
}

function setSemanticHeatmapPaint(
  map: MapLibreMap,
  selectedNeighborhoodId: string | null | undefined,
  neutralColor: string,
  theme?: string,
): void {
  if (map.getLayer(AKARFINDER_TERRITORIAL_FILL_LAYER_ID)) {
    map.setPaintProperty(
      AKARFINDER_TERRITORIAL_FILL_LAYER_ID,
      "fill-color",
      ["coalesce", ["get", "marketFillColor"], neutralColor],
    );
  }
  updateAkarFinderTerritorialSelection(map, selectedNeighborhoodId, theme);
}

function installCasablancaMarketBridge(
  map: MapLibreMap,
  baseGeojson: GeoJSON.FeatureCollection,
  theme?: string,
): void {
  MARKET_BRIDGE_CLEANUPS.get(map)?.();
  let requestRevision = 0;

  const applyMode = async (detail: MarketModeEventDetail) => {
    if (detail.city !== "casablanca" || !map.getSource(AKARFINDER_TERRITORIAL_SOURCE_ID)) return;
    const revision = ++requestRevision;
    try {
      const response = await fetch(
        `/api/geo/market-intelligence?city=casablanca&mode=${detail.mode}&transaction=${detail.transaction}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok || revision !== requestRevision || !map.getSource(AKARFINDER_TERRITORIAL_SOURCE_ID)) return;
      const payload = await response.json() as CityMarketIntelligencePayload;
      const decorated = decorateGeometryWithMarketIntelligence(baseGeojson, payload);
      const source = map.getSource(AKARFINDER_TERRITORIAL_SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(decorated);
      setSemanticHeatmapPaint(map, detail.district, payload.legend.neutralColor, theme);
    } catch (error) {
      console.error("[AkarFinderMap:market-heatmap]", error);
      if (!map.getLayer(AKARFINDER_TERRITORIAL_FILL_LAYER_ID)) return;
      map.setPaintProperty(AKARFINDER_TERRITORIAL_FILL_LAYER_ID, "fill-color", DEFAULT_NEUTRAL_HEATMAP);
      updateAkarFinderTerritorialSelection(map, detail.district, theme);
    }
  };

  const onModeEvent = (event: Event) => {
    const detail = (event as CustomEvent<MarketModeEventDetail>).detail;
    if (!detail) return;
    void applyMode(detail);
  };

  const onClick = (event: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
    const properties = event.features?.[0]?.properties;
    if (!properties || properties.marketNeutral !== false) return;
    const district = properties.neighborhoodCanonicalId;
    if (typeof district !== "string" || !district.trim()) return;
    updateAkarFinderTerritorialSelection(map, district, theme);
    window.dispatchEvent(new CustomEvent<TerritorialSelectEventDetail>(AKARFINDER_TERRITORIAL_SELECT_EVENT, {
      detail: { city: "casablanca", district },
    }));
  };

  const onEnter = (event: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
    const properties = event.features?.[0]?.properties;
    map.getCanvas().style.cursor = properties?.marketNeutral === false ? "pointer" : "";
  };
  const onLeave = () => { map.getCanvas().style.cursor = ""; };

  window.addEventListener(AKARFINDER_MARKET_MODE_EVENT, onModeEvent);
  map.on("click", AKARFINDER_TERRITORIAL_FILL_LAYER_ID, onClick as never);
  map.on("mouseenter", AKARFINDER_TERRITORIAL_FILL_LAYER_ID, onEnter as never);
  map.on("mouseleave", AKARFINDER_TERRITORIAL_FILL_LAYER_ID, onLeave);

  const cleanup = () => {
    window.removeEventListener(AKARFINDER_MARKET_MODE_EVENT, onModeEvent);
    try {
      map.off("click", AKARFINDER_TERRITORIAL_FILL_LAYER_ID, onClick as never);
      map.off("mouseenter", AKARFINDER_TERRITORIAL_FILL_LAYER_ID, onEnter as never);
      map.off("mouseleave", AKARFINDER_TERRITORIAL_FILL_LAYER_ID, onLeave);
    } catch {
      // Style swaps can remove the target layer before cleanup.
    }
  };
  MARKET_BRIDGE_CLEANUPS.set(map, cleanup);

  const initial = currentMarketModeFromLocation();
  setSemanticHeatmapPaint(map, initial.district, DEFAULT_NEUTRAL_HEATMAP, theme);
  void applyMode(initial);
}

export function addAkarFinderTerritorialLayers(
  map: MapLibreMap,
  geojson: GeoJSON.FeatureCollection,
  theme?: string,
  options?: TerritorialLayerOptions,
): void {
  if (map.getLayer(AKARFINDER_TERRITORIAL_LABEL_LAYER_ID)) map.removeLayer(AKARFINDER_TERRITORIAL_LABEL_LAYER_ID);
  if (map.getLayer(AKARFINDER_TERRITORIAL_LINE_LAYER_ID)) map.removeLayer(AKARFINDER_TERRITORIAL_LINE_LAYER_ID);
  if (map.getLayer(AKARFINDER_TERRITORIAL_FILL_LAYER_ID)) map.removeLayer(AKARFINDER_TERRITORIAL_FILL_LAYER_ID);
  if (map.getSource(AKARFINDER_TERRITORIAL_SOURCE_ID)) map.removeSource(AKARFINDER_TERRITORIAL_SOURCE_ID);

  const citySlug = geometryCitySlug(geojson);
  const semantic = options?.marketIntelligence === true || citySlug === "casablanca";
  const neutralColor = options?.neutralColor ?? DEFAULT_NEUTRAL_HEATMAP;

  mountStage("source", () => {
    map.addSource(AKARFINDER_TERRITORIAL_SOURCE_ID, {
      type: "geojson",
      data: geojson,
    });
  });

  mountStage("fill", () => {
    map.addLayer({
      id: AKARFINDER_TERRITORIAL_FILL_LAYER_ID,
      type: "fill",
      source: AKARFINDER_TERRITORIAL_SOURCE_ID,
      paint: {
        "fill-color": semantic
          ? ["coalesce", ["get", "marketFillColor"], neutralColor]
          : [
              "match",
              ["get", "neighborhoodCanonicalId"],
              "anfa", AKARFINDER_TERRITORIAL_PALETTE[0],
              "maarif", AKARFINDER_TERRITORIAL_PALETTE[1],
              "sidi-belyout", AKARFINDER_TERRITORIAL_PALETTE[2],
              "hay-hassani", AKARFINDER_TERRITORIAL_PALETTE[3],
              "ain-chock", AKARFINDER_TERRITORIAL_PALETTE[4],
              "al-fida", AKARFINDER_TERRITORIAL_PALETTE[5],
              "mers-sultan", AKARFINDER_TERRITORIAL_PALETTE[6],
              "ain-sebaa", AKARFINDER_TERRITORIAL_PALETTE[7],
              "hay-mohammadi", AKARFINDER_TERRITORIAL_PALETTE[0],
              "roches-noires", AKARFINDER_TERRITORIAL_PALETTE[1],
              "sidi-bernoussi", AKARFINDER_TERRITORIAL_PALETTE[2],
              "sidi-moumen", AKARFINDER_TERRITORIAL_PALETTE[3],
              "moulay-rachid", AKARFINDER_TERRITORIAL_PALETTE[4],
              "sidi-othmane", AKARFINDER_TERRITORIAL_PALETTE[5],
              "ben-msick", AKARFINDER_TERRITORIAL_PALETTE[6],
              "sbata", AKARFINDER_TERRITORIAL_PALETTE[7],
              AKARFINDER_TERRITORIAL_PALETTE[0],
            ],
        "fill-opacity": semantic
          ? semanticFillOpacity(options?.selectedNeighborhoodId, theme)
          : theme === "dark" ? 0.42 : 0.66,
      },
    });
  });

  mountStage("outline", () => {
    map.addLayer({
      id: AKARFINDER_TERRITORIAL_LINE_LAYER_ID,
      type: "line",
      source: AKARFINDER_TERRITORIAL_SOURCE_ID,
      paint: {
        "line-color": semantic
          ? semanticLineColor(options?.selectedNeighborhoodId, theme)
          : theme === "dark" ? "#8CC3FF" : "#0B63CE",
        "line-width": semantic
          ? semanticLineWidth(options?.selectedNeighborhoodId)
          : ["interpolate", ["linear"], ["zoom"], 8, 1.35, 12, 2.45],
        "line-opacity": 0.96,
      },
    });
  });

  mountStage("label", () => {
    map.addLayer({
      id: AKARFINDER_TERRITORIAL_LABEL_LAYER_ID,
      type: "symbol",
      source: AKARFINDER_TERRITORIAL_SOURCE_ID,
      minzoom: 9,
      layout: {
        "text-field": ["get", "displayName"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 11.5, 12, 14.5],
        "text-font": ["Noto Sans Regular"],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": theme === "dark" ? "#E3F0FF" : "#102F55",
        "text-opacity": semantic ? 1 : 0.96,
        "text-halo-color": darkOrLightHalo(theme),
        "text-halo-width": semantic ? 2 : 1.6,
      },
    });
  });

  if (citySlug === "casablanca" && typeof window !== "undefined") {
    installCasablancaMarketBridge(map, geojson, theme);
  }
}

export function territorialColorsAreSemanticScores(): false {
  return false;
}
