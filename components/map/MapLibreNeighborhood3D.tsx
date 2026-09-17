"use client";

import { Layers3, LocateFixed, Minus, Plus, Search } from "lucide-react";
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
const FOCUS_SOURCE_ID = "akarfinder-neighborhood-focus";
const FOCUS_GLOW_LAYER_ID = "akarfinder-neighborhood-focus-glow";
const FOCUS_RING_LAYER_ID = "akarfinder-neighborhood-focus-ring";

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

  const restoreCamera = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const desktop = window.innerWidth >= 1024;
    const targetCenter: MutablePosition = desktop
      ? [center[0] + desktopCameraOffset[0], center[1] + desktopCameraOffset[1]]
      : center;
    map.easeTo({
      center: targetCenter,
      zoom: desktop ? 14.05 : 14.45,
      pitch: desktop ? 52 : 44,
      bearing: desktop ? -27 : -18,
      duration: 650,
    });
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
      .then((maplibregl) => {
        if (disposed || !mapRef.current) return;
        const desktop = window.innerWidth >= 1024;
        const targetCenter: MutablePosition = desktop
          ? [center[0] + desktopCameraOffset[0], center[1] + desktopCameraOffset[1]]
          : center;
        map = new maplibregl.Map({
          container: mapRef.current,
          center: targetCenter,
          zoom: desktop ? 14.05 : 14.45,
          pitch: desktop ? 52 : 44,
          bearing: desktop ? -27 : -18,
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
              { id: "background", type: "background", paint: { "background-color": "#dce8e5" } },
              {
                id: "imagery", type: "raster", source: "imagery",
                paint: {
                  "raster-brightness-min": 0.14,
                  "raster-brightness-max": 0.94,
                  "raster-contrast": 0.08,
                  "raster-saturation": -0.02,
                  "raster-opacity": 0.98,
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
                  0, "#e6dfd2", 10, "#d8cbb8", 24, "#c8b29a", 55, "#aa8e77", 120, "#826c5d",
                ],
                "fill-extrusion-height": ["coalesce", ["get", "render_height"], 0],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                "fill-extrusion-opacity": 0.72,
                "fill-extrusion-vertical-gradient": true,
              },
            } as any);

            map.addSource(FOCUS_SOURCE_ID, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: { district: districtLabel, boundaryStatus: boundaryGeometry ? "provided" : "center-only" },
                geometry: { type: "Point", coordinates: center },
              },
            });
            map.addLayer({
              id: FOCUS_GLOW_LAYER_ID,
              type: "circle",
              source: FOCUS_SOURCE_ID,
              paint: {
                "circle-radius": desktop ? 84 : 68,
                "circle-color": "#12a9a1",
                "circle-opacity": 0.13,
                "circle-stroke-color": "#8ff8ee",
                "circle-stroke-width": 1.5,
                "circle-stroke-opacity": 0.56,
              },
            });
            map.addLayer({
              id: FOCUS_RING_LAYER_ID,
              type: "circle",
              source: FOCUS_SOURCE_ID,
              paint: {
                "circle-radius": 10,
                "circle-color": "#087b78",
                "circle-opacity": 0.96,
                "circle-stroke-color": "#ffffff",
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
                paint: { "fill-color": "#0aa39a", "fill-opacity": 0.09 },
              });
              map.addLayer({
                id: "neighborhood-boundary-line", type: "line", source: "neighborhood-boundary",
                paint: { "line-color": "#8ff8ee", "line-width": 2.2, "line-opacity": 0.88 },
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
  }, [citySlug, districtSlug, districtLabel, center[0], center[1], desktopCameraOffset[0], desktopCameraOffset[1], boundaryGeometry]);

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
      data-maplibre-boundary-status={boundaryGeometry ? "provided" : "center-only"}
      data-maplibre-reserve-rail={reserveRail ? "true" : "false"}
    >
      <div className="maplibre-spike-map" data-maplibre-map-surface>
        <div className="maplibre-spike-canvas" ref={mapRef} />
        <div className="maplibre-spike-map-grade" aria-hidden="true" />
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
            return <div key={anchor.poi_id} className="maplibre-spike-poi-label" style={{ left: screen.x, top: screen.y }}><span>{anchor.name}</span><i style={{ background: meta.color }} /></div>;
          })}
        </div>
      </div>

      <div className="maplibre-spike-map-chrome">
        <div className="maplibre-spike-brand"><b>AF</b><span>AkarFinder</span></div>
        <div className="maplibre-spike-search"><Search size={17} aria-hidden="true" /><strong>{cityLabel}</strong><span>Quartiers et adresses</span></div>
        <div className="maplibre-spike-mode"><span>Satellite</span><strong>3D</strong></div>
      </div>

      <div className="maplibre-spike-view-chips" aria-label="Mode cartographique">
        <span className="active">Satellite</span>
        <span>Quartiers</span>
      </div>

      <div className="maplibre-spike-filters" aria-label={`Filtres des repères de ${districtLabel}`}>
        <button className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>Repères</button>
        {categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{CATEGORY_META[category].label}</button>)}
      </div>

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
          {boundaryGeometry ? "Périmètre qualifié affiché." : "Repère central sourcé · périmètre non revendiqué."}
        </span>
        <span className="maplibre-spike-map-note-status">{buildingCount > 0 ? `${buildingCount} volumes 3D visibles` : "Chargement du relief urbain…"}</span>
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
