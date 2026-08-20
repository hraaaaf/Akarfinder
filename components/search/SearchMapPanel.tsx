"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { MapAtlasLayerSwitcher } from "@/components/search/MapAtlasLayerSwitcher";
import { SearchMapNeighborhoodDock } from "@/components/search/SearchMapNeighborhoodDock";
import { usePropertySelection } from "@/components/search/PropertySelectionProvider";
import { applyAkarFinderBasemapTreatment } from "@/lib/map/akarfinder-territorial-style";
import {
  formatShortPrice,
  getCityFlyTarget,
  MOROCCO_OVERVIEW,
} from "@/lib/map/listing-map";
import { formatPrice } from "@/lib/listings/utils";
import {
  buildCertifiedPropertyMapPoints,
  hasCertifiedExactCoordinates,
} from "@/lib/ux/certified-property-map";
import { getCanonicalPropertyId } from "@/lib/ux/property-selection";
import {
  DEFAULT_MAP_ATLAS_AVAILABILITY,
  MAP_ATLAS_LAYERS,
  resolveMapAtlasLayer,
  type MapAtlasAvailability,
  type MapAtlasLayer,
} from "@/lib/ux/map-atlas";

export type CityCount = { city: string; count: number };

type SearchMapPanelProps = {
  cityCounts: CityCount[];
  otherCount: number;
  activeCity: string;
  onSelectCity: (city: string) => void;
  stats: { total: number; citiesCovered: number; avgIndex: number | null; updatedLabel: string };
  atlasAvailability?: MapAtlasAvailability;
  className?: string;
};

const LIGHT_TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";

function mapCityTarget(city: string) {
  return getCityFlyTarget(city === "Fès" ? "Fes" : city);
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

function createCityAggregateMarker(city: string, count: number, active: boolean): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.dataset.searchCityAggregateMarker = "true";
  el.setAttribute("aria-label", `Filtrer les ${count} résultats affichés à ${city}`);
  el.setAttribute("aria-pressed", active ? "true" : "false");
  el.style.cssText = [
    "display:flex",
    "align-items:center",
    "gap:6px",
    "min-height:34px",
    "padding:5px 9px 5px 6px",
    "border-radius:999px",
    `border:1px solid ${active ? "#0B63CE" : "#d9e4ef"}`,
    `background:${active ? "#0B63CE" : "rgba(255,255,255,0.96)"}`,
    `color:${active ? "#ffffff" : "#071B33"}`,
    "box-shadow:0 7px 20px rgba(15,35,65,0.18)",
    "font:800 11px/1.1 var(--font-jakarta),system-ui,sans-serif",
    "cursor:pointer",
  ].join(";");
  el.innerHTML = `
    <span aria-hidden="true" style="display:grid;width:23px;height:23px;place-items:center;border-radius:999px;background:${active ? "rgba(255,255,255,.18)" : "#EAF3FF"};color:${active ? "#fff" : "#0B63CE"};font-size:9px;font-weight:900">${count}</span>
    <span>${city}</span>
  `;
  return el;
}

function createExactPropertyMarker(label: string, active: boolean): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.dataset.searchExactPropertyMarker = "true";
  el.style.cssText = [
    "display:grid",
    "min-height:30px",
    "place-items:center",
    "padding:5px 8px",
    "border-radius:10px",
    `border:2px solid ${active ? "#0B63CE" : "#ffffff"}`,
    `background:${active ? "#0B63CE" : "#0f766e"}`,
    "color:#ffffff",
    `box-shadow:${active ? "0 0 0 3px rgba(11,99,206,.18),0 8px 20px rgba(15,35,65,.24)" : "0 6px 18px rgba(15,35,65,.20)"}`,
    "font:900 10px/1 var(--font-jakarta),system-ui,sans-serif",
    "white-space:nowrap",
    "cursor:pointer",
  ].join(";");
  el.textContent = label;
  return el;
}

