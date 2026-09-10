"use client";

import { useEffect, useRef, useState } from "react";

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

export type MapLibreNeighborhood3DProps = {
  citySlug: string;
  cityLabel: string;
  districtSlug: string;
  districtLabel: string;
  center: MutablePosition;
  boundaryGeometry?: BoundaryGeometry | null;
  desktopCameraOffset?: MutablePosition;
  reserveRail?: boolean;
};

const OPENFREEMAP_VECTOR = "https://tiles.openfreemap.org/planet";
const ESRI_IMAGERY_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const CATEGORY_META: Record<LivingHereCategory, { label: string; color: string }> = {
  education: { label: "Écoles", color: "#2f80ed" }, groceries: { label: "Courses", color: "#7b61ff" },
  health: { label: "Santé", color: "#df5a56" }, transport: { label: "Transports", color: "#2979d3" },
  food: { label: "Cafés & restaurants", color: "#e8872d" }, green_sport: { label: "Parcs & sport", color: "#3c9a63" },
  worship: { label: "Mosquées", color: "#2b8f7b" }, banking: { label: "Banques", color: "#667085" },
  parking: { label: "Parking", color: "#4f6f8f" }, shopping: { label: "Shopping", color: "#8b5cf6" },
  coast: { label: "Côte", color: "#3b82c4" }, other: { label: "Autres", color: "#6b7280" },
};

