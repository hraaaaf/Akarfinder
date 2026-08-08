"use client";

import Link from "next/link";
import { Info, MapPin, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useTheme } from "@/components/theme/ThemeProvider";
import { resolveCityEntity } from "@/lib/geo/geo-entity-registry";
import {
  filterNeighborhoodsByCity,
  getBenchmarkLabel,
  getNeighborhoodBySlug,
  getNeighborhoodCities,
  type NeighborhoodPoint,
} from "@/lib/map/canonical-neighborhood-data";
import {
  formatDhPerM2,
  formatPriceRange,
  getExactApartmentBuyBenchmark,
  getExactApartmentBuyBenchmarks,
} from "@/lib/map/akarfinder-market-intelligence";
import {
  addAkarFinderTerritorialLayers,
  applyAkarFinderBasemapTreatment,
  AKARFINDER_TERRITORIAL_FILL_LAYER_ID,
  AKARFINDER_TERRITORIAL_LABEL_LAYER_ID,
  AKARFINDER_TERRITORIAL_LINE_LAYER_ID,
  AKARFINDER_TERRITORIAL_SOURCE_ID,
} from "@/lib/map/akarfinder-territorial-style";
import {
  getMapConfidenceMeta,
  MAP_VISUAL_TOKENS,
} from "@/lib/map/map-design-system";
import {
  buildMapProjectHref,
  buildMapSearchHref,
  buildNeighborhoodPageHref,
  MAP_LAYER_EXPLORE,
  MAP_LAYER_PRICE,
  withMapLayer,
  withMapLocation,
  type MapNavigationState,
} from "@/lib/map/map-navigation-state";
import { getCityFlyTarget, MOROCCO_OVERVIEW } from "@/lib/map/listing-map";

const CLUSTER_ZOOM_THRESHOLD = 8;
const LIGHT_TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_TILE_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CASABLANCA_TERRITORIAL_ENDPOINT = "/api/geo/casablanca-arrondissements";

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

function removeAkarFinderTerritorialLayers(map: MapLibreMap) {
  if (map.getLayer(AKARFINDER_TERRITORIAL_LABEL_LAYER_ID)) map.removeLayer(AKARFINDER_TERRITORIAL_LABEL_LAYER_ID);
  if (map.getLayer(AKARFINDER_TERRITORIAL_LINE_LAYER_ID)) map.removeLayer(AKARFINDER_TERRITORIAL_LINE_LAYER_ID);
  if (map.getLayer(AKARFINDER_TERRITORIAL_FILL_LAYER_ID)) map.removeLayer(AKARFINDER_TERRITORIAL_FILL_LAYER_ID);
  if (map.getSource(AKARFINDER_TERRITORIAL_SOURCE_ID)) map.removeSource(AKARFINDER_TERRITORIAL_SOURCE_ID);
}

