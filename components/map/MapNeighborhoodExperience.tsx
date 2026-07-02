"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import Link from "next/link";
import Image from "next/image";
import {
  NEIGHBORHOOD_POINTS,
  filterNeighborhoodsByCity,
  getBenchmarkLabel,
  getNeighborhoodCities,
  type NeighborhoodPoint,
  type DataConfidence,
} from "@/lib/map/neighborhood-data";
import {
  getCityFlyTarget,
  MOROCCO_OVERVIEW,
  type FlyToTarget,
} from "@/lib/map/listing-map";
import { CITIES } from "@/lib/cities";
import { useTheme } from "@/components/theme/ThemeProvider";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CLUSTER_ZOOM_THRESHOLD = 8;
const LIGHT_TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_TILE_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function styleForTheme(theme: string | undefined) {
  return theme === "dark" ? DARK_TILE_STYLE : LIGHT_TILE_STYLE;
}

function hideInternalBoundaries(map: MapLibreMap) {
  const layers = [
    "boundary_3",
    "boundary_4",
    "boundary_3_z3z4",
    "boundary_4_z5",
    "admin_level_3",
    "admin_level_4",
  ];
  for (const id of layers) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
  }
}

// ─── Confidence badge color ────────────────────────────────────────────────────

function confidenceColor(c: DataConfidence): string {
  switch (c) {
    case "élevée":
      return "#22c55e"; // green-500
    case "moyenne":
      return "#f59e0b"; // amber-500
    case "faible":
      return "#f97316"; // orange-500
    case "en_preparation":
      return "#94a3b8"; // slate-400
  }
}

// ─── Marker factories ──────────────────────────────────────────────────────────

function createNeighborhoodMarkerEl(
  point: NeighborhoodPoint,
  isSelected: boolean
): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";

  const label =
    point.neighborhood ?? point.city;
  const benchmarkLabel = getBenchmarkLabel(point);
  const color = confidenceColor(point.dataConfidence);
  const bgColor = isSelected ? "#9B7838" : "#ffffff";
  const textColor = isSelected ? "#ffffff" : "#071B33";
  const subColor = isSelected ? "rgba(255,255,255,0.75)" : "#6b7280";
  const border = isSelected
    ? "2px solid #C2A368"
    : `1.5px solid ${color}`;

  el.className = [
    "maplibre-neighborhood-marker cursor-pointer whitespace-nowrap",
    "rounded-xl px-2.5 py-1.5",
    "shadow-[0_4px_12px_rgba(0,0,0,0.22)]",
    "transition-transform duration-100 hover:scale-105 focus:outline-none",
    isSelected ? "scale-110 z-20" : "z-10",
  ].join(" ");

  el.style.cssText = `background:${bgColor};border:${border};${
    isSelected
      ? "box-shadow:0 0 0 2px #C2A368,0 4px 12px rgba(0,0,0,0.3);"
      : ""
  }`;

  el.innerHTML = `
    <span style="display:block;font-size:11px;font-weight:800;line-height:1;color:${textColor}">${label}</span>
    <span style="display:block;font-size:10px;font-weight:600;line-height:1;margin-top:3px;color:${subColor}">${benchmarkLabel}</span>
  `;

  return el;
}

function createCityClusterEl(
  city: string,
  count: number
): HTMLAnchorElement {
  const el = document.createElement("a");
  el.href = `/search?city=${encodeURIComponent(city)}`;
  el.setAttribute(
    "aria-label",
    `Explorer les repères immobiliers à ${city} (${count} quartier${count > 1 ? "s" : ""})`
  );
  el.className =
    "maplibre-cluster-marker cursor-pointer rounded-2xl bg-white border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.22)] px-3 py-2 text-left min-w-[90px] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-bronze-500";
  el.innerHTML = `
    <span class="block text-[12px] font-extrabold text-[#071B33]">${city}</span>
    <span class="block text-[11px] font-bold text-[#9B7838]">${count} quartier${count > 1 ? "s" : ""} · repères indicatifs</span>
    <span class="block text-[10px] font-bold text-[#071B33]/50 mt-0.5">Explorer →</span>
  `;
  return el;
}

