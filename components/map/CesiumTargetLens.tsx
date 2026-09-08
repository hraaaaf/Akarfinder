"use client";

import { useLayoutEffect } from "react";

declare global {
  interface Window {
    Cesium?: any;
    __AKARFINDER_CESIUM_TARGET_LENS__?: boolean;
  }
}

type OverpassGeometryPoint = { lat: number; lon: number };
type OverpassElement = {
  id?: number;
  tags?: Record<string, string>;
  geometry?: OverpassGeometryPoint[];
};
type OverpassPayload = { elements?: OverpassElement[] };

const OVERPASS_ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
] as const;
const BUILDING_QUERY_RADIUS_M = 1800;
const BUILDING_QUERY_LIMIT = 160;
const LEVEL_HEIGHT_ESTIMATE_M = 3;
const MIN_BUILDINGS = 8;

function setShellAttribute(name: string, value: string) {
  document.querySelector<HTMLElement>("[data-cesium-spike]")?.setAttribute(name, value);
}

function ensureOsmAttribution() {
  const map = document.querySelector<HTMLElement>(".cesium-spike-map");
  if (!map || map.querySelector("[data-osm-3d-attribution]")) return;
  const attribution = document.createElement("div");
  attribution.dataset.osm3dAttribution = "true";
  attribution.className = "cesium-spike-osm-3d-attribution";
  attribution.textContent = "© OpenStreetMap contributors · volumes 3D: hauteur OSM ou estimation ~3 m/niveau";
  map.appendChild(attribution);
}

function applyDaylightGrade(Cesium: any, scene: any) {
  if (!scene?.imageryLayers) return;

  for (let index = 0; index < scene.imageryLayers.length; index += 1) {
    const layer = scene.imageryLayers.get(index);
    if (!layer) continue;
    layer.brightness = 1.38;
    layer.contrast = 0.8;
    layer.saturation = 1.02;
    layer.gamma = 1.2;
    layer.hue = Cesium.Math.toRadians(-1.5);
  }

  scene.backgroundColor = Cesium.Color.fromCssColorString("#bfe4f2");
  setShellAttribute("data-cesium-day-mode", "true");
}

function parseMeters(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(",", ".");
  const metric = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:m|meter|meters|metre|metres)?$/);
  if (!metric) return null;
  const meters = Number(metric[1]);
  return Number.isFinite(meters) && meters >= 2 && meters <= 350 ? meters : null;
}

function parseLevels(value: string | undefined): number | null {
  if (!value) return null;
  const levels = Number(value.trim().replace(",", "."));
  return Number.isFinite(levels) && levels >= 1 && levels <= 100 ? levels : null;
}

function buildingHeight(tags: Record<string, string> | undefined) {
  const exact = parseMeters(tags?.height);
  if (exact !== null) return { meters: exact, precision: "height" as const };
  const levels = parseLevels(tags?.["building:levels"]);
  if (levels !== null) {
    return { meters: levels * LEVEL_HEIGHT_ESTIMATE_M, precision: "levels-estimate" as const };
  }
  return null;
}

function createOverpassBuildingPrimitive(Cesium: any, elements: OverpassElement[]) {
  const seen = new Set<number>();
  const instances: any[] = [];
  let exactHeightCount = 0;
  let estimatedHeightCount = 0;

  for (const element of elements) {
    if (!element.id || seen.has(element.id)) continue;
    seen.add(element.id);

    const height = buildingHeight(element.tags);
    const geometry = element.geometry;
    if (!height || !Array.isArray(geometry) || geometry.length < 4 || geometry.length > 220) continue;

    const degrees: number[] = [];
    for (const point of geometry) {
      if (!Number.isFinite(point.lon) || !Number.isFinite(point.lat)) continue;
      degrees.push(point.lon, point.lat);
    }
    if (degrees.length < 8) continue;

    try {
      const polygonHierarchy = new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(degrees));
      const polygon = new Cesium.PolygonGeometry({
        polygonHierarchy,
        height: 0,
        extrudedHeight: height.meters,
        vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
      });
      const color = height.precision === "height"
        ? Cesium.Color.fromCssColorString("#f1e8dc").withAlpha(0.94)
        : Cesium.Color.fromCssColorString("#e7ded1").withAlpha(0.84);
      instances.push(new Cesium.GeometryInstance({
        geometry: polygon,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
        },
      }));
      if (height.precision === "height") exactHeightCount += 1;
      else estimatedHeightCount += 1;
    } catch {
      // Skip malformed OSM polygons instead of fabricating geometry.
    }
  }

  if (!instances.length) return null;

  const primitive = new Cesium.Primitive({
    geometryInstances: instances,
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
      translucent: true,
      flat: false,
    }),
    asynchronous: false,
  });

  return { primitive, count: instances.length, exactHeightCount, estimatedHeightCount };
}

