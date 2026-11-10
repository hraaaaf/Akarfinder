"use client";

import { LocateFixed, Minus, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { nationalBasemapConfiguration } from "@/lib/map/carto-basemap-style";

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
  /** OSM shadow geometry; never an official or neighborhood-central boundary. */
  administrativeBoundaryPreview?: BoundaryGeometry | null;
  desktopCameraOffset?: MutablePosition;
  reserveRail?: boolean;
};

// LOT01: Historic component name retained for compatibility with the router.
// The immersive 3D/satellite path is frozen; Explore only renders sourced 2D.
const FOCUS_SOURCE_ID = "akarfinder-neighborhood-focus";
const FOCUS_GLOW_LAYER_ID = "akarfinder-neighborhood-focus-glow";
const FOCUS_RING_LAYER_ID = "akarfinder-neighborhood-focus-ring";
const ADMIN_SHADOW_SOURCE_ID = "akarfinder-maarif-osm-admin-shadow";
const ADMIN_SHADOW_FILL_ID = "akarfinder-maarif-osm-admin-shadow-fill";
const ADMIN_SHADOW_LINE_ID = "akarfinder-maarif-osm-admin-shadow-line";
const QA_OSM_ENABLED = process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_VIVRE_ICI_QA_NATIONAL_POI === "true";
const QA_OSM_SOURCE_ID = "akarfinder-osm-national-qa";
const QA_OSM_LAYER_ID = "akarfinder-osm-national-qa-points";
const QA_OSM_CLUSTER_ID = "akarfinder-osm-national-qa-clusters";
const QA_OSM_COUNT_ID = "akarfinder-osm-national-qa-cluster-count";
type QaOsmSelection = { name: string; category: LivingHereCategory; osmId: string };

