"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW } from "@/lib/geo/casablanca-neighborhood-geometry-shadow";

declare global {
  interface Window {
    Cesium?: any;
    CESIUM_BASE_URL?: string;
  }
}

const CESIUM_VERSION = "1.141.0";
const CESIUM_BASE_URL = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/`;
const CESIUM_JS = `${CESIUM_BASE_URL}Cesium.js`;
const CESIUM_CSS = `${CESIUM_BASE_URL}Widgets/widgets.css`;
const ESRI_WORLD_IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";

function flattenCoordinates(value: unknown, out: Array<[number, number]>) {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    out.push([value[0], value[1]]);
    return;
  }
  value.forEach((entry) => flattenCoordinates(entry, out));
}

function maarifCenter(): [number, number] {
  const geometry = CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW.find((entry) => entry.neighborhoodCanonicalId === "maarif")?.geometry;
  const points: Array<[number, number]> = [];
  flattenCoordinates(geometry?.coordinates, points);
  if (!points.length) return [-7.632, 33.585];
  const sum = points.reduce((acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat] as [number, number], [0, 0] as [number, number]);
  return [sum[0] / points.length, sum[1] / points.length];
}

function loadExternalAsset(): Promise<void> {
  if (window.Cesium) return Promise.resolve();
  window.CESIUM_BASE_URL = CESIUM_BASE_URL;
  if (!document.querySelector(`link[href="${CESIUM_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CESIUM_CSS;
    document.head.appendChild(link);
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CESIUM_JS}"]`);
    if (existing) {
      if (window.Cesium) resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Cesium CDN load failed")), { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = CESIUM_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Cesium CDN load failed"));
    document.head.appendChild(script);
  });
}

