"use client";

import { useLayoutEffect } from "react";
import { tryLoadOvertureStaticBuildings } from "@/components/map/cesium-overture-buildings";

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
const BUILDING_QUERY_RADIUS_M = 2500;
const BUILDING_QUERY_LIMIT = 900;
const LEVEL_HEIGHT_ESTIMATE_M = 3;
const MIN_BUILDINGS = 8;

function setShellAttribute(name: string, value: string) {
  document.querySelector<HTMLElement>("[data-cesium-spike]")?.setAttribute(name, value);
}

function ensureOsmAttribution() {
  const map = document.querySelector<HTMLElement>(".cesium-spike-map");
  if (!map || map.querySelector("[data-osm-3d-attribution]") || map.querySelector("[data-open-3d-attribution]")) return;
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
    layer.brightness = 1.24;
    layer.contrast = 0.98;
    layer.saturation = 0.94;
    layer.gamma = 1.08;
    layer.hue = Cesium.Math.toRadians(0.5);
  }

  scene.backgroundColor = Cesium.Color.fromCssColorString("#cfeaf4");
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

function buildingColor(Cesium: any, meters: number, precision: "height" | "levels-estimate") {
  if (meters >= 32) return Cesium.Color.fromCssColorString(precision === "height" ? "#c39258" : "#c9a779");
  if (meters >= 22) return Cesium.Color.fromCssColorString(precision === "height" ? "#d6b27d" : "#d8c09d");
  if (meters >= 12) return Cesium.Color.fromCssColorString(precision === "height" ? "#e6cfaa" : "#dfceb4");
  return Cesium.Color.fromCssColorString(precision === "height" ? "#f1dfc7" : "#e8dccb");
}

function createOverpassBuildingPrimitive(Cesium: any, elements: OverpassElement[]) {
  const seen = new Set<number>();
  const instances: any[] = [];
  const roofOutlineInstances: any[] = [];
  let exactHeightCount = 0;
  let estimatedHeightCount = 0;

  for (const element of elements) {
    if (!element.id || seen.has(element.id)) continue;
    seen.add(element.id);

    const height = buildingHeight(element.tags);
    const geometry = element.geometry;
    if (!height || !Array.isArray(geometry) || geometry.length < 4 || geometry.length > 220) continue;

    const degrees: number[] = [];
    const degreesHeights: number[] = [];
    for (const point of geometry) {
      if (!Number.isFinite(point.lon) || !Number.isFinite(point.lat)) continue;
      degrees.push(point.lon, point.lat);
      degreesHeights.push(point.lon, point.lat, height.meters + 0.5);
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
      const color = buildingColor(Cesium, height.meters, height.precision);
      instances.push(new Cesium.GeometryInstance({
        geometry: polygon,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
        },
      }));

      const roofPositions = Cesium.Cartesian3.fromDegreesArrayHeights(degreesHeights);
      if (roofPositions.length >= 3 && Cesium.PolylineGeometry && Cesium.PolylineColorAppearance) {
        roofOutlineInstances.push(new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions: roofPositions,
            width: height.meters >= 18 ? 1.35 : 0.9,
            vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
          }),
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              Cesium.Color.fromCssColorString("#75685d").withAlpha(height.meters >= 18 ? 0.58 : 0.4),
            ),
          },
        }));
      }

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
      translucent: false,
      flat: false,
    }),
    shadows: Cesium.ShadowMode?.ENABLED,
    asynchronous: false,
  });

  const outlinePrimitive = roofOutlineInstances.length
    ? new Cesium.Primitive({
        geometryInstances: roofOutlineInstances,
        appearance: new Cesium.PolylineColorAppearance({ translucent: true }),
        asynchronous: false,
      })
    : null;

  return { primitive, outlinePrimitive, count: instances.length, exactHeightCount, estimatedHeightCount };
}

async function fetchOverpassBuildings(endpoint: string, latitude: number, longitude: number) {
  const query = `[out:json][timeout:18];(way["building"]["height"](around:${BUILDING_QUERY_RADIUS_M},${latitude.toFixed(6)},${longitude.toFixed(6)});way["building"]["building:levels"](around:${BUILDING_QUERY_RADIUS_M},${latitude.toFixed(6)},${longitude.toFixed(6)});way["building:part"]["height"](around:${BUILDING_QUERY_RADIUS_M},${latitude.toFixed(6)},${longitude.toFixed(6)});way["building:part"]["building:levels"](around:${BUILDING_QUERY_RADIUS_M},${latitude.toFixed(6)},${longitude.toFixed(6)}););out tags geom ${BUILDING_QUERY_LIMIT};`;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 21000);

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

