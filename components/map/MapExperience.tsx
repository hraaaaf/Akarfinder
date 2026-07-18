"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import Image from "next/image";
import Link from "next/link";
import type {
  Listing,
  ListingPropertyType,
  ListingTransactionType,
} from "@/lib/listings/types";
import {
  defaultMapFilters,
  filterMapListings,
  formatShortPrice,
  getCitiesWithGeo,
  getMapSearchHref,
  getCityFlyTarget,
  MOROCCO_OVERVIEW,
  type MapFilters,
} from "@/lib/map/listing-map";
import { getMarketReference } from "@/lib/market/get-market-reference";
import { CITIES } from "@/lib/cities";
import { MapBottomSheet } from "./MapBottomSheet";
import { MapSidePanel } from "./MapSidePanel";
import { useTheme } from "@/components/theme/ThemeProvider";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CLUSTER_ZOOM_THRESHOLD = 8;
// Theme-aware basemap styles (both free, no API key).
const LIGHT_TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_TILE_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function styleForTheme(theme: string | undefined) {
  return theme === "dark" ? DARK_TILE_STYLE : LIGHT_TILE_STYLE;
}

/** Hide internal Moroccan administrative boundaries (region lines). */
function hideInternalBoundaries(map: MapLibreMap) {
  const internalBoundaryLayers = [
    "boundary_3", "boundary_4", "boundary_3_z3z4", "boundary_4_z5",
    "admin_level_3", "admin_level_4",
  ];
  for (const layerId of internalBoundaryLayers) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", "none");
    }
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type MapExperienceProps = {
  listings: Listing[];
  initialFilters?: Partial<MapFilters>;
  totalAnalyzed?: number;
  positionedCount?: number;
};

type CityCluster = {
  city: string;
  count: number;
  lat: number;
  lng: number;
  averagePrice: number | null;
};

const transactionOptions: Array<{
  value: MapFilters["transactionType"];
  label: string;
}> = [
  { value: "all", label: "Tous" },
  { value: "buy", label: "Acheter" },
  { value: "rent", label: "Louer" },
  { value: "new", label: "Neuf" },
];

function getPropertyTypes(listings: Listing[]): ListingPropertyType[] {
  return Array.from(
    new Set(listings.map((l) => l.property_type))
  ).sort() as ListingPropertyType[];
}

function getCityClusters(listings: Listing[]): CityCluster[] {
  const { CITY_CENTROIDS } = require("@/lib/geo/morocco-centroids") as {
    CITY_CENTROIDS: Record<string, { lat: number; lng: number }>;
  };

  const byCity = new Map<string, Listing[]>();
  for (const listing of listings) {
    if (listing.latitude == null || listing.longitude == null) continue;
    byCity.set(listing.city, [...(byCity.get(listing.city) ?? []), listing]);
  }

  const clusters: CityCluster[] = [];
  for (const [city, cityListings] of byCity.entries()) {
    const key = city.toLowerCase().trim();
    const centroid = CITY_CENTROIDS[key];
    if (!centroid) continue;

    // Undisclosed prices are excluded from the average, never treated as 0.
    const pricedCityListings = cityListings.filter((l): l is typeof l & { price: number } => l.price != null);
    const averagePrice = pricedCityListings.length === 0
      ? null
      : Math.round(pricedCityListings.reduce((sum, l) => sum + l.price, 0) / pricedCityListings.length);
    clusters.push({
      city,
      count: cityListings.length,
      lat: centroid.lat,
      lng: centroid.lng,
      averagePrice,
    });
  }
  return clusters.sort((a, b) => b.count - a.count);
}

// ─── MarkerFactory ──────────────────────────────────────────────────────────────
// Creates DOM elements for price markers and cluster markers
// (outside React so they can be passed to MapLibre Marker)