export function MapLibreNeighborhood3D({
  citySlug,
  cityLabel,
  districtSlug,
  districtLabel,
  center,
  boundaryGeometry = null,
  desktopCameraOffset = [0, 0],
  reserveRail = false,
}: MapLibreNeighborhood3DProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [renderState, setRenderState] = useState<"loading" | "ready" | "error">("loading");
  const [sourceState, setSourceState] = useState<"loading" | "available" | "unavailable">("loading");
  const [buildingCount, setBuildingCount] = useState(0);
  const [contextState, setContextState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [context, setContext] = useState<NeighborhoodContext | null>(null);
  const [activeCategory, setActiveCategory] = useState<LivingHereCategory | "all">("all");
  const [screenPoints, setScreenPoints] = useState<Record<string, ScreenPoint>>({});
  const [centerPoint, setCenterPoint] = useState<ScreenPoint | null>(null);

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
      .then((maplibregl) => {
        if (disposed || !mapRef.current) return;
        const desktop = window.innerWidth >= 1024;
        const targetCenter: MutablePosition = desktop
          ? [center[0] + desktopCameraOffset[0], center[1] + desktopCameraOffset[1]]
          : center;
        map = new maplibregl.Map({
          container: mapRef.current,
          center: targetCenter,
          zoom: desktop ? 14.15 : 14.85,
          pitch: desktop ? 55 : 48,
          bearing: desktop ? -31 : -22,
          attributionControl: false,
          canvasContextAttributes: { antialias: true },
          style: {
            version: 8,
            sources: {
              imagery: {
                type: "raster",
                tiles: [ESRI_IMAGERY_TILES],
                tileSize: 256,
                attribution: "Tiles © Esri",
                maxzoom: 19,
              },
              openfreemap: {
                type: "vector",
                url: OPENFREEMAP_VECTOR,
                attribution: "© OpenStreetMap contributors · OpenFreeMap",
              },
            },
            layers: [
              { id: "background", type: "background", paint: { "background-color": "#d9eef4" } },
              {
                id: "imagery", type: "raster", source: "imagery",
                paint: {
                  "raster-brightness-min": 0.20,
                  "raster-brightness-max": 1,
                  "raster-contrast": -0.08,
                  "raster-saturation": -0.02,
                },
              },
            ],
          } as any,
        } as any);
        mapInstanceRef.current = map;

        map.once("load", () => {
          if (disposed) return;
          try {
            map.addLayer({
              id: "3d-buildings",
              source: "openfreemap",
              "source-layer": "building",
              type: "fill-extrusion",
              minzoom: 13.5,
              filter: ["!=", ["get", "hide_3d"], true],
              paint: {
                "fill-extrusion-color": [
                  "interpolate", ["linear"], ["coalesce", ["get", "render_height"], 0],
                  0, "#eadcc9", 10, "#ddc7aa", 24, "#c8a17b", 55, "#a97e60", 120, "#8d6955",
                ],
                "fill-extrusion-height": ["coalesce", ["get", "render_height"], 0],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                "fill-extrusion-opacity": 0.88,
                "fill-extrusion-vertical-gradient": true,
              },
            } as any);

            if (boundaryGeometry) {
              map.addSource("neighborhood-boundary", {
                type: "geojson",
                data: { type: "Feature", properties: {}, geometry: boundaryGeometry } as any,
              });
              map.addLayer({
                id: "neighborhood-boundary-fill", type: "fill", source: "neighborhood-boundary",
                paint: { "fill-color": "#0b6668", "fill-opacity": 0.025 },
              });
              map.addLayer({
                id: "neighborhood-boundary-line", type: "line", source: "neighborhood-boundary",
                paint: { "line-color": "#f4ddaf", "line-width": 1.4, "line-opacity": 0.55 },
              });
            }
          } catch (error) {
            console.error("[vivre-ici-maplibre-national] layer setup failed", error);
            setSourceState("unavailable");
          }
        });

        const evaluate = () => {
          if (disposed || !map?.getLayer("3d-buildings")) return;
          try {
            const features = map.queryRenderedFeatures(undefined, { layers: ["3d-buildings"] });
            setBuildingCount(features.length);
            if (features.length > 0) setSourceState("available");
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
  }, [citySlug, districtSlug, center[0], center[1], desktopCameraOffset[0], desktopCameraOffset[1], boundaryGeometry]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !context || !ready) return;
    const updatePositions = () => {
      const next: Record<string, ScreenPoint> = {};
      const canvas = map.getCanvas();
      for (const anchor of context.anchors) {
        const point = map.project([anchor.longitude, anchor.latitude]);
        next[anchor.poi_id] = {
          x: point.x, y: point.y,
          visible: point.x > -100 && point.x < canvas.clientWidth + 100 && point.y > -80 && point.y < canvas.clientHeight + 80,
        };
      }
      const cp = map.project(center);
      setCenterPoint({ x: cp.x, y: cp.y, visible: true });
      setScreenPoints(next);
    };
    map.on("move", updatePositions);
    map.on("resize", updatePositions);
    updatePositions();
    return () => {
      map.off("move", updatePositions);
      map.off("resize", updatePositions);
    };
  }, [context, ready, center[0], center[1]]);

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
      data-maplibre-context-state={contextState}
      data-maplibre-anchor-count={context?.anchor_count ?? 0}
      data-maplibre-city={citySlug}
      data-maplibre-district={districtSlug}
      data-maplibre-reserve-rail={reserveRail ? "true" : "false"}
    >
      <div className="maplibre-spike-map" data-maplibre-map-surface>
        <div className="maplibre-spike-canvas" ref={mapRef} />
        <div className="maplibre-spike-dom-labels" aria-hidden="true">
          {centerPoint?.visible && <div className="maplibre-spike-neighborhood-label" style={{ left: centerPoint.x, top: centerPoint.y }}>{districtLabel}</div>}
          {visibleAnchors.map((anchor) => {
            const screen = screenPoints[anchor.poi_id];
            if (!screen?.visible) return null;
            const meta = CATEGORY_META[anchor.category] ?? CATEGORY_META.other;
            return <div key={anchor.poi_id} className="maplibre-spike-poi-label" style={{ left: screen.x, top: screen.y }}><span>{anchor.name}</span><i style={{ background: meta.color }} /></div>;
          })}
        </div>
      </div>

      <div className="maplibre-spike-map-chrome">
        <div className="maplibre-spike-location">←&nbsp; Vivre à {cityLabel}</div>
        <div className="maplibre-spike-search">Rechercher un quartier, une adresse, une ville…</div>
        <div className="maplibre-spike-mode"><span>2D</span><strong>3D</strong></div>
      </div>
      <div className="maplibre-spike-filters" aria-label={`Filtres des repères de ${districtLabel}`}>
        <button className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>Repères</button>
        {categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{CATEGORY_META[category].label}</button>)}
      </div>
      <div className="maplibre-spike-map-note"><strong>{districtLabel} · MapLibre national</strong><span>{buildingCount > 0 ? `${buildingCount} volumes visibles` : "Chargement des volumes…"}</span></div>
      <footer className="maplibre-spike-outro"><div><strong>Découvrez les quartiers autrement</strong><span>Un même moteur cartographique, du quartier au Maroc.</span></div><em>Des lieux. Des vies. Des projets.</em></footer>

      <style jsx global>{`
        .maplibre-spike-shell{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 372px;grid-template-rows:minmax(0,1fr) 76px;gap:8px;height:calc(100svh - 64px);padding:10px 10px 0 12px;background:#f4efe7;color:#17302e;overflow:hidden}.maplibre-spike-shell[data-maplibre-reserve-rail="false"]{grid-template-columns:minmax(0,1fr)}
        .maplibre-spike-map{position:relative;grid-column:1;grid-row:1;min-width:0;overflow:hidden;border-radius:22px;box-shadow:0 18px 44px rgb(38 48 48/.12);background:#d9eef4}.maplibre-spike-canvas{position:absolute;inset:0}.maplibre-spike-canvas,.maplibre-spike-canvas .maplibregl-map,.maplibre-spike-canvas .maplibregl-canvas-container,.maplibre-spike-canvas canvas{width:100%!important;height:100%!important}.maplibre-spike-canvas canvas{outline:none}
        .maplibre-spike-dom-labels{position:absolute;z-index:9;inset:0;pointer-events:none;overflow:hidden}.maplibre-spike-neighborhood-label{position:absolute;transform:translate(-50%,-50%);padding:7px 11px;border-radius:8px;background:rgb(8 101 97/.92);box-shadow:0 5px 14px rgb(18 50 49/.18);color:#fff;font-size:13px;font-weight:850;white-space:nowrap}.maplibre-spike-poi-label{position:absolute;display:flex;flex-direction:column;align-items:center;gap:5px;transform:translate(-50%,-100%)}.maplibre-spike-poi-label span{max-width:250px;padding:7px 14px;border:1px solid rgb(224 221 214/.9);border-radius:999px;background:rgb(255 253 249/.94);box-shadow:0 7px 19px rgb(30 46 47/.15);color:#33433f;font-size:10px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.maplibre-spike-poi-label i{display:block;width:10px;height:10px;border:2px solid #fff;border-radius:999px;box-shadow:0 2px 8px rgb(30 46 47/.22)}
        .maplibre-spike-map-chrome{position:absolute;z-index:12;left:28px;right:28px;top:28px;display:grid;grid-template-columns:auto minmax(220px,1fr) auto;gap:10px}.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-map-chrome{right:398px}.maplibre-spike-location,.maplibre-spike-search,.maplibre-spike-mode{min-height:40px;display:flex;align-items:center;border:1px solid rgb(255 255 255/.88);background:rgb(255 255 255/.94);box-shadow:0 8px 26px rgb(30 46 47/.12);font-size:10px;font-weight:800;color:#243a39}.maplibre-spike-location{padding:0 13px;border-radius:999px}.maplibre-spike-search{padding:0 16px;border-radius:999px;color:#7b817e}.maplibre-spike-mode{padding:3px;border-radius:999px}.maplibre-spike-mode span,.maplibre-spike-mode strong{display:grid;place-items:center;min-width:37px;min-height:32px;border-radius:999px}.maplibre-spike-mode strong{background:#0b6668;color:#fff}
        .maplibre-spike-filters{position:absolute;z-index:13;left:190px;right:34px;top:78px;display:flex;gap:7px;overflow:hidden}.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-filters{right:404px}.maplibre-spike-filters button{flex:0 0 auto;border:0;padding:7px 11px;border-radius:999px;background:rgb(255 255 255/.94);box-shadow:0 6px 18px rgb(30 46 47/.10);font-size:8px;font-weight:800;color:#364845}.maplibre-spike-filters button.active{background:#0b6668;color:#fff}.maplibre-spike-map-note{position:absolute;z-index:12;left:28px;bottom:102px;display:grid;gap:2px;padding:9px 12px;border-radius:13px;background:rgb(255 255 255/.9);box-shadow:0 8px 22px rgb(30 46 47/.12);font-size:8px}.maplibre-spike-map-note strong{font-size:9px}.maplibre-spike-map-note span{color:#6f7773}
        .maplibre-spike-outro{grid-column:1/-1;grid-row:2;display:flex;align-items:center;justify-content:space-between;padding:12px 24px 15px;border-top:1px solid #ded6c9}.maplibre-spike-outro div{display:grid;gap:2px}.maplibre-spike-outro strong{font-size:17px}.maplibre-spike-outro span{font-size:9px;color:#767972}.maplibre-spike-outro em{font-family:Georgia,serif;font-size:13px;color:#777067;transform:rotate(-4deg)}
        @media(max-width:1023px){.maplibre-spike-shell,.maplibre-spike-shell[data-maplibre-reserve-rail="false"],.maplibre-spike-shell[data-maplibre-reserve-rail="true"]{display:block;height:calc(100svh - 58px);padding:0;background:#eef2f2}.maplibre-spike-map{height:100%;border-radius:0;box-shadow:none}.maplibre-spike-map-chrome,.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-map-chrome{left:12px;right:12px;top:12px;grid-template-columns:auto 1fr auto;gap:6px}.maplibre-spike-location{max-width:138px}.maplibre-spike-search{position:absolute;left:0;right:0;top:50px}.maplibre-spike-filters,.maplibre-spike-shell[data-maplibre-reserve-rail="true"] .maplibre-spike-filters{left:12px;right:12px;top:112px;overflow-x:auto}.maplibre-spike-map-note{left:12px;bottom:275px}.maplibre-spike-poi-label span{max-width:180px;padding:6px 9px;font-size:8px}.maplibre-spike-neighborhood-label{font-size:11px;padding:6px 9px}.maplibre-spike-outro{display:none}}
      `}</style>
    </section>
  );
}