async function ensureOpenBuildings(Cesium: any, scene: any, latitude: number, longitude: number) {
  if (!scene || window.innerWidth < 1024) {
    setShellAttribute("data-cesium-buildings-state", "skipped");
    return;
  }

  if ((scene as any).__AKARFINDER_OSM_BUILDINGS_REQUESTED__) return;
  (scene as any).__AKARFINDER_OSM_BUILDINGS_REQUESTED__ = true;
  setShellAttribute("data-cesium-buildings-state", "loading");
  setShellAttribute("data-cesium-buildings-count", "0");

  if (await tryLoadOvertureStaticBuildings(Cesium, scene)) return;

  setShellAttribute("data-cesium-buildings-source", "overpass-osm");
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const payload = await fetchOverpassBuildings(endpoint, latitude, longitude);
      const built = createOverpassBuildingPrimitive(Cesium, payload.elements ?? []);
      if (!built || built.count < MIN_BUILDINGS) continue;

      if (Cesium.SunLight) scene.light = new Cesium.SunLight({ intensity: 1.55 });
      if (scene.shadowMap) {
        scene.shadowMap.enabled = true;
        scene.shadowMap.softShadows = true;
      }
      scene.primitives.add(built.primitive);
      if (built.outlinePrimitive) scene.primitives.add(built.outlinePrimitive);
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
          void ensureOpenBuildings(Cesium, scene, latitude, longitude);
          const tunedOffset = new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(329),
            Cesium.Math.toRadians(-42),
            6200,
          );
          return originalLookAt.call(this, target, tunedOffset);
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
          height: 12% !important;
          background: linear-gradient(
            180deg,
            rgba(90, 195, 232, 0.12),
            rgba(135, 211, 238, 0.05) 52%,
            rgba(190, 232, 247, 0) 100%
          ) !important;
          mix-blend-mode: normal !important;
        }
        [data-vivre-ici-cesium-spike-page] .cesium-spike-shell {
          column-gap: 0 !important;
        }
        [data-vivre-ici-cesium-spike-page] .cesium-spike-map {
          border-radius: 22px 0 0 22px !important;
          box-shadow: 0 18px 44px rgb(38 48 48 / .10) !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-rail {
          border-radius: 0 22px 22px 0 !important;
          background: #fffaf4 !important;
          box-shadow: 0 18px 44px rgb(38 48 48 / .10) !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-hero {
          height: 166px !important;
          border-radius: 0 22px 0 0 !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-head {
          padding: 18px 20px 10px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-copy {
          padding: 14px 20px 7px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-metrics {
          gap: 6px !important;
          padding: 7px 20px 14px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-nearby {
          padding: 14px 20px 18px !important;
        }
        .cesium-spike-osm-3d-attribution {
          position: absolute;
          z-index: 14;
          right: 10px;
          bottom: 8px;
          max-width: 360px;
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
      @media (max-width: 1023px) {
        [data-vivre-ici-cesium-spike-page] .maarif-target-rail {
          bottom: 10px !important;
          max-height: 31svh !important;
          border-radius: 24px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-hero {
          display: block !important;
          height: 58px !important;
          margin: 10px 12px 0 !important;
          border-radius: 16px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-hero figcaption {
          display: none !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-head {
          padding: 8px 16px 2px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-head h1 {
          font-size: 22px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-head p {
          margin-top: 2px !important;
          font-size: 10px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-head button {
          width: 30px !important;
          height: 30px !important;
          font-size: 16px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-tabs {
          display: none !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-copy {
          padding: 5px 16px 2px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-copy p {
          font-size: 9px !important;
          line-height: 1.35 !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-metrics {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 6px !important;
          padding: 6px 12px 12px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-metrics article {
          min-height: 56px !important;
          padding: 8px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-metrics i {
          width: 24px !important;
          height: 24px !important;
          font-size: 11px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-metrics strong {
          margin-top: 5px !important;
          font-size: 12px !important;
        }
        [data-vivre-ici-cesium-spike-page] .maarif-target-metrics span {
          font-size: 7px !important;
        }
      }
    `}</style>
  );
}