// ─── Neighborhood detail panel (side / bottom) ────────────────────────────────

type NeighborhoodPanelProps = {
  point: NeighborhoodPoint | null;
  onDismiss: () => void;
};

function NeighborhoodPanel({ point, onDismiss }: NeighborhoodPanelProps) {
  if (!point) return null;
  const benchmarkLabel = getBenchmarkLabel(point);
  const color = confidenceColor(point.dataConfidence);

  return (
    <div
      className="animate-in slide-in-from-bottom duration-300 border-t border-[#eadfca] bg-white"
      aria-label={`Fiche repère quartier ${point.neighborhood ?? point.city}`}
    >
      <div className="mx-auto max-w-xl px-4 py-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9B7838]">
              Repère indicatif · {point.city}
            </p>
            <h2 className="mt-1 text-[1.1rem] font-extrabold tracking-tight text-[#071B33]">
              {point.neighborhood ?? point.city}
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Benchmark */}
        <div
          className="mt-3 rounded-xl border px-3 py-2.5"
          style={{ borderColor: color, background: `${color}10` }}
        >
          <p
            className="text-[11px] font-extrabold uppercase tracking-[0.1em]"
            style={{ color }}
          >
            Repère prix indicatif — {point.benchmark.period}
          </p>
          <p className="mt-1 text-[1.05rem] font-extrabold text-[#071B33]">
            {benchmarkLabel}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-400">
            Appartement · achat · non garanti · à confirmer
          </p>
        </div>

        {/* Highlights */}
        {point.highlights.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400">
              Vie autour du quartier · données indicatives OSM
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {point.highlights.map((h, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700"
                >
                  {h.icon} {h.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4">
          <Link
            href={point.searchHref}
            className="block w-full rounded-xl bg-[#071B33] px-4 py-2.5 text-center text-[13px] font-extrabold text-white hover:bg-[#0f2d52] transition-colors"
          >
            Rechercher dans ce quartier →
          </Link>
          <p className="mt-2 text-[10px] text-center text-gray-400">
            Repères indicatifs · sources visibles · à confirmer avant toute décision
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

type MapNeighborhoodExperienceProps = {
  initialCity?: string;
};

export function MapNeighborhoodExperience({
  initialCity = "all",
}: MapNeighborhoodExperienceProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const clusterMarkersRef = useRef<Marker[]>([]);
  const { theme } = useTheme();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapZoom, setMapZoom] = useState(MOROCCO_OVERVIEW.zoom);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string>(initialCity);

  const cities = useMemo(() => getNeighborhoodCities(), []);

  const visiblePoints = useMemo(
    () => filterNeighborhoodsByCity(cityFilter),
    [cityFilter]
  );

  const selectedPoint = useMemo(
    () => visiblePoints.find((p) => p.id === selectedId) ?? null,
    [visiblePoints, selectedId]
  );

  const showClusters = mapZoom < CLUSTER_ZOOM_THRESHOLD;

  // City overlay (initial load)
  const initialCityConfig = useMemo(
    () =>
      CITIES.find(
        (c) => c.label.toLowerCase() === (initialCity ?? "").toLowerCase()
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [showCityOverlay, setShowCityOverlay] = useState(
    () => !!initialCityConfig
  );
  const [overlayExiting, setOverlayExiting] = useState(false);

  const dismissOverlay = useCallback(() => {
    setOverlayExiting(true);
    setTimeout(() => {
      setShowCityOverlay(false);
      setOverlayExiting(false);
    }, 400);
  }, []);

  // Group by city for cluster view
  const cityClusters = useMemo(() => {
    const byCity = new Map<string, number>();
    for (const p of visiblePoints) {
      byCity.set(p.city, (byCity.get(p.city) ?? 0) + 1);
    }
    return Array.from(byCity.entries()).map(([city, count]) => ({
      city,
      count,
      flyTarget: getCityFlyTarget(city),
    }));
  }, [visiblePoints]);

  // ─── MapLibre init ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let mapInstance: MapLibreMap;

    import("maplibre-gl").then(({ Map: MapClass, setRTLTextPlugin }) => {
      if (!mapContainerRef.current) return;

      setRTLTextPlugin("/mapbox-gl-rtl-text.min.js", true).catch(() => {});

      const initialTheme =
        typeof document !== "undefined"
          ? document.documentElement.dataset.theme
          : "light";

      mapInstance = new MapClass({
        container: mapContainerRef.current,
        style: styleForTheme(initialTheme),
        center: [MOROCCO_OVERVIEW.lng, MOROCCO_OVERVIEW.lat],
        zoom: MOROCCO_OVERVIEW.zoom,
        attributionControl: {
          customAttribution:
            "© <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>",
        },
      });

      mapRef.current = mapInstance;
      mapInstance.on("load", () => {
        hideInternalBoundaries(mapInstance);
        setMapLoaded(true);
      });
      mapInstance.on("zoom", () => setMapZoom(mapInstance.getZoom()));
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── City flyTo ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (cityFilter !== "all") {
      const t = getCityFlyTarget(cityFilter);
      mapRef.current.flyTo({ center: [t.lng, t.lat], zoom: t.zoom, duration: 1000 });
    } else {
      mapRef.current.flyTo({
        center: [MOROCCO_OVERVIEW.lng, MOROCCO_OVERVIEW.lat],
        zoom: MOROCCO_OVERVIEW.zoom,
        duration: 1000,
      });
    }
  }, [cityFilter, mapLoaded]);

  // ─── Theme swap ─────────────────────────────────────────────────────────────

  const styleInitRef = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (styleInitRef.current) { styleInitRef.current = false; return; }
    map.setStyle(styleForTheme(theme));
    map.once("style.load", () => hideInternalBoundaries(map));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // ─── Markers ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    import("maplibre-gl").then(({ Marker }) => {
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];
      for (const m of clusterMarkersRef.current) m.remove();
      clusterMarkersRef.current = [];

      if (showClusters) {
        for (const { city, count, flyTarget } of cityClusters) {
          const el = createCityClusterEl(city, count);
          const marker = new Marker({ element: el, anchor: "center" })
            .setLngLat([flyTarget.lng, flyTarget.lat])
            .addTo(mapRef.current!);
          clusterMarkersRef.current.push(marker);
        }
      } else {
        for (const point of visiblePoints) {
          const isSelected = point.id === selectedId;
          const el = createNeighborhoodMarkerEl(point, isSelected);
          el.addEventListener("click", () => setSelectedId(point.id));

          const marker = new Marker({ element: el, anchor: "center" })
            .setLngLat([point.lng, point.lat])
            .addTo(mapRef.current!);
          markersRef.current.push(marker);
        }
      }
    });
  }, [mapLoaded, showClusters, cityClusters, visiblePoints, selectedId]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <section className="flex-shrink-0 border-b border-[#eadfca] bg-deepblue text-white z-10">
        <div className="mx-auto max-w-[1480px] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-bronze-400">
                Intelligence quartier · Repères indicatifs
              </p>
              <h1 className="mt-1 text-[1.4rem] font-extrabold tracking-[-0.04em] sm:text-[1.8rem]">
                Explorez les quartiers immobiliers du Maroc
              </h1>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[12px] font-bold text-white/60">
                {visiblePoints.length} quartier{visiblePoints.length !== 1 ? "s" : ""} répertorié{visiblePoints.length !== 1 ? "s" : ""}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">
                Données indicatives · sources visibles
              </p>
            </div>
          </div>

          {/* City filter */}
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <label className="block flex-1 min-w-[180px] max-w-[280px]">
              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.13em] text-white/64">
                Ville
              </span>
              <select
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setSelectedId(null);
                }}
                className="h-10 w-full rounded-xl border border-white/10 bg-white px-3 text-[13px] font-bold text-deepblue outline-none"
              >
                <option value="all">Tout le Maroc</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => { setCityFilter("all"); setSelectedId(null); }}
              className="mt-5 h-10 rounded-xl border border-white/15 px-4 text-[12px] font-extrabold text-white/82 hover:bg-white/10 transition-colors"
            >
              Réinitialiser
            </button>

            <Link
              href={cityFilter !== "all" ? `/search?city=${encodeURIComponent(cityFilter)}` : "/search"}
              className="mt-5 h-10 flex items-center rounded-xl bg-[#9B7838] px-4 text-[12px] font-extrabold text-white hover:bg-[#b08c44] transition-colors"
            >
              Rechercher dans cette zone →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Map + panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col overflow-hidden min-h-0">
        {/* Map */}
        <div className="relative flex-1 min-h-0">
          <div ref={mapContainerRef} className="absolute inset-0" />

          {/* Loading */}
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-deepblue z-10">
              <div className="text-center text-white">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <p className="text-[13px] font-bold text-white/72">
                  Chargement de la carte…
                </p>
              </div>
            </div>
          )}

          {/* Zoom hint */}
          {mapLoaded && showClusters && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="rounded-full border border-white/15 bg-[#071B33]/80 px-4 py-2 backdrop-blur">
                <p className="text-[11px] font-bold text-white/80">
                  Zoomez sur une ville pour voir les quartiers
                </p>
              </div>
            </div>
          )}

          {/* Count badge */}
          {mapLoaded && (
            <div className="absolute top-4 left-4 z-10">
              <div className="rounded-xl border border-white/15 bg-[#071B33]/80 px-3 py-2 backdrop-blur">
                <p className="text-[12px] font-extrabold text-white">
                  {visiblePoints.length} quartier{visiblePoints.length !== 1 ? "s" : ""} répertorié{visiblePoints.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="absolute bottom-8 left-4 right-4 sm:right-auto sm:max-w-xs z-10 pointer-events-none">
            <div className="rounded-2xl border border-white/15 bg-[#071B33]/88 p-3 backdrop-blur">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#C2A368]">
                Intelligence quartier — repères indicatifs
              </p>
              <p className="mt-1 text-[11px] leading-5 text-white/70">
                Données indicatives OSM et observations de marché 2024–2025. À confirmer avant toute décision d'achat ou location.
              </p>
              <p className="mt-1 text-[10px] text-white/45">
                Tuiles ©{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline pointer-events-auto"
                >
                  OpenStreetMap contributors
                </a>{" "}
                via OpenFreeMap
              </p>
            </div>
          </div>
        </div>

        {/* Neighborhood panel */}
        <NeighborhoodPanel
          point={selectedPoint}
          onDismiss={() => setSelectedId(null)}
        />
      </div>

      {/* ── City overlay ────────────────────────────────────────────────────── */}
      {showCityOverlay && initialCityConfig && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{ transition: "opacity 0.4s ease", opacity: overlayExiting ? 0 : 1 }}
          onClick={dismissOverlay}
        >
          {initialCityConfig.image && (
            <Image
              src={initialCityConfig.image}
              alt=""
              fill
              className="absolute inset-0 object-cover"
              priority
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, ${initialCityConfig.overlayFrom} 0%, rgba(7,27,51,0.96) 100%)`,
            }}
          />
          <div
            className="relative z-10 flex flex-col items-center px-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#C2A368]">
              Intelligence quartier · AkarFinder
            </p>
            <h1 className="mt-4 text-[3.2rem] font-extrabold leading-[1.02] tracking-[-0.04em] text-white sm:text-[4.5rem]">
              {initialCityConfig.label}
            </h1>
            <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#C2A368]/85">
              {initialCityConfig.tag}
            </p>
            <p className="mt-5 max-w-[320px] text-[15px] leading-relaxed text-white/68">
              {initialCityConfig.description}
            </p>
            <button
              type="button"
              onClick={dismissOverlay}
              className="mt-8 rounded-full bg-[#9B7838] px-8 py-3.5 text-[14px] font-extrabold text-white shadow-[0_8px_24px_rgba(155,120,56,0.45)] transition hover:bg-[#b08c44]"
            >
              Explorer {initialCityConfig.label} sur la carte →
            </button>
            <p className="mt-4 text-[11px] text-white/35">
              ou appuyez n&apos;importe où pour passer
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