function createPriceMarkerEl(
  priceLabel: string,
  pricePerM2: number | null,
  position: "coherent" | "high" | "low" | null,
  isSelected: boolean,
  isApprox: boolean
): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";

  const borderColor = isSelected
    ? "#C2A368"
    : position === "high"
    ? "#fca5a5"
    : position === "low"
    ? "#93c5fd"
    : "rgba(255,255,255,0.85)";

  const bgColor = isSelected ? "#9B7838" : "#ffffff";
  const priceColor = isSelected ? "#ffffff" : "#071B33";
  const subColor = isSelected ? "rgba(255,255,255,0.72)" : "#6b7280";

  el.className = [
    "maplibre-price-marker cursor-pointer whitespace-nowrap",
    "rounded-xl px-2.5 py-1.5",
    "shadow-[0_4px_12px_rgba(0,0,0,0.25)]",
    "transition-transform duration-100 hover:scale-105 focus:outline-none",
    isSelected ? "scale-110 z-20" : "z-10",
  ].join(" ");

  el.style.cssText = `background:${bgColor};border:1.5px solid ${borderColor};${isSelected ? "box-shadow:0 0 0 2px #C2A368,0 4px 12px rgba(0,0,0,0.3);" : ""}`;

  el.innerHTML = `
    <span style="display:block;font-size:12px;font-weight:800;line-height:1;color:${priceColor}">${priceLabel}</span>
    ${pricePerM2 != null ? `<span style="display:block;font-size:10px;font-weight:600;line-height:1;margin-top:3px;color:${subColor}">${pricePerM2.toLocaleString("fr-FR")} DH/m²</span>` : ""}
  `;

  if (isApprox) {
    el.title = "Position approximative — niveau ville/quartier";
  }
  return el;
}