function previewBounds(geometry: BoundaryGeometry | null): [[number, number], [number, number]] | null {
  if (!geometry || geometry.type !== "Polygon") return null;
  const rings = geometry.coordinates;
  if (!Array.isArray(rings) || rings.length !== 1 || !Array.isArray(rings[0])) return null;
  const ring = rings[0] as unknown[];
  if (ring.length < 4 || ring.length > 2000) return null;
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const point of ring) {
    if (!Array.isArray(point) || point.length !== 2 ||
        !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
    const lng = point[0] as number, lat = point[1] as number;
    if (lng < -7.85 || lng > -7.45 || lat < 33.4 || lat > 33.75) return null;
    west = Math.min(west, lng); east = Math.max(east, lng);
    south = Math.min(south, lat); north = Math.max(north, lat);
  }
  const first = ring[0] as number[], last = ring[ring.length - 1] as number[];
  if (first[0] !== last[0] || first[1] !== last[1] ||
      east - west < .005 || east - west > .1 ||
      north - south < .005 || north - south > .1) return null;
  return [[west, south], [east, north]];
}

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
  administrativeBoundaryPreview = null,
  desktopCameraOffset = [0, 0],
  reserveRail = false,
}: MapLibreNeighborhood3DProps) {
  const { theme } = useTheme();
  const basemap = nationalBasemapConfiguration(theme);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const isMaarifPilot = citySlug === "casablanca" && districtSlug === "maarif";
  const adminPreviewBounds = isMaarifPilot ? previewBounds(administrativeBoundaryPreview) : null;
  const [pilotView, setPilotView] = useState<"quartier" | "rue" | "limites">("quartier");
  const [observedCamera, setObservedCamera] = useState({ pitch: -1, bearing: -1, zoom: -1 });
  const [ready, setReady] = useState(false);
  const [qaState, setQaState] = useState<"off" | "loading" | "ready" | "zoom" | "error">("off");
  const [qaCount, setQaCount] = useState(0);
  const [qaShownCount, setQaShownCount] = useState(0);
  const [qaCategories, setQaCategories] = useState<LivingHereCategory[]>([]);
  const [qaSelected, setQaSelected] = useState<QaOsmSelection | null>(null);
  const qaFeaturesRef = useRef<any[]>([]);
  const [renderState, setRenderState] = useState<"loading" | "ready" | "error">("loading");
  const [sourceState, setSourceState] = useState<"loading" | "available" | "unavailable">("loading");
  const [baseFeatureCount, setBaseFeatureCount] = useState(0);
  const [contextState, setContextState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [context, setContext] = useState<NeighborhoodContext | null>(null);
  const [activeCategory, setActiveCategory] = useState<LivingHereCategory | "all">("all");
  const activeQaCategoryRef = useRef(activeCategory);
  activeQaCategoryRef.current = activeCategory;
  const [screenPoints, setScreenPoints] = useState<Record<string, ScreenPoint>>({});
  const [centerPoint, setCenterPoint] = useState<ScreenPoint | null>(null);

  useEffect(() => { setPilotView("quartier"); }, [citySlug, districtSlug]);

  // L3-A: user-triggered camera changes, never pretend to offer a published boundary.
  const selectMaarifView = (view: "quartier" | "rue" | "limites") => {
    if (!isMaarifPilot) return;
    const map = mapInstanceRef.current;
    if (!map) { setPilotView(view); return; }
    const showAdminPreview = view === "limites" && adminPreviewBounds !== null &&
      Boolean(map.getLayer(ADMIN_SHADOW_FILL_ID)) && Boolean(map.getLayer(ADMIN_SHADOW_LINE_ID));
    if (adminPreviewBounds && map.getLayer(ADMIN_SHADOW_FILL_ID) && map.getLayer(ADMIN_SHADOW_LINE_ID)) {
      const visibility = showAdminPreview ? "visible" : "none";
      map.setLayoutProperty(ADMIN_SHADOW_FILL_ID, "visibility", visibility);
      map.setLayoutProperty(ADMIN_SHADOW_LINE_ID, "visibility", visibility);
    }
    if (showAdminPreview && adminPreviewBounds) {
      // The outline is an OSM *indicative arrondissement* shadow preview, not a
      // legal, reviewed boundary or the perimeter of the central Maârif quarter.
      map.fitBounds(adminPreviewBounds, {
        padding: { top: 115, right: 50, bottom: window.innerWidth < 1024 ? 250 : 130, left: 50 },
        maxZoom: 14,
        pitch: 0,
        bearing: 0,
        duration: 450,
      });
    } else {
      map.easeTo({
        center,
        zoom: view === "rue" ? 17.1 : 14.6,
        pitch: 0,
        bearing: 0,
        duration: 450,
      });
    }
    setPilotView(view);
  };

  const restoreCamera = () => {
    if (isMaarifPilot) { selectMaarifView("quartier"); return; }
    const map = mapInstanceRef.current;
    if (!map) return;
    const desktop = window.innerWidth >= 1024;
    const targetCenter: MutablePosition = desktop
      ? [center[0] + desktopCameraOffset[0], center[1] + desktopCameraOffset[1]]
      : center;
    map.easeTo({
      center: targetCenter,
      zoom: desktop ? 14.05 : 14.45,
      pitch: 0,
      bearing: 0,
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
        const targetCenter: MutablePosition = isMaarifPilot
          ? center
          : desktop
            ? [center[0] + desktopCameraOffset[0], center[1] + desktopCameraOffset[1]]
            : center;
        map = new maplibregl.Map({
          container: mapRef.current,
          center: targetCenter,
          zoom: isMaarifPilot ? 14.6 : desktop ? 14.05 : 14.45,
          pitch: 0,
          bearing: 0,
          // Provider/OSM attributions must remain legible during map use.
          // Source styles already declare their licensing. Avoid duplicating OpenFreeMap attribution.
          // CARTO receives explicit attribution until its live keyed style has been audited.
          attributionControl: { compact: false, customAttribution: basemap.provider === "carto" ? basemap.attribution : undefined },
          canvasContextAttributes: { antialias: true },
          style: basemap.style,
        } as any);
        mapInstanceRef.current = map;

        map.once("load", () => {
          if (disposed) return;
          try {

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
                "circle-radius": desktop ? 28 : 24,
                "circle-color": "#12a9a1",
                "circle-opacity": 0.08,
                "circle-stroke-color": "#8ff8ee",
                "circle-stroke-width": 1,
                "circle-stroke-opacity": 0.3,
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

            // The shadow is hidden by default and only available for an explicitly
            // enabled private QA build, with clear ODbL attribution and no legal claim.
            if (adminPreviewBounds && administrativeBoundaryPreview) {
              map.addSource(ADMIN_SHADOW_SOURCE_ID, {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: { entity: "OSM relation/2801474", scope: "arrondissement", reviewed: false },
                  geometry: administrativeBoundaryPreview,
                } as any,
                attribution: "© OpenStreetMap contributors (ODbL)",
              });
              map.addLayer({
                id: ADMIN_SHADOW_FILL_ID,
                type: "fill",
                source: ADMIN_SHADOW_SOURCE_ID,
                layout: { visibility: "none" },
                paint: { "fill-color": "#0B63CE", "fill-opacity": 0.1 },
              });
              map.addLayer({
                id: ADMIN_SHADOW_LINE_ID,
                type: "line",
                source: ADMIN_SHADOW_SOURCE_ID,
                layout: { visibility: "none" },
                paint: { "line-color": "#071B33", "line-width": 2.6, "line-opacity": 0.92 },
              });
            }

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
          if (disposed || !map?.isStyleLoaded() || !map.getLayer(FOCUS_RING_LAYER_ID)) return;
          try {
            const features = map.queryRenderedFeatures().filter((feature: any) =>
              feature.layer?.id !== FOCUS_GLOW_LAYER_ID && feature.layer?.id !== FOCUS_RING_LAYER_ID);
            setBaseFeatureCount(features.length);
            // Fail closed: a focus dot alone does not prove that real basemap tiles rendered.
            if (features.length === 0) { setSourceState("unavailable"); return; }
            setSourceState("available");
            setReady(true);
            setRenderState("ready");
            const cameraNow = {
              pitch: Math.round(map.getPitch() * 100) / 100,
              bearing: Math.round(map.getBearing() * 100) / 100,
              zoom: Math.round(map.getZoom() * 100) / 100,
            };
            setObservedCamera((previous) =>
              previous.pitch === cameraNow.pitch && previous.bearing === cameraNow.bearing && previous.zoom === cameraNow.zoom
                ? previous : cameraNow,
            );
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
  }, [citySlug, districtSlug, districtLabel, center[0], center[1], desktopCameraOffset[0], desktopCameraOffset[1], boundaryGeometry, administrativeBoundaryPreview, theme]);


  // J11-C2: gated QA-only national OSM viewport, never enabled on a production build.
  useEffect(() => {
    if (!QA_OSM_ENABLED || !ready) return;
    const map = mapInstanceRef.current;
    if (!map?.isStyleLoaded?.()) return;
    let cancelled = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const empty = { type: "FeatureCollection", features: [] };
    try {
      if (!map.getSource(QA_OSM_SOURCE_ID)) map.addSource(QA_OSM_SOURCE_ID, {
        type: "geojson", data: empty, cluster: true, clusterMaxZoom: 16, clusterRadius: 46,
        attribution: "© OpenStreetMap contributors · ODbL",
      });
      if (!map.getLayer(QA_OSM_LAYER_ID)) map.addLayer({
        id: QA_OSM_LAYER_ID, type: "circle", source: QA_OSM_SOURCE_ID, minzoom: 13,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 3, 15, 5.5, 17, 7],
          "circle-color": ["match", ["get", "category"],
            "education", "#2f80ed", "groceries", "#7b61ff", "health", "#df5a56",
            "transport", "#2979d3", "green_sport", "#3c9a63", "shopping", "#8b5cf6", "#708090"],
          "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.6, "circle-opacity": 0.92,
        },
      });
      if (!map.getLayer(QA_OSM_CLUSTER_ID)) map.addLayer({
        id: QA_OSM_CLUSTER_ID, type: "circle", source: QA_OSM_SOURCE_ID,
        filter: ["has", "point_count"], minzoom: 13,
        paint: {
          "circle-color": "#116477",
          "circle-radius": ["step", ["get", "point_count"], 13, 10, 17, 30, 21],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.2,
          "circle-opacity": 0.88,
        },
      });
      if (!map.getLayer(QA_OSM_COUNT_ID)) map.addLayer({
        id: QA_OSM_COUNT_ID, type: "symbol", source: QA_OSM_SOURCE_ID,
        filter: ["has", "point_count"], minzoom: 13,
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Regular"],
          "text-size": 11, "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff" },
      });
    } catch { setQaState("error"); return; }
    const clear = () => {
      try { map.getSource(QA_OSM_SOURCE_ID)?.setData(empty); } catch {}
      qaFeaturesRef.current = [];
      setQaCount(0); setQaShownCount(0); setQaCategories([]); setQaSelected(null);
    };
    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      if (map.getZoom() < 13) { clear(); setQaState("zoom"); return; }
      const bounds = map.getBounds();
      const box = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
      if (box.some((n: number) => !Number.isFinite(n))) { clear(); setQaState("error"); return; }
      setQaState("loading");
      try {
        const query = new URLSearchParams({ bbox: box.map((n: number) => n.toFixed(6)).join(","), limit: "180" });
        const response = await fetch("/api/geo/qa-national-landmarks?" + query.toString(), { signal, cache: "no-store" });
        if (response.status === 400) {
          if (!cancelled && !signal.aborted) { clear(); setQaState("zoom"); }
          return;
        }
        if (!response.ok) throw new Error("qa_no_source");
        const value = await response.json();
        if (!value?.ok || value.state !== "PRIVATE_CANDIDATE_NO_DB_OR_UI_WRITE" ||
            value.label !== "Repères à proximité" || value.businessOperatingStatusCertified !== false ||
            value.officialNeighborhoodMembershipCertified !== false || value.entrancePrecisionCertified !== false ||
            !Array.isArray(value.features) || value.features.length > 180) throw new Error("qa_invalid_provenance");
        if (cancelled || signal.aborted) return;
        const source = map.getSource(QA_OSM_SOURCE_ID);
        if (!source) throw new Error("qa_source_missing");
        qaFeaturesRef.current = value.features;
        const selectedCategory = activeQaCategoryRef.current;
        const visible = selectedCategory === "all" ? value.features :
          value.features.filter((f: any) => f?.properties?.category === selectedCategory);
        source.setData({ type: "FeatureCollection", features: visible });
        setQaCount(value.features.length);
        setQaShownCount(visible.length);
        setQaCategories((Object.keys(CATEGORY_META) as LivingHereCategory[]).filter(cat =>
          value.features.some((feature: any) => feature?.properties?.category === cat)));
        setQaSelected(null); setQaState("ready");
      } catch {
        if (!cancelled && !signal.aborted) { clear(); setQaState("error"); }
      }
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void refresh(); }, 220);
    };
    const onClick = (event: any) => {
      const p = event.features?.[0]?.properties;
      if (typeof p?.name !== "string" || typeof p?.osmId !== "string" ||
          !/^(node|way|relation)\/[1-9]\d*$/.test(p.osmId) || !(p.category in CATEGORY_META)) return;
      setQaSelected({ name: p.name.slice(0, 200), osmId: p.osmId, category: p.category as LivingHereCategory });
    };
    const onClusterClick = (event: any) => {
      if (!event.features?.[0]?.properties?.cluster) return;
      map.easeTo({ center: event.lngLat, zoom: Math.min(17.2, map.getZoom() + 1.5), duration: 450 });
    };
    const cursorOn = () => { map.getCanvas().style.cursor = "pointer"; };
    const cursorOff = () => { map.getCanvas().style.cursor = ""; };
    map.on("moveend", schedule);
    map.on("click", QA_OSM_LAYER_ID, onClick);
    map.on("click", QA_OSM_CLUSTER_ID, onClusterClick);
    map.on("mouseenter", QA_OSM_LAYER_ID, cursorOn);
    map.on("mouseleave", QA_OSM_LAYER_ID, cursorOff);
    map.on("mouseenter", QA_OSM_CLUSTER_ID, cursorOn);
    map.on("mouseleave", QA_OSM_CLUSTER_ID, cursorOff);
    void refresh();
    return () => {
      cancelled = true; controller?.abort();
      if (timer) clearTimeout(timer);
      try {
        map.off("moveend", schedule);
        map.off("click", QA_OSM_LAYER_ID, onClick);
        map.off("click", QA_OSM_CLUSTER_ID, onClusterClick);
        map.off("mouseenter", QA_OSM_LAYER_ID, cursorOn);
        map.off("mouseleave", QA_OSM_LAYER_ID, cursorOff);
        map.off("mouseenter", QA_OSM_CLUSTER_ID, cursorOn);
        map.off("mouseleave", QA_OSM_CLUSTER_ID, cursorOff);
        if (map.getLayer(QA_OSM_COUNT_ID)) map.removeLayer(QA_OSM_COUNT_ID);
        if (map.getLayer(QA_OSM_CLUSTER_ID)) map.removeLayer(QA_OSM_CLUSTER_ID);
        if (map.getLayer(QA_OSM_LAYER_ID)) map.removeLayer(QA_OSM_LAYER_ID);
        if (map.getSource(QA_OSM_SOURCE_ID)) map.removeSource(QA_OSM_SOURCE_ID);
      } catch {}
    };
  }, [ready, citySlug, districtSlug, theme]);

  useEffect(() => {
    if (!QA_OSM_ENABLED || !ready) return;
    const map = mapInstanceRef.current;
    if (!map?.getSource?.(QA_OSM_SOURCE_ID)) return;
    const visible = activeCategory === "all" ? qaFeaturesRef.current :
      qaFeaturesRef.current.filter((f: any) => f?.properties?.category === activeCategory);
    try {
      map.getSource(QA_OSM_SOURCE_ID).setData({ type: "FeatureCollection", features: visible });
      setQaShownCount(visible.length);
    } catch { /* current map may be reinitialized */ }
  }, [ready, activeCategory, qaState]);

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

  const categories = QA_OSM_ENABLED && qaState === "ready" ? qaCategories : context?.categories.filter((category) => Boolean(CATEGORY_META[category])) ?? [];
  const visibleAnchors = context?.anchors.filter((anchor) => activeCategory === "all" || anchor.category === activeCategory) ?? [];

  return (
    <section
      className="maplibre-spike-shell"
      data-maplibre-spike
      data-maplibre-ready={ready ? "true" : "false"}
      data-maplibre-render-state={renderState}
      data-maplibre-source-state={sourceState}
      data-maplibre-source={basemap.provider}
      data-maplibre-mode="2d"
      data-maplibre-basemap-feature-count={baseFeatureCount}
      data-maplibre-context-state={contextState}
      data-maplibre-anchor-count={context?.anchor_count ?? 0}
      data-j11c-qa-enabled={QA_OSM_ENABLED ? "true" : "false"}
      data-j11c-qa-state={qaState}
      data-j11c-qa-count={qaCount}
      data-j11c-qa-shown={qaShownCount}
      data-j11c-qa-clustered={QA_OSM_ENABLED ? "true" : "false"}
      data-maplibre-city={citySlug}
      data-maplibre-district={districtSlug}
      data-l3-maarif-pilot={isMaarifPilot ? "true" : "false"}
      data-l3-maarif-view={isMaarifPilot ? pilotView : "legacy"}
      data-l3-camera-pitch={observedCamera.pitch}
      data-l3-camera-bearing={observedCamera.bearing}
      data-l3-camera-zoom={observedCamera.zoom}
      data-l3-admin-boundary={adminPreviewBounds ? "osm-indicative-preview" : "unavailable"}
      data-maplibre-boundary-status={boundaryGeometry ? "provided" : "center-only"}
      data-l3-admin-preview-source={adminPreviewBounds ? "osm-relation-2801474" : "none"}
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

      {QA_OSM_ENABLED ? (
        <div className="maplibre-qa-osm-status" data-j11c-qa-attribution role="status" aria-live="polite">
          <b>Repères à proximité</b>
          <span>{qaState === "ready" ? String(qaShownCount) + " repères indicatifs · regroupés selon le zoom" :
            qaState === "zoom" ? "Zoomez pour afficher les repères" :
            qaState === "error" ? "Repères OSM indisponibles pour cette vue" : "Chargement des repères OSM…"}</span>
          <small>© OpenStreetMap contributors · ODbL · Ouverture non vérifiée</small>
        </div>
      ) : null}
      {QA_OSM_ENABLED && qaSelected ? (
        <div className="maplibre-qa-osm-detail" data-j11c-selected-osm role="group" aria-label="Repère indicatif">
          <button type="button" aria-label="Fermer le repère" onClick={() => setQaSelected(null)}>×</button>
          <strong>{qaSelected.name}</strong>
          <span>{CATEGORY_META[qaSelected.category]?.label ?? "Repère"} · Position indicative OSM</span>
          <a href={"https://www.openstreetmap.org/" + qaSelected.osmId} target="_blank" rel="noopener noreferrer">Source OpenStreetMap</a>
        </div>
      ) : null}
      {isMaarifPilot ? (
        <div className="l3-maarif-view-controls" data-l3-map-modes role="group" aria-label="Modes de la carte Maârif">
          <button type="button" data-l3-go-quarter aria-pressed={pilotView === "quartier"} onClick={() => selectMaarifView("quartier")}>Quartier · 2D</button>
          <button type="button" data-l3-go-street aria-pressed={pilotView === "rue"} onClick={() => selectMaarifView("rue")}>Rue · zoom</button>
          <button type="button" data-l3-go-admin aria-pressed={pilotView === "limites"} aria-controls="maarif-admin-boundary-explanation" onClick={() => selectMaarifView("limites")}>Limites</button>
          {pilotView === "limites" ? (
            <div id="maarif-admin-boundary-explanation" role="status" className="l3-maarif-admin-panel"
              data-l3-admin-unavailable={adminPreviewBounds ? undefined : "true"}
              data-l3-admin-preview={adminPreviewBounds ? "true" : undefined}>
              {adminPreviewBounds ? (
                <>
                  <strong>Arrondissement Maârif · contour OSM indicatif</strong>
                  <p>Tracé communautaire en prévisualisation, non certifié par la commune. Il ne représente pas la limite du quartier central ni une frontière cadastrale.</p>
                  <a href="https://www.openstreetmap.org/relation/2801474" target="_blank" rel="noopener noreferrer">
                    © OpenStreetMap contributors · ODbL
                  </a>
                  <a href="https://maarif.casablancacity.ma/fr/article/420/situation-geographique" target="_blank" rel="noopener noreferrer">
                    Limites textuelles · Commune de Casablanca
                  </a>
                </>
              ) : (
                <>
                  <strong>Limites non disponibles</strong>
                  <p>Le contour officiel de l’arrondissement Maârif n’est pas encore vérifié. Le repère sur la carte indique le quartier, pas sa frontière.</p>
                </>
              )}
              <button type="button" data-l3-admin-return onClick={() => selectMaarifView("quartier")}>Retour au quartier</button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="maplibre-spike-map-chrome">
        <div className="maplibre-spike-brand"><b>AF</b><span>AkarFinder</span></div>
        <div className="maplibre-spike-search"><Search size={17} aria-hidden="true" /><strong>{cityLabel}</strong><span>Quartiers et adresses</span></div>

      </div>

      <div className="maplibre-spike-filters" aria-label={`Filtres des repères de ${districtLabel}`}>
        <button className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>Repères</button>
        {categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{CATEGORY_META[category].label}</button>)}
      </div>

      <div className="maplibre-spike-controls" aria-label="Contrôles de la carte">
        <button type="button" className="maplibre-spike-control-primary" onClick={restoreCamera} aria-label="Recentrer sur le quartier"><LocateFixed size={18} /></button>
        <button type="button" onClick={() => changeZoom(0.75)} aria-label="Zoomer"><Plus size={19} /></button>
        <button type="button" onClick={() => changeZoom(-0.75)} aria-label="Dézoomer"><Minus size={19} /></button>
      </div>

      <div className="maplibre-spike-map-note">
        <span className="maplibre-spike-map-note-kicker">Quartier · {cityLabel}</span>
        <strong>{districtLabel}</strong>
        <span className="maplibre-spike-map-note-copy">
          {boundaryGeometry ? "Périmètre qualifié affiché." : "Repère central sourcé · périmètre non revendiqué."}
        </span>
        <span className="maplibre-spike-map-note-status">{baseFeatureCount > 0 ? "Carte 2D · repère géolocalisé" : "Chargement du fond cartographique…"}</span>
      </div>

      <footer className="maplibre-spike-outro"><div><strong>Découvrez les quartiers autrement</strong><span>Un même moteur cartographique, du quartier au Maroc.</span></div><em>Des lieux. Des vies. Des projets.</em></footer>

      <style jsx global>{`
        .maplibre-qa-osm-status{position:absolute;z-index:13;left:18px;bottom:70px;display:flex;flex-direction:column;gap:3px;max-width:min(340px,calc(100% - 36px));padding:9px 12px;border:1px solid rgba(255,255,255,.92);border-radius:14px;background:rgba(255,255,255,.94);box-shadow:0 9px 25px rgba(4,33,39,.14);color:#14383d;pointer-events:none}.maplibre-qa-osm-status b{font-size:11px;font-weight:850}.maplibre-qa-osm-status span{font-size:10px}.maplibre-qa-osm-status small{font-size:8px;color:#506266}
        .maplibre-qa-osm-detail{position:absolute;z-index:18;left:18px;bottom:100px;display:grid;gap:5px;max-width:min(340px,calc(100% - 36px));padding:14px 18px;border:1px solid #dce8e4;border-radius:15px;background:#fff;box-shadow:0 12px 40px rgba(6,38,42,.22)}.maplibre-qa-osm-detail strong{font-size:14px}.maplibre-qa-osm-detail span{font-size:11px;color:#56706a}.maplibre-qa-osm-detail a{font-size:11px;color:#075e9e;text-decoration:underline}.maplibre-qa-osm-detail button{position:absolute;top:6px;right:8px;width:27px;height:27px;border:0;border-radius:50%;background:#eef2f0;color:#263d3d;font-size:20px}
        @media(max-width:1023px){.maplibre-qa-osm-status{bottom:300px;left:12px;padding:7px 10px;max-width:min(330px,calc(100% - 24px))}.maplibre-qa-osm-detail{left:12px;bottom:387px}}
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
