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

const CESIUM_VERSION = "1.141.0";
const CESIUM_BASE_URL = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/`;
const CESIUM_JS = `${CESIUM_BASE_URL}Cesium.js`;
const CESIUM_CSS = `${CESIUM_BASE_URL}Widgets/widgets.css`;
const ESRI_WORLD_IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";

const CATEGORY_META: Record<LivingHereCategory, { label: string; color: string; glyph: string }> = {
  education: { label: "Écoles", color: "#2f80ed", glyph: "E" },
  groceries: { label: "Courses", color: "#7b61ff", glyph: "C" },
  health: { label: "Santé", color: "#e5484d", glyph: "+" },
  transport: { label: "Transports", color: "#2979d3", glyph: "T" },
  food: { label: "Cafés & restaurants", color: "#e8872d", glyph: "R" },
  green_sport: { label: "Parcs & sport", color: "#3a9b54", glyph: "P" },
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
  const [buildings, setBuildings] = useState<"loading" | "available" | "unavailable">("loading");
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
        imagery.brightness = 1.1;
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
        viewer.scene.fog.density = 0.00028;
        viewer.scene.skyAtmosphere.brightnessShift = 0.18;

        const rings = outerRings();
        if (rings.length) {
          rings.forEach((ring) => {
            const degrees = ring.flatMap(([lng, lat]) => [lng, lat]);
            viewer.entities.add({
              polygon: {
                hierarchy: Cesium.Cartesian3.fromDegreesArray(degrees),
                material: Cesium.Color.fromCssColorString("#0b6668").withAlpha(0.1),
                outline: false,
              },
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(degrees),
                width: 4,
                material: Cesium.Color.fromCssColorString("#f3d8a5").withAlpha(0.96),
                clampToGround: true,
              },
            });
          });
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(center[0], center[1], 20),
            label: {
              text: "Maârif",
              font: "700 22px system-ui, sans-serif",
              fillColor: Cesium.Color.WHITE,
              backgroundColor: Cesium.Color.fromCssColorString("#0b6668").withAlpha(0.92),
              showBackground: true,
              backgroundPadding: new Cesium.Cartesian2(12, 8),
              pixelOffset: new Cesium.Cartesian2(0, -8),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          setBoundaryState("reference");
        } else {
          setBoundaryState("unavailable");
        }

        const target = Cesium.Cartesian3.fromDegrees(center[0], center[1], 0);
        const range = window.innerWidth >= 1024 ? 3600 : 3000;
        viewer.camera.lookAt(
          target,
          new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(338),
            Cesium.Math.toRadians(-33),
            range,
          ),
        );
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

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
      })
      .catch((error) => {
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
      const color = Cesium.Color.fromCssColorString(meta.color);
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(anchor.longitude, anchor.latitude, 26),
        point: {
          pixelSize: 16,
          color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: anchor.name,
          font: "700 12px system-ui, sans-serif",
          fillColor: Cesium.Color.fromCssColorString("#17302e"),
          backgroundColor: Cesium.Color.WHITE.withAlpha(0.94),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(8, 5),
          pixelOffset: new Cesium.Cartesian2(0, -25),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 9000),
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
      <div className="cesium-spike-map" ref={mapRef} data-cesium-map-surface />

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

      <aside className="cesium-spike-rail">
        <p className="cesium-spike-kicker">Casablanca · Quartier</p>
        <h1>Maârif</h1>
        <p className="cesium-spike-subtitle">
          Explorez le quartier à partir de repères publics sourcés, affichés directement sur la carte.
        </p>
        <nav><strong>Carte quartier</strong><span>Vie locale</span><span>Biens</span></nav>

        <div className="cesium-spike-signals">
          <article><b>{context?.anchor_count ?? "—"}</b><small>Repères sourcés</small></article>
          <article><b>{categories.length || "—"}</b><small>Catégories observées</small></article>
          <article><b>Exact</b><small>Requis pour un pin immobilier</small></article>
        </div>

        <div className="cesium-spike-nearby">
          <p>Repères visibles</p>
          <h2>{activeCategory === "all" ? "Autour de Maârif" : CATEGORY_META[activeCategory].label}</h2>
          <div className="cesium-spike-anchor-list">
            {visibleAnchors.slice(0, 6).map((anchor) => (
              <div key={anchor.poi_id} className="cesium-spike-anchor-row">
                <i style={{ background: CATEGORY_META[anchor.category].color }}>{CATEGORY_META[anchor.category].glyph}</i>
                <span><b>{anchor.name}</b><small>{anchor.territorial_wording}</small></span>
              </div>
            ))}
            {contextState !== "ready" && <div className="cesium-spike-empty">Contexte de quartier indisponible.</div>}
          </div>
        </div>

        <div className="cesium-spike-proof">
          <strong>Contour OSM de référence · prototype non publié</strong>
          <span>© OpenStreetMap contributors · Pins immobiliers affichés uniquement avec coordonnées exactes.</span>
        </div>
      </aside>

      <footer className="cesium-spike-outro">
        <div><strong>Découvrez les quartiers autrement</strong><span>Explorez, comparez, vivez mieux avec AkarFinder.</span></div>
        <em>Des lieux. Des vies. Des projets.</em>
      </footer>

      <style jsx global>{`
        .cesium-spike-shell{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 372px;grid-template-rows:minmax(0,1fr) 76px;gap:8px;height:calc(100svh - 64px);padding:10px 10px 0 12px;background:#f4efe7;color:#17302e;overflow:hidden}
        .cesium-spike-map{position:relative;min-width:0;overflow:hidden;border-radius:22px;box-shadow:0 18px 44px rgb(38 48 48/.12);background:#dfeef2}
        .cesium-spike-map .cesium-viewer,.cesium-spike-map .cesium-viewer-cesiumWidgetContainer,.cesium-spike-map .cesium-widget,.cesium-spike-map canvas{width:100%!important;height:100%!important}
        .cesium-spike-map .cesium-viewer-bottom{font-size:8px!important;opacity:.68}
        .cesium-spike-map-chrome{position:absolute;z-index:10;left:28px;right:398px;top:28px;display:grid;grid-template-columns:auto minmax(220px,1fr) auto;gap:10px}
        .cesium-spike-location,.cesium-spike-search,.cesium-spike-mode{min-height:40px;display:flex;align-items:center;border:1px solid rgb(255 255 255/.85);background:rgb(255 255 255/.94);box-shadow:0 8px 26px rgb(30 46 47/.13);backdrop-filter:blur(14px);font-size:10px;font-weight:800;color:#243a39}
        .cesium-spike-location{padding:0 13px;border-radius:999px}.cesium-spike-search{padding:0 16px;border-radius:999px;color:#7b817e}.cesium-spike-mode{padding:3px;border-radius:999px}.cesium-spike-mode span,.cesium-spike-mode strong{display:grid;place-items:center;min-width:37px;min-height:32px;border-radius:999px}.cesium-spike-mode strong{background:#0b6668;color:#fff}
        .cesium-spike-filters{position:absolute;z-index:11;left:190px;right:404px;top:78px;display:flex;gap:7px;overflow:hidden}.cesium-spike-filters button{flex:0 0 auto;border:0;padding:7px 11px;border-radius:999px;background:rgb(255 255 255/.94);box-shadow:0 6px 18px rgb(30 46 47/.10);font-size:8px;font-weight:800;color:#364845}.cesium-spike-filters button.active{background:#0b6668;color:#fff}
        .cesium-spike-map-note{position:absolute;z-index:10;left:28px;bottom:102px;display:grid;gap:2px;padding:9px 12px;border-radius:13px;background:rgb(255 255 255/.92);box-shadow:0 8px 22px rgb(30 46 47/.13);font-size:8px}.cesium-spike-map-note strong{font-size:9px}.cesium-spike-map-note span{color:#6f7773}
        .cesium-spike-rail{grid-column:2;grid-row:1;min-height:0;overflow:auto;border-radius:22px;background:#fffefa;box-shadow:0 18px 44px rgb(38 48 48/.08);padding:22px 20px 18px}.cesium-spike-kicker{margin:0;font-size:8px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#0b6668}.cesium-spike-rail h1{margin:5px 0 0;font-size:42px;line-height:.95;letter-spacing:-.05em}.cesium-spike-subtitle{margin:10px 0 0;font-size:11px;line-height:1.55;color:#69716d}.cesium-spike-rail nav{display:flex;gap:18px;margin-top:17px;border-bottom:1px solid #e5dfd4}.cesium-spike-rail nav>*{padding:8px 0 10px;font-size:9px}.cesium-spike-rail nav strong{color:#0b6668;border-bottom:2px solid #0b6668}
        .cesium-spike-signals{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:15px}.cesium-spike-signals article{min-height:72px;padding:10px;border:1px solid #e2ded4;border-radius:14px;background:#fbfaf6}.cesium-spike-signals b,.cesium-spike-signals small{display:block}.cesium-spike-signals b{font-size:14px}.cesium-spike-signals small{margin-top:6px;font-size:7.5px;line-height:1.3;color:#7b817e}
        .cesium-spike-nearby{margin-top:18px;padding-top:15px;border-top:1px solid #e5dfd4}.cesium-spike-nearby>p{margin:0;font-size:8px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#0b6668}.cesium-spike-nearby h2{margin:5px 0 10px;font-size:15px;line-height:1.2}.cesium-spike-anchor-list{display:grid;gap:7px}.cesium-spike-anchor-row{display:flex;gap:9px;align-items:center;padding:8px 9px;border-radius:12px;background:#f6f5f0}.cesium-spike-anchor-row i{display:grid;place-items:center;flex:0 0 25px;width:25px;height:25px;border-radius:999px;color:#fff;font-style:normal;font-size:9px;font-weight:900}.cesium-spike-anchor-row span,.cesium-spike-anchor-row b,.cesium-spike-anchor-row small{display:block}.cesium-spike-anchor-row b{font-size:9px}.cesium-spike-anchor-row small{margin-top:2px;font-size:7.5px;color:#777e79}.cesium-spike-empty{font-size:9px;color:#777e79}
        .cesium-spike-proof{margin-top:15px;padding:11px 12px;border-radius:13px;background:#eef5f2;color:#31524e}.cesium-spike-proof strong,.cesium-spike-proof span{display:block}.cesium-spike-proof strong{font-size:8px}.cesium-spike-proof span{margin-top:4px;font-size:7.5px;line-height:1.4}
        .cesium-spike-outro{grid-column:1/3;grid-row:2;display:flex;align-items:center;justify-content:space-between;padding:12px 24px 15px;border-top:1px solid #ded6c9}.cesium-spike-outro div{display:grid;gap:2px}.cesium-spike-outro strong{font-size:17px}.cesium-spike-outro span{font-size:9px;color:#767972}.cesium-spike-outro em{font-family:Georgia,serif;font-size:13px;color:#777067;transform:rotate(-4deg)}
        @media(max-width:1023px){.cesium-spike-shell{display:block;height:calc(100svh - 58px);padding:0;background:#eef2f2}.cesium-spike-map{height:100%;border-radius:0;box-shadow:none}.cesium-spike-map-chrome{left:12px;right:12px;top:12px;grid-template-columns:auto 1fr auto;gap:6px}.cesium-spike-location{max-width:138px}.cesium-spike-search{position:absolute;left:0;right:0;top:50px}.cesium-spike-filters{left:12px;right:12px;top:112px;overflow-x:auto}.cesium-spike-map-note{left:12px;bottom:275px}.cesium-spike-rail{position:absolute;z-index:12;left:12px;right:12px;bottom:16px;max-height:31svh;padding:14px;border-radius:25px;overflow:hidden}.cesium-spike-kicker{margin-top:0}.cesium-spike-rail h1{font-size:27px}.cesium-spike-subtitle{margin-top:5px;font-size:9px}.cesium-spike-rail nav,.cesium-spike-nearby{display:none}.cesium-spike-signals{margin-top:10px}.cesium-spike-signals article{min-height:52px}.cesium-spike-proof{margin-top:9px;padding:8px 9px}.cesium-spike-outro{display:none}}
      `}</style>
    </section>
  );
}
