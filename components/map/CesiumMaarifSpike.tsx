"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW } from "@/lib/geo/casablanca-neighborhood-geometry-shadow";

declare global {
  interface Window {
    Cesium?: any;
    CESIUM_BASE_URL?: string;
  }
}

type LivingHereCategory =
  | "education"
  | "groceries"
  | "health"
  | "transport"
  | "food"
  | "green_sport"
  | "worship"
  | "banking"
  | "parking"
  | "shopping"
  | "coast"
  | "other";

type ContextAnchor = {
  poi_id: string;
  name: string;
  category: LivingHereCategory;
  latitude: number;
  longitude: number;
  territorial_wording: string;
  attribution: string;
};

type NeighborhoodContext = {
  neighborhood: string;
  anchor_count: number;
  categories: LivingHereCategory[];
  anchors: ContextAnchor[];
  coverage_status: string;
};

type MutablePosition = [number, number];
type ScreenPoint = { x: number; y: number; visible: boolean };

const CESIUM_VERSION = "1.141.0";
const CESIUM_BASE_URL = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/`;
const CESIUM_JS = `${CESIUM_BASE_URL}Cesium.js`;
const CESIUM_CSS = `${CESIUM_BASE_URL}Widgets/widgets.css`;
const ESRI_WORLD_IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";

const CATEGORY_META: Record<LivingHereCategory, { label: string; color: string; glyph: string }> = {
  education: { label: "Écoles", color: "#2f80ed", glyph: "E" },
  groceries: { label: "Courses", color: "#7b61ff", glyph: "C" },
  health: { label: "Santé", color: "#df5a56", glyph: "+" },
  transport: { label: "Transports", color: "#2979d3", glyph: "T" },
  food: { label: "Cafés & restaurants", color: "#e8872d", glyph: "R" },
  green_sport: { label: "Parcs & sport", color: "#3c9a63", glyph: "P" },
  worship: { label: "Mosquées", color: "#2b8f7b", glyph: "M" },
  banking: { label: "Banques", color: "#667085", glyph: "B" },
  parking: { label: "Parking", color: "#4f6f8f", glyph: "P" },
  shopping: { label: "Shopping", color: "#8b5cf6", glyph: "S" },
  coast: { label: "Côte", color: "#3b82c4", glyph: "C" },
  other: { label: "Autres", color: "#6b7280", glyph: "•" },
};

const maarifGeometry = CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW.find(
  (entry) => entry.neighborhoodCanonicalId === "maarif",
);

function flattenCoordinates(value: unknown, out: MutablePosition[]) {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    out.push([value[0], value[1]]);
    return;
  }
  value.forEach((entry) => flattenCoordinates(entry, out));
}

function maarifCenter(): MutablePosition {
  const points: MutablePosition[] = [];
  flattenCoordinates(maarifGeometry?.geometry.coordinates, points);
  if (!points.length) return [-7.632, 33.585];
  const [lng, lat] = points.reduce(
    (acc, [pointLng, pointLat]) => [acc[0] + pointLng, acc[1] + pointLat] as MutablePosition,
    [0, 0] as MutablePosition,
  );
  return [lng / points.length, lat / points.length];
}

function outerRings(): MutablePosition[][] {
  const geometry = maarifGeometry?.geometry;
  if (!geometry) return [];

  const copyRing = (ring: readonly (readonly [number, number])[]): MutablePosition[] =>
    ring.map(([lng, lat]) => [lng, lat]);

  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    return ring ? [copyRing(ring)] : [];
  }

  return geometry.coordinates.flatMap((polygon) => {
    const ring = polygon[0];
    return ring ? [copyRing(ring)] : [];
  });
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
  const viewerRef = useRef<any>(null);
  const anchorEntitiesRef = useRef<Array<{ entity: any; category: LivingHereCategory }>>([]);
  const [ready, setReady] = useState(false);
  const [renderState, setRenderState] = useState<"loading" | "ready" | "error">("loading");
  const [imageryLayers, setImageryLayers] = useState(0);
  const [boundaryState, setBoundaryState] = useState<"loading" | "reference" | "unavailable">("loading");
  const [contextState, setContextState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [context, setContext] = useState<NeighborhoodContext | null>(null);
  const [activeCategory, setActiveCategory] = useState<LivingHereCategory | "all">("all");
  const [renderedAnchorCount, setRenderedAnchorCount] = useState(0);
  const [screenPoints, setScreenPoints] = useState<Record<string, ScreenPoint>>({});
  const [centerPoint, setCenterPoint] = useState<ScreenPoint | null>(null);
  const center = useMemo(() => maarifCenter(), []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/geo/neighborhood-context?city=casablanca&district=maarif", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`context ${response.status}`);
        const payload = await response.json();
        if (payload?.status !== "ok" || !payload?.context) throw new Error("context unavailable");
        if (!cancelled) {
          setContext(payload.context as NeighborhoodContext);
          setContextState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setContextState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let viewer: any = null;
    let readyTimer: ReturnType<typeof setTimeout> | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let onTileProgress: ((remaining: number) => void) | null = null;

    const markReady = () => {
      if (disposed) return;
      setRenderState("ready");
      setReady(true);
    };

    void loadExternalAsset()
      .then(async () => {
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
        viewerRef.current = viewer;

        const imageryProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(ESRI_WORLD_IMAGERY, {
          enablePickFeatures: false,
        });
        if (disposed || !viewer || viewer.isDestroyed()) return;

        const imagery = viewer.imageryLayers.addImageryProvider(imageryProvider);
        imagery.brightness = 1.17;
        imagery.contrast = 0.9;
        imagery.saturation = 0.9;
        imagery.gamma = 1.09;
        setImageryLayers(viewer.imageryLayers.length);

        const globe = viewer.scene.globe;
        globe.enableLighting = false;
        globe.baseColor = Cesium.Color.fromCssColorString("#d8e6e8");
        globe.maximumScreenSpaceError = 0.7;
        globe.tileCacheSize = 1500;
        globe.preloadAncestors = true;
        globe.preloadSiblings = true;
        globe.depthTestAgainstTerrain = false;
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#dcebed");
        viewer.scene.highDynamicRange = false;
        viewer.scene.fog.enabled = false;
        viewer.scene.skyAtmosphere.show = false;
        if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
        if (viewer.scene.postProcessStages?.fxaa) viewer.scene.postProcessStages.fxaa.enabled = true;

        const rings = outerRings();
        if (rings.length) {
          rings.forEach((ring) => {
            const degrees = ring.flatMap(([lng, lat]) => [lng, lat]);
            viewer.entities.add({
              polygon: {
                hierarchy: Cesium.Cartesian3.fromDegreesArray(degrees),
                material: Cesium.Color.fromCssColorString("#0b6668").withAlpha(0.01),
                outline: false,
              },
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(degrees),
                width: 1.2,
                material: Cesium.Color.fromCssColorString("#f1d8a6").withAlpha(0.28),
                clampToGround: true,
              },
            });
          });
          setBoundaryState("reference");
        } else {
          setBoundaryState("unavailable");
        }

        const desktop = window.innerWidth >= 1024;
        const cameraTarget = Cesium.Cartesian3.fromDegrees(
          center[0] - (desktop ? 0.0005 : 0),
          center[1] + (desktop ? 0.0084 : 0),
          0,
        );
        viewer.camera.lookAt(
          cameraTarget,
          new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(desktop ? 329 : 338),
            Cesium.Math.toRadians(desktop ? -54 : -39),
            desktop ? 6450 : 3300,
          ),
        );
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

        onTileProgress = (remaining: number) => {
          if (disposed || remaining !== 0) {
            if (settleTimer) clearTimeout(settleTimer);
            return;
          }
          if (settleTimer) clearTimeout(settleTimer);
          settleTimer = setTimeout(markReady, 1400);
        };
        globe.tileLoadProgressEvent.addEventListener(onTileProgress);
        readyTimer = setTimeout(markReady, 14000);
      })
      .catch((error) => {
        console.error("[vivre-ici-cesium-spike] renderer failed", error);
        if (!disposed) {
          setRenderState("error");
          setReady(false);
        }
      });

    return () => {
      disposed = true;
      if (readyTimer) clearTimeout(readyTimer);
      if (settleTimer) clearTimeout(settleTimer);
      if (viewer && onTileProgress) viewer.scene.globe.tileLoadProgressEvent.removeEventListener(onTileProgress);
      anchorEntitiesRef.current = [];
      viewerRef.current = null;
      try {
        viewer?.destroy();
      } catch {
        // no-op on teardown
      }
    };
  }, [center]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium || !context || contextState !== "ready" || !ready) return;

    anchorEntitiesRef.current.forEach(({ entity }) => viewer.entities.remove(entity));
    anchorEntitiesRef.current = [];

    context.anchors.forEach((anchor) => {
      const meta = CATEGORY_META[anchor.category] ?? CATEGORY_META.other;
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(anchor.longitude, anchor.latitude, 18),
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromCssColorString(meta.color),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      anchorEntitiesRef.current.push({ entity, category: anchor.category });
    });

    setRenderedAnchorCount(anchorEntitiesRef.current.length);
  }, [context, contextState, ready]);

  useEffect(() => {
    anchorEntitiesRef.current.forEach(({ entity, category }) => {
      entity.show = activeCategory === "all" || category === activeCategory;
    });
  }, [activeCategory, renderedAnchorCount]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium || !context || !ready || !mapRef.current) return;

    const project = (lng: number, lat: number, height = 18): ScreenPoint => {
      const point = Cesium.SceneTransforms.worldToWindowCoordinates(
        viewer.scene,
        Cesium.Cartesian3.fromDegrees(lng, lat, height),
      );
      const width = mapRef.current?.clientWidth ?? 0;
      const heightPx = mapRef.current?.clientHeight ?? 0;
      if (!point) return { x: 0, y: 0, visible: false };
      return {
        x: point.x,
        y: point.y,
        visible: point.x > -120 && point.x < width + 120 && point.y > -80 && point.y < heightPx + 80,
      };
    };

    const updatePositions = () => {
      const next: Record<string, ScreenPoint> = {};
      context.anchors.forEach((anchor) => {
        next[anchor.poi_id] = project(anchor.longitude, anchor.latitude);
      });
      setScreenPoints(next);
      setCenterPoint(project(center[0], center[1], 20));
    };

    const timer = setTimeout(updatePositions, 180);
    window.addEventListener("resize", updatePositions);
    const removeCameraListener = viewer.camera.changed.addEventListener(updatePositions);
    updatePositions();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePositions);
      if (typeof removeCameraListener === "function") removeCameraListener();
    };
  }, [context, ready, center]);

  const categories = context?.categories.filter((category) => Boolean(CATEGORY_META[category])) ?? [];
  const visibleAnchors =
    context?.anchors.filter((anchor) => activeCategory === "all" || anchor.category === activeCategory) ?? [];

  return (
    <section
      className="cesium-spike-shell"
      data-cesium-spike
      data-cesium-ready={ready ? "true" : "false"}
      data-cesium-render-state={renderState}
      data-cesium-imagery-layers={imageryLayers}
      data-cesium-boundary-state={boundaryState}
      data-cesium-context-state={contextState}
      data-cesium-anchor-count={renderedAnchorCount}
    >
      <div className="cesium-spike-map" data-cesium-map-surface>
        <div className="cesium-spike-canvas" ref={mapRef} />
        <div className="cesium-spike-map-atmosphere" />
        <div className="cesium-spike-dom-labels" aria-hidden="true">
          {centerPoint?.visible && (
            <div className="cesium-spike-neighborhood-label" style={{ left: centerPoint.x, top: centerPoint.y }}>
              Maârif
            </div>
          )}
          {visibleAnchors.map((anchor) => {
            const screen = screenPoints[anchor.poi_id];
            if (!screen?.visible) return null;
            const meta = CATEGORY_META[anchor.category] ?? CATEGORY_META.other;
            return (
              <div key={anchor.poi_id} className="cesium-spike-poi-label" style={{ left: screen.x, top: screen.y }}>
                <span>{anchor.name}</span>
                <i style={{ background: meta.color }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="cesium-spike-map-chrome">
        <div className="cesium-spike-location">←&nbsp; Vivre à Casablanca</div>
        <div className="cesium-spike-search">Rechercher un quartier, une adresse, une ville…</div>
        <div className="cesium-spike-mode"><span>2D</span><strong>3D</strong></div>
      </div>

      <div className="cesium-spike-filters" aria-label="Filtres des repères du quartier">
        <button className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>Repères</button>
        {categories.map((category) => (
          <button
            key={category}
            className={activeCategory === category ? "active" : ""}
            onClick={() => setActiveCategory(category)}
          >
            {CATEGORY_META[category].label}
          </button>
        ))}
      </div>

      <div className="cesium-spike-map-note">
        <strong>Maârif · lecture quartier</strong>
        <span>
          {contextState === "ready"
            ? `${visibleAnchors.length} repère${visibleAnchors.length > 1 ? "s" : ""} sourcé${visibleAnchors.length > 1 ? "s" : ""}`
            : "Repères indisponibles"}
        </span>
      </div>

      <footer className="cesium-spike-outro">
        <div><strong>Découvrez les quartiers autrement</strong><span>Explorez, comparez, vivez mieux avec AkarFinder.</span></div>
        <em>Des lieux. Des vies. Des projets.</em>
      </footer>

      <style jsx global>{`
        .cesium-spike-shell{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 372px;grid-template-rows:minmax(0,1fr) 76px;gap:8px;height:calc(100svh - 64px);padding:10px 10px 0 12px;background:#f4efe7;color:#17302e;overflow:hidden}
        .cesium-spike-map{position:relative;grid-column:1;grid-row:1;min-width:0;overflow:hidden;border-radius:22px;box-shadow:0 18px 44px rgb(38 48 48/.12);background:#dfeef2}
        .cesium-spike-canvas,.cesium-spike-canvas .cesium-viewer,.cesium-spike-canvas .cesium-viewer-cesiumWidgetContainer,.cesium-spike-canvas .cesium-widget,.cesium-spike-canvas canvas{width:100%!important;height:100%!important}
        .cesium-spike-canvas{position:absolute;inset:0}.cesium-spike-map .cesium-viewer-bottom{font-size:7px!important;opacity:.55}.cesium-spike-map-atmosphere{position:absolute;z-index:7;left:0;right:0;top:0;height:28%;pointer-events:none;background:linear-gradient(180deg,rgba(155,211,238,.16),rgba(183,221,239,.07) 58%,rgba(183,221,239,0));mix-blend-mode:screen}
        .cesium-spike-dom-labels{position:absolute;z-index:9;inset:0;pointer-events:none;overflow:hidden}.cesium-spike-neighborhood-label{position:absolute;transform:translate(-50%,-50%);padding:7px 11px;border-radius:8px;background:rgb(8 101 97/.92);box-shadow:0 5px 14px rgb(18 50 49/.18);color:#fff;font-size:13px;font-weight:850;letter-spacing:-.01em;white-space:nowrap}.cesium-spike-poi-label{position:absolute;display:flex;flex-direction:column;align-items:center;gap:5px;transform:translate(-50%,-100%)}.cesium-spike-poi-label span{max-width:250px;padding:7px 14px;border:1px solid rgb(224 221 214/.9);border-radius:999px;background:rgb(255 253 249/.94);box-shadow:0 7px 19px rgb(30 46 47/.15);backdrop-filter:blur(8px);color:#33433f;font-size:10px;font-weight:750;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cesium-spike-poi-label i{display:block;width:10px;height:10px;border:2px solid #fff;border-radius:999px;box-shadow:0 2px 8px rgb(30 46 47/.22)}
        .cesium-spike-map-chrome{position:absolute;z-index:12;left:28px;right:398px;top:28px;display:grid;grid-template-columns:auto minmax(220px,1fr) auto;gap:10px}.cesium-spike-location,.cesium-spike-search,.cesium-spike-mode{min-height:40px;display:flex;align-items:center;border:1px solid rgb(255 255 255/.88);background:rgb(255 255 255/.94);box-shadow:0 8px 26px rgb(30 46 47/.12);backdrop-filter:blur(14px);font-size:10px;font-weight:800;color:#243a39}.cesium-spike-location{padding:0 13px;border-radius:999px}.cesium-spike-search{padding:0 16px;border-radius:999px;color:#7b817e}.cesium-spike-mode{padding:3px;border-radius:999px}.cesium-spike-mode span,.cesium-spike-mode strong{display:grid;place-items:center;min-width:37px;min-height:32px;border-radius:999px}.cesium-spike-mode strong{background:#0b6668;color:#fff}
        .cesium-spike-filters{position:absolute;z-index:13;left:190px;right:404px;top:78px;display:flex;gap:7px;overflow:hidden}.cesium-spike-filters button{flex:0 0 auto;border:0;padding:7px 11px;border-radius:999px;background:rgb(255 255 255/.94);box-shadow:0 6px 18px rgb(30 46 47/.10);font-size:8px;font-weight:800;color:#364845}.cesium-spike-filters button.active{background:#0b6668;color:#fff}
        .cesium-spike-map-note{position:absolute;z-index:12;left:28px;bottom:102px;display:grid;gap:2px;padding:9px 12px;border-radius:13px;background:rgb(255 255 255/.9);box-shadow:0 8px 22px rgb(30 46 47/.12);backdrop-filter:blur(8px);font-size:8px}.cesium-spike-map-note strong{font-size:9px}.cesium-spike-map-note span{color:#6f7773}
        .cesium-spike-outro{grid-column:1/3;grid-row:2;display:flex;align-items:center;justify-content:space-between;padding:12px 24px 15px;border-top:1px solid #ded6c9}.cesium-spike-outro div{display:grid;gap:2px}.cesium-spike-outro strong{font-size:17px}.cesium-spike-outro span{font-size:9px;color:#767972}.cesium-spike-outro em{font-family:Georgia,serif;font-size:13px;color:#777067;transform:rotate(-4deg)}
        @media(max-width:1023px){.cesium-spike-shell{display:block;height:calc(100svh - 58px);padding:0;background:#eef2f2}.cesium-spike-map{height:100%;border-radius:0;box-shadow:none}.cesium-spike-map-chrome{left:12px;right:12px;top:12px;grid-template-columns:auto 1fr auto;gap:6px}.cesium-spike-location{max-width:138px}.cesium-spike-search{position:absolute;left:0;right:0;top:50px}.cesium-spike-filters{left:12px;right:12px;top:112px;overflow-x:auto}.cesium-spike-map-note{left:12px;bottom:275px}.cesium-spike-poi-label span{max-width:180px;padding:6px 9px;font-size:8px}.cesium-spike-neighborhood-label{font-size:11px;padding:6px 9px}.cesium-spike-map-atmosphere{height:22%}.cesium-spike-outro{display:none}}
      `}</style>
    </section>
  );
}
