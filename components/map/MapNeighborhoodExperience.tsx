"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import Link from "next/link";
import {
  filterNeighborhoodsByCity,
  getBenchmarkLabel,
  getNeighborhoodBySlug,
  getNeighborhoodCities,
  type NeighborhoodConfidence,
  type NeighborhoodPoint,
} from "@/lib/map/canonical-neighborhood-data";
import { resolveCityEntity } from "@/lib/geo/geo-entity-registry";
import {
  buildMapProjectHref,
  buildMapSearchHref,
  buildNeighborhoodPageHref,
  withMapLocation,
  type MapNavigationState,
} from "@/lib/map/map-navigation-state";
import { getCityFlyTarget, MOROCCO_OVERVIEW } from "@/lib/map/listing-map";
import { useTheme } from "@/components/theme/ThemeProvider";

const CLUSTER_ZOOM_THRESHOLD = 8;
const LIGHT_TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_TILE_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function styleForTheme(theme: string | undefined) {
  return theme === "dark" ? DARK_TILE_STYLE : LIGHT_TILE_STYLE;
}

function hideInternalBoundaries(map: MapLibreMap) {
  for (const id of [
    "boundary_3",
    "boundary_4",
    "boundary_3_z3z4",
    "boundary_4_z5",
    "admin_level_3",
    "admin_level_4",
  ]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
  }
}

function confidenceColor(confidence: NeighborhoodConfidence): string {
  switch (confidence) {
    case "high":
      return "#22c55e";
    case "medium":
      return "#f59e0b";
    case "low":
      return "#f97316";
  }
}

function createNeighborhoodMarkerEl(
  point: NeighborhoodPoint,
  isSelected: boolean,
): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  const benchmarkLabel = getBenchmarkLabel(point);
  const color = confidenceColor(point.confidence);
  const bgColor = isSelected ? "#9B7838" : "#ffffff";
  const textColor = isSelected ? "#ffffff" : "#071B33";
  const subColor = isSelected ? "rgba(255,255,255,0.75)" : "#6b7280";
  const border = isSelected ? "2px solid #C2A368" : `1.5px solid ${color}`;

  el.className = [
    "maplibre-neighborhood-marker cursor-pointer whitespace-nowrap",
    "rounded-xl px-2.5 py-1.5",
    "shadow-[0_4px_12px_rgba(0,0,0,0.22)]",
    "transition-transform duration-100 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40",
    isSelected ? "scale-110 z-20" : "z-10",
  ].join(" ");
  el.style.cssText = `background:${bgColor};border:${border};${
    isSelected ? "box-shadow:0 0 0 2px #C2A368,0 4px 12px rgba(0,0,0,0.3);" : ""
  }`;
  el.setAttribute("aria-label", `Explorer ${point.neighborhood}, ${point.city}`);
  el.setAttribute("aria-pressed", isSelected ? "true" : "false");
  el.innerHTML = `
    <span style="display:block;font-size:11px;font-weight:800;line-height:1;color:${textColor}">${point.neighborhood}</span>
    <span style="display:block;font-size:10px;font-weight:600;line-height:1;margin-top:3px;color:${subColor}">${benchmarkLabel}</span>
  `;
  return el;
}

function createCityClusterEl(city: string, count: number): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.title = `${city} · ${count} quartier${count > 1 ? "s" : ""} répertorié${count > 1 ? "s" : ""}`;
  el.setAttribute(
    "aria-label",
    `Explorer les repères immobiliers à ${city} (${count} quartier${count > 1 ? "s" : ""})`,
  );
  el.className =
    "maplibre-cluster-marker cursor-pointer flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white border border-[#e4e9f2] shadow-[0_3px_10px_rgba(7,27,51,0.16)] pl-2 pr-3 py-1.5 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40";
  el.innerHTML = `
    <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#eef4ff] text-[9.5px] font-extrabold text-[#2563eb]">${count}</span>
    <span class="text-[12px] font-extrabold text-[#071B33]">${city}</span>
  `;
  return el;
}

type NeighborhoodPanelProps = {
  point: NeighborhoodPoint | null;
  searchHref: string;
  neighborhoodHref: string | null;
  projectHref: string | null;
  onDismiss: () => void;
};

