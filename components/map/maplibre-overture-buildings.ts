"use client";

export const MAPLIBRE_OVERTURE_SOURCE_ID = "akarfinder-overture-maarif-buildings";
export const MAPLIBRE_OVERTURE_SHADOW_SOFT_LAYER_ID = "akarfinder-overture-building-shadow-soft";
export const MAPLIBRE_OVERTURE_SHADOW_CONTACT_LAYER_ID = "akarfinder-overture-building-shadow-contact";
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
        "fill-color": "#4C5660",
        "fill-opacity": 0.040,
        "fill-translate": [5, 8],
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
        "fill-color": "#46515B",
        "fill-opacity": 0.060,
        "fill-translate": [2, 3.5],
        "fill-translate-anchor": "viewport",
        "fill-antialias": true,
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
          3, "#EAE7E1", 12, "#DED8CF", 24, "#CFC6BB", 55, "#B7AA9C", 120, "#95877A",
        ],
        "fill-extrusion-height": ["get", "top_height"],
        "fill-extrusion-base": ["get", "min_height"],
        "fill-extrusion-opacity": 0.72,
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
          3, "#E5DED6", 12, "#D4C9BE", 24, "#C1B1A3", 55, "#A18D7D", 120, "#806B5C",
        ],
        "fill-extrusion-height": ["get", "top_height"],
        "fill-extrusion-base": ["get", "min_height"],
        "fill-extrusion-opacity": 0.84,
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
