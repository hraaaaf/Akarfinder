"use client";

import { useEffect, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

const BUILDING_SOURCE = "akarfinder-vivre-ici-3d-buildings-source";
export const BUILDING_LAYER = "akarfinder-vivre-ici-3d-buildings";
const DISTRICT_SOURCE = "akarfinder-national-neighborhood-points";
const OPENFREEMAP_VECTOR_URL = "https://tiles.openfreemap.org/planet";
const CASABLANCA_3D_ZOOM = 14.2;
const CASABLANCA_3D_PITCH = 56;
const CASABLANCA_3D_BEARING = -18;

type Props = {
  citySlug: string | null;
  districtSlug: string | null;
};

type NationalMapWindow = Window & {
  __AKARFINDER_NATIONAL_MAP__?: MapLibreMap;
};

function firstLabelLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers?.find((layer) => layer.type === "symbol" && Boolean(layer.layout?.["text-field"]))?.id;
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
      "fill-extrusion-color": "#C5CFD8",
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
      "fill-extrusion-opacity": 0.96,
    },
  }, firstLabelLayerId(map));
}

function removeBuildingLayer(map: MapLibreMap): void {
  if (map.getLayer(BUILDING_LAYER)) map.removeLayer(BUILDING_LAYER);
  if (map.getSource(BUILDING_SOURCE)) map.removeSource(BUILDING_SOURCE);
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

    const applyLayerState = () => {
      if (!map || cancelled || !map.isStyleLoaded()) return;
      if (enabled) {
        ensureBuildingLayer(map);
        map.setLayoutProperty(BUILDING_LAYER, "visibility", "visible");
      } else if (map.getLayer(BUILDING_LAYER)) {
        map.setLayoutProperty(BUILDING_LAYER, "visibility", "none");
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
        map.easeTo({
          center: districtCenter ?? map.getCenter(),
          zoom: Math.max(map.getZoom(), CASABLANCA_3D_ZOOM),
          pitch: CASABLANCA_3D_PITCH,
          bearing: CASABLANCA_3D_BEARING,
          duration: 900,
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
        removeBuildingLayer(map);
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
      aria-pressed={enabled}
      data-vivre-ici-3d-toggle
      onClick={() => setEnabled((value) => !value)}
      className="absolute left-3 top-[132px] z-30 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/85 bg-white/95 px-3 text-[10px] font-extrabold text-foreground shadow-[0_10px_28px_rgba(15,35,66,0.15)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0A1A2F]/95 sm:left-4 sm:top-[150px]"
    >
      <span className="text-brand-primary">{enabled ? "3D" : "2D"}</span>
      <span className="text-muted-foreground">{enabled ? "Vue immersive" : "Activer la 3D"}</span>
    </button>
  );
}