function createClusterMarkerEl(
  city: string,
  count: number,
  avgPrice: number | null
): HTMLAnchorElement {
  const el = document.createElement("a");
  el.href = `/search?city=${encodeURIComponent(city)}`;
  el.setAttribute("aria-label", `Explorer les annonces à ${city} (${count} bien${count > 1 ? "s" : ""})`);
  el.className =
    "maplibre-cluster-marker cursor-pointer rounded-2xl bg-white border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.22)] px-3 py-2 text-left min-w-[90px] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-bronze-500";
  el.innerHTML = `
    <span class="block text-[12px] font-extrabold text-[#071B33]">${city}</span>
    <span class="block text-[11px] font-bold text-[#9B7838]">${count} bien${count > 1 ? "s" : ""} · ${formatShortPrice(avgPrice)}</span>
    <span class="block text-[10px] font-bold text-[#071B33]/50 mt-0.5">Explorer →</span>
  `;
  return el;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function MapExperience({ listings, initialFilters, totalAnalyzed, positionedCount }: MapExperienceProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const clusterMarkersRef = useRef<Marker[]>([]);
  const { theme } = useTheme();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapZoom, setMapZoom] = useState(MOROCCO_OVERVIEW.zoom);
  const [filters, setFilters] = useState<MapFilters>({
    ...defaultMapFilters,
    ...initialFilters,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // City overlay — shown on initial load when a city is pre-selected via URL
  const initialCityConfig = useMemo(
    () => CITIES.find((c) => c.label.toLowerCase() === (initialFilters?.city ?? "").toLowerCase()),
    // stable — derived from SSR prop, never changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [showCityOverlay, setShowCityOverlay] = useState(() => !!initialCityConfig);
  const [overlayExiting, setOverlayExiting] = useState(false);

  const dismissOverlay = useCallback(() => {
    setOverlayExiting(true);
    setTimeout(() => {
      setShowCityOverlay(false);
      setOverlayExiting(false);
    }, 400);
  }, []);

  const cities = useMemo(() => getCitiesWithGeo(listings), [listings]);
  const propertyTypes = useMemo(() => getPropertyTypes(listings), [listings]);

  const visibleListings = useMemo(
    () => filterMapListings(listings, filters),
    [listings, filters]
  );

  const clusters = useMemo(
    () => getCityClusters(visibleListings),
    [visibleListings]
  );

  const selectedListing = useMemo(
    () =>
      visibleListings.find((l) => l.id === selectedId) ??
      null,
    [visibleListings, selectedId]
  );

  const showClusters = mapZoom < CLUSTER_ZOOM_THRESHOLD;

  // ─── Filter helpers ──────────────────────────────────────────────────────────

  const updateFilter = useCallback(
    <K extends keyof MapFilters>(key: K, value: MapFilters[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(defaultMapFilters);
    setSelectedId(null);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [MOROCCO_OVERVIEW.lng, MOROCCO_OVERVIEW.lat],
        zoom: MOROCCO_OVERVIEW.zoom,
        duration: 1200,
      });
    }
  }, []);

  // ─── Select listing + flyTo ──────────────────────────────────────────────────

  const selectListing = useCallback(
    (listing: Listing) => {
      setSelectedId(listing.id);
      if (mapRef.current && listing.latitude != null && listing.longitude != null) {
        const currentZoom = mapRef.current.getZoom();
        mapRef.current.flyTo({
          center: [listing.longitude, listing.latitude],
          zoom: Math.max(currentZoom, 12),
          duration: 900,
        });
      }
    },
    []
  );

  // ─── MapLibre initialization ────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let mapInstance: MapLibreMap;

    // Dynamic import to avoid SSR issues
    import("maplibre-gl").then(({ Map: MapLibreMapClass, setRTLTextPlugin }) => {
      if (!mapContainerRef.current) return;

      // Enable Arabic / RTL text rendering
      setRTLTextPlugin("/mapbox-gl-rtl-text.min.js", true).catch(() => {
        // already loaded or unavailable — safe to ignore
      });

      // Read the theme the no-flash script already applied — reliable at init.
      const initialTheme =
        typeof document !== "undefined" ? document.documentElement.dataset.theme : "light";

      mapInstance = new MapLibreMapClass({
        container: mapContainerRef.current,
        style: styleForTheme(initialTheme),
        center: [MOROCCO_OVERVIEW.lng, MOROCCO_OVERVIEW.lat],
        zoom: MOROCCO_OVERVIEW.zoom,
        attributionControl: {
          customAttribution: "© <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>",
        },
      });

      mapRef.current = mapInstance;

      mapInstance.on("load", () => {
        hideInternalBoundaries(mapInstance);
        setMapLoaded(true);
      });

      mapInstance.on("zoom", () => {
        setMapZoom(mapInstance.getZoom());
      });
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── City flyTo when filter changes ─────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (filters.city !== "all") {
      const target = getCityFlyTarget(filters.city);
      mapRef.current.flyTo({
        center: [target.lng, target.lat],
        zoom: target.zoom,
        duration: 1000,
      });
    } else {
      mapRef.current.flyTo({
        center: [MOROCCO_OVERVIEW.lng, MOROCCO_OVERVIEW.lat],
        zoom: MOROCCO_OVERVIEW.zoom,
        duration: 1000,
      });
    }
  }, [filters.city, mapLoaded]);

  // ─── Swap basemap style when the theme changes (light/dark) ─────────────────

  const styleInitRef = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    // Skip the first run — the init style already matches the current theme.
    if (styleInitRef.current) {
      styleInitRef.current = false;
      return;
    }
    // HTML markers (price/cluster) survive setStyle; only re-hide boundaries.
    map.setStyle(styleForTheme(theme));
    map.once("style.load", () => hideInternalBoundaries(map));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // ─── Render / update markers ──────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Dynamic import needed because maplibre-gl is client-only
    import("maplibre-gl").then(({ Marker }) => {
      // Clear previous markers
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];
      for (const m of clusterMarkersRef.current) m.remove();
      clusterMarkersRef.current = [];

      if (showClusters) {
        // Render cluster markers — each is a link to /search?city=City
        for (const cluster of clusters) {
          const el = createClusterMarkerEl(
            cluster.city,
            cluster.count,
            cluster.averagePrice
          );

          const marker = new Marker({ element: el, anchor: "center" })
            .setLngLat([cluster.lng, cluster.lat])
            .addTo(mapRef.current!);
          clusterMarkersRef.current.push(marker);
        }
      } else {
        // Render individual price markers
        for (const listing of visibleListings) {
          if (listing.latitude == null || listing.longitude == null) continue;

          const isSelected = listing.id === selectedId;
          const isApprox = listing.geo_precision !== "exact";
          const priceLabel = formatShortPrice(listing.price);
          const txType = listing.transaction_type === "rent" ? "rent" : "buy";
          const marketRef = getMarketReference(
            listing.city,
            listing.neighborhood,
            listing.property_type,
            txType,
            listing.price_per_m2
          );
          const position = marketRef?.position ?? null;

          const el = createPriceMarkerEl(
            priceLabel,
            listing.price_per_m2,
            position,
            isSelected,
            isApprox
          );
          el.addEventListener("click", () => {
            selectListing(listing);
          });

          const marker = new Marker({ element: el, anchor: "center" })
            .setLngLat([listing.longitude, listing.latitude])
            .addTo(mapRef.current!);
          markersRef.current.push(marker);
        }
      }
    });
  }, [
    mapLoaded,
    showClusters,
    clusters,
    visibleListings,
    selectedId,
    updateFilter,
    selectListing,
  ]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <section className="flex-shrink-0 border-b border-[#eadfca] bg-deepblue text-white z-10">
        <div className="mx-auto max-w-[1480px] px-4 py-4 sm:px-6">
          {/* Title row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-bronze-400">
                Carte indicative · Repères simplifiés
              </p>
              <h1 className="mt-1 text-[1.4rem] font-extrabold tracking-[-0.04em] sm:text-[1.8rem]">
                Explorez les biens sur la carte du Maroc
              </h1>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2">
              {transactionOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateFilter("transactionType", opt.value)}
                  className={
                    filters.transactionType === opt.value
                      ? "rounded-full bg-bronze-600 px-4 py-2 text-[12px] font-extrabold text-deepblue"
                      : "rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[12px] font-bold text-white/72 hover:bg-white/10"
                  }
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateFilter("hideDuplicates", !filters.hideDuplicates)
                }
                className={
                  filters.hideDuplicates
                    ? "rounded-full bg-white px-4 py-2 text-[12px] font-extrabold text-deepblue"
                    : "rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[12px] font-bold text-white/72"
                }
              >
                Doublons masqués
              </button>
            </div>
          </div>

          {/* Filter grid */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            {/* City */}
            <label className="block">
              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.13em] text-white/64">
                Ville
              </span>
              <select
                value={filters.city}
                onChange={(e) => {
                  updateFilter("city", e.target.value);
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

            {/* Type */}
            <label className="block">
              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.13em] text-white/64">
                Type
              </span>
              <select
                value={filters.propertyType}
                onChange={(e) =>
                  updateFilter(
                    "propertyType",
                    e.target.value as MapFilters["propertyType"]
                  )
                }
                className="h-10 w-full rounded-xl border border-white/10 bg-white px-3 text-[13px] font-bold text-deepblue outline-none sm:w-[150px]"
              >
                <option value="all">Tous</option>
                {propertyTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            {/* Budget */}
            <label className="block">
              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.13em] text-white/64">
                Budget max
              </span>
              <input
                value={filters.maxBudget}
                inputMode="numeric"
                onChange={(e) => updateFilter("maxBudget", e.target.value)}
                placeholder="Prix max"
                className="h-10 w-full rounded-xl border border-white/10 bg-white px-3 text-[13px] font-bold text-deepblue outline-none placeholder:text-gray-400 sm:w-[130px]"
              />
            </label>

            {/* Reset */}
            <button
              type="button"
              onClick={resetFilters}
              className="col-span-2 h-10 self-end rounded-xl border border-white/15 px-4 text-[12px] font-extrabold text-white/82 hover:bg-white/10 sm:col-span-1"
            >
              Réinitialiser
            </button>
          </div>

          {/* Mobile transaction tabs */}
          <div className="mt-2 flex gap-2 sm:hidden overflow-x-auto pb-1">
            {transactionOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateFilter("transactionType", opt.value)}
                className={
                  filters.transactionType === opt.value
                    ? "flex-shrink-0 rounded-full bg-bronze-600 px-3 py-1.5 text-[12px] font-extrabold text-deepblue"
                    : "flex-shrink-0 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-[12px] font-bold text-white/72"
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Map + Side panel ──────────────────────────────────────────────── */}
      <div className="flex-1 relative flex overflow-hidden min-h-0">
        {/* Map container */}
        <div className="relative flex-1 min-w-0">
          <div ref={mapContainerRef} className="absolute inset-0" />

          {/* Loading overlay */}
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

          {/* Bottom disclaimer */}
          <div className="absolute bottom-8 left-4 right-4 sm:right-auto sm:max-w-sm z-10 pointer-events-none">
            <div className="rounded-2xl border border-white/15 bg-[#071B33]/88 p-3 backdrop-blur">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#C2A368]">
                Carte indicative — repères simplifiés
              </p>
              <p className="mt-1 text-[11px] leading-5 text-white/70">
                Repères simplifiés pour l'exploration. Positions au niveau ville/quartier — à vérifier avant visite.
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

          {/* Cluster hint */}
          {mapLoaded && showClusters && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="rounded-full border border-white/15 bg-[#071B33]/80 px-4 py-2 backdrop-blur">
                <p className="text-[11px] font-bold text-white/80">
                  Dézoomez pour voir les zones · Zoomez pour les annonces
                </p>
              </div>
            </div>
          )}

          {/* Count badge */}
          {mapLoaded && (
            <div className="absolute top-4 left-4 z-10">
              <div className="rounded-xl border border-white/15 bg-[#071B33]/80 px-3 py-2 backdrop-blur">
                <p className="text-[12px] font-extrabold text-white">
                  {visibleListings.length} bien{visibleListings.length !== 1 ? "s" : ""} positionné{visibleListings.length !== 1 ? "s" : ""}
                </p>
                {totalAnalyzed != null && totalAnalyzed > (positionedCount ?? visibleListings.length) && (
                  <p className="mt-0.5 text-[10px] text-white/60">
                    sur {totalAnalyzed} annonce{totalAnalyzed !== 1 ? "s" : ""} analysée{totalAnalyzed !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side panel — desktop only */}
        <div className="hidden lg:flex lg:w-[380px] lg:flex-col border-l border-[#eadfca] bg-white overflow-hidden">
          <MapSidePanel
            listings={visibleListings}
            selectedId={selectedId}
            filters={filters}
            onSelect={(id) => {
              const listing = visibleListings.find((l) => l.id === id);
              if (listing) selectListing(listing);
            }}
          />
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <MapBottomSheet
        listing={selectedListing}
        onDismiss={() => setSelectedId(null)}
      />

      {/* ── City overlay — aparece cuando se llega desde la sección carte intelligente ── */}
      {showCityOverlay && initialCityConfig && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{ transition: "opacity 0.4s ease", opacity: overlayExiting ? 0 : 1 }}
          onClick={dismissOverlay}
        >
          {/* Background image */}
          {initialCityConfig.image && (
            <Image
              src={initialCityConfig.image}
              alt=""
              fill
              className="absolute inset-0 object-cover"
              priority
            />
          )}
          {/* Gradient scrim */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, ${initialCityConfig.overlayFrom} 0%, rgba(7,27,51,0.96) 100%)`,
            }}
          />
          {/* Content */}
          <div
            className="relative z-10 flex flex-col items-center px-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#C2A368]">
              Carte immobilière · AkarFinder
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
              className="mt-8 rounded-full bg-[#9B7838] px-8 py-3.5 text-[14px] font-extrabold text-white shadow-[0_8px_24px_rgba(155,120,56,0.45)] transition hover:bg-[#b08c44] hover:shadow-[0_8px_32px_rgba(155,120,56,0.6)]"
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
