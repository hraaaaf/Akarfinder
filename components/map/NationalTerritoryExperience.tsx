"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { useTheme } from "@/components/theme/ThemeProvider";
import { applyAkarFinderBasemapTreatment } from "@/lib/map/akarfinder-territorial-style";

const LIGHT_TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_TILE_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const ACCENT = "#0B63CE";
const MOROCCO_CENTER: [number, number] = [-6.35, 31.6];
const MOROCCO_ZOOM = 4.75;

const BOUNDARY_SOURCE = "akarfinder-national-city-boundaries";
const CITY_SOURCE = "akarfinder-national-city-points";
const BOUNDARY_FILL = "akarfinder-national-city-fill";
const BOUNDARY_LINE = "akarfinder-national-city-line";
const ACTIVE_FILL = "akarfinder-national-city-active-fill";
const ACTIVE_LINE = "akarfinder-national-city-active-line";
const CITY_HITS = "akarfinder-national-city-hits";
const CITY_LABELS = "akarfinder-national-city-labels";
const ACTIVE_POINT = "akarfinder-national-city-active-point";

type NationalCity = {
  slug: string;
  name: string;
  center: { lng: number; lat: number } | null;
  boundaryRelationId: number | null;
  confidence: "official_hcp" | "osm_open_map";
  population: number | null;
  neighborhoodCount: number;
};

type MoroccoPayload = {
  status: "ok";
  view: "morocco";
  places: NationalCity[];
  boundaries: GeoJSON.FeatureCollection;
  meta: { cityCount: number; boundaryCount: number; neighborhoodCount: number };
};

type CityPayload = {
  status: "ok";
  view: "city";
  place: NationalCity;
  boundary: GeoJSON.FeatureCollection;
  meta: { neighborhoodCount: number };
};

type Payload = MoroccoPayload | CityPayload;

type Props = {
  selectedCitySlug: string | null;
  onSelectCity: (slug: string) => void;
  onBackToMorocco: () => void;
};

function styleForTheme(theme: string | undefined) {
  return theme === "dark" ? DARK_TILE_STYLE : LIGHT_TILE_STYLE;
}

function emptyFilter(): unknown[] {
  return ["==", ["get", "slug"], "__none__"];
}

function boundsForGeoJSON(collection: GeoJSON.FeatureCollection): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  const walk = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      minLng = Math.min(minLng, value[0]);
      maxLng = Math.max(maxLng, value[0]);
      minLat = Math.min(minLat, value[1]);
      maxLat = Math.max(maxLat, value[1]);
      return;
    }
    for (const item of value) walk(item);
  };
  for (const feature of collection.features) {
    const geometry = feature.geometry as (GeoJSON.Geometry & { coordinates?: unknown }) | null;
    walk(geometry?.coordinates);
  }
  return Number.isFinite(minLng) ? [[minLng, minLat], [maxLng, maxLat]] : null;
}

function cityPoints(places: NationalCity[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: places.flatMap((place) => place.center ? [{
      type: "Feature" as const,
      id: place.slug,
      properties: {
        slug: place.slug,
        name: place.name,
        population: place.population ?? 0,
        neighborhoodCount: place.neighborhoodCount,
        hasBoundary: Boolean(place.boundaryRelationId),
      },
      geometry: { type: "Point" as const, coordinates: [place.center.lng, place.center.lat] },
    }] : []),
  };
}

