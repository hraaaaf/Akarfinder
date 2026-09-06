"use client";

import { useEffect, useState } from "react";
import type { LightSpecification, Map as MapLibreMap } from "maplibre-gl";

const BUILDING_SOURCE = "akarfinder-vivre-ici-3d-buildings-source";
export const BUILDING_LAYER = "akarfinder-vivre-ici-3d-buildings";
const IMAGERY_SOURCE = "akarfinder-vivre-ici-world-imagery";
const IMAGERY_LAYER = "akarfinder-vivre-ici-world-imagery-layer";
const DISTRICT_SOURCE = "akarfinder-national-neighborhood-points";
const OPENFREEMAP_VECTOR_URL = "https://tiles.openfreemap.org/planet";
const WORLD_IMAGERY_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const WORLD_IMAGERY_ATTRIBUTION = "© Esri, Maxar, Earthstar Geographics, GIS User Community";
const CASABLANCA_3D_ZOOM = 15.5;
const CASABLANCA_3D_PITCH = 60;
const CASABLANCA_3D_BEARING = -28;

const IMMERSIVE_LIGHT: LightSpecification = {
  anchor: "viewport",
  color: "#FFF0D5",
  intensity: 0.9,
  position: [1.25, 210, 38],
};

const PRESENTATION_LAYER_TARGETS = [
  { id: "akarfinder-national-city-fill", property: "fill-opacity", value: 0.025 },
  { id: "akarfinder-national-city-line", property: "line-opacity", value: 0.32 },
  { id: "akarfinder-neighborhood-fill", property: "fill-opacity", value: 0.045 },
  { id: "akarfinder-neighborhood-outline", property: "line-opacity", value: 0.42 },
] as const;

type Props = {
  citySlug: string | null;
  districtSlug: string | null;
};

type NationalMapWindow = Window & {
  __AKARFINDER_NATIONAL_MAP__?: MapLibreMap;
};

type SymbolOpacitySnapshot = {
  textOpacity: unknown;
  iconOpacity: unknown;
};

type PaintSnapshot = Map<string, unknown>;

function firstLabelLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers?.find((layer) => layer.type === "symbol" && Boolean(layer.layout?.["text-field"]))?.id;
}

function ensureImageryLayer(map: MapLibreMap): void {
  if (!map.getSource(IMAGERY_SOURCE)) {
    map.addSource(IMAGERY_SOURCE, {
      type: "raster",
      tiles: [WORLD_IMAGERY_TILE_URL],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: WORLD_IMAGERY_ATTRIBUTION,
    });
  }

  if (!map.getLayer(IMAGERY_LAYER)) {
    map.addLayer({
      id: IMAGERY_LAYER,
      type: "raster",
      source: IMAGERY_SOURCE,
      minzoom: 10,
      paint: {
        "raster-opacity": 0.93,
        "raster-saturation": -0.05,
        "raster-contrast": 0.06,
        "raster-brightness-min": 0.05,
        "raster-brightness-max": 0.98,
        "raster-fade-duration": 180,
      },
    }, firstLabelLayerId(map));
  }
}

function ensureBuildingLayer(map: MapLibreMap): void {
  if (!map.getSource(BUILDING_SOURCE)) {
    map.addSource(BUILDING_SOURCE, {
      type: "vector",
      url: OPENFREEMAP_VECTOR_URL,
    });
  }

  if (map.getLayer(BUILDING_LAYER)) return;

  map.addLayer({
    id: BUILDING_LAYER,
    type: "fill-extrusion",
    source: BUILDING_SOURCE,
    "source-layer": "building",
    minzoom: 13,
    filter: ["all", ["!=", ["get", "hide_3d"], true], ["has", "render_height"]],
    paint: {
      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "render_height"], 0],
        0,
        "#FFF9EF",
        18,
        "#F2E3CC",
        45,
        "#E2C9A6",
        90,
        "#C7A47A",
        140,
        "#9D7B5D",
      ],
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        13,
        0,
        14.2,
        ["get", "render_height"],
      ],
      "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
      "fill-extrusion-opacity": 0.82,
      "fill-extrusion-vertical-gradient": true,
    },
  }, firstLabelLayerId(map));
}