function NeighborhoodPanel({
  point,
  searchHref,
  neighborhoodHref,
  projectHref,
  onDismiss,
}: NeighborhoodPanelProps) {
  if (!point) return null;
  const benchmarkLabel = getBenchmarkLabel(point);
  const color = confidenceColor(point.confidence);

  return (
    <div
      className="animate-in slide-in-from-bottom border-t border-[#eadfca] bg-white duration-300"
      aria-label={`Fiche repère quartier ${point.neighborhood}`}
    >
      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9B7838]">
              Repère indicatif · {point.city}
            </p>
            <h2 className="mt-1 text-[1.1rem] font-extrabold tracking-tight text-[#071B33]">
              {point.neighborhood}
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:bg-gray-50"
            aria-label="Fermer le quartier sélectionné"
          >
            ✕
          </button>
        </div>

        <div
          className="mt-3 rounded-xl border px-3 py-2.5"
          style={{ borderColor: color, background: `${color}10` }}
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em]" style={{ color }}>
            Repère prix indicatif — {point.benchmark.period}
          </p>
          <p className="mt-1 text-[1.05rem] font-extrabold text-[#071B33]">{benchmarkLabel}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">
            Appartement · achat · non garanti · à confirmer
          </p>
        </div>

        {point.highlights.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400">
              Vie autour du quartier · données indicatives OSM
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {point.highlights.map((highlight, index) => (
                <span
                  key={`${highlight.label}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700"
                >
                  {highlight.icon} {highlight.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            href={searchHref}
            className="rounded-xl bg-[#071B33] px-4 py-2.5 text-center text-[13px] font-extrabold text-white transition-colors hover:bg-[#0f2d52]"
          >
            Rechercher dans ce quartier →
          </Link>
          {neighborhoodHref ? (
            <Link
              href={neighborhoodHref}
              className="rounded-xl border border-[#d9c8a7] bg-[#fffaf0] px-4 py-2.5 text-center text-[13px] font-extrabold text-[#765823] transition hover:bg-[#f8eedc]"
            >
              Voir la page quartier
            </Link>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-[11px] font-bold text-slate-500">
              Page quartier non publiée
            </div>
          )}
        </div>

        {projectHref ? (
          <div className="mt-2 text-center">
            <Link href={projectHref} className="text-[11px] font-extrabold text-[#0B63CE] hover:underline">
              Revenir à Mon Projet sans perdre le contexte
            </Link>
          </div>
        ) : null}
        <p className="mt-2 text-center text-[10px] text-gray-400">
          Repères indicatifs · sources visibles · à confirmer avant toute décision
        </p>
      </div>
    </div>
  );
}

type MapNeighborhoodExperienceProps = {
  navigationState: MapNavigationState;
  onNavigationChange: (nextState: MapNavigationState) => void;
};

export function MapNeighborhoodExperience({
  navigationState,
  onNavigationChange,
}: MapNeighborhoodExperienceProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const clusterMarkersRef = useRef<Marker[]>([]);
  const styleInitRef = useRef(true);
  const { theme } = useTheme();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapZoom, setMapZoom] = useState(MOROCCO_OVERVIEW.zoom);

  const cityEntity = useMemo(
    () => navigationState.city === "all" ? null : resolveCityEntity(navigationState.city),
    [navigationState.city],
  );
  const cityFilter = cityEntity?.canonical_name ?? "all";
  const cities = useMemo(() => getNeighborhoodCities(), []);
  const visiblePoints = useMemo(
    () => filterNeighborhoodsByCity(cityFilter),
    [cityFilter],
  );
  const selectedPoint = useMemo(
    () => cityEntity && navigationState.district
      ? getNeighborhoodBySlug(cityEntity.slug, navigationState.district)
      : null,
    [cityEntity, navigationState.district],
  );
  const showClusters = mapZoom < CLUSTER_ZOOM_THRESHOLD && !selectedPoint;

  const cityClusters = useMemo(() => {
    const byCity = new Map<string, number>();
    for (const point of visiblePoints) {
      byCity.set(point.city, (byCity.get(point.city) ?? 0) + 1);
    }
    return Array.from(byCity.entries()).map(([city, count]) => ({
      city,
      count,
      flyTarget: getCityFlyTarget(city),
    }));
  }, [visiblePoints]);

  const searchHref = useMemo(() => buildMapSearchHref(navigationState), [navigationState]);
  const neighborhoodHref = useMemo(
    () => buildNeighborhoodPageHref(navigationState),
    [navigationState],
  );
  const projectHref = useMemo(
    () => navigationState.project_id ? buildMapProjectHref(navigationState) : null,
    [navigationState],
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let mapInstance: MapLibreMap | null = null;
    let cancelled = false;

    void import("maplibre-gl").then(({ Map: MapClass, setRTLTextPlugin }) => {
      if (cancelled || !mapContainerRef.current) return;
      void setRTLTextPlugin("/mapbox-gl-rtl-text.min.js", true).catch(() => {});
      const initialTheme = document.documentElement.dataset.theme;
      mapInstance = new MapClass({
        container: mapContainerRef.current,
        style: styleForTheme(initialTheme),
        center: [MOROCCO_OVERVIEW.lng, MOROCCO_OVERVIEW.lat],
        zoom: MOROCCO_OVERVIEW.zoom,
        minZoom: 4.6,
        maxZoom: 15,
        maxBounds: [[-14.5, 20.5], [2.5, 37.5]],
        attributionControl: {
          customAttribution:
            "© <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>",
        },
      });
      mapRef.current = mapInstance;
      mapInstance.on("load", () => {
        if (!mapInstance) return;
        hideInternalBoundaries(mapInstance);
        setMapLoaded(true);
      });
      mapInstance.on("zoom", () => {
        if (mapInstance) setMapZoom(mapInstance.getZoom());
      });
    });

    return () => {
      cancelled = true;
      mapInstance?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (selectedPoint) {
      map.flyTo({
        center: [selectedPoint.lng, selectedPoint.lat],
        zoom: 11.2,
        duration: 850,
      });
      return;
    }
    if (cityFilter !== "all") {
      const target = getCityFlyTarget(cityFilter);
      map.flyTo({ center: [target.lng, target.lat], zoom: target.zoom, duration: 850 });
      return;
    }
    map.flyTo({
      center: [MOROCCO_OVERVIEW.lng, MOROCCO_OVERVIEW.lat],
      zoom: MOROCCO_OVERVIEW.zoom,
      duration: 850,
    });
  }, [cityFilter, mapLoaded, selectedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (styleInitRef.current) {
      styleInitRef.current = false;
      return;
    }
    map.setStyle(styleForTheme(theme));
    map.once("style.load", () => hideInternalBoundaries(map));
  }, [mapLoaded, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    let cancelled = false;

    void import("maplibre-gl").then(({ Marker }) => {
      if (cancelled || !mapRef.current) return;
      for (const marker of markersRef.current) marker.remove();
      for (const marker of clusterMarkersRef.current) marker.remove();
      markersRef.current = [];
      clusterMarkersRef.current = [];

      if (showClusters) {
        for (const { city, count, flyTarget } of cityClusters) {
          const el = createCityClusterEl(city, count);
          el.addEventListener("click", () => {
            onNavigationChange(withMapLocation(navigationState, city));
          });
          const marker = new Marker({ element: el, anchor: "center" })
            .setLngLat([flyTarget.lng, flyTarget.lat])
            .addTo(mapRef.current!);
          clusterMarkersRef.current.push(marker);
        }
        return;
      }

      for (const point of visiblePoints) {
        const isSelected = selectedPoint?.id === point.id;
        const el = createNeighborhoodMarkerEl(point, isSelected);
        el.addEventListener("click", () => {
          onNavigationChange(withMapLocation(navigationState, point.city, point.neighborhood));
        });
        const marker = new Marker({ element: el, anchor: "center" })
          .setLngLat([point.lng, point.lat])
          .addTo(mapRef.current!);
        markersRef.current.push(marker);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cityClusters, mapLoaded, navigationState, onNavigationChange, selectedPoint, showClusters, visiblePoints]);

  return (
    <div className="relative flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <section className="z-10 flex-shrink-0 border-b border-[#eadfca] bg-deepblue text-white">
        <div className="mx-auto max-w-[1480px] px-4 py-2.5 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div>
              <p className="hidden text-[11px] font-extrabold uppercase tracking-[0.18em] text-bronze-400 sm:block">
                Repères quartier · Données indicatives
              </p>
              <h1 className="text-[1.05rem] font-extrabold tracking-[-0.03em] sm:mt-1 sm:text-[1.8rem]">
                Explorez les quartiers immobiliers du Maroc
              </h1>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-[12px] font-bold text-white/60">
                {visiblePoints.length} quartier{visiblePoints.length !== 1 ? "s" : ""} répertorié{visiblePoints.length !== 1 ? "s" : ""}
              </p>
              <p className="mt-0.5 text-[10px] text-white/40">
                État partageable · navigation navigateur conservée
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-end gap-2 sm:mt-3">
            <label className="block min-w-0 flex-1 sm:max-w-[280px] sm:flex-initial">
              <span className="mb-1 hidden text-[10px] font-extrabold uppercase tracking-[0.13em] text-white/64 sm:block">
                Ville
              </span>
              <select
                value={cityFilter}
                onChange={(event) => {
                  onNavigationChange(withMapLocation(navigationState, event.target.value));
                }}
                className="h-10 w-full rounded-xl border border-white/10 bg-white px-3 text-[13px] font-bold text-deepblue outline-none focus:ring-2 focus:ring-[#C2A368] sm:w-auto sm:min-w-[180px]"
              >
                <option value="all">Tout le Maroc</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => onNavigationChange(withMapLocation(navigationState, "all"))}
              className="h-10 shrink-0 rounded-xl border border-white/15 px-3 text-[12px] font-extrabold text-white/82 transition-colors hover:bg-white/10 sm:px-4"
            >
              Réinitialiser
            </button>

            <Link
              href={searchHref}
              className="flex h-10 shrink-0 items-center rounded-xl bg-[#9B7838] px-3 text-[12px] font-extrabold text-white transition-colors hover:bg-[#b08c44] sm:px-4"
            >
              <span className="hidden sm:inline">Rechercher dans cette zone →</span>
              <span className="sm:hidden">Rechercher →</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1">
          <div ref={mapContainerRef} className="absolute inset-0" />

          {!mapLoaded ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-deepblue">
              <div className="text-center text-white">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <p className="text-[13px] font-bold text-white/72">Chargement de la carte…</p>
              </div>
            </div>
          ) : (
            <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)]">
              <div className="rounded-xl border border-white/15 bg-[#071B33]/85 px-3 py-2 backdrop-blur">
                <p className="text-[12px] font-extrabold text-white">
                  {selectedPoint ? `${selectedPoint.neighborhood} · ${selectedPoint.city}` : `${visiblePoints.length} quartier${visiblePoints.length !== 1 ? "s" : ""} répertorié${visiblePoints.length !== 1 ? "s" : ""}`}
                </p>
                {!selectedPoint && showClusters ? (
                  <p className="mt-0.5 text-[10px] font-semibold text-white/60">
                    Choisissez une ville ou zoomez pour explorer
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-8 left-4 right-4 z-10 sm:right-auto sm:max-w-[280px]">
            <div className="rounded-2xl border border-white/15 bg-[#071B33]/88 p-3 backdrop-blur">
              <p className="text-[11px] leading-5 text-white/70">
                Repères indicatifs pour préparer votre recherche — à confirmer sur la source originale avant toute décision.
              </p>
              <p className="mt-1.5 text-[10px] text-white/45">
                Tuiles ©{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto underline"
                >
                  OpenStreetMap contributors
                </a>{" "}
                via OpenFreeMap
              </p>
            </div>
          </div>
        </div>

        <NeighborhoodPanel
          point={selectedPoint}
          searchHref={searchHref}
          neighborhoodHref={neighborhoodHref}
          projectHref={projectHref}
          onDismiss={() => onNavigationChange(withMapLocation(navigationState, cityFilter))}
        />
      </div>
    </div>
  );
}