function removeNationalLayers(map: MapLibreMap) {
  for (const id of [ACTIVE_POINT, CITY_LABELS, CITY_HITS, ACTIVE_LINE, ACTIVE_FILL, BOUNDARY_LINE, BOUNDARY_FILL]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of [CITY_SOURCE, BOUNDARY_SOURCE]) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

export function NationalTerritoryExperience({ selectedCitySlug, onSelectCity, onBackToMorocco }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const previewSlugRef = useRef<string | null>(null);
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);
    const query = selectedCitySlug ? `?city=${encodeURIComponent(selectedCitySlug)}` : "";
    void fetch(`/api/geo/national-territories${query}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`territory ${response.status}`);
        return response.json() as Promise<Payload>;
      })
      .then(setPayload)
      .catch((error) => {
        if (error?.name !== "AbortError") setLoadError(true);
      });
    return () => controller.abort();
  }, [selectedCitySlug]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;
    let instance: MapLibreMap | null = null;
    void import("maplibre-gl").then(({ Map: MapClass, NavigationControl }) => {
      if (cancelled || !mapContainerRef.current) return;
      instance = new MapClass({
        container: mapContainerRef.current,
        style: styleForTheme(document.documentElement.dataset.theme),
        center: MOROCCO_CENTER,
        zoom: MOROCCO_ZOOM,
        minZoom: 4.4,
        maxZoom: 15,
        maxBounds: [[-14.5, 20.5], [2.5, 37.5]],
        attributionControl: { customAttribution: "© OpenStreetMap contributors" },
      });
      instance.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
      instance.once("style.load", () => {
        if (!instance || cancelled) return;
        applyAkarFinderBasemapTreatment(instance, document.documentElement.dataset.theme);
        setMapReady(true);
        (window as unknown as { __AKARFINDER_NATIONAL_MAP__?: MapLibreMap }).__AKARFINDER_NATIONAL_MAP__ = instance;
      });
      mapRef.current = instance;
    });
    return () => {
      cancelled = true;
      if ((window as unknown as { __AKARFINDER_NATIONAL_MAP__?: MapLibreMap }).__AKARFINDER_NATIONAL_MAP__ === instance) {
        delete (window as unknown as { __AKARFINDER_NATIONAL_MAP__?: MapLibreMap }).__AKARFINDER_NATIONAL_MAP__;
      }
      instance?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    setMapReady(false);
    map.setStyle(styleForTheme(theme));
    map.once("style.load", () => {
      applyAkarFinderBasemapTreatment(map, theme);
      setMapReady(true);
    });
  }, [theme]);

  useEffect(() => { previewSlugRef.current = previewSlug; }, [previewSlug]);

  const enterCity = useCallback((slug: string) => {
    previewSlugRef.current = null;
    setPreviewSlug(null);
    onSelectCity(slug);
  }, [onSelectCity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !payload) return;
    removeNationalLayers(map);

    const boundaries = payload.view === "morocco" ? payload.boundaries : payload.boundary;
    const places = payload.view === "morocco" ? payload.places : [payload.place];
    const points = cityPoints(places);

    map.addSource(BOUNDARY_SOURCE, { type: "geojson", data: boundaries });
    map.addSource(CITY_SOURCE, { type: "geojson", data: points });

    map.addLayer({
      id: BOUNDARY_FILL,
      type: "fill",
      source: BOUNDARY_SOURCE,
      paint: { "fill-color": ACCENT, "fill-opacity": payload.view === "city" ? 0.13 : 0.018 },
    });
    map.addLayer({
      id: BOUNDARY_LINE,
      type: "line",
      source: BOUNDARY_SOURCE,
      paint: { "line-color": ACCENT, "line-opacity": payload.view === "city" ? 0.9 : 0.22, "line-width": payload.view === "city" ? 2.4 : 0.7 },
    });
    map.addLayer({
      id: ACTIVE_FILL,
      type: "fill",
      source: BOUNDARY_SOURCE,
      filter: emptyFilter() as never,
      paint: { "fill-color": ACCENT, "fill-opacity": 0.2 },
    });
    map.addLayer({
      id: ACTIVE_LINE,
      type: "line",
      source: BOUNDARY_SOURCE,
      filter: emptyFilter() as never,
      paint: { "line-color": ACCENT, "line-opacity": 1, "line-width": 2.8 },
    });
    map.addLayer({
      id: CITY_HITS,
      type: "circle",
      source: CITY_SOURCE,
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4.5, 11, 7, 16], "circle-color": ACCENT, "circle-opacity": 0.01 },
    });
    map.addLayer({
      id: ACTIVE_POINT,
      type: "circle",
      source: CITY_SOURCE,
      filter: emptyFilter() as never,
      paint: { "circle-radius": 8, "circle-color": ACCENT, "circle-opacity": 0.2, "circle-stroke-color": ACCENT, "circle-stroke-width": 2 },
    });
    map.addLayer({
      id: CITY_LABELS,
      type: "symbol",
      source: CITY_SOURCE,
      layout: {
        "text-field": ["get", "name"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 4.5, 9.5, 7, 12.5, 10, 14],
        "text-offset": [0, 1.05],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "symbol-sort-key": ["-", 0, ["coalesce", ["get", "population"], 0]],
      },
      paint: { "text-color": theme === "dark" ? "#E8F2FF" : "#123250", "text-halo-color": theme === "dark" ? "#071426" : "#FFFFFF", "text-halo-width": 1.7 },
    });

    const setActive = (slug: string | null) => {
      const filter = slug ? ["==", ["get", "slug"], slug] : emptyFilter();
      if (map.getLayer(ACTIVE_FILL)) map.setFilter(ACTIVE_FILL, filter as never);
      if (map.getLayer(ACTIVE_LINE)) map.setFilter(ACTIVE_LINE, filter as never);
      if (map.getLayer(ACTIVE_POINT)) map.setFilter(ACTIVE_POINT, filter as never);
    };

    const interactiveLayers = [CITY_HITS, BOUNDARY_FILL];
    const renderedSlug = (event: MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: interactiveLayers })[0];
      const slug = feature?.properties?.slug;
      return typeof slug === "string" ? slug : null;
    };

    const handleMove = (event: MapMouseEvent) => {
      if (payload.view !== "morocco") return;
      const slug = renderedSlug(event);
      setHoverSlug(slug);
      setActive(slug ?? previewSlugRef.current);
      map.getCanvas().style.cursor = slug ? "pointer" : "";
    };
    const handleClick = (event: MapMouseEvent) => {
      if (payload.view !== "morocco") return;
      const slug = renderedSlug(event);
      if (!slug) return;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      if (coarse && previewSlugRef.current !== slug) {
        previewSlugRef.current = slug;
        setPreviewSlug(slug);
        setActive(slug);
        return;
      }
      enterCity(slug);
    };
    const handleMapLeave = () => {
      if (payload.view !== "morocco") return;
      setHoverSlug(null);
      setActive(previewSlugRef.current);
      map.getCanvas().style.cursor = "";
    };

    map.on("mousemove", handleMove);
    map.on("click", handleClick);
    map.getCanvas().addEventListener("mouseleave", handleMapLeave);

    if (payload.view === "morocco") {
      map.easeTo({ center: MOROCCO_CENTER, zoom: MOROCCO_ZOOM, duration: 650 });
    } else {
      setActive(payload.place.slug);
      const bounds = boundsForGeoJSON(payload.boundary);
      if (bounds) {
        map.fitBounds(bounds, { padding: { top: 125, right: 40, bottom: 135, left: 40 }, duration: 750, maxZoom: 10.5 });
      } else if (payload.place.center) {
        map.flyTo({ center: [payload.place.center.lng, payload.place.center.lat], zoom: 10, duration: 750 });
      }
    }

    return () => {
      map.off("mousemove", handleMove);
      map.off("click", handleClick);
      map.getCanvas().removeEventListener("mouseleave", handleMapLeave);
    };
  }, [enterCity, mapReady, payload, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !payload || payload.view !== "morocco") return;
    const active = previewSlug ?? hoverSlug;
    const filter = active ? ["==", ["get", "slug"], active] : emptyFilter();
    for (const layer of [ACTIVE_FILL, ACTIVE_LINE, ACTIVE_POINT]) {
      if (map.getLayer(layer)) map.setFilter(layer, filter as never);
    }
  }, [hoverSlug, mapReady, payload, previewSlug]);

  const previewPlace = useMemo(() => {
    if (!payload || payload.view !== "morocco") return null;
    const slug = previewSlug ?? hoverSlug;
    return slug ? payload.places.find((place) => place.slug === slug) ?? null : null;
  }, [hoverSlug, payload, previewSlug]);

  const searchHref = payload?.view === "city" ? `/search?city=${encodeURIComponent(payload.place.name)}` : "/search";

  return (
    <div className="relative h-[calc(100svh-64px)] min-h-[520px] overflow-hidden bg-[#EDF3F7] dark:bg-[#071426]" data-akarfinder-national-map data-akarfinder-national-view={payload?.view ?? "loading"}>
      <div ref={mapContainerRef} className="absolute inset-0" />

      <section className="absolute inset-x-3 top-3 z-20 rounded-[22px] border border-white/80 bg-white/[0.94] p-3 shadow-[0_18px_50px_rgba(15,35,66,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0A1A2F]/[0.94] sm:left-4 sm:right-auto sm:top-4 sm:w-[min(430px,calc(100vw-32px))]" aria-label="Navigation territoriale nationale">
        <div className="flex items-start gap-3">
          {payload?.view === "city" ? (
            <button type="button" onClick={onBackToMorocco} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-brand-primary" aria-label="Revenir à la carte du Maroc">
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-brand-primary">Carte territoriale AkarFinder</p>
            <h1 className="mt-0.5 truncate text-[16px] font-extrabold tracking-[-0.025em] text-foreground">
              {payload?.view === "city" ? payload.place.name : "Explorer le Maroc par ville"}
            </h1>
            <p className="mt-1 text-[10.5px] font-semibold leading-4 text-muted-foreground">
              {payload?.view === "city"
                ? `${payload.place.neighborhoodCount.toLocaleString("fr-FR")} quartiers / labels répertoriés · contours OSM candidats`
                : payload?.view === "morocco"
                  ? `${payload.meta.cityCount} villes / localités cartographiées · ${payload.meta.boundaryCount} contours qualifiés`
                  : "Chargement du registre territorial…"}
            </p>
          </div>
        </div>
        {payload?.view === "city" ? (
          <Link href={searchHref} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-[11.5px] font-extrabold text-white shadow-accent">
            <Search size={14} aria-hidden="true" />
            Rechercher à {payload.place.name}
          </Link>
        ) : (
          <p className="mt-2 rounded-xl bg-brand-primary-soft px-3 py-2 text-[10px] font-bold leading-4 text-brand-primary">
            Desktop : survolez puis cliquez. Mobile : premier tap pour révéler, second tap pour entrer.
          </p>
        )}
      </section>

      {previewPlace && payload?.view === "morocco" ? (
        <aside className="absolute inset-x-3 bottom-[84px] z-20 rounded-[22px] border border-white/[0.85] bg-white/[0.96] p-3.5 shadow-[0_18px_48px_rgba(15,35,66,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0A1A2F]/[0.96] sm:inset-x-auto sm:bottom-5 sm:left-4 sm:w-[330px]" aria-label={`Ville sélectionnée ${previewPlace.name}`} data-akarfinder-city-preview={previewPlace.slug}>
          <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand-primary"><MapPin size={11} aria-hidden="true" />Ville sélectionnée</p>
          <h2 className="mt-1 text-[20px] font-extrabold tracking-[-0.03em] text-foreground">{previewPlace.name}</h2>
          <p className="mt-1 text-[10.5px] font-semibold text-muted-foreground">{previewPlace.neighborhoodCount.toLocaleString("fr-FR")} quartiers / labels répertoriés{previewPlace.boundaryRelationId ? " · contour disponible" : " · repère ponctuel"}</p>
          <button type="button" onClick={() => enterCity(previewPlace.slug)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-primary px-4 text-[11.5px] font-extrabold text-white shadow-accent">
            Explorer {previewPlace.name}
          </button>
        </aside>
      ) : null}

      {loadError ? (
        <div className="absolute inset-x-4 top-1/2 z-30 -translate-y-1/2 rounded-2xl border border-rose-200 bg-white/[0.96] p-4 text-center shadow-panel">
          <p className="text-[12px] font-extrabold text-foreground">Le registre territorial national est indisponible.</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Aucune frontière de secours n’est inventée.</p>
        </div>
      ) : null}

      {!payload && !loadError ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[#EDF3F7]/50 dark:bg-[#071426]/50">
          <div className="rounded-2xl border border-border bg-card/95 px-5 py-4 text-center shadow-card"><div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" /><p className="text-[11px] font-extrabold">Chargement de la carte nationale…</p></div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/[0.70] bg-white/[0.85] px-3 py-1 text-[8.5px] font-semibold text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#0A1A2F]/[0.85] dark:text-slate-300">
        Contours : OpenStreetMap · ODbL · repérage AkarFinder, pas frontières officielles
      </div>
    </div>
  );
}