function removePresentationLayers(map: MapLibreMap): void {
  if (map.getLayer(BUILDING_LAYER)) map.removeLayer(BUILDING_LAYER);
  if (map.getSource(BUILDING_SOURCE)) map.removeSource(BUILDING_SOURCE);
  if (map.getLayer(IMAGERY_LAYER)) map.removeLayer(IMAGERY_LAYER);
  if (map.getSource(IMAGERY_SOURCE)) map.removeSource(IMAGERY_SOURCE);
}

function muteBasemapSymbols(map: MapLibreMap, snapshots: Map<string, SymbolOpacitySnapshot>): void {
  snapshots.clear();
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== "symbol" || layer.id.startsWith("akarfinder-")) continue;
    const textOpacity = map.getPaintProperty(layer.id, "text-opacity");
    const iconOpacity = map.getPaintProperty(layer.id, "icon-opacity");
    snapshots.set(layer.id, { textOpacity, iconOpacity });
    try {
      if (layer.layout?.["text-field"] !== undefined) map.setPaintProperty(layer.id, "text-opacity", 0.12);
      if (layer.layout?.["icon-image"] !== undefined) map.setPaintProperty(layer.id, "icon-opacity", 0.05);
    } catch {
      // Third-party basemap symbol layers do not all expose identical paint properties.
    }
  }
}

function restoreBasemapSymbols(map: MapLibreMap, snapshots: Map<string, SymbolOpacitySnapshot>): void {
  for (const [layerId, snapshot] of snapshots) {
    if (!map.getLayer(layerId)) continue;
    try {
      map.setPaintProperty(layerId, "text-opacity", (snapshot.textOpacity ?? null) as never);
      map.setPaintProperty(layerId, "icon-opacity", (snapshot.iconOpacity ?? null) as never);
    } catch {
      // Style teardown can remove paint properties before React cleanup finishes.
    }
  }
  snapshots.clear();
}

function softenTerritorialPresentation(map: MapLibreMap, snapshots: PaintSnapshot): void {
  snapshots.clear();
  for (const target of PRESENTATION_LAYER_TARGETS) {
    if (!map.getLayer(target.id)) continue;
    const key = `${target.id}:${target.property}`;
    try {
      snapshots.set(key, map.getPaintProperty(target.id, target.property));
      map.setPaintProperty(target.id, target.property, target.value);
    } catch {
      // The relevant custom layer may not expose this paint property in every city state.
    }
  }
}

function restoreTerritorialPresentation(map: MapLibreMap, snapshots: PaintSnapshot): void {
  for (const [key, value] of snapshots) {
    const split = key.lastIndexOf(":");
    const layerId = key.slice(0, split);
    const property = key.slice(split + 1);
    if (!map.getLayer(layerId)) continue;
    try {
      map.setPaintProperty(layerId, property, (value ?? null) as never);
    } catch {
      // Style teardown can remove paint properties before React cleanup finishes.
    }
  }
  snapshots.clear();
}

function selectedDistrictCenter(map: MapLibreMap, districtSlug: string | null): [number, number] | null {
  if (!districtSlug || !map.getSource(DISTRICT_SOURCE)) return null;
  const feature = map.querySourceFeatures(DISTRICT_SOURCE).find((item) => item.properties?.slug === districtSlug);
  if (!feature || feature.geometry.type !== "Point") return null;
  const [lng, lat] = feature.geometry.coordinates;
  return typeof lng === "number" && typeof lat === "number" ? [lng, lat] : null;
}

