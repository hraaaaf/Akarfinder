import type { Map as MapLibreMap } from "maplibre-gl";

export const AKARFINDER_TERRITORIAL_SOURCE_ID = "akarfinder-neighborhood-geometry";
export const AKARFINDER_TERRITORIAL_FILL_LAYER_ID = "akarfinder-neighborhood-fill";
export const AKARFINDER_TERRITORIAL_LINE_LAYER_ID = "akarfinder-neighborhood-outline";
export const AKARFINDER_TERRITORIAL_LABEL_LAYER_ID = "akarfinder-neighborhood-label";

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

export function addAkarFinderTerritorialLayers(
  map: MapLibreMap,
  geojson: GeoJSON.FeatureCollection,
  theme?: string,
): void {
  if (map.getLayer(AKARFINDER_TERRITORIAL_LABEL_LAYER_ID)) map.removeLayer(AKARFINDER_TERRITORIAL_LABEL_LAYER_ID);
  if (map.getLayer(AKARFINDER_TERRITORIAL_LINE_LAYER_ID)) map.removeLayer(AKARFINDER_TERRITORIAL_LINE_LAYER_ID);
  if (map.getLayer(AKARFINDER_TERRITORIAL_FILL_LAYER_ID)) map.removeLayer(AKARFINDER_TERRITORIAL_FILL_LAYER_ID);
  if (map.getSource(AKARFINDER_TERRITORIAL_SOURCE_ID)) map.removeSource(AKARFINDER_TERRITORIAL_SOURCE_ID);

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
        "fill-color": [
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
        "fill-opacity": theme === "dark" ? 0.42 : 0.66,
      },
    });
  });

  mountStage("outline", () => {
    map.addLayer({
      id: AKARFINDER_TERRITORIAL_LINE_LAYER_ID,
      type: "line",
      source: AKARFINDER_TERRITORIAL_SOURCE_ID,
      paint: {
        "line-color": theme === "dark" ? "#8CC3FF" : "#0B63CE",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.35, 12, 2.45],
        "line-opacity": 0.94,
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
        "text-opacity": 0.96,
        "text-halo-color": darkOrLightHalo(theme),
        "text-halo-width": 1.6,
      },
    });
  });
}

export function territorialColorsAreSemanticScores(): false {
  return false;
}