export function CesiumMaarifSpike() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [renderState, setRenderState] = useState<"loading" | "ready" | "error">("loading");
  const [imageryLayers, setImageryLayers] = useState(0);
  const [buildings, setBuildings] = useState<"loading" | "available" | "unavailable">("loading");
  const center = useMemo(() => maarifCenter(), []);

  useEffect(() => {
    let disposed = false;
    let viewer: any = null;
    let readyTimer: ReturnType<typeof setTimeout> | null = null;

    void loadExternalAsset().then(async () => {
      if (disposed || !mapRef.current || !window.Cesium) return;
      const Cesium = window.Cesium;
      viewer = new Cesium.Viewer(mapRef.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        shouldAnimate: false,
        requestRenderMode: false,
        baseLayer: false,
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      });

      const imageryProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(ESRI_WORLD_IMAGERY, {
        enablePickFeatures: false,
      });
      if (disposed || !viewer || viewer.isDestroyed()) return;

      const imagery = viewer.imageryLayers.addImageryProvider(imageryProvider);
      imagery.brightness = 1.10;
      imagery.contrast = 0.96;
      imagery.saturation = 1.05;
      imagery.gamma = 0.98;
      setImageryLayers(viewer.imageryLayers.length);

      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#dce8ea");
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#dfeef2");
      viewer.scene.globe.maximumScreenSpaceError = 1.25;
      viewer.scene.globe.tileCacheSize = 800;
      viewer.scene.highDynamicRange = true;
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.00035;
      viewer.scene.skyAtmosphere.saturationShift = -0.03;
      viewer.scene.skyAtmosphere.brightnessShift = 0.16;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 180;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 18000;

      const target = Cesium.Cartesian3.fromDegrees(center[0], center[1], 0);
      const range = window.innerWidth >= 1024 ? 5200 : 4300;
      viewer.camera.lookAt(
        target,
        new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(338),
          Cesium.Math.toRadians(-31),
          range,
        ),
      );
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

      // Imagery and camera are the spike's critical path. OSM Buildings is optional and
      // must never block a valid aerial render when Cesium ion is unavailable.
      void Cesium.createOsmBuildingsAsync()
        .then((osmBuildings: unknown) => {
          if (!disposed && viewer && !viewer.isDestroyed()) {
            viewer.scene.primitives.add(osmBuildings);
            setBuildings("available");
          }
        })
        .catch(() => {
          if (!disposed) setBuildings("unavailable");
        });

      readyTimer = setTimeout(() => {
        if (!disposed) {
          setRenderState("ready");
          setReady(true);
        }
      }, 6500);
    }).catch((error) => {
      console.error("[vivre-ici-cesium-spike] renderer failed", error);
      if (!disposed) {
        setBuildings("unavailable");
        setRenderState("error");
        setReady(false);
      }
    });

    return () => {
      disposed = true;
      if (readyTimer) clearTimeout(readyTimer);
      try { viewer?.destroy(); } catch { /* spike teardown */ }
    };
  }, [center]);

  return (
    <section
      className="cesium-spike-shell"
      data-cesium-spike
      data-cesium-ready={ready ? "true" : "false"}
      data-cesium-render-state={renderState}
      data-cesium-imagery-layers={imageryLayers}
    >
      <div className="cesium-spike-map" ref={mapRef} data-cesium-map-surface />

      <div className="cesium-spike-map-chrome" aria-hidden="true">
        <div className="cesium-spike-location">←&nbsp; Vivre à Casablanca</div>
        <div className="cesium-spike-search">Rechercher un quartier, une adresse, une ville…</div>
        <div className="cesium-spike-mode"><span>2D</span><strong>3D</strong></div>
      </div>

      <div className="cesium-spike-filters" aria-hidden="true">
        <span>Repères</span><span>Écoles</span><span>Santé</span><span>Parcs & sport</span>
      </div>

      <aside className="cesium-spike-rail">
        <div className="cesium-spike-hero" />
        <p className="cesium-spike-kicker">Casablanca · Quartier</p>
        <h1>Maârif</h1>
        <p className="cesium-spike-subtitle">Un quartier central à explorer par ses repères publics sourcés.</p>
        <nav><strong>Vue d’ensemble</strong><span>Vie locale</span><span>Biens</span></nav>
        <div className="cesium-spike-copy">
          Cette branche est un prototype visuel isolé. Elle teste une caméra Cesium plus cinématique et une lecture territoriale plus proche du TARGET, sans publier de nouvelle donnée immobilière.
        </div>
        <div className="cesium-spike-signals">
          <article><b>Repères</b><small>Sourcés uniquement</small></article>
          <article><b>3D</b><small>{buildings === "available" ? "OSM disponible" : buildings === "loading" ? "Chargement…" : "Fallback imagerie"}</small></article>
          <article><b>Biens</b><small>Pin exact requis</small></article>
        </div>
        <div className="cesium-spike-nearby">
          <p>À proximité</p>
          <h2>Lire le quartier avant de chercher</h2>
          <div><span>Vie locale</span><span>Mobilité</span><span>Services</span></div>
        </div>
        <button type="button">Voir les biens disponibles à Maârif</button>
      </aside>

      <footer className="cesium-spike-outro">
        <div><strong>Découvrez les quartiers autrement</strong><span>Explorez, comparez, vivez mieux avec AkarFinder.</span></div>
        <em>Des lieux. Des vies. Des projets.</em>
      </footer>

      <style jsx global>{`
        .cesium-spike-shell{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 360px;grid-template-rows:minmax(0,1fr) 76px;gap:8px;height:calc(100svh - 64px);padding:10px 10px 0 12px;background:#f4efe7;color:#17302e;overflow:hidden}
        .cesium-spike-map{position:relative;min-width:0;overflow:hidden;border-radius:22px;box-shadow:0 18px 44px rgb(38 48 48/.12);background:#dfeef2}
        .cesium-spike-map .cesium-viewer,.cesium-spike-map .cesium-viewer-cesiumWidgetContainer,.cesium-spike-map .cesium-widget,.cesium-spike-map canvas{width:100%!important;height:100%!important}
        .cesium-spike-map .cesium-viewer-bottom{font-size:8px!important;opacity:.68}
        .cesium-spike-map-chrome{position:absolute;z-index:10;left:28px;right:386px;top:28px;display:grid;grid-template-columns:auto minmax(220px,1fr) auto;gap:10px;pointer-events:none}
        .cesium-spike-location,.cesium-spike-search,.cesium-spike-mode{min-height:40px;display:flex;align-items:center;border:1px solid rgb(255 255 255/.85);background:rgb(255 255 255/.94);box-shadow:0 8px 26px rgb(30 46 47/.13);backdrop-filter:blur(14px);font-size:10px;font-weight:800;color:#243a39}
        .cesium-spike-location{padding:0 13px;border-radius:999px}.cesium-spike-search{padding:0 16px;border-radius:999px;color:#7b817e}.cesium-spike-mode{padding:3px;border-radius:999px}.cesium-spike-mode span,.cesium-spike-mode strong{display:grid;place-items:center;min-width:37px;min-height:32px;border-radius:999px}.cesium-spike-mode strong{background:#0b6668;color:#fff}
        .cesium-spike-filters{position:absolute;z-index:10;left:210px;top:78px;display:flex;gap:7px;pointer-events:none}.cesium-spike-filters span{padding:7px 11px;border-radius:999px;background:rgb(255 255 255/.94);box-shadow:0 6px 18px rgb(30 46 47/.10);font-size:8px;font-weight:800;color:#364845}
        .cesium-spike-rail{grid-column:2;grid-row:1;min-height:0;overflow:auto;border-radius:22px;background:#fffefa;box-shadow:0 18px 44px rgb(38 48 48/.08);padding:14px 18px 18px}.cesium-spike-hero{height:128px;border-radius:16px;background:linear-gradient(135deg,#dce8dd,#f0dfc5 58%,#b7d0c7)}
        .cesium-spike-kicker{margin:17px 0 0;font-size:8px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#0b6668}.cesium-spike-rail h1{margin:4px 0 0;font-size:40px;line-height:.95;letter-spacing:-.05em}.cesium-spike-subtitle{margin:9px 0 0;font-size:11px;line-height:1.45;color:#69716d}.cesium-spike-rail nav{display:flex;gap:18px;margin-top:16px;border-bottom:1px solid #e5dfd4}.cesium-spike-rail nav>*{padding:8px 0 10px;font-size:9px}.cesium-spike-rail nav strong{color:#0b6668;border-bottom:2px solid #0b6668}.cesium-spike-copy{margin-top:15px;font-size:10.5px;line-height:1.58;color:#525c58}.cesium-spike-signals{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:14px}.cesium-spike-signals article{min-height:70px;padding:10px;border:1px solid #e2ded4;border-radius:14px;background:#fbfaf6}.cesium-spike-signals b,.cesium-spike-signals small{display:block}.cesium-spike-signals b{font-size:10px}.cesium-spike-signals small{margin-top:6px;font-size:7.5px;line-height:1.3;color:#7b817e}.cesium-spike-nearby{margin-top:17px;padding-top:15px;border-top:1px solid #e5dfd4}.cesium-spike-nearby p{margin:0;font-size:8px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#0b6668}.cesium-spike-nearby h2{margin:5px 0 0;font-size:15px;line-height:1.2}.cesium-spike-nearby div{display:flex;gap:6px;margin-top:12px}.cesium-spike-nearby span{padding:7px 9px;border-radius:10px;background:#f2f5f0;font-size:8px}.cesium-spike-rail button{width:100%;min-height:44px;margin-top:17px;border:0;border-radius:13px;background:#0b6668;color:#fff;font-size:10px;font-weight:850}
        .cesium-spike-outro{grid-column:1/3;grid-row:2;display:flex;align-items:center;justify-content:space-between;padding:12px 24px 15px;border-top:1px solid #ded6c9}.cesium-spike-outro div{display:grid;gap:2px}.cesium-spike-outro strong{font-size:17px}.cesium-spike-outro span{font-size:9px;color:#767972}.cesium-spike-outro em{font-family:Georgia,serif;font-size:13px;color:#777067;transform:rotate(-4deg)}
        @media(max-width:1023px){.cesium-spike-shell{display:block;height:calc(100svh - 58px);padding:0;background:#eef2f2}.cesium-spike-map{height:100%;border-radius:0;box-shadow:none}.cesium-spike-map-chrome{left:12px;right:12px;top:12px;grid-template-columns:auto 1fr auto;gap:6px}.cesium-spike-location{max-width:138px}.cesium-spike-search{position:absolute;left:0;right:0;top:50px}.cesium-spike-filters{left:12px;right:12px;top:112px;overflow:hidden}.cesium-spike-rail{position:absolute;z-index:12;left:12px;right:12px;bottom:70px;height:auto;max-height:34svh;padding:16px 14px 14px;border-radius:25px;overflow:hidden}.cesium-spike-hero,.cesium-spike-rail nav,.cesium-spike-copy,.cesium-spike-nearby{display:none}.cesium-spike-kicker{margin-top:0}.cesium-spike-rail h1{font-size:25px}.cesium-spike-subtitle{margin-top:5px;font-size:9px}.cesium-spike-signals{margin-top:10px}.cesium-spike-signals article{min-height:52px}.cesium-spike-rail button{min-height:38px;margin-top:10px}.cesium-spike-outro{display:none}}
      `}</style>
    </section>
  );
}
