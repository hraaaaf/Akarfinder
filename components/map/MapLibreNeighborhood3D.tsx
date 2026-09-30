"use client";

import { Layers3, LocateFixed, Minus, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AKARFINDER_MOROCCO_MAP_NAVY, territoryLightToneForKey } from "@/lib/map/akarfinder-territorial-style";
import {
  installMapLibreOvertureBuildings,
  MAPLIBRE_OVERTURE_ESTIMATED_LAYER_ID,
  MAPLIBRE_OVERTURE_EXACT_LAYER_ID,
} from "@/components/map/maplibre-overture-buildings";

type LivingHereCategory =
  | "education" | "groceries" | "health" | "transport" | "food" | "green_sport"
  | "worship" | "banking" | "parking" | "shopping" | "coast" | "other";

type ContextAnchor = {
  poi_id: string;
  name: string;
  category: LivingHereCategory;
  latitude: number;
  longitude: number;
};
type NeighborhoodContext = {
  neighborhood: string;
  anchor_count: number;
  categories: LivingHereCategory[];
  anchors: ContextAnchor[];
};
type MutablePosition = [number, number];
type ScreenPoint = { x: number; y: number; visible: boolean };
type BoundaryGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: unknown;
};

export type TargetPilotLandmark = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  tier: "flagship" | "major" | "regional" | "local" | string;
};

export type MapLibreNeighborhood3DProps = {
  citySlug: string;
  cityLabel: string;
  districtSlug: string;
  districtLabel: string;
  center: MutablePosition;
  boundaryGeometry?: BoundaryGeometry | null;
  desktopCameraOffset?: MutablePosition;
  targetComposition?: "boundary" | "context";
  reserveRail?: boolean;
  targetPilotLandmarks?: readonly TargetPilotLandmark[];
};

const OPENFREEMAP_VECTOR = "https://tiles.openfreemap.org/planet";
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const OPENFREEMAP_TARGET_STYLE = "https://tiles.openfreemap.org/styles/bright";
const RTL_TEXT_PLUGIN_URL = "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js";
let rtlTextPluginPromise: Promise<void> | null = null;

function isArabicText(value: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value);
}

async function ensureMapLibreRtlText(maplibregl: any): Promise<"loaded" | "error"> {
  try {
    const status = typeof maplibregl.getRTLTextPluginStatus === "function"
      ? maplibregl.getRTLTextPluginStatus()
      : "unavailable";
    if (status === "loaded") return "loaded";
    if (!rtlTextPluginPromise) {
      rtlTextPluginPromise = Promise.resolve(maplibregl.setRTLTextPlugin(RTL_TEXT_PLUGIN_URL, false));
    }
    await rtlTextPluginPromise;
    return maplibregl.getRTLTextPluginStatus?.() === "loaded" ? "loaded" : "error";
  } catch (error) {
    console.error("[vivre-ici-maplibre-rtl] plugin failed", error);
    return "error";
  }
}
const FOCUS_SOURCE_ID = "akarfinder-neighborhood-focus";
const FOCUS_GLOW_LAYER_ID = "akarfinder-neighborhood-focus-glow";
const FOCUS_RING_LAYER_ID = "akarfinder-neighborhood-focus-ring";
const CONTEXT_FOOTPRINT_SOURCE_ID = "akarfinder-target-context-footprint";
const CONTEXT_FOCUS_MASK_SOURCE_ID = "akarfinder-target-context-focus-mask";
const CONTEXT_FOCUS_MASK_LAYER_ID = "akarfinder-target-context-focus-mask";
const CONTEXT_FOOTPRINT_FILL_LAYER_ID = "akarfinder-target-context-footprint-fill";
const CONTEXT_FOOTPRINT_HALO_LAYER_ID = "akarfinder-target-context-footprint-halo";
const CONTEXT_FOOTPRINT_SHADOW_LAYER_ID = "akarfinder-target-context-footprint-shadow";
const CONTEXT_FOOTPRINT_LINE_LAYER_ID = "akarfinder-target-context-footprint-line";
const CONTEXT_FOOTPRINT_HIGHLIGHT_LAYER_ID = "akarfinder-target-context-footprint-highlight";

const CATEGORY_META: Record<LivingHereCategory, { label: string; color: string }> = {
  education: { label: "Écoles", color: "#2f80ed" }, groceries: { label: "Courses", color: "#7b61ff" },
  health: { label: "Santé", color: "#df5a56" }, transport: { label: "Transports", color: "#2979d3" },
  food: { label: "Cafés & restaurants", color: "#e8872d" }, green_sport: { label: "Parcs & sport", color: "#3c9a63" },
  worship: { label: "Mosquées", color: "#2b8f7b" }, banking: { label: "Banques", color: "#667085" },
  parking: { label: "Parking", color: "#4f6f8f" }, shopping: { label: "Shopping", color: "#8b5cf6" },
  coast: { label: "Côte", color: "#3b82c4" }, other: { label: "Autres", color: "#6b7280" },
};

function collectBoundaryPositions(value: unknown, output: MutablePosition[]): void {
  if (!Array.isArray(value)) return;
  if (
    value.length >= 2
    && typeof value[0] === "number"
    && Number.isFinite(value[0])
    && typeof value[1] === "number"
    && Number.isFinite(value[1])
  ) {
    output.push([value[0], value[1]]);
    return;
  }
  for (const item of value) collectBoundaryPositions(item, output);
}

function getBoundaryBounds(geometry: BoundaryGeometry | null): [MutablePosition, MutablePosition] | null {
  if (!geometry) return null;
  const positions: MutablePosition[] = [];
  collectBoundaryPositions(geometry.coordinates, positions);
  if (!positions.length) return null;
  let minLng = positions[0][0];
  let maxLng = positions[0][0];
  let minLat = positions[0][1];
  let maxLat = positions[0][1];
  for (const [lng, lat] of positions.slice(1)) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

function buildVerifiedPointHull(points: MutablePosition[]): MutablePosition[] | null {
  const unique = Array.from(
    new Map(points.map(([lng, lat]) => [`${lng.toFixed(7)}:${lat.toFixed(7)}`, [lng, lat] as MutablePosition])).values(),
  ).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (unique.length < 3) return null;

  const cross = (o: MutablePosition, a: MutablePosition, b: MutablePosition) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: MutablePosition[] = [];
  for (const point of unique) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }

  const upper: MutablePosition[] = [];
  for (const point of [...unique].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }

  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  return hull.length >= 3 ? [...hull, hull[0]] : null;
}

function expandContextHull(hull: MutablePosition[], scale = 1.50): MutablePosition[] {
  const distinct = hull.slice(0, -1);
  if (distinct.length < 3) return hull;
  const centroid: MutablePosition = [
    distinct.reduce((sum, point) => sum + point[0], 0) / distinct.length,
    distinct.reduce((sum, point) => sum + point[1], 0) / distinct.length,
  ];
  const expanded = distinct.map(([lng, lat]) => [
    centroid[0] + (lng - centroid[0]) * scale,
    centroid[1] + (lat - centroid[1]) * scale,
  ] as MutablePosition);
  return [...expanded, expanded[0]];
}

function contextCameraForViewport(desktop: boolean) {
  return desktop
    ? { zoom: 14.30, pitch: 58, bearing: -24 }
    : { zoom: 14.16, pitch: 52, bearing: -18 };
}