export function National3DBuildingsLayer({ citySlug, districtSlug }: Props) {
  const eligible = citySlug === "casablanca";
  const [enabled, setEnabled] = useState(eligible);

  useEffect(() => {
    setEnabled(eligible);
  }, [eligible]);

  useEffect(() => {
    if (!eligible) return;

    let cancelled = false;
    let frame = 0;
    let cameraAttempts = 0;
    let map: MapLibreMap | null = null;
    const symbolSnapshots = new Map<string, SymbolOpacitySnapshot>();
    const presentationSnapshots: PaintSnapshot = new Map();

    const applyLayerState = () => {
      if (!map || cancelled || !map.isStyleLoaded()) return;
      if (enabled) {
        ensureImageryLayer(map);
        ensureBuildingLayer(map);
        map.setLayoutProperty(IMAGERY_LAYER, "visibility", "visible");
        map.setLayoutProperty(BUILDING_LAYER, "visibility", "visible");
        map.setLight(IMMERSIVE_LIGHT);
        muteBasemapSymbols(map, symbolSnapshots);
        softenTerritorialPresentation(map, presentationSnapshots);
      } else {
        restoreBasemapSymbols(map, symbolSnapshots);
        restoreTerritorialPresentation(map, presentationSnapshots);
        if (map.getLayer(BUILDING_LAYER)) map.setLayoutProperty(BUILDING_LAYER, "visibility", "none");
        if (map.getLayer(IMAGERY_LAYER)) map.setLayoutProperty(IMAGERY_LAYER, "visibility", "none");
      }
    };

    const applyCamera = () => {
      if (!map || cancelled) return;
      if (enabled) {
        if (map.getZoom() < 8.5) {
          frame = window.requestAnimationFrame(applyCamera);
          return;
        }
        const districtCenter = selectedDistrictCenter(map, districtSlug);
        if (districtSlug && !districtCenter && cameraAttempts < 120) {
          cameraAttempts += 1;
          frame = window.requestAnimationFrame(applyCamera);
          return;
        }
        map.setMaxZoom(16);
        map.easeTo({
          center: districtCenter ?? map.getCenter(),
          zoom: Math.max(map.getZoom(), CASABLANCA_3D_ZOOM),
          pitch: CASABLANCA_3D_PITCH,
          bearing: CASABLANCA_3D_BEARING,
          duration: 950,
        });
      } else {
        map.easeTo({ pitch: 0, bearing: 0, duration: 650 });
      }
    };

    const attach = () => {
      if (cancelled) return;
      map = (window as NationalMapWindow).__AKARFINDER_NATIONAL_MAP__ ?? null;
      if (!map || !map.isStyleLoaded()) {
        frame = window.requestAnimationFrame(attach);
        return;
      }
      applyLayerState();
      applyCamera();
      map.on("style.load", applyLayerState);
    };

    attach();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (!map) return;
      map.off("style.load", applyLayerState);
      try {
        restoreBasemapSymbols(map, symbolSnapshots);
        restoreTerritorialPresentation(map, presentationSnapshots);
        removePresentationLayers(map);
        map.easeTo({ pitch: 0, bearing: 0, duration: 0 });
      } catch {
        // The map can already be tearing down while the route changes.
      }
    };
  }, [districtSlug, eligible, enabled]);

  if (!eligible) return null;

  return (
    <button
      type="button"
      aria-label={enabled ? "Afficher la carte en 2D" : "Afficher la carte en 3D"}
      aria-pressed={enabled}
      data-vivre-ici-3d-toggle
      data-vivre-ici-3d-active={enabled ? "true" : "false"}
      onClick={() => setEnabled((value) => !value)}
      className="absolute left-3 top-[132px] z-30 inline-grid min-h-10 grid-cols-2 items-center rounded-full border border-white/85 bg-white/95 p-1 text-[10px] font-extrabold text-foreground shadow-[0_10px_28px_rgba(15,35,66,0.15)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0A1A2F]/95 sm:left-4 sm:top-[150px]"
    >
      <span className={`grid min-h-8 min-w-10 place-items-center rounded-full px-3 transition ${enabled ? "text-muted-foreground" : "bg-brand-primary text-white shadow-sm"}`}>
        2D
      </span>
      <span className={`grid min-h-8 min-w-10 place-items-center rounded-full px-3 transition ${enabled ? "bg-brand-primary text-white shadow-sm" : "text-muted-foreground"}`}>
        3D
      </span>
    </button>
  );
}