async function fetchOverpassBuildings(endpoint: string, latitude: number, longitude: number) {
  // Start with building:levels only. It is dramatically lighter than requesting all buildings,
  // while remaining sourced and usable for an explicitly disclosed 3 m/level approximation.
  const query = `[out:json][timeout:14];way["building"]["building:levels"](around:${BUILDING_QUERY_RADIUS_M},${latitude.toFixed(6)},${longitude.toFixed(6)});out tags geom ${BUILDING_QUERY_LIMIT};`;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 16000);

  try {
    const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Overpass ${response.status}`);
    return (await response.json()) as OverpassPayload;
  } finally {
    window.clearTimeout(timer);
  }
}

async function ensureTokenlessOsmBuildings(Cesium: any, scene: any, latitude: number, longitude: number) {
  if (!scene || window.innerWidth < 1024) {
    setShellAttribute("data-cesium-buildings-state", "skipped");
    return;
  }

  if ((scene as any).__AKARFINDER_OSM_BUILDINGS_REQUESTED__) return;
  (scene as any).__AKARFINDER_OSM_BUILDINGS_REQUESTED__ = true;
  setShellAttribute("data-cesium-buildings-state", "loading");
  setShellAttribute("data-cesium-buildings-source", "overpass-osm");
  setShellAttribute("data-cesium-buildings-count", "0");

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const payload = await fetchOverpassBuildings(endpoint, latitude, longitude);
      const built = createOverpassBuildingPrimitive(Cesium, payload.elements ?? []);
      if (!built || built.count < MIN_BUILDINGS) continue;

      scene.primitives.add(built.primitive);
      scene.requestRender?.();
      ensureOsmAttribution();
      setShellAttribute("data-cesium-buildings-endpoint", new URL(endpoint).hostname);
      setShellAttribute("data-cesium-buildings-count", String(built.count));
      setShellAttribute("data-cesium-buildings-exact-count", String(built.exactHeightCount));
      setShellAttribute("data-cesium-buildings-estimated-count", String(built.estimatedHeightCount));
      setShellAttribute("data-cesium-buildings-precision", built.estimatedHeightCount > 0 ? "mixed" : "exact-height-tags");
      setShellAttribute("data-cesium-buildings-state", "available");
      return;
    } catch (error) {
      console.warn(`[vivre-ici-cesium-spike] Overpass endpoint failed: ${endpoint}`, error);
    }
  }

  setShellAttribute("data-cesium-buildings-state", "unavailable");
}

function installTargetLens(Cesium: any) {
  if (!Cesium?.Camera?.prototype?.lookAt || window.__AKARFINDER_CESIUM_TARGET_LENS__) return;

  const cameraPrototype = Cesium.Camera.prototype;
  const originalLookAt = cameraPrototype.lookAt;

  cameraPrototype.lookAt = function targetLockedLookAt(this: any, target: any, offset: any) {
    try {
      if (window.innerWidth >= 1024 && offset && typeof offset.range === "number") {
        const cartographic = Cesium.Cartographic.fromCartesian(target);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);
        const isCasablancaTarget = longitude > -7.8 && longitude < -7.4 && latitude > 33.4 && latitude < 33.8;

        if (isCasablancaTarget) {
          const scene = this?._scene;
          applyDaylightGrade(Cesium, scene);
          void ensureTokenlessOsmBuildings(Cesium, scene, latitude, longitude);

          const tunedTarget = Cesium.Cartesian3.fromDegrees(
            longitude + 0.0035,
            latitude + 0.0100,
            0,
          );

          if (this.frustum && "fov" in this.frustum) {
            this.frustum.fov = Cesium.Math.toRadians(40);
          }

          const tunedOffset = new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(346),
            Cesium.Math.toRadians(-40),
            8500,
          );

          return originalLookAt.call(this, tunedTarget, tunedOffset);
        }
      }
    } catch {
      // Fail closed to the existing camera if Cesium internals differ.
    }

    return originalLookAt.call(this, target, offset);
  };

  window.__AKARFINDER_CESIUM_TARGET_LENS__ = true;
}

export function CesiumTargetLens() {
  useLayoutEffect(() => {
    if (window.Cesium) {
      installTargetLens(window.Cesium);
      return;
    }

    const attach = (script: HTMLScriptElement) => {
      if (!/\/cesium@[^/]+\/Build\/Cesium\/Cesium\.js/i.test(script.src)) return;
      script.addEventListener(
        "load",
        () => {
          if (window.Cesium) installTargetLens(window.Cesium);
        },
        { once: true },
      );
    };

    document.querySelectorAll<HTMLScriptElement>("script[src]").forEach(attach);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLScriptElement) attach(node);
        });
      }
    });

    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, []);

  return (
    <style jsx global>{`
      @media (min-width: 1024px) {
        .cesium-spike-map-atmosphere {
          height: 38% !important;
          background: linear-gradient(
            180deg,
            rgba(112, 203, 241, 0.55),
            rgba(145, 216, 242, 0.30) 44%,
            rgba(195, 230, 243, 0.10) 72%,
            rgba(195, 230, 243, 0)
          ) !important;
          mix-blend-mode: screen !important;
        }
        .cesium-spike-osm-3d-attribution {
          position: absolute;
          z-index: 14;
          right: 10px;
          bottom: 8px;
          max-width: 330px;
          padding: 4px 7px;
          border-radius: 7px;
          background: rgba(255, 253, 249, 0.82);
          color: #59635f;
          font-size: 7px;
          line-height: 1.25;
          pointer-events: none;
          backdrop-filter: blur(7px);
        }
      }
    `}</style>
  );
}