export function SearchMapPanel({
  cityCounts,
  otherCount,
  activeCity,
  onSelectCity,
  stats,
  atlasAvailability = DEFAULT_MAP_ATLAS_AVAILABILITY,
  className = "",
}: SearchMapPanelProps) {
  const [requestedLayer, setRequestedLayer] = useState<MapAtlasLayer>("listings");
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const cityMarkersRef = useRef<Marker[]>([]);
  const propertyMarkersRef = useRef<Marker[]>([]);
  const {
    activeListing,
    selection,
    visibleListings,
    hoverListing,
    clearHover,
    selectListing,
    clearSelection,
  } = usePropertySelection();

  const activeLayer = resolveMapAtlasLayer(requestedLayer, atlasAvailability);
  const activeLayerDefinition = MAP_ATLAS_LAYERS.find((layer) => layer.id === activeLayer);
  const exactPropertyPoints = useMemo(
    () => buildCertifiedPropertyMapPoints(visibleListings),
    [visibleListings],
  );
  const displayCity = activeCity === "all" ? "Maroc" : activeCity;
  const activeHasCertifiedExactCoordinates = activeListing
    ? hasCertifiedExactCoordinates(activeListing)
    : false;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let cancelled = false;
    let mapInstance: MapLibreMap | null = null;
    let resizeObserver: ResizeObserver | null = null;

    void import("maplibre-gl").then(({ Map: MapClass, NavigationControl, setRTLTextPlugin }) => {
      if (cancelled || !mapContainerRef.current) return;

      void setRTLTextPlugin("/mapbox-gl-rtl-text.min.js", true).catch(() => {});
      const target = activeCity === "all" ? MOROCCO_OVERVIEW : mapCityTarget(activeCity);

      mapInstance = new MapClass({
        container: mapContainerRef.current,
        style: LIGHT_TILE_STYLE,
        center: [target.lng, target.lat],
        zoom: target.zoom,
        minZoom: 4.6,
        maxZoom: 17,
        maxBounds: [[-17.8, 20.5], [1.6, 37.5]],
      });
      mapRef.current = mapInstance;
      mapInstance.addControl(new NavigationControl({ showCompass: false }), "top-right");

      mapInstance.once("style.load", () => {
        if (!mapInstance || cancelled) return;
        hideInternalBoundaries(mapInstance);
        applyAkarFinderBasemapTreatment(mapInstance, "light");
        setMapLoaded(true);
      });

      resizeObserver = new ResizeObserver(() => mapInstance?.resize());
      resizeObserver.observe(mapContainerRef.current);
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      for (const marker of cityMarkersRef.current) marker.remove();
      for (const marker of propertyMarkersRef.current) marker.remove();
      cityMarkersRef.current = [];
      propertyMarkersRef.current = [];
      mapRef.current = null;
      mapInstance?.remove();
    };
    // Initialization is intentionally one-shot. activeCity is handled by flyTo below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const target = activeCity === "all" ? MOROCCO_OVERVIEW : mapCityTarget(activeCity);
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: target.zoom,
      duration: 450,
      essential: false,
    });
  }, [activeCity, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    let cancelled = false;

    void import("maplibre-gl").then(({ Marker: MarkerClass }) => {
      if (cancelled || !mapRef.current) return;
      for (const marker of cityMarkersRef.current) marker.remove();
      cityMarkersRef.current = [];

      if (activeCity !== "all") return;

      for (const item of cityCounts) {
        const target = mapCityTarget(item.city);
        if (target === MOROCCO_OVERVIEW) continue;
        const element = createCityAggregateMarker(item.city, item.count, false);
        element.addEventListener("click", () => onSelectCity(item.city));
        const marker = new MarkerClass({ element, anchor: "bottom" })
          .setLngLat([target.lng, target.lat])
          .addTo(mapRef.current!);
        cityMarkersRef.current.push(marker);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeCity, cityCounts, mapLoaded, onSelectCity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    let cancelled = false;

    void import("maplibre-gl").then(({ Marker: MarkerClass }) => {
      if (cancelled || !mapRef.current) return;
      for (const marker of propertyMarkersRef.current) marker.remove();
      propertyMarkersRef.current = [];

      for (const point of exactPropertyPoints) {
        const listing = point.listing;
        if (!hasCertifiedExactCoordinates(listing)) continue;
        const canonicalPropertyId = getCanonicalPropertyId(listing);
        const active = selection.canonicalPropertyId === canonicalPropertyId;
        const label = listing.price == null ? "Bien" : formatShortPrice(listing.price);
        const element = createExactPropertyMarker(label, active);
        element.setAttribute("aria-label", `Sélectionner ${listing.title}, position exacte`);
        element.setAttribute(
          "aria-pressed",
          active && selection.interaction === "selected" ? "true" : "false",
        );
        element.addEventListener("mouseenter", () => hoverListing(listing, "map"));
        element.addEventListener("mouseleave", () => clearHover());
        element.addEventListener("focus", () => hoverListing(listing, "map"));
        element.addEventListener("blur", () => clearHover());
        element.addEventListener("click", () => selectListing(listing, "map"));

        const marker = new MarkerClass({ element, anchor: "bottom" })
          .setLngLat([listing.longitude!, listing.latitude!])
          .addTo(mapRef.current!);
        propertyMarkersRef.current.push(marker);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    clearHover,
    exactPropertyPoints,
    hoverListing,
    mapLoaded,
    selectListing,
    selection.canonicalPropertyId,
    selection.interaction,
  ]);

  return (
    <aside className={`overflow-hidden rounded-2xl border border-[#e4e9f2] bg-white shadow-[0_18px_50px_rgba(15,35,65,0.08)] ${className}`}>
      <div className="border-b border-[#eef2f8] bg-[#f8fafc] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">Zones des résultats</p>
            <h2 className="mt-1 text-[1.3rem] font-extrabold tracking-[-0.03em] text-[#071B33]">{displayCity}</h2>
            <p className="mt-0.5 text-[12.5px] font-semibold text-slate-500">
              {stats.total} résultat{stats.total !== 1 ? "s" : ""} · {stats.citiesCovered} ville{stats.citiesCovered !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="rounded-full border border-[#dbe7f3] bg-white px-3 py-1.5 text-[10.5px] font-bold text-[#315b87]">Carte interactive</span>
            {exactPropertyPoints.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9.5px] font-extrabold text-emerald-700">
                <LocateFixed size={10} aria-hidden="true" /> {exactPropertyPoints.length} position{exactPropertyPoints.length > 1 ? "s" : ""} exacte{exactPropertyPoints.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-3">
          <MapAtlasLayerSwitcher value={activeLayer} availability={atlasAvailability} onChange={setRequestedLayer} />
          <p className="mt-2 text-[10.5px] leading-4 text-slate-500">{activeLayerDefinition?.description}</p>
        </div>
      </div>

      <div
        className="relative min-h-[480px] overflow-hidden bg-[#edf3f7] lg:min-h-[640px]"
        data-search-map-renderer="maplibre"
      >
        <div ref={mapContainerRef} className="absolute inset-0" aria-label={`Carte interactive des résultats à ${displayCity}`} />

        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[245px] rounded-xl border border-white/80 bg-white/92 px-3 py-2 shadow-sm backdrop-blur sm:left-4 sm:top-4">
          <p className="text-[10px] font-extrabold text-[#17324f]">Fond cartographique réel</p>
          <p className="mt-0.5 text-[9.5px] leading-4 text-slate-600">
            Seuls les biens dotés de coordonnées exactes certifiées reçoivent un pin individuel.
          </p>
          {otherCount > 0 ? (
            <p className="mt-1 text-[9px] font-semibold text-slate-500">
              {otherCount} résultat{otherCount > 1 ? "s" : ""} sans repère ville exploitable.
            </p>
          ) : null}
        </div>

        {activeListing ? (
          <div className="absolute bottom-14 left-3 right-3 z-30 rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-[0_18px_40px_rgba(15,35,65,0.18)] backdrop-blur sm:left-4 sm:right-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-600">
                  {activeHasCertifiedExactCoordinates ? <LocateFixed size={12} aria-hidden="true" /> : <MapPin size={12} aria-hidden="true" />}
                  {selection.interaction === "selected" ? "Bien sélectionné" : "Bien survolé"}
                </p>
                <p className="mt-1 line-clamp-1 text-[13px] font-extrabold text-[#071B33]">{activeListing.title}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  {activeListing.neighborhood ? `${activeListing.city}, ${activeListing.neighborhood}` : activeListing.city} · {formatPrice(activeListing.price, activeListing.currency)}
                </p>
              </div>
              {selection.interaction === "selected" ? (
                <button type="button" onClick={clearSelection} aria-label="Retirer le bien sélectionné" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">
                  <X size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-500">
              {activeHasCertifiedExactCoordinates
                ? "Position exacte certifiée pour ce bien."
                : "AkarFinder ne place pas ce bien précisément sans coordonnées exactes certifiées."}
            </p>
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 rounded-xl border border-white/80 bg-white/92 px-4 py-2.5 shadow-sm backdrop-blur sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-2xl">
          <p className="text-[10.5px] leading-4 text-slate-600">
            Zoomez et déplacez la carte · les pins individuels représentent uniquement des positions exactes certifiées.
          </p>
        </div>
      </div>

      <SearchMapNeighborhoodDock />
    </aside>
  );
}