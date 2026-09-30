"use client";

export const MAPLIBRE_OVERTURE_SOURCE_ID = "akarfinder-overture-maarif-buildings";
export const MAPLIBRE_OVERTURE_SHADOW_SOFT_LAYER_ID = "akarfinder-overture-building-shadow-soft";
export const MAPLIBRE_OVERTURE_SHADOW_CONTACT_LAYER_ID = "akarfinder-overture-building-shadow-contact";
export const MAPLIBRE_OVERTURE_FOOTPRINT_EDGE_LAYER_ID = "akarfinder-overture-building-footprint-edge";
export const MAPLIBRE_OVERTURE_ESTIMATED_LAYER_ID = "akarfinder-overture-buildings-estimated";
export const MAPLIBRE_OVERTURE_EXACT_LAYER_ID = "akarfinder-overture-buildings-exact";

const OVERTURE_RUNTIME_URL = "/data/vivre-ici/maarif-overture-3d.compact.json";
const MIN_FEATURES = 4000;
const MIN_EXACT_HEIGHT_FEATURES = 700;
const MIN_LEVEL_ESTIMATED_FEATURES = 4000;

type RuntimeFeature = [
  height: number,
  minHeight: number,
  precisionCode: 0 | 1,
  kindCode: 0 | 1,
  geometryTypeCode: 0 | 1,
  coordinates: unknown,
];

type RuntimePayload = {
  v?: number;
  source?: string;
  release?: string | null;
  license?: string;
  attribution?: string;
  floorEstimateMeters?: number;
  defaultHeightInvented?: boolean;
  features?: RuntimeFeature[];
};

export type MapLibreOvertureInstallResult = {
  total: number;
  exactHeight: number;
  levelEstimated: number;
  release: string | null;
  attribution: string;
};

function finite(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function validGeometry(typeCode: 0 | 1, coordinates: unknown): boolean {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return false;
  if (typeCode === 0) return Array.isArray(coordinates[0]);
  return Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0]);
}