function focusNeighborhoodMap(
  map: any,
  geometry: BoundaryGeometry | null,
  center: MutablePosition,
  desktopCameraOffset: MutablePosition,
  composition: "boundary" | "context",
  desktop: boolean,
  duration: number,
): void {
  const bounds = getBoundaryBounds(geometry);
  if (bounds && composition === "boundary") {
    map.fitBounds(bounds, {
      padding: desktop
        ? { top: 108, right: 82, bottom: 76, left: 82 }
        : { top: 126, right: 26, bottom: 190, left: 26 },
      maxZoom: desktop ? 14.25 : 14.2,
      pitch: desktop ? 8 : 0,
      bearing: 0,
      duration,
    });
    return;
  }
  const targetCenter: MutablePosition = desktop
    ? [center[0] + desktopCameraOffset[0], center[1] + desktopCameraOffset[1]]
    : center;
  const contextual = composition === "context";
  const contextCamera = contextCameraForViewport(desktop);
  map.easeTo({
    center: targetCenter,
    zoom: contextual ? contextCamera.zoom : (desktop ? 13.55 : 13.8),
    pitch: contextual ? contextCamera.pitch : (desktop ? 18 : 8),
    bearing: contextual ? contextCamera.bearing : 0,
    duration,
  });
}

export function MapLibreNeighborhood3D({
  citySlug,
  cityLabel,
  districtSlug,
  districtLabel,
  center,
  boundaryGeometry = null,
  desktopCameraOffset = [0, 0],
  targetComposition = "boundary",
  reserveRail = false,
  targetPilotLandmarks = [],
}: MapLibreNeighborhood3DProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [renderState, setRenderState] = useState<"loading" | "ready" | "error">("loading");
  const [sourceState, setSourceState] = useState<"loading" | "available" | "unavailable">("loading");
  const [buildingCount, setBuildingCount] = useState(0);
  const [buildingFootprintCount, setBuildingFootprintCount] = useState(0);
  const [overtureState, setOvertureState] = useState<"idle" | "loading" | "available" | "unavailable">("idle");
  const [overtureTotalCount, setOvertureTotalCount] = useState(0);
  const [overtureExactCount, setOvertureExactCount] = useState(0);
  const [overtureEstimatedCount, setOvertureEstimatedCount] = useState(0);
  const [overtureRelease, setOvertureRelease] = useState<string | null>(null);
  const [contextState, setContextState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [context, setContext] = useState<NeighborhoodContext | null>(null);
  const [activeCategory, setActiveCategory] = useState<LivingHereCategory | "all">("all");
  const [screenPoints, setScreenPoints] = useState<Record<string, ScreenPoint>>({});
  const [centerPoint, setCenterPoint] = useState<ScreenPoint | null>(null);
  const [rtlStatus, setRtlStatus] = useState<"loading" | "loaded" | "error">("loading");
  const isMaarifTargetPilot = citySlug === "casablanca" && districtSlug === "maarif";
  const districtTone = territoryLightToneForKey(districtSlug);

  const restoreCamera = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    focusNeighborhoodMap(map, boundaryGeometry, center, desktopCameraOffset, targetComposition, window.innerWidth >= 1024, 650);
  };

  const changeZoom = (delta: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.easeTo({ zoom: Math.max(11, Math.min(19, map.getZoom() + delta)), duration: 260 });
  };

  useEffect(() => {
    let cancelled = false;
    setContextState("loading");
    void fetch(`/api/geo/neighborhood-context?city=${encodeURIComponent(citySlug)}&district=${encodeURIComponent(districtSlug)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`context ${response.status}`);
        const payload = await response.json();
        if (payload?.status !== "ok" || !payload?.context) throw new Error("context unavailable");
        if (!cancelled) {
          setContext(payload.context as NeighborhoodContext);
          setContextState("ready");
        }
      })
      .catch(() => { if (!cancelled) setContextState("unavailable"); });
    return () => { cancelled = true; };
  }, [citySlug, districtSlug]);

  useEffect(() => {
    let disposed = false;
    let map: any = null;

    void import("maplibre-gl")
      .then(async (maplibregl) => {
        const rtl = await ensureMapLibreRtlText(maplibregl);
        if (disposed || !mapRef.current) return;
        setRtlStatus(rtl);
        if (rtl !== "loaded") {
          setRenderState("error");
          return;
        }
        const desktop = window.innerWidth >= 1024;
        const targetCenter: MutablePosition = desktop
          ? [center[0] + desktopCameraOffset[0], center[1] + desktopCameraOffset[1]]
          : center;
        const contextual = targetComposition === "context";
        const contextCamera = contextCameraForViewport(desktop);
        map = new maplibregl.Map({
          container: mapRef.current,
          center: targetCenter,
          zoom: contextual ? contextCamera.zoom : (desktop ? 13.55 : 13.8),
          pitch: contextual ? contextCamera.pitch : (desktop ? 18 : 8),
          bearing: contextual ? contextCamera.bearing : 0,
          attributionControl: false,
          canvasContextAttributes: { antialias: true },
          style: isMaarifTargetPilot && targetComposition === "context"
            ? OPENFREEMAP_TARGET_STYLE
            : OPENFREEMAP_STYLE,
        } as any);
        mapInstanceRef.current = map;

        map.once("load", () => {
          if (disposed) return;
          try {
            if (isMaarifTargetPilot && targetComposition === "context") {
              map.setLight({
                anchor: "viewport",
                color: "#FFF7EF",
                intensity: 0.62,
                position: [1.15, 215, 36],
              });
              for (const layer of map.getStyle().layers ?? []) {
                const id = String(layer.id ?? "").toLowerCase();
                try {
                  if (layer.type === "background") {
                    map.setPaintProperty(layer.id, "background-color", "#FBF8F3");
                  }
                  if ((layer.type === "fill" || layer.type === "line") && /building/.test(id)) {
                    // The target layer below owns building footprints. Hiding duplicate base footprints
                    // keeps real render_height extrusions legible without inventing synthetic heights.
                    map.setLayoutProperty(layer.id, "visibility", "none");
                  }
                  if (
                    (layer.type === "fill" && /(water|ocean|sea|park|landuse|landcover)/.test(id))
                    || (layer.type === "line" && /(coast|shore|water|road|street|highway|motorway|trunk|primary|secondary|tertiary)/.test(id))
                  ) {
                    map.setLayoutProperty(layer.id, "visibility", "none");
                  }
                  if (layer.type === "symbol") {
                    // Maârif owns its typographic hierarchy. Suppress all native basemap symbols
                    // so neighborhood/place/POI labels cannot compete with AkarFinder labels.
                    // Structural road names are reintroduced below through AkarFinder-controlled
                    // transportation_name layers with our own typography and collision rules.
                    map.setLayoutProperty(layer.id, "visibility", "none");
                  }
                } catch {
                  // Style-layer capabilities vary; keep the base style when a paint property is unsupported.
                }
              }
            }
            if (!map.getSource("akarfinder-openfreemap")) {
              map.addSource("akarfinder-openfreemap", {
                type: "vector",
                url: OPENFREEMAP_VECTOR,
                attribution: "© OpenStreetMap contributors · OpenFreeMap",
              });
            }

            if (isMaarifTargetPilot && targetComposition === "context") {
              const source = "akarfinder-openfreemap";

              if (!map.hasImage("akarfinder-water-texture")) {
                const size = 96;
                const tau = Math.PI * 2;
                const data = new Uint8Array(size * size * 4);
                for (let y = 0; y < size; y += 1) {
                  for (let x = 0; x < size; x += 1) {
                    const index = (y * size + x) * 4;
                    const nx = x / size;
                    const ny = y / size;
                    const waveA = Math.sin(tau * ((2 * nx) + ny)) * 4.0;
                    const waveB = Math.cos(tau * (nx - (3 * ny))) * 2.5;
                    const waveC = Math.sin(tau * ((4 * nx) + (2 * ny))) * 1.45;
                    const foamBand = Math.sin(tau * ((5 * nx) + (2 * ny)))
                      + Math.cos(tau * ((2 * nx) - (4 * ny)));
                    const foamLift = foamBand > 1.64 ? 5.0 : foamBand > 1.40 ? 2.5 : 0;
                    const grain = (
                      Math.sin(tau * ((11 * nx) + (7 * ny)))
                      + Math.cos(tau * ((7 * nx) - (13 * ny)))
                    ) * 0.45;
                    const delta = waveA + waveB + waveC + foamLift + grain;
                    data[index] = 172 + Math.round(delta * 0.22);
                    data[index + 1] = 205 + Math.round(delta * 0.24);
                    data[index + 2] = 212 + Math.round(delta * 0.26);
                    data[index + 3] = 255;
                  }
                }
                map.addImage("akarfinder-water-texture", { width: size, height: size, data }, { pixelRatio: 2 });
              }

              map.addLayer({
                id: "akarfinder-target-water",
                type: "fill",
                source,
                "source-layer": "water",
                paint: {
                  "fill-pattern": "akarfinder-water-texture",
                  "fill-opacity": 0.97,
                  "fill-antialias": true,
                },
              } as any);

              map.addLayer({
                id: "akarfinder-target-landuse-urban",
                type: "fill",
                source,
                "source-layer": "landuse",
                filter: ["match", ["get", "class"], ["residential", "commercial", "retail", "industrial"], true, false],
                paint: {
                  "fill-color": [
                    "match", ["get", "class"],
                    "commercial", "#F0E3D5",
                    "retail", "#F5EBDF",
                    "industrial", "#ECE7DF",
                    "#F3EADC"
                  ],
                  "fill-opacity": 0.44,
                },
              } as any);

              map.addLayer({
                id: "akarfinder-target-urban-grain",
                type: "fill",
                source,
                "source-layer": "landuse",
                minzoom: 15.4,
                filter: ["match", ["get", "class"], ["residential", "commercial", "retail", "industrial"], true, false],
                paint: {
                  "fill-color": [
                    "match", ["get", "class"],
                    "commercial", "#EBDDCB",
                    "retail", "#F0E4D6",
                    "industrial", "#E6E0D8",
                    "#EFE6D9"
                  ],
                  "fill-opacity": ["interpolate", ["linear"], ["zoom"], 15.4, 0.035, 16.5, 0.070, 18, 0.095],
                  "fill-outline-color": "rgba(190,181,170,0.16)",
                },
              } as any);

              map.addLayer({
                id: "akarfinder-target-landcover-green",
                type: "fill",
                source,
                "source-layer": "landcover",
                filter: ["match", ["get", "class"], ["grass", "wood"], true, false],
                paint: {
                  "fill-color": ["match", ["get", "class"], "wood", "#DDEAD7", "#EBF3ED"],
                  "fill-opacity": 0.82,
                },
              } as any);

              map.addLayer({
                id: "akarfinder-target-landuse-green",
                type: "fill",
                source,
                "source-layer": "landuse",
                filter: ["match", ["get", "class"], ["park", "cemetery", "grass", "recreation_ground"], true, false],
                paint: {
                  "fill-color": "#E4EFE2",
                  "fill-opacity": 0.88,
                  "fill-outline-color": "#C7DCC4",
                },
              } as any);

              map.addLayer({
                id: "akarfinder-target-buildings",
                type: "fill",
                source,
                "source-layer": "building",
                minzoom: 12.2,
                paint: {
                  "fill-color": [
                    "interpolate", ["linear"], ["coalesce", ["get", "render_height"], 0],
                    0, "#F2EFEA",
                    12, "#EEEAE4",
                    28, "#E8E3DC",
                    60, "#DED8D0"
                  ],
                  "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12.2, 0.09, 14.5, 0.16],
                  "fill-outline-color": "#D8D1C8",
                },
              } as any);

              const roadFilter = ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service"], true, false];

              map.addLayer({
                id: "akarfinder-target-road-casing",
                type: "line",
                source,
                "source-layer": "transportation",
                filter: roadFilter,
                layout: {
                  "line-cap": "round",
                  "line-join": "round",
                },
                paint: {
                  "line-color": [
                    "match", ["get", "class"],
                    "motorway", "#F0C06F",
                    "trunk", "#F4D596",
                    "primary", "#E8D8C2",
                    "secondary", "#E2DED4",
                    "tertiary", "#E1DDD2",
                    "#E6DFCB"
                  ],
                  "line-opacity": 0.90,
                  "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    11, ["match", ["get", "class"], "motorway", 2.4, "trunk", 2.2, "primary", 2.0, "secondary", 1.7, "tertiary", 1.3, 0.8],
                    15, ["match", ["get", "class"], "motorway", 9.4, "trunk", 8.3, "primary", 7.4, "secondary", 5.9, "tertiary", 4.15, "minor", 2.55, 1.6],
                    18, ["match", ["get", "class"], "motorway", 14.0, "trunk", 12.6, "primary", 11.2, "secondary", 8.8, "tertiary", 6.3, "minor", 4.0, "service", 2.8, 2.2]
                  ],
                },
              } as any);

              map.addLayer({
                id: "akarfinder-target-road-fill",
                type: "line",
                source,
                "source-layer": "transportation",
                filter: roadFilter,
                layout: {
                  "line-cap": "round",
                  "line-join": "round",
                },
                paint: {
                  "line-color": [
                    "match", ["get", "class"],
                    "motorway", "#FFE39A",
                    "trunk", "#FFE9A5",
                    "primary", "#FFF8EC",
                    "secondary", "#FFFFFF",
                    "tertiary", "#FFFFFF",
                    "#FFFFFF"
                  ],
                  "line-opacity": 0.96,
                  "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    11, ["match", ["get", "class"], "motorway", 1.8, "trunk", 1.65, "primary", 1.5, "secondary", 1.2, "tertiary", 0.95, 0.62],
                    15, ["match", ["get", "class"], "motorway", 7.8, "trunk", 6.9, "primary", 6.1, "secondary", 4.8, "tertiary", 3.35, "minor", 1.95, 1.2],
                    18, ["match", ["get", "class"], "motorway", 12.2, "trunk", 10.8, "primary", 9.4, "secondary", 7.2, "tertiary", 5.0, "minor", 3.0, "service", 2.0, 1.55]
                  ],
                },
              } as any);

              map.addLayer({
                id: "akarfinder-target-road-labels-major",
                type: "symbol",
                source,
                "source-layer": "transportation_name",
                minzoom: 11.8,
                filter: ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary"], true, false],
                layout: {
                  "symbol-placement": "line",
                  "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 11.8, 340, 16, 380, 18, 430],
                  "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]],
                  "text-size": ["interpolate", ["linear"], ["zoom"], 11.8, 10.1, 14, 12.4, 18, 13.6],
                  "text-letter-spacing": 0.012,
                  "text-max-angle": 20,
                  "text-padding": 2,
                  "text-allow-overlap": false,
                  "text-ignore-placement": false,
                },
                paint: {
                  "text-color": "#505B63",
                  "text-opacity": 0.88,
                  "text-halo-color": "rgba(251,248,243,0.98)",
                  "text-halo-width": 1.4,
                  "text-halo-blur": 0.12,
                },
              } as any);

              map.addLayer({
                id: "akarfinder-target-road-labels-minor",
                type: "symbol",
                source,
                "source-layer": "transportation_name",
                minzoom: 12.5,
                filter: ["match", ["get", "class"], ["tertiary", "minor", "service"], true, false],
                layout: {
                  "symbol-placement": "line",
                  "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 12.5, 460, 16, 360, 18, 300],
                  "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]],
                  "text-size": ["interpolate", ["linear"], ["zoom"], 12.5, 7.8, 14.5, 9.5, 18, 10.8],
                  "text-letter-spacing": 0.008,
                  "text-max-angle": 24,
                  "text-padding": 2,
                  "text-allow-overlap": false,
                  "text-ignore-placement": false,
                },
                paint: {
                  "text-color": "#70787C",
                  "text-opacity": 0.50,
                  "text-halo-color": "rgba(251,248,243,0.96)",
                  "text-halo-width": 1.0,
                  "text-halo-blur": 0.14,
                },
              } as any);

              map.addLayer({
                id: "akarfinder-target-coastline-foam-wide",
                type: "line",
                source,
                "source-layer": "water",
                paint: {
                  "line-color": "#9FC7CE",
                  "line-opacity": 0.34,
                  "line-width": ["interpolate", ["linear"], ["zoom"], 11, 3.4, 14, 6.4],
                  "line-blur": 1.55,
                },
              } as any);

              map.addLayer({
                id: "akarfinder-target-coastline-foam-breaks",
                type: "line",
                source,
                "source-layer": "water",
                layout: {
                  "line-cap": "round",
                  "line-join": "round",
                },
                paint: {
                  "line-color": "#C5DEE2",
                  "line-opacity": 0.50,
                  "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.9, 14, 4.2],
                  "line-dasharray": [0.34, 0.24, 0.82, 0.38, 0.18, 0.28],
                  "line-blur": 0.62,
                },
              } as any);

              map.addLayer({
                id: "akarfinder-target-coastline",
                type: "line",
                source,
                "source-layer": "water",
                paint: {
                  "line-color": "#EAF4F2",
                  "line-opacity": 0.92,
                  "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.3, 14, 2.9],
                  "line-blur": 0.18,
                },
              } as any);
            }
            map.addLayer({
              id: "3d-buildings",
              source: "akarfinder-openfreemap",
              "source-layer": "building",
              type: "fill-extrusion",
              minzoom: isMaarifTargetPilot && targetComposition === "context" ? 12.2 : 14.8,
              filter: isMaarifTargetPilot && targetComposition === "context"
                ? ["all", ["!=", ["get", "hide_3d"], true], [">", ["coalesce", ["get", "render_height"], 0], 0]]
                : ["!=", ["get", "hide_3d"], true],
              paint: {
                "fill-extrusion-color": isMaarifTargetPilot && targetComposition === "context"
                  ? [
                    "interpolate", ["linear"], ["coalesce", ["get", "render_height"], 0],
                    0, "#F2EFEA", 10, "#ECE8E1", 24, "#E4DFD7", 55, "#D8D2CA", 120, "#C8C0B7",
                  ]
                  : [
                    "interpolate", ["linear"], ["coalesce", ["get", "render_height"], 0],
                    0, "#edf1f4", 10, "#e4e9ed", 24, "#d9e1e6", 55, "#ccd7df", 120, "#b8c6d1",
                  ],
                "fill-extrusion-height": ["coalesce", ["get", "render_height"], 0],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                "fill-extrusion-opacity": isMaarifTargetPilot && targetComposition === "context" ? 0.31 : 0.28,
                "fill-extrusion-vertical-gradient": true,
              },
            } as any);

            map.addSource(FOCUS_SOURCE_ID, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {
                  district: districtLabel,
                  boundaryStatus: boundaryGeometry ? "provided" : "center-only",
                  focusSemantic: isMaarifTargetPilot ? "context-focus-not-boundary" : "district-focus",
                },
                geometry: { type: "Point", coordinates: center },
              },
            });
            map.addLayer({
              id: FOCUS_GLOW_LAYER_ID,
              type: "circle",
              source: FOCUS_SOURCE_ID,
              paint: {
                "circle-radius": isMaarifTargetPilot ? (desktop ? 136 : 96) : (desktop ? 84 : 68),
                "circle-color": districtTone,
                "circle-opacity": isMaarifTargetPilot ? 0.034 : 0.13,
                "circle-stroke-color": AKARFINDER_MOROCCO_MAP_NAVY,
                "circle-stroke-width": isMaarifTargetPilot ? 0.85 : 1.5,
                "circle-stroke-opacity": isMaarifTargetPilot ? 0.12 : 0.56,
              },
            });
            map.addLayer({
              id: FOCUS_RING_LAYER_ID,
              type: "circle",
              source: FOCUS_SOURCE_ID,
              paint: {
                "circle-radius": 10,
                "circle-color": AKARFINDER_MOROCCO_MAP_NAVY,
                "circle-opacity": 0.96,
                "circle-stroke-color": "#477C8D",
                "circle-stroke-width": 4,
                "circle-stroke-opacity": 0.98,
              },
            });

            if (boundaryGeometry) {
              map.addSource("neighborhood-boundary", {
                type: "geojson",
                data: { type: "Feature", properties: {}, geometry: boundaryGeometry } as any,
              });
              map.addLayer({
                id: "neighborhood-boundary-fill", type: "fill", source: "neighborhood-boundary",
                paint: {
                  // OSM relation 2801474 is the Maârif administrative arrondissement, not a certified neighborhood boundary.
                  // Keep the area unfilled so the neighborhood focus is never confused with the arrondissement.
                  "fill-color": isMaarifTargetPilot ? "#4D9BE6" : districtTone,
                  "fill-opacity": isMaarifTargetPilot ? 0 : 0.18,
                },
              });
              if (isMaarifTargetPilot) {
                map.addLayer({
                  id: "neighborhood-boundary-relief",
                  type: "line",
                  source: "neighborhood-boundary",
                  paint: {
                    "line-color": AKARFINDER_MOROCCO_MAP_NAVY,
                    "line-width": 7.0,
                    "line-opacity": 0.13,
                    "line-blur": 3.0,
                  },
                });
              }
              map.addLayer({
                id: "neighborhood-boundary-line", type: "line", source: "neighborhood-boundary",
                paint: {
                  "line-color": AKARFINDER_MOROCCO_MAP_NAVY,
                  "line-width": isMaarifTargetPilot ? 1.7 : 3.2,
                  "line-opacity": isMaarifTargetPilot ? 0.68 : 0.96,
                  "line-blur": isMaarifTargetPilot ? 0.10 : 0,
                  ...(isMaarifTargetPilot ? { "line-dasharray": [3.0, 1.6] } : {}),
                },
              });
            }

            if (isMaarifTargetPilot && targetComposition === "context") {
              setOvertureState("loading");
              void installMapLibreOvertureBuildings(map, { beforeLayerId: FOCUS_GLOW_LAYER_ID })
                .then((result) => {
                  if (disposed) return;
                  setOvertureTotalCount(result.total);
                  setOvertureExactCount(result.exactHeight);
                  setOvertureEstimatedCount(result.levelEstimated);
                  setOvertureRelease(result.release);
                  setOvertureState("available");
                  setSourceState("available");
                })
                .catch((error) => {
                  console.error("[vivre-ici-maplibre-overture] install failed", error);
                  if (!disposed) setOvertureState("unavailable");
                });
            }

            window.requestAnimationFrame(() => {
              if (!disposed) focusNeighborhoodMap(map, boundaryGeometry, center, desktopCameraOffset, targetComposition, desktop, 0);
            });
          } catch (error) {
            console.error("[vivre-ici-maplibre-national] layer setup failed", error);
            setSourceState("unavailable");
          }
        });

        const evaluate = () => {
          if (disposed || !map) return;
          try {
            const overtureLayers = [
              MAPLIBRE_OVERTURE_ESTIMATED_LAYER_ID,
              MAPLIBRE_OVERTURE_EXACT_LAYER_ID,
            ].filter((layerId) => Boolean(map.getLayer(layerId)));
            const volumeFeatures = overtureLayers.length
              ? map.queryRenderedFeatures(undefined, { layers: overtureLayers })
              : map.getLayer("3d-buildings")
                ? map.queryRenderedFeatures(undefined, { layers: ["3d-buildings"] })
                : [];
            const footprintFeatures = overtureLayers.length
              ? volumeFeatures
              : map.getLayer("akarfinder-target-buildings")
                ? map.queryRenderedFeatures(undefined, { layers: ["akarfinder-target-buildings"] })
                : [];
            setBuildingCount(volumeFeatures.length);
            setBuildingFootprintCount(footprintFeatures.length);
            if (volumeFeatures.length > 0 || footprintFeatures.length > 0) setSourceState("available");
            setReady(true);
            setRenderState("ready");
          } catch {
            setSourceState("unavailable");
          }
        };
        map.on("idle", evaluate);
        window.setTimeout(evaluate, 12000);
      })
      .catch((error) => {
        console.error("[vivre-ici-maplibre-national] renderer failed", error);
        if (!disposed) setRenderState("error");
      });

    return () => {
      disposed = true;
      mapInstanceRef.current = null;
      try { map?.remove(); } catch { /* no-op */ }
    };
  }, [citySlug, districtSlug, districtLabel, center[0], center[1], desktopCameraOffset[0], desktopCameraOffset[1], boundaryGeometry, targetComposition, districtTone]);

  useEffect(() => {
    const element = mapRef.current;
    const map = mapInstanceRef.current;
    if (!element || !map || !ready) return;

    let frame = 0;
    let initialCameraSyncPending = true;
    const syncSize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        try {
          map.resize();
          if (initialCameraSyncPending) {
            focusNeighborhoodMap(
              map,
              boundaryGeometry,
              center,
              desktopCameraOffset,
              targetComposition,
              window.innerWidth >= 1024,
              0,
            );
            initialCameraSyncPending = false;
          }
        } catch { /* map may be disposing */ }
      });
    };

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    observer?.observe(element);
    window.addEventListener("resize", syncSize);
    syncSize();

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncSize);
      window.cancelAnimationFrame(frame);
    };
  }, [ready, boundaryGeometry, center, desktopCameraOffset, targetComposition]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (
      !map
      || !ready
      || !isMaarifTargetPilot
      || targetComposition !== "context"
      || !context?.anchors?.length
    ) return;

    const verifiedPoints: MutablePosition[] = [
      center,
      ...context.anchors.map((anchor) => [anchor.longitude, anchor.latitude] as MutablePosition),
      ...targetPilotLandmarks.map((landmark) => [landmark.longitude, landmark.latitude] as MutablePosition),
    ];
    const hull = buildVerifiedPointHull(verifiedPoints);
    if (!hull) return;
    const contextualEnvelope = expandContextHull(hull, 1.50);

    const data = {
      type: "Feature",
      properties: {
        semantic: "verified-anchor-envelope-buffered",
        boundaryClaim: false,
        sourcePointCount: verifiedPoints.length,
        visualExpansionFactor: 1.50,
      },
      geometry: { type: "Polygon", coordinates: [contextualEnvelope] },
    };

    const lngs = contextualEnvelope.map((point) => point[0]);
    const lats = contextualEnvelope.map((point) => point[1]);
    const minLng = Math.min(...lngs) - 0.055;
    const maxLng = Math.max(...lngs) + 0.055;
    const minLat = Math.min(...lats) - 0.045;
    const maxLat = Math.max(...lats) + 0.045;
    const maskOuter: MutablePosition[] = [
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat],
    ];
    const maskData = {
      type: "Feature",
      properties: {
        semantic: "context-focus-mask-not-boundary",
        boundaryClaim: false,
      },
      geometry: {
        type: "Polygon",
        coordinates: [maskOuter, [...contextualEnvelope].reverse()],
      },
    };

    const source = map.getSource(CONTEXT_FOOTPRINT_SOURCE_ID);
    const maskSource = map.getSource(CONTEXT_FOCUS_MASK_SOURCE_ID);
    if (source?.setData && maskSource?.setData) {
      source.setData(data as any);
      maskSource.setData(maskData as any);
      return;
    }

    try {
      map.addSource(CONTEXT_FOOTPRINT_SOURCE_ID, { type: "geojson", data } as any);
      map.addSource(CONTEXT_FOCUS_MASK_SOURCE_ID, { type: "geojson", data: maskData } as any);
      map.addLayer({
        id: CONTEXT_FOCUS_MASK_LAYER_ID,
        type: "fill",
        source: CONTEXT_FOCUS_MASK_SOURCE_ID,
        paint: {
          "fill-color": AKARFINDER_MOROCCO_MAP_NAVY,
          "fill-opacity": 0.020,
          "fill-antialias": true,
        },
      } as any, FOCUS_GLOW_LAYER_ID);
      map.addLayer({
        id: CONTEXT_FOOTPRINT_FILL_LAYER_ID,
        type: "fill",
        source: CONTEXT_FOOTPRINT_SOURCE_ID,
        paint: {
          "fill-color": districtTone,
          "fill-opacity": 0.028,
        },
      } as any, FOCUS_GLOW_LAYER_ID);
      map.addLayer({
        id: CONTEXT_FOOTPRINT_HALO_LAYER_ID,
        type: "line",
        source: CONTEXT_FOOTPRINT_SOURCE_ID,
        paint: {
          "line-color": AKARFINDER_MOROCCO_MAP_NAVY,
          "line-width": 7.0,
          "line-opacity": 0.07,
          "line-blur": 3.8,
        },
      } as any, FOCUS_GLOW_LAYER_ID);
      map.addLayer({
        id: CONTEXT_FOOTPRINT_SHADOW_LAYER_ID,
        type: "line",
        source: CONTEXT_FOOTPRINT_SOURCE_ID,
        paint: {
          "line-color": AKARFINDER_MOROCCO_MAP_NAVY,
          "line-width": 3.1,
          "line-opacity": 0.105,
          "line-offset": 1.8,
          "line-blur": 0.85,
        },
      } as any, FOCUS_GLOW_LAYER_ID);
      map.addLayer({
        id: CONTEXT_FOOTPRINT_LINE_LAYER_ID,
        type: "line",
        source: CONTEXT_FOOTPRINT_SOURCE_ID,
        paint: {
          "line-color": "#426D7D",
          "line-width": 1.15,
          "line-opacity": 0.30,
          "line-blur": 0.22,
        },
      } as any, FOCUS_GLOW_LAYER_ID);
      map.addLayer({
        id: CONTEXT_FOOTPRINT_HIGHLIGHT_LAYER_ID,
        type: "line",
        source: CONTEXT_FOOTPRINT_SOURCE_ID,
        paint: {
          "line-color": "#FFFFFF",
          "line-width": 0.90,
          "line-opacity": 0.54,
          "line-offset": -1.05,
          "line-blur": 0.32,
        },
      } as any, FOCUS_GLOW_LAYER_ID);
    } catch (error) {
      console.error("[vivre-ici-maplibre-context-footprint] setup failed", error);
    }
  }, [
    context,
    ready,
    isMaarifTargetPilot,
    targetComposition,
    center[0],
    center[1],
    targetPilotLandmarks,
    districtTone,
  ]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !ready) return;
    const updatePositions = () => {
      const next: Record<string, ScreenPoint> = {};
      const canvas = map.getCanvas();
      for (const anchor of context?.anchors ?? []) {
        const point = map.project([anchor.longitude, anchor.latitude]);
        next[anchor.poi_id] = {
          x: point.x, y: point.y,
          visible: point.x > -100 && point.x < canvas.clientWidth + 100 && point.y > -80 && point.y < canvas.clientHeight + 80,
        };
      }
      for (const landmark of targetPilotLandmarks) {
        const point = map.project([landmark.longitude, landmark.latitude]);
        next[`target:${landmark.id}`] = {
          x: point.x, y: point.y,
          visible: point.x > -120 && point.x < canvas.clientWidth + 120 && point.y > -100 && point.y < canvas.clientHeight + 100,
        };
      }
      const cp = map.project(center);
      setCenterPoint({ x: cp.x, y: cp.y, visible: cp.x > -60 && cp.x < canvas.clientWidth + 60 && cp.y > -60 && cp.y < canvas.clientHeight + 60 });
      setScreenPoints(next);
    };
    map.on("move", updatePositions);
    map.on("resize", updatePositions);
    updatePositions();
    return () => {
      map.off("move", updatePositions);
      map.off("resize", updatePositions);
    };
  }, [context, ready, center[0], center[1], targetPilotLandmarks, isMaarifTargetPilot]);

  const categories = context?.categories.filter((category) => Boolean(CATEGORY_META[category])) ?? [];
  const visibleAnchors = context?.anchors.filter((anchor) => activeCategory === "all" || anchor.category === activeCategory) ?? [];

  return (
    <section
      className="maplibre-spike-shell"
      data-maplibre-spike
      data-maplibre-ready={ready ? "true" : "false"}
      data-maplibre-render-state={renderState}
      data-maplibre-source-state={sourceState}
      data-maplibre-source="openfreemap-vector"
      data-maplibre-building-count={buildingCount}
      data-maplibre-building-footprint-count={buildingFootprintCount}
      data-maplibre-overture-state={overtureState}
      data-maplibre-overture-total-count={overtureTotalCount}
      data-maplibre-overture-exact-count={overtureExactCount}
      data-maplibre-overture-estimated-count={overtureEstimatedCount}
      data-maplibre-overture-release={overtureRelease ?? ""}
      data-maplibre-shadow-policy={isMaarifTargetPilot ? "non-metric-overture-footprints" : "none"}
      data-maplibre-context-focus={isMaarifTargetPilot ? "verified-anchor-envelope-not-boundary" : "none"}
      data-maplibre-context-relief={isMaarifTargetPilot ? "raised-indicative-zone" : "none"}
      data-maplibre-quarter-style={isMaarifTargetPilot ? "illustrated-progressive-v1" : "default"}
      data-maplibre-basemap-language={isMaarifTargetPilot ? "voyager-inspired-openfreemap-v1" : "default"}
      data-maplibre-building-language={isMaarifTargetPilot ? "standard-inspired-overture-v1" : "default"}
      data-maplibre-polish={isMaarifTargetPilot ? "material-relief-v3" : "default"}
      data-maplibre-street-language={isMaarifTargetPilot ? "architectural-paper-v2" : "default"}
      data-maplibre-label-policy={isMaarifTargetPilot ? "akarfinder-owned" : "basemap-default"}
      data-maplibre-context-label-policy={isMaarifTargetPilot ? "suppressed-at-quarter-zoom" : "default"}
      data-maplibre-boundary-render={isMaarifTargetPilot && boundaryGeometry ? "administrative-relief" : "default"}
      data-maplibre-context-state={contextState}
      data-maplibre-anchor-count={context?.anchor_count ?? 0}
      data-maplibre-city={citySlug}
      data-maplibre-district={districtSlug}
      data-maplibre-boundary-status={boundaryGeometry ? "shadow-reference" : "center-only"}
      data-maplibre-boundary-semantic={isMaarifTargetPilot && boundaryGeometry ? "administrative-arrondissement" : boundaryGeometry ? "boundary-reference" : "none"}
      data-maplibre-camera-policy={targetComposition === "context" ? "contextual-center" : "boundary-fit"}
      data-maplibre-focus-semantic={isMaarifTargetPilot ? "context-focus-not-boundary" : "district-focus"}
      data-maplibre-context-footprint={isMaarifTargetPilot && context?.anchors?.length ? "verified-anchor-envelope-buffered" : "none"}
      data-maplibre-target-context-count={0}
      data-maplibre-rtl-status={rtlStatus}
      data-maplibre-reserve-rail={reserveRail ? "true" : "false"}
      data-akar-quartier-target={isMaarifTargetPilot ? "maarif-couche1" : undefined}
      style={isMaarifTargetPilot ? { height: "100%" } : undefined}
    >
      <div className="maplibre-spike-map" data-maplibre-map-surface>
        <div className="maplibre-spike-canvas" ref={mapRef} />
        <div className="maplibre-spike-map-grade" aria-hidden="true" />
        {isMaarifTargetPilot && targetComposition === "context" ? (
          <div className="maplibre-spike-attribution">
            Map © OpenStreetMap contributors · OpenFreeMap{overtureState === "available" ? " · 3D © Overture Maps Foundation" : ""}
          </div>
        ) : null}
        <div className="maplibre-spike-dom-labels" aria-hidden="true">
          {centerPoint?.visible && (
            <div className="maplibre-spike-neighborhood-label" style={{ left: centerPoint.x, top: centerPoint.y }}>
              <span>{districtLabel}</span>
              <i />
            </div>
          )}
          {visibleAnchors.map((anchor) => {
            const screen = screenPoints[anchor.poi_id];
            if (!screen?.visible) return null;
            const meta = CATEGORY_META[anchor.category] ?? CATEGORY_META.other;
            const arabic = isArabicText(anchor.name);
            const protectedPoints = [
              centerPoint,
              ...targetPilotLandmarks.map((landmark) => screenPoints[`target:${landmark.id}`]),
            ].filter((point): point is ScreenPoint => Boolean(point?.visible));
            const overviewSecondary = isMaarifTargetPilot
              && activeCategory === "all"
              && anchor.category !== "green_sport"
              && anchor.category !== "education";
            const protectedCollision = anchor.category !== "green_sport" && protectedPoints.some((point) =>
              Math.abs(point.x - screen.x) < 110 && Math.abs(point.y - screen.y) < 30
            );
            const collapseLabel = overviewSecondary || (isMaarifTargetPilot && protectedCollision);
            return (
              <div
                key={anchor.poi_id}
                className="maplibre-spike-poi-label"
                data-label-collapsed={collapseLabel ? "true" : "false"}
                data-poi-category={anchor.category}
                style={{ left: screen.x, top: screen.y }}
              >
                <span lang={arabic ? "ar" : undefined} dir={arabic ? "rtl" : "auto"}>{anchor.name}</span>
                <i style={{ background: meta.color }} />
              </div>
            );
          })}
          {targetPilotLandmarks.map((landmark) => {
            const screen = screenPoints[`target:${landmark.id}`];
            if (!screen?.visible) return null;
            return (
              <div
                key={landmark.id}
                className="maplibre-spike-target-landmark-label"
                data-landmark-tier={landmark.tier}
                style={{ left: screen.x, top: screen.y }}
              >
                <i aria-hidden="true" />
                <span lang={isArabicText(landmark.name) ? "ar" : undefined} dir={isArabicText(landmark.name) ? "rtl" : "auto"}>{landmark.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="maplibre-spike-map-chrome">
        <div className="maplibre-spike-brand"><b>AF</b><span>AkarFinder</span></div>
        <div className="maplibre-spike-search"><Search size={17} aria-hidden="true" /><strong>{cityLabel}</strong><span>Quartiers et adresses</span></div>
        <div className="maplibre-spike-mode"><span>2D</span><strong>3D</strong></div>
      </div>

      <div className="maplibre-spike-view-chips" aria-label="Mode cartographique">
        <span className="active">Plan</span>
        <span>Quartiers</span>
      </div>

      <div className="maplibre-spike-filters" aria-label={`Filtres des repères de ${districtLabel}`}>
        <button className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>Repères</button>
        {categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{CATEGORY_META[category].label}</button>)}
      </div>


      {isMaarifTargetPilot && boundaryGeometry ? (
        <div className="maplibre-spike-boundary-badge" aria-label="Contour administratif de l'arrondissement Maârif">
          Contour administratif
        </div>
      ) : null}

      <div className="maplibre-spike-controls" aria-label="Contrôles de la carte">
        <button type="button" className="maplibre-spike-control-primary" onClick={restoreCamera} aria-label="Recentrer sur le quartier"><LocateFixed size={18} /></button>
        <button type="button" onClick={() => changeZoom(0.75)} aria-label="Zoomer"><Plus size={19} /></button>
        <button type="button" onClick={() => changeZoom(-0.75)} aria-label="Dézoomer"><Minus size={19} /></button>
        <span aria-hidden="true"><Layers3 size={18} /></span>
      </div>

      <div className="maplibre-spike-map-note">
        <span className="maplibre-spike-map-note-kicker">Quartier · {cityLabel}</span>
        <strong>{districtLabel}</strong>
        <span className="maplibre-spike-map-note-copy">
          {boundaryGeometry ? (isMaarifTargetPilot ? "Contour administratif : Arrondissement Maârif (OSM). Le halo de contexte est dérivé des repères vérifiés et ne constitue pas une frontière de quartier." : "Limite OSM de référence · validation production en attente.") : "Repère central sourcé · périmètre non revendiqué."}
        </span>
        <span className="maplibre-spike-map-note-status">
          {overtureState === "available"
            ? `${buildingCount} volumes Overture visibles · ${overtureExactCount} hauteurs exactes / ${overtureEstimatedCount} estimées depuis les niveaux`
            : buildingCount > 0
              ? `${buildingCount} volumes 3D visibles`
              : buildingFootprintCount > 0
                ? `${buildingFootprintCount} empreintes visibles · hauteur 3D non observée`
                : "Tissu urbain vectoriel · hauteur 3D non observée"}
        </span>
      </div>

      <footer className="maplibre-spike-outro"><div><strong>Découvrez les quartiers autrement</strong><span>Un même moteur cartographique, du quartier au Maroc.</span></div><em>Des lieux. Des vies. Des projets.</em></footer>

      <style jsx global>{`
        .maplibre-spike-shell{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 372px;grid-template-rows:minmax(0,1fr) 68px;gap:0;height:calc(100svh - 64px);padding:0;background:#e7eeeb;color:#102f32;overflow:hidden}.maplibre-spike-shell[data-maplibre-reserve-rail="false"]{grid-template-columns:minmax(0,1fr)}
        .maplibre-spike-map{position:relative;grid-column:1;grid-row:1;min-width:0;overflow:hidden;border-radius:0;background:#dce8e5}.maplibre-spike-canvas{position:absolute;inset:0}.maplibre-spike-canvas,.maplibre-spike-canvas .maplibregl-map,.maplibre-spike-canvas .maplibregl-canvas-container,.maplibre-spike-canvas canvas{width:100%!important;height:100%!important}.maplibre-spike-canvas canvas{outline:none}.maplibre-spike-map-grade{position:absolute;z-index:2;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(1,38,39,.08) 0%,rgba(7,50,49,.015) 38%,rgba(3,32,34,.08) 100%);mix-blend-mode:multiply}
        .maplibre-spike-dom-labels{position:absolute;z-index:9;inset:0;pointer-events:none;overflow:hidden}.maplibre-spike-neighborhood-label{position:absolute;display:flex;flex-direction:column;align-items:center;gap:7px;transform:translate(-50%,-112%);filter:drop-shadow(0 8px 18px rgb(0 42 43/.28));white-space:nowrap}.maplibre-spike-neighborhood-label span{padding:9px 14px;border:1px solid rgb(255 255 255/.58);border-radius:999px;background:rgb(3 113 108/.92);box-shadow:inset 0 1px 0 rgb(255 255 255/.22);color:#fff;font-size:13px;font-weight:850;letter-spacing:-.01em}.maplibre-spike-neighborhood-label i{display:block;width:10px;height:10px;border:3px solid #fff;border-radius:999px;background:#07928c;box-shadow:0 0 0 4px rgb(5 178 166/.22)}.maplibre-spike-poi-label{position:absolute;display:flex;flex-direction:column;align-items:center;gap:5px;transform:translate(-50%,-100%)}.maplibre-spike-poi-label span{max-width:250px;padding:7px 13px;border:1px solid rgb(255 255 255/.78);border-radius:999px;background:rgb(251 252 249/.9);backdrop-filter:blur(14px);box-shadow:0 8px 20px rgb(14 45 44/.15);color:#254441;font-size:10px;font-weight:780;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.maplibre-spike-poi-label i{display:block;width:9px;height:9px;border:2px solid #fff;border-radius:999px;box-shadow:0 2px 8px rgb(30 46 47/.22)}
        .maplibre-spike-map-chrome{position:absolute;z-index:14;left:22px;right:22px;top:20px;display:grid;grid-template-columns:auto minmax(260px,580px) auto;justify-content:space-between;gap:10px;pointer-events:none}.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-map-chrome{right:394px}.maplibre-spike-brand,.maplibre-spike-search,.maplibre-spike-mode{min-height:48px;display:flex;align-items:center;border:1px solid rgb(255 255 255/.8);background:rgb(250 252 251/.88);backdrop-filter:blur(18px) saturate(1.15);box-shadow:0 12px 34px rgb(7 34 35/.16);color:#173638}.maplibre-spike-brand{gap:9px;padding:0 15px 0 9px;border-radius:999px}.maplibre-spike-brand b{display:grid;width:32px;height:32px;place-items:center;border-radius:999px;background:#063b54;color:#fff;font-size:11px;letter-spacing:-.04em}.maplibre-spike-brand span{font-size:14px;font-weight:900;letter-spacing:-.025em}.maplibre-spike-search{gap:10px;padding:0 15px;border-radius:999px}.maplibre-spike-search strong{font-size:14px;font-weight:850}.maplibre-spike-search span{overflow:hidden;color:#73817f;font-size:10px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.maplibre-spike-mode{gap:4px;padding:4px;border-radius:999px;font-size:10px;font-weight:850}.maplibre-spike-mode span,.maplibre-spike-mode strong{display:grid;place-items:center;min-width:62px;min-height:38px;border-radius:999px}.maplibre-spike-mode strong{background:#087873;color:#fff;box-shadow:0 5px 14px rgb(3 105 101/.22)}
        .maplibre-spike-view-chips{position:absolute;z-index:14;left:22px;top:80px;display:flex;gap:7px;pointer-events:none}.maplibre-spike-view-chips span{padding:8px 12px;border:1px solid rgb(255 255 255/.76);border-radius:999px;background:rgb(250 252 251/.88);backdrop-filter:blur(16px);box-shadow:0 7px 22px rgb(7 34 35/.12);color:#2b4a48;font-size:9px;font-weight:850}.maplibre-spike-view-chips span.active{background:rgb(4 112 107/.92);color:#fff}
        .maplibre-spike-filters{position:absolute;z-index:14;left:178px;right:34px;top:80px;display:flex;gap:7px;overflow:hidden}.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-filters{right:404px}.maplibre-spike-filters button{flex:0 0 auto;border:1px solid rgb(255 255 255/.76);padding:8px 12px;border-radius:999px;background:rgb(250 252 251/.9);backdrop-filter:blur(16px);box-shadow:0 7px 20px rgb(7 34 35/.11);font-size:9px;font-weight:820;color:#2e4b49;transition:transform .15s ease,background .15s ease}.maplibre-spike-filters button:hover{transform:translateY(-1px)}.maplibre-spike-filters button.active{background:#087873;color:#fff}
        .maplibre-spike-controls{position:absolute;z-index:14;right:22px;top:50%;display:grid;gap:6px;transform:translateY(-50%)}.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-controls{right:394px}.maplibre-spike-controls button,.maplibre-spike-controls>span{display:grid;width:42px;height:42px;place-items:center;border:1px solid rgb(255 255 255/.82);border-radius:14px;background:rgb(250 252 251/.9);backdrop-filter:blur(16px);box-shadow:0 8px 22px rgb(7 34 35/.15);color:#173d42}.maplibre-spike-controls button{cursor:pointer;transition:transform .15s ease,background .15s ease}.maplibre-spike-controls button:hover{transform:translateY(-1px);background:#fff}.maplibre-spike-controls .maplibre-spike-control-primary{background:#087873;color:#fff}
        .maplibre-spike-map-note{position:absolute;z-index:13;right:24px;bottom:88px;width:min(330px,calc(100% - 48px));display:grid;gap:5px;padding:18px 18px 16px;border:1px solid rgb(255 255 255/.78);border-radius:22px;background:rgb(250 252 251/.9);backdrop-filter:blur(20px) saturate(1.12);box-shadow:0 20px 48px rgb(8 37 37/.19)}.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-map-note{right:394px}.maplibre-spike-map-note-kicker{text-transform:uppercase;letter-spacing:.13em;color:#087873;font-size:8px;font-weight:900}.maplibre-spike-map-note strong{font-size:23px;line-height:1.05;letter-spacing:-.035em;color:#163538}.maplibre-spike-map-note-copy{margin-top:2px;color:#5d706d;font-size:10px;font-weight:650;line-height:1.45}.maplibre-spike-map-note-status{margin-top:7px;padding-top:8px;border-top:1px solid rgb(27 73 70/.12);color:#33524f;font-size:9px;font-weight:800}
        .maplibre-spike-outro{grid-column:1/-1;grid-row:2;display:flex;align-items:center;justify-content:space-between;padding:10px 24px 12px;border-top:1px solid rgb(25 67 65/.13);background:#f5f2eb}.maplibre-spike-outro div{display:grid;gap:2px}.maplibre-spike-outro strong{font-size:15px}.maplibre-spike-outro span{font-size:9px;color:#6d7875}.maplibre-spike-outro em{font-family:Georgia,serif;font-size:12px;color:#6e736e;transform:rotate(-3deg)}
        @media(max-width:1023px){.maplibre-spike-shell,.maplibre-spike-shell[data-maplibre-reserve-rail="false"],.maplibre-spike-shell[data-maplibre-reserve-rail="true"]{display:block;height:calc(100svh - 58px);padding:0;background:#e5ece9}.maplibre-spike-map{height:100%;border-radius:0;box-shadow:none}.maplibre-spike-map-chrome,.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-map-chrome{left:12px;right:12px;top:10px;grid-template-columns:auto 1fr;gap:7px}.maplibre-spike-brand{min-height:44px;padding:0 10px 0 7px}.maplibre-spike-brand b{width:30px;height:30px}.maplibre-spike-brand span{display:none}.maplibre-spike-search{min-height:44px}.maplibre-spike-search span{display:none}.maplibre-spike-mode{display:none}.maplibre-spike-view-chips{left:12px;top:62px}.maplibre-spike-view-chips span{padding:7px 10px}.maplibre-spike-filters,.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-filters{left:142px;right:12px;top:62px;overflow-x:auto;padding-bottom:4px}.maplibre-spike-controls,.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-controls{right:12px;top:43%}.maplibre-spike-controls button,.maplibre-spike-controls>span{width:40px;height:40px;border-radius:13px}.maplibre-spike-map-note,.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-map-note{left:12px;right:12px;bottom:268px;width:auto;padding:14px 15px;border-radius:20px}.maplibre-spike-map-note strong{font-size:20px}.maplibre-spike-poi-label span{max-width:180px;padding:6px 9px;font-size:8px}.maplibre-spike-neighborhood-label{font-size:11px}.maplibre-spike-neighborhood-label span{padding:7px 10px;font-size:11px}.maplibre-spike-outro{display:none}}
      `}</style>
    </section>
  );
}