function createNeighborhoodMarkerEl(
  point: NeighborhoodPoint,
  isSelected: boolean,
  priceMode: boolean,
): HTMLButtonElement | null {
  const exactBenchmark = getExactApartmentBuyBenchmark(point);
  if (priceMode && !exactBenchmark) return null;

  const el = document.createElement("button");
  el.type = "button";
  const benchmarkLabel = priceMode && exactBenchmark
    ? `~${formatDhPerM2(exactBenchmark.medianPricePerM2)}`
    : getBenchmarkLabel(point);
  const confidence = getMapConfidenceMeta(priceMode && exactBenchmark ? exactBenchmark.confidence : point.confidence);
  const background = isSelected
    ? MAP_VISUAL_TOKENS.accent
    : priceMode ? "rgba(255,255,255,0.97)" : MAP_VISUAL_TOKENS.surface;
  const textColor = isSelected ? "#ffffff" : MAP_VISUAL_TOKENS.navy;
  const subColor = isSelected ? "rgba(255,255,255,0.82)" : MAP_VISUAL_TOKENS.muted;
  const border = isSelected ? MAP_VISUAL_TOKENS.accent : priceMode ? "#0B63CE" : MAP_VISUAL_TOKENS.border;

  el.className = [
    "maplibre-neighborhood-marker cursor-pointer whitespace-nowrap rounded-xl px-2.5 py-1.5",
    "transition duration-150 ease-out hover:-translate-y-0.5 hover:scale-[1.03] focus:outline-none",
    isSelected ? "z-20 scale-[1.04]" : "z-10",
  ].join(" ");
  el.dataset.akarfinderMarketMarker = priceMode ? "exact-price" : "territorial-repère";
  el.style.cssText = [
    `background:${background}`,
    `border:1.5px solid ${border}`,
    `box-shadow:${isSelected
      ? `0 0 0 3px ${MAP_VISUAL_TOKENS.accentHalo}55,0 10px 24px rgba(7,27,51,0.24)`
      : priceMode ? "0 8px 22px rgba(11,99,206,0.18)" : "0 5px 16px rgba(7,27,51,0.16)"}`,
  ].join(";");
  const detail = priceMode && exactBenchmark
    ? `${formatPriceRange(exactBenchmark)} · n=${exactBenchmark.sampleCount}`
    : benchmarkLabel;
  el.setAttribute(
    "aria-label",
    priceMode && exactBenchmark
      ? `${point.neighborhood}, ${point.city}. Prix observé appartement achat ${benchmarkLabel}. Fourchette ${formatPriceRange(exactBenchmark)}. Échantillon ${exactBenchmark.sampleCount}. ${confidence.label}.`
      : `Explorer ${point.neighborhood}, ${point.city}. ${benchmarkLabel}. ${confidence.label}.`,
  );
  el.setAttribute("aria-pressed", isSelected ? "true" : "false");
  el.innerHTML = `
    <span style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:800;line-height:1;color:${textColor}">
      <span>${point.neighborhood}</span>
      <span aria-hidden="true" title="${confidence.label}" style="width:6px;height:6px;border-radius:999px;background:${confidence.color};box-shadow:0 0 0 2px ${isSelected ? "rgba(255,255,255,0.32)" : confidence.soft}"></span>
    </span>
    <span style="display:block;font-size:${priceMode ? "11px" : "10px"};font-weight:${priceMode ? "850" : "650"};line-height:1;margin-top:4px;color:${priceMode && !isSelected ? "#0B63CE" : subColor}">${benchmarkLabel}</span>
    ${priceMode ? `<span style="display:block;font-size:8.5px;font-weight:650;line-height:1;margin-top:4px;color:${subColor}">${detail}</span>` : ""}
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
    "maplibre-cluster-marker cursor-pointer flex items-center gap-2 whitespace-nowrap rounded-full border bg-white px-2 py-1.5 shadow-[0_5px_18px_rgba(7,27,51,0.16)] transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(7,27,51,0.20)] focus:outline-none";
  el.style.borderColor = MAP_VISUAL_TOKENS.border;
  el.innerHTML = `
    <span style="display:grid;width:22px;height:22px;place-items:center;border-radius:999px;background:${MAP_VISUAL_TOKENS.accentSoft};color:${MAP_VISUAL_TOKENS.accent};font-size:10px;font-weight:800">${count}</span>
    <span style="padding-right:4px;font-size:12px;font-weight:800;color:${MAP_VISUAL_TOKENS.navy}">${city}</span>
  `;
  return el;
}

type NeighborhoodPanelProps = {
  point: NeighborhoodPoint | null;
  searchHref: string;
  neighborhoodHref: string | null;
  projectHref: string | null;
  priceMode: boolean;
  onDismiss: () => void;
};

function NeighborhoodPanel({
  point,
  searchHref,
  neighborhoodHref,
  projectHref,
  priceMode,
  onDismiss,
}: NeighborhoodPanelProps) {
  if (!point) return null;
  const exactBenchmark = getExactApartmentBuyBenchmark(point);
  const benchmarkLabel = exactBenchmark
    ? `~${formatDhPerM2(exactBenchmark.medianPricePerM2)}`
    : getBenchmarkLabel(point);
  const confidence = getMapConfidenceMeta(exactBenchmark?.confidence ?? point.confidence);

  return (
    <aside
      className="absolute inset-x-3 bottom-3 z-30 max-h-[48vh] overflow-y-auto rounded-2xl border border-border-strong/70 bg-card/95 p-4 text-card-foreground shadow-panel backdrop-blur-xl md:inset-x-auto md:bottom-auto md:right-4 md:top-[92px] md:w-[390px] md:max-h-[calc(100%-108px)]"
      aria-label={`Fiche repère quartier ${point.neighborhood}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-primary">
            <MapPin size={12} aria-hidden="true" />
            Repère quartier · {point.city}
          </div>
          <h2 className="mt-1.5 truncate text-[1.15rem] font-extrabold tracking-[-0.025em] text-foreground">
            {point.neighborhood}
          </h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:border-border-strong hover:bg-surface-muted hover:text-foreground"
          aria-label="Fermer le quartier sélectionné"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 rounded-2xl border border-brand-primary/20 bg-brand-primary-soft/65 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-primary">
            {priceMode ? "Prix observé exact" : "Repère prix"} · {exactBenchmark?.period ?? point.benchmark.period}
          </p>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9.5px] font-extrabold"
            style={{
              color: confidence.color,
              borderColor: `${confidence.color}40`,
              background: confidence.soft,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: confidence.color }} aria-hidden="true" />
            {confidence.label}
          </span>
        </div>
        {priceMode && !exactBenchmark ? (
          <>
            <p className="mt-2 text-[12px] font-extrabold text-foreground">Pas de benchmark appartement exact pour ce quartier.</p>
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
              Le fallback ville n’est pas présenté comme un prix de quartier.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-[1.15rem] font-extrabold tracking-[-0.02em] text-foreground">{benchmarkLabel}</p>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">
              Appartement · achat · indicatif · à confirmer
            </p>
            {priceMode && exactBenchmark ? (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[9.5px] font-bold text-text-secondary">
                <span className="rounded-full border border-border bg-surface px-2 py-1">Fourchette {formatPriceRange(exactBenchmark)}</span>
                <span className="rounded-full border border-border bg-surface px-2 py-1">n={exactBenchmark.sampleCount}</span>
              </div>
            ) : null}
          </>
        )}
      </div>

      {point.highlights.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            Vie autour du quartier · OSM indicatif
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {point.highlights.slice(0, 6).map((highlight, index) => (
              <span
                key={`${highlight.label}-${index}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[10.5px] font-semibold text-text-secondary"
              >
                <span aria-hidden="true">{highlight.icon}</span>
                {highlight.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-1">
        <Link
          href={searchHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-center text-[12.5px] font-extrabold text-white shadow-accent transition hover:bg-brand-primary-hover"
        >
          <Search size={14} aria-hidden="true" />
          Rechercher dans ce quartier
        </Link>
        {neighborhoodHref ? (
          <Link
            href={neighborhoodHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-center text-[12.5px] font-extrabold text-foreground transition hover:bg-surface-muted"
          >
            Voir la page quartier
          </Link>
        ) : (
          <div className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-center text-[10.5px] font-bold text-muted-foreground">
            Page quartier non publiée
          </div>
        )}
      </div>

      {projectHref ? (
        <div className="mt-3 text-center">
          <Link href={projectHref} className="text-[10.5px] font-extrabold text-brand-primary hover:underline">
            Revenir à Mon Projet sans perdre le contexte
          </Link>
        </div>
      ) : null}

      <div className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-[9.5px] leading-4 text-muted-foreground">
        <Info size={13} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true" />
        <p>{priceMode ? "Prix issus du dataset observé AkarFinder. Aucun prix n’est interpolé entre les repères." : "Repères indicatifs, sources visibles. Confirmez les informations sur la source originale avant toute décision."}</p>
      </div>
    </aside>
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
  const [styleRevision, setStyleRevision] = useState(0);
  const [mapZoom, setMapZoom] = useState(MOROCCO_OVERVIEW.zoom);
  const [territorialLayerActive, setTerritorialLayerActive] = useState(false);

  const cityEntity = useMemo(
    () => navigationState.city === "all" ? null : resolveCityEntity(navigationState.city),
    [navigationState.city],
  );
  const cityFilter = cityEntity?.canonical_name ?? "all";
  const cities = useMemo(() => getNeighborhoodCities(), []);
  const visiblePoints = useMemo(() => filterNeighborhoodsByCity(cityFilter), [cityFilter]);
  const exactPriceBenchmarks = useMemo(() => getExactApartmentBuyBenchmarks(visiblePoints), [visiblePoints]);
  const priceMode = navigationState.layer === MAP_LAYER_PRICE && cityFilter !== "all";
  const selectedPoint = useMemo(
    () => cityEntity && navigationState.district
      ? getNeighborhoodBySlug(cityEntity.slug, navigationState.district)
      : null,
    [cityEntity, navigationState.district],
  );
  const showClusters = mapZoom < CLUSTER_ZOOM_THRESHOLD && !selectedPoint && !priceMode;

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
  const neighborhoodHref = useMemo(() => buildNeighborhoodPageHref(navigationState), [navigationState]);
  const projectHref = useMemo(
    () => navigationState.project_id ? buildMapProjectHref(navigationState) : null,
    [navigationState],
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let mapInstance: MapLibreMap | null = null;
    let cancelled = false;
    let initialStyleReady = false;

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
      const markMapReady = () => {
        if (!mapInstance || initialStyleReady) return;
        initialStyleReady = true;
        hideInternalBoundaries(mapInstance);
        applyAkarFinderBasemapTreatment(mapInstance, initialTheme);
        setMapLoaded(true);
        setStyleRevision((revision) => revision + 1);
      };
      mapInstance.once("style.load", markMapReady);
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
      map.flyTo({ center: [selectedPoint.lng, selectedPoint.lat], zoom: 11.2, duration: 850 });
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
    setTerritorialLayerActive(false);
    map.setStyle(styleForTheme(theme));
    map.once("style.load", () => {
      hideInternalBoundaries(map);
      applyAkarFinderBasemapTreatment(map, theme);
      setStyleRevision((revision) => revision + 1);
    });
  }, [mapLoaded, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || styleRevision === 0) return;
    let cancelled = false;

    const install = async () => {
      if (cancelled || !mapRef.current) return;
      applyAkarFinderBasemapTreatment(map, theme);
      removeAkarFinderTerritorialLayers(map);
      setTerritorialLayerActive(false);

      if (cityEntity?.slug !== "casablanca") return;

      try {
        const response = await fetch(CASABLANCA_TERRITORIAL_ENDPOINT, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok || cancelled || !mapRef.current) return;
        const geojson = await response.json() as GeoJSON.FeatureCollection;
        if (cancelled || !mapRef.current) return;
        addAkarFinderTerritorialLayers(map, geojson, theme);
        setTerritorialLayerActive(
          Boolean(map.getLayer(AKARFINDER_TERRITORIAL_FILL_LAYER_ID) && map.getSource(AKARFINDER_TERRITORIAL_SOURCE_ID)),
        );
      } catch (error) {
        console.error("[AkarFinderMap:territorial-install]", error);
        if (!cancelled) setTerritorialLayerActive(false);
      }
    };

    void install();

    return () => {
      cancelled = true;
    };
  }, [cityEntity?.slug, mapLoaded, styleRevision, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !territorialLayerActive || !map.getLayer(AKARFINDER_TERRITORIAL_FILL_LAYER_ID)) return;
    map.setPaintProperty(
      AKARFINDER_TERRITORIAL_FILL_LAYER_ID,
      "fill-opacity",
      priceMode ? (theme === "dark" ? 0.14 : 0.18) : (theme === "dark" ? 0.38 : 0.52),
    );
  }, [priceMode, mapLoaded, territorialLayerActive, theme]);

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
        const el = createNeighborhoodMarkerEl(point, isSelected, priceMode);
        if (!el) continue;
        el.addEventListener("click", () => {
          onNavigationChange(withMapLocation(navigationState, point.city, point.neighborhood));
        });
        const marker = new Marker({
          element: el,
          anchor: priceMode ? (point.lng <= map.getCenter().lng ? "left" : "right") : "center",
        })
          .setLngLat([point.lng, point.lat])
          .addTo(mapRef.current!);
        markersRef.current.push(marker);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cityClusters, mapLoaded, navigationState, onNavigationChange, priceMode, selectedPoint, showClusters, visiblePoints]);

  const mapStatus = priceMode
    ? `${cityFilter} · ${exactPriceBenchmarks.length} repère${exactPriceBenchmarks.length !== 1 ? "s" : ""} prix exact${exactPriceBenchmarks.length !== 1 ? "s" : ""}`
    : selectedPoint
      ? `${selectedPoint.neighborhood} · ${selectedPoint.city}`
      : cityFilter === "all"
        ? `${visiblePoints.length} quartiers répertoriés`
        : `${cityFilter} · ${visiblePoints.length} quartier${visiblePoints.length !== 1 ? "s" : ""}`;

  return (
    <div className="relative min-w-0 overflow-hidden bg-background" style={{ height: "calc(100svh - 64px)" }}>
      <div ref={mapContainerRef} className="absolute inset-0 bg-[#eaf1f7] dark:bg-[#071426]" />

      <section
        className="absolute inset-x-3 top-3 z-20 rounded-2xl border border-border-strong/70 bg-card/95 p-2.5 text-card-foreground shadow-panel backdrop-blur-xl sm:inset-x-auto sm:left-4 sm:right-4 sm:top-4 sm:p-3 lg:right-auto lg:w-auto lg:max-w-[820px]"
        aria-label="Contrôles de la carte immobilière"
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden min-w-0 lg:block lg:w-[218px]">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand-primary">
              Carte immobilière AkarFinder
            </p>
            <h1 className="mt-0.5 truncate text-[13px] font-extrabold tracking-[-0.02em] text-foreground">
              Explorer les quartiers du Maroc
            </h1>
          </div>

          <label className="min-w-0 flex-1 sm:flex-none sm:w-[210px]">
            <span className="sr-only">Ville</span>
            <select
              value={cityFilter}
              onChange={(event) => onNavigationChange(withMapLocation(navigationState, event.target.value))}
              className="h-10 w-full rounded-xl border border-border-strong bg-surface px-3 text-[12px] font-extrabold text-foreground shadow-sm outline-none transition focus:border-brand-primary"
            >
              <option value="all">Tout le Maroc</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => onNavigationChange(withMapLayer(navigationState, priceMode ? MAP_LAYER_EXPLORE : MAP_LAYER_PRICE))}
            disabled={cityFilter === "all"}
            className={`inline-flex h-10 shrink-0 items-center justify-center rounded-xl border px-2.5 text-[10px] font-extrabold transition sm:px-3 ${priceMode ? "border-brand-primary bg-brand-primary text-white shadow-accent" : "border-border-strong bg-surface text-foreground hover:bg-surface-muted"} disabled:cursor-not-allowed disabled:opacity-40`}
            aria-pressed={priceMode}
            aria-label={priceMode ? "Afficher les territoires" : "Afficher les prix observés exacts"}
            title={cityFilter === "all" ? "Choisissez une ville avant d’afficher les prix" : priceMode ? "Revenir aux territoires" : "Prix observés"}
            data-akarfinder-price-toggle
          >
            <span className="sm:hidden">DH</span>
            <span className="hidden sm:inline">{priceMode ? "Territoires" : "Prix observés"}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigationChange(withMapLocation({ ...navigationState, layer: MAP_LAYER_EXPLORE }, "all"))}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:border-border-strong hover:bg-surface-muted hover:text-foreground"
            aria-label="Réinitialiser la carte"
            title="Réinitialiser"
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>

          <Link
            href={searchHref}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3 text-[11.5px] font-extrabold text-white shadow-accent transition hover:bg-brand-primary-hover sm:px-4"
          >
            <Search size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Rechercher cette zone</span>
            <span className="sm:hidden">Résultats</span>
          </Link>
        </div>

        <div className="mt-2 flex min-w-0 items-center justify-between gap-2 border-t border-border pt-2 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-brand-primary shadow-[0_0_0_3px_rgba(11,99,206,0.12)]" aria-hidden="true" />
            <p className="truncate text-[10.5px] font-extrabold text-foreground">{mapStatus}</p>
          </div>
          <span className="hidden shrink-0 text-[9px] font-semibold text-muted-foreground sm:inline">
            {priceMode ? "Prix observés exacts" : territorialLayerActive ? "Couche AkarFinder active" : "Repères indicatifs"}
          </span>
        </div>
      </section>

      {!mapLoaded ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#eef3f8]/82 backdrop-blur-[1px] dark:bg-[#06162d]/65">
          <div className="rounded-2xl border border-border-strong/70 bg-card/95 px-5 py-4 text-center text-card-foreground shadow-card backdrop-blur-xl">
            <div className="mx-auto mb-2.5 h-6 w-6 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" />
            <p className="text-[11px] font-extrabold text-foreground">Chargement de la carte…</p>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute left-4 top-[92px] z-10 hidden max-w-[300px] lg:block">
          <div className="rounded-xl border border-border-strong/60 bg-card/90 px-3 py-2 text-card-foreground shadow-card backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-brand-primary shadow-[0_0_0_3px_rgba(11,99,206,0.12)]" aria-hidden="true" />
              <p className="truncate text-[11px] font-extrabold text-foreground">{mapStatus}</p>
            </div>
            {!selectedPoint ? (
              <p className="mt-1 text-[9.5px] font-semibold text-muted-foreground">
                {priceMode
                  ? "Appartement · achat · benchmarks exacts uniquement"
                  : territorialLayerActive
                    ? "Couche territoriale AkarFinder · limites OSM certifiées en preview"
                    : showClusters ? "Choisissez une ville ou zoomez" : "Sélectionnez un quartier pour afficher son repère"}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {!selectedPoint ? (
        <div
          className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[310px] md:bottom-4 md:left-4"
          data-akarfinder-territorial-layer={territorialLayerActive ? "active" : "inactive"}
          data-akarfinder-intelligence-layer={priceMode ? "price" : "territory"}
        >
          <div className="rounded-xl border border-border-strong/60 bg-card/90 px-3 py-2 text-card-foreground shadow-card backdrop-blur-xl">
            <div className="flex items-start gap-2">
              <Info size={12} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true" />
              <p className="text-[9px] leading-4 text-muted-foreground">
                {priceMode
                  ? `Prix observés · appartement achat · ${exactPriceBenchmarks[0]?.period ?? "période indisponible"}. ${exactPriceBenchmarks.length} repère${exactPriceBenchmarks.length !== 1 ? "s" : ""} exact${exactPriceBenchmarks.length !== 1 ? "s" : ""}. Fourchette + échantillon visibles. Aucune interpolation sur les zones.`
                  : territorialLayerActive
                    ? "Couleurs AkarFinder = repérage territorial, pas un score de prix. Limites : © OpenStreetMap contributors · preview canary."
                    : "Repères indicatifs pour préparer la recherche. Aucune limite de quartier n’est inventée."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <NeighborhoodPanel
        point={selectedPoint}
        searchHref={searchHref}
        neighborhoodHref={neighborhoodHref}
        projectHref={projectHref}
        priceMode={priceMode}
        onDismiss={() => onNavigationChange(withMapLocation(navigationState, cityFilter))}
      />
    </div>
  );
}