export async function installMapLibreOvertureBuildings(
  map: any,
  options: { beforeLayerId?: string } = {},
): Promise<MapLibreOvertureInstallResult> {
  const response = await fetch(OVERTURE_RUNTIME_URL, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Overture bundle unavailable (${response.status})`);

  const payload = (await response.json()) as RuntimePayload;
  if (
    payload.v !== 1
    || payload.source !== "Overture Maps Foundation"
    || payload.license !== "ODbL-1.0"
    || payload.defaultHeightInvented !== false
    || payload.floorEstimateMeters !== 3
    || !Array.isArray(payload.features)
  ) {
    throw new Error("Overture bundle truth contract mismatch");
  }

  let exactHeight = 0;
  let levelEstimated = 0;
  const features: any[] = [];

  for (let index = 0; index < payload.features.length; index += 1) {
    const record = payload.features[index];
    if (!Array.isArray(record) || record.length < 6) continue;

    const height = finite(record[0]);
    const minHeight = finite(record[1]) ?? 0;
    const precisionCode = record[2] === 0 ? 0 : 1;
    const kindCode = record[3] === 1 ? 1 : 0;
    const geometryTypeCode = record[4] === 1 ? 1 : 0;
    const coordinates = record[5];

    if (
      height === null || height <= 0 || height > 350
      || minHeight < 0 || minHeight > 350
      || !validGeometry(geometryTypeCode, coordinates)
    ) continue;

    const precision = precisionCode === 0 ? "exact" : "levels-estimate";
    if (precisionCode === 0) exactHeight += 1;
    else levelEstimated += 1;

    features.push({
      type: "Feature",
      id: `overture-${index}`,
      properties: {
        height,
        min_height: minHeight,
        top_height: minHeight + height,
        precision,
        kind: kindCode === 1 ? "building_part" : "building",
      },
      geometry: {
        type: geometryTypeCode === 0 ? "Polygon" : "MultiPolygon",
        coordinates,
      },
    });
  }

  if (
    features.length < MIN_FEATURES
    || exactHeight < MIN_EXACT_HEIGHT_FEATURES
    || levelEstimated < MIN_LEVEL_ESTIMATED_FEATURES
  ) {
    throw new Error(
      `Overture density contract failed: total=${features.length} exact=${exactHeight} estimated=${levelEstimated}`,
    );
  }

  if (!map.getSource(MAPLIBRE_OVERTURE_SOURCE_ID)) {
    map.addSource(MAPLIBRE_OVERTURE_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features },
      attribution: payload.attribution ?? "© OpenStreetMap contributors, Overture Maps Foundation",
    } as any);
  }

  const before = options.beforeLayerId && map.getLayer(options.beforeLayerId)
    ? options.beforeLayerId
    : undefined;

  // Decorative non-metric shadows from truthful Overture footprints only.
  // Pixel translations improve grounding/depth without altering claimed geometry or physical height.
  if (!map.getLayer(MAPLIBRE_OVERTURE_SHADOW_SOFT_LAYER_ID)) {
    map.addLayer({
      id: MAPLIBRE_OVERTURE_SHADOW_SOFT_LAYER_ID,
      type: "fill",
      source: MAPLIBRE_OVERTURE_SOURCE_ID,
      minzoom: 12.8,
      paint: {
        "fill-color": "#6D7377",
        "fill-opacity": 0.034,
        "fill-translate": [3, 4],
        "fill-translate-anchor": "viewport",
        "fill-antialias": true,
      },
    } as any, before);
  }

  if (!map.getLayer(MAPLIBRE_OVERTURE_SHADOW_CONTACT_LAYER_ID)) {
    map.addLayer({
      id: MAPLIBRE_OVERTURE_SHADOW_CONTACT_LAYER_ID,
      type: "fill",
      source: MAPLIBRE_OVERTURE_SOURCE_ID,
      minzoom: 12.8,
      paint: {
        "fill-color": "#7D746B",
        "fill-opacity": 0.048,
        "fill-translate": [1.2, 2.0],
        "fill-translate-anchor": "viewport",
        "fill-antialias": true,
      },
    } as any, before);
  }

  if (!map.getLayer(MAPLIBRE_OVERTURE_FOOTPRINT_EDGE_LAYER_ID)) {
    map.addLayer({
      id: MAPLIBRE_OVERTURE_FOOTPRINT_EDGE_LAYER_ID,
      type: "line",
      source: MAPLIBRE_OVERTURE_SOURCE_ID,
      minzoom: 15.2,
      paint: {
        "line-color": "#BEB5AA",
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 15.2, 0.12, 16.5, 0.26, 18, 0.38],
        "line-width": ["interpolate", ["linear"], ["zoom"], 15.2, 0.35, 18, 0.68],
        "line-blur": 0.08,
      },
    } as any, before);
  }

  if (!map.getLayer(MAPLIBRE_OVERTURE_ESTIMATED_LAYER_ID)) {
    map.addLayer({
      id: MAPLIBRE_OVERTURE_ESTIMATED_LAYER_ID,
      type: "fill-extrusion",
      source: MAPLIBRE_OVERTURE_SOURCE_ID,
      filter: ["==", ["get", "precision"], "levels-estimate"],
      minzoom: 12.8,
      paint: {
        "fill-extrusion-color": [
          "interpolate", ["linear"], ["get", "height"],
          3, "#F4F1ED", 12, "#EFECE7", 24, "#E9E5DF", 55, "#E0DBD4", 120, "#D4CDC5",
        ],
        "fill-extrusion-height": ["get", "top_height"],
        "fill-extrusion-base": ["get", "min_height"],
        "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 12.8, 0.29, 16, 0.31, 18, 0.33],
        "fill-extrusion-vertical-gradient": true,
      },
    } as any, before);
  }

  if (!map.getLayer(MAPLIBRE_OVERTURE_EXACT_LAYER_ID)) {
    map.addLayer({
      id: MAPLIBRE_OVERTURE_EXACT_LAYER_ID,
      type: "fill-extrusion",
      source: MAPLIBRE_OVERTURE_SOURCE_ID,
      filter: ["==", ["get", "precision"], "exact"],
      minzoom: 12.8,
      paint: {
        "fill-extrusion-color": [
          "interpolate", ["linear"], ["get", "height"],
          3, "#EEE9E2", 12, "#E5DED6", 24, "#DBD2C8", 55, "#CDC2B7", 120, "#BBAEA1",
        ],
        "fill-extrusion-height": ["get", "top_height"],
        "fill-extrusion-base": ["get", "min_height"],
        "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 12.8, 0.40, 16, 0.42, 18, 0.44],
        "fill-extrusion-vertical-gradient": true,
      },
    } as any, before);
  }

  // Avoid double geometry/z-fighting once the denser truth-safe Overture layer is available.
  if (map.getLayer("3d-buildings")) map.setLayoutProperty("3d-buildings", "visibility", "none");
  if (map.getLayer("akarfinder-target-buildings")) map.setLayoutProperty("akarfinder-target-buildings", "visibility", "none");

  map.triggerRepaint?.();

  return {
    total: features.length,
    exactHeight,
    levelEstimated,
    release: payload.release ?? null,
    attribution: payload.attribution ?? "© OpenStreetMap contributors, Overture Maps Foundation",
  };
}
