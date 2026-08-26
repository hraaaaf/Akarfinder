"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { NeighborhoodContextPoiOverlay } from "@/components/map/NeighborhoodContextPoiOverlay";
import { RabatMarketZoneSheet } from "@/components/map/RabatMarketZoneSheet";
import { useTheme } from "@/components/theme/ThemeProvider";
import { applyAkarFinderBasemapTreatment } from "@/lib/map/akarfinder-territorial-style";
import type { RabatIntelligenceGeoJson } from "@/lib/map/intelligence-payload";
import type { IntelligenceMode } from "@/lib/map/intelligence-scale";
import {
  buildMapSearchHref,
  withMapLocation,
  type MapNavigationState,
} from "@/lib/map/map-navigation-state";
import { getCityFlyTarget } from "@/lib/map/listing-map";

const LIGHT_TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_TILE_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const SOURCE_ID = "akarfinder-rabat-market-intelligence";
const FILL_LAYER_ID = "akarfinder-rabat-market-intelligence-fill";
const LINE_LAYER_ID = "akarfinder-rabat-market-intelligence-line";
const LABEL_LAYER_ID = "akarfinder-rabat-market-intelligence-label";
const ENDPOINT = "/api/geo/rabat-market-intelligence";

const FLAGSHIP_CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"] as const;

const ZONE_TO_DISTRICT = new Map<string, string>([
  ["market_zone_rabat_agdal", "agdal"],
  ["market_zone_rabat_hay_riad", "hay-riad"],
  ["market_zone_rabat_souissi", "souissi"],
  ["market_zone_rabat_centre", "hassan"],
]);
const DISTRICT_TO_ZONE = new Map<string, string>(
  [...ZONE_TO_DISTRICT.entries()].map(([zoneId, district]) => [district, zoneId]),
);

const MODE_META: Record<IntelligenceMode, { label: string; short: string }> = {
  price: { label: "Prix", short: "DH/m²" },
  density: { label: "Densité", short: "ann./km²" },
  listings: { label: "Annonces", short: "annonces" },
};

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

export function districtSlugForMarketZone(zoneId: string): string | null {
  return ZONE_TO_DISTRICT.get(zoneId) ?? null;
}

export function marketZoneIdForDistrict(district: string | undefined): string | null {
  return district ? DISTRICT_TO_ZONE.get(district) ?? null : null;
}

export function formatIntelligenceMetric(value: number | null, mode: IntelligenceMode): string {
  if (value == null || !Number.isFinite(value)) return "Données insuffisantes";
  if (mode === "price") return `${Math.round(value).toLocaleString("fr-FR")} DH/m²`;
  if (mode === "density") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} annonces/km²`;
  return `${Math.round(value).toLocaleString("fr-FR")} annonce${Math.round(value) === 1 ? "" : "s"}`;
}

function legendRangeLabel(
  index: number,
  thresholds: readonly number[],
  min: number | null,
  max: number | null,
  mode: IntelligenceMode,
): string {
  if (min == null || max == null) return "Indisponible";
  const start = index === 0 ? min : thresholds[index - 1];
  const end = index < thresholds.length ? thresholds[index] : max;
  if (mode === "price") return `${Math.round(start).toLocaleString("fr-FR")}–${Math.round(end).toLocaleString("fr-FR")} DH/m²`;
  if (mode === "density") return `${start.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}–${end.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/km²`;
  return `${Math.round(start)}–${Math.round(end)} annonces`;
}

function removeIntelligenceLayers(map: MapLibreMap) {
  for (const layerId of [LABEL_LAYER_ID, LINE_LAYER_ID, FILL_LAYER_ID]) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

type RabatMarketIntelligenceExperienceProps = {
  navigationState: MapNavigationState;
  onNavigationChange: (nextState: MapNavigationState) => void;
};

export function RabatMarketIntelligenceExperience({
  navigationState,
  onNavigationChange,
}: RabatMarketIntelligenceExperienceProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const styleInitRef = useRef(true);
  const { theme } = useTheme();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleRevision, setStyleRevision] = useState(0);
  const [mode, setMode] = useState<IntelligenceMode>("price");
  const [transaction, setTransaction] = useState<"sale" | "rent">(
    navigationState.transaction_type === "rent" ? "rent" : "sale",
  );
  const [payload, setPayload] = useState<RabatIntelligenceGeoJson | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(false);

  const selectedZoneId = useMemo(
    () => marketZoneIdForDistrict(navigationState.district),
    [navigationState.district],
  );
  const selectedFeature = useMemo(
    () => payload?.features.find((feature) => feature.properties.zoneId === selectedZoneId) ?? null,
    [payload, selectedZoneId],
  );
  const searchHref = useMemo(() => buildMapSearchHref({
    ...navigationState,
    transaction_type: transaction === "rent" ? "rent" : "buy",
  }), [navigationState, transaction]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let mapInstance: MapLibreMap | null = null;
    let cancelled = false;

    void import("maplibre-gl").then(({ Map: MapClass, setRTLTextPlugin }) => {
      if (cancelled || !mapContainerRef.current) return;
      void setRTLTextPlugin("/mapbox-gl-rtl-text.min.js", true).catch(() => {});
      const initialTheme = document.documentElement.dataset.theme;
      const rabat = getCityFlyTarget("Rabat");
      mapInstance = new MapClass({
        container: mapContainerRef.current,
        style: styleForTheme(initialTheme),
        center: [rabat.lng, rabat.lat],
        zoom: 10.8,
        minZoom: 8,
        maxZoom: 15,
        maxBounds: [[-7.25, 33.72], [-6.45, 34.25]],
        attributionControl: {
          customAttribution: "© <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>",
        },
      });
      mapRef.current = mapInstance;
      mapInstance.once("style.load", () => {
        if (!mapInstance) return;
        hideInternalBoundaries(mapInstance);
        applyAkarFinderBasemapTreatment(mapInstance, initialTheme);
        setMapLoaded(true);
        setStyleRevision((value) => value + 1);
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
    if (styleInitRef.current) {
      styleInitRef.current = false;
      return;
    }
    map.setStyle(styleForTheme(theme));
    map.once("style.load", () => {
      hideInternalBoundaries(map);
      applyAkarFinderBasemapTreatment(map, theme);
      setStyleRevision((value) => value + 1);
    });
  }, [mapLoaded, theme]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoadingData(true);
    setDataError(false);

    void fetch(`${ENDPOINT}?mode=${mode}&transaction=${transaction}`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`market intelligence HTTP ${response.status}`);
        return response.json() as Promise<RabatIntelligenceGeoJson>;
      })
      .then((nextPayload) => {
        if (cancelled) return;
        setPayload(nextPayload);
        setLoadingData(false);
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) return;
        console.error("[AkarFinderMap:market-intelligence]", error);
        setPayload(null);
        setDataError(true);
        setLoadingData(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [mode, transaction]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || styleRevision === 0 || !payload) return;
    removeIntelligenceLayers(map);

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: payload as unknown as GeoJSON.FeatureCollection,
    });
    map.addLayer({
      id: FILL_LAYER_ID,
      type: "fill",
      source: SOURCE_ID,
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], payload.properties.legend.neutralColor],
        "fill-opacity": [
          "case",
          ["==", ["get", "zoneId"], selectedZoneId ?? ""], theme === "dark" ? 0.78 : 0.76,
          ["boolean", ["get", "neutral"], false], theme === "dark" ? 0.24 : 0.2,
          theme === "dark" ? 0.56 : 0.5,
        ],
      },
    });
    map.addLayer({
      id: LINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "zoneId"], selectedZoneId ?? ""],
          "#0B63CE",
          theme === "dark" ? "#D9E8FA" : "#FFFFFF",
        ],
        "line-width": ["case", ["==", ["get", "zoneId"], selectedZoneId ?? ""], 3.4, 1.2],
        "line-opacity": 0.96,
      },
    });
    map.addLayer({
      id: LABEL_LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      layout: {
        "text-field": ["get", "displayName"],
        "text-size": ["case", ["==", ["get", "zoneId"], selectedZoneId ?? ""], 14, 12.5],
        "text-font": ["Noto Sans Regular"],
        "text-allow-overlap": false,
        "text-padding": 8,
      },
      paint: {
        "text-color": theme === "dark" ? "#F8FAFC" : "#071B33",
        "text-halo-color": theme === "dark" ? "#071426" : "#FFFFFF",
        "text-halo-width": 2,
      },
    });

    const onClick = (event: any) => {
      const feature = event.features?.[0];
      const zoneId = String(feature?.properties?.zoneId ?? "");
      const district = districtSlugForMarketZone(zoneId);
      if (!district) return;
      onNavigationChange(withMapLocation(navigationState, "rabat", district));
    };
    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };
    map.on("click", FILL_LAYER_ID, onClick);
    map.on("mouseenter", FILL_LAYER_ID, onEnter);
    map.on("mouseleave", FILL_LAYER_ID, onLeave);

    return () => {
      try {
        map.off("click", FILL_LAYER_ID, onClick);
        map.off("mouseenter", FILL_LAYER_ID, onEnter);
        map.off("mouseleave", FILL_LAYER_ID, onLeave);
        removeIntelligenceLayers(map);
      } catch {
        // Theme/style swaps may have already removed the layers.
      }
    };
  }, [mapLoaded, navigationState, onNavigationChange, payload, selectedZoneId, styleRevision, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getLayer(LINE_LAYER_ID) || !map.getLayer(FILL_LAYER_ID)) return;
    map.setPaintProperty(
      LINE_LAYER_ID,
      "line-color",
      ["case", ["==", ["get", "zoneId"], selectedZoneId ?? ""], "#0B63CE", theme === "dark" ? "#D9E8FA" : "#FFFFFF"],
    );
    map.setPaintProperty(
      LINE_LAYER_ID,
      "line-width",
      ["case", ["==", ["get", "zoneId"], selectedZoneId ?? ""], 3.4, 1.2],
    );
    map.setPaintProperty(
      FILL_LAYER_ID,
      "fill-opacity",
      [
        "case",
        ["==", ["get", "zoneId"], selectedZoneId ?? ""], theme === "dark" ? 0.78 : 0.76,
        ["boolean", ["get", "neutral"], false], theme === "dark" ? 0.24 : 0.2,
        theme === "dark" ? 0.56 : 0.5,
      ],
    );
  }, [mapLoaded, selectedZoneId, theme]);

  const legend = payload?.properties.legend ?? null;

  return (
    <div
      className="relative min-w-0 overflow-hidden bg-background"
      style={{ height: "calc(100svh - 64px)" }}
      data-akarfinder-market-intelligence-map
      data-p4-basemap="territorial-muted"
    >
      <div ref={mapContainerRef} className="absolute inset-0 bg-[#eaf1f7] dark:bg-[#071426]" />

      <NeighborhoodContextPoiOverlay
        map={mapRef.current}
        mapReady={mapLoaded}
        citySlug="rabat"
        districtSlug={navigationState.district ?? null}
        placement="market"
      />

      <section
        className="absolute inset-x-3 top-3 z-20 rounded-[22px] border border-white/80 bg-card/94 p-3 shadow-[0_18px_50px_rgba(15,35,66,0.14)] backdrop-blur-xl sm:inset-x-auto sm:left-4 sm:right-4 sm:top-4 lg:right-auto lg:w-[min(900px,calc(100vw-430px))]"
        aria-label="Contrôles carte des quartiers"
        data-akarfinder-premium-map-toolbar
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-brand-primary">Carte des quartiers</p>
            <p className="mt-0.5 truncate text-[13px] font-extrabold tracking-[-0.01em] text-foreground sm:text-[15px]">Rabat · intelligence immobilière observée</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigationChange(withMapLocation(navigationState, "all"))}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:border-brand-primary/30 hover:text-brand-primary"
            aria-label="Revenir à la carte du Maroc"
            title="Tout le Maroc"
          >
            <RotateCcw size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 hidden gap-1.5 overflow-x-auto pb-0.5 sm:flex" aria-label="Villes phares">
          {FLAGSHIP_CITIES.map((city) => {
            const active = city === "Rabat";
            return (
              <button
                key={city}
                type="button"
                aria-pressed={active}
                onClick={() => onNavigationChange(withMapLocation(navigationState, city))}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-extrabold transition ${active ? "border-brand-primary bg-brand-primary text-white shadow-sm" : "border-border bg-surface/90 text-text-secondary hover:border-brand-primary/25 hover:text-foreground"}`}
              >
                {city}
              </button>
            );
          })}
        </div>

        <label className="mt-3 block sm:hidden">
          <span className="sr-only">Ville</span>
          <select
            value="Rabat"
            onChange={(event) => onNavigationChange(withMapLocation(navigationState, event.target.value))}
            className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-[11px] font-extrabold text-foreground outline-none"
          >
            {FLAGSHIP_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </label>

        <div className="mt-3 flex flex-col gap-2 border-t border-border/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 rounded-xl border border-border bg-surface-muted/80 p-1" role="tablist" aria-label="Mode intelligence marché">
            {(Object.keys(MODE_META) as IntelligenceMode[]).map((candidate) => (
              <button
                key={candidate}
                type="button"
                role="tab"
                aria-selected={mode === candidate}
                onClick={() => setMode(candidate)}
                className={`min-w-0 flex-1 rounded-lg px-2.5 py-2 text-[10px] font-extrabold transition sm:text-[10.5px] ${mode === candidate ? "bg-brand-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                data-akarfinder-intelligence-mode={candidate}
              >
                {MODE_META[candidate].label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="inline-flex rounded-xl border border-border bg-surface-muted/80 p-1" aria-label="Transaction">
              {(["sale", "rent"] as const).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => setTransaction(candidate)}
                  className={`rounded-lg px-3 py-1.5 text-[9.5px] font-extrabold transition ${transaction === candidate ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {candidate === "sale" ? "Vente" : "Location"}
                </button>
              ))}
            </div>
            <span className="hidden rounded-full border border-border bg-surface/90 px-2.5 py-1.5 text-[9px] font-bold text-muted-foreground md:inline-flex">
              Zones AkarFinder · non officielles
            </span>
          </div>
        </div>
      </section>

      {!mapLoaded || loadingData ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#eef3f8]/56 backdrop-blur-[1px] dark:bg-[#06162d]/52">
          <div className="rounded-2xl border border-white/80 bg-card/96 px-5 py-4 text-center shadow-card">
            <div className="mx-auto mb-2.5 h-6 w-6 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" />
            <p className="text-[11px] font-extrabold text-foreground">Chargement de la carte des quartiers…</p>
          </div>
        </div>
      ) : null}

      {dataError ? (
        <div className="absolute left-1/2 top-[48%] z-20 w-[min(88vw,390px)] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-white/80 bg-card/96 p-5 text-center shadow-[0_22px_60px_rgba(15,35,66,0.18)] backdrop-blur-xl" role="status">
          <p className="text-[13px] font-extrabold text-foreground">Données quartiers temporairement indisponibles</p>
          <p className="mt-1.5 text-[10.5px] leading-4 text-muted-foreground">Aucune couleur de remplacement n’est inventée. Aucune zone ou valeur n’est fabriquée. La carte reste fail-closed.</p>
        </div>
      ) : null}

      {legend && !dataError ? (
        <aside
          className="absolute bottom-4 left-3 z-10 w-[min(72vw,286px)] rounded-[18px] border border-white/80 bg-card/94 p-3 shadow-[0_14px_36px_rgba(15,35,66,0.12)] backdrop-blur-xl sm:left-4"
          aria-label={`Légende ${MODE_META[mode].label}`}
          data-akarfinder-intelligence-legend
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand-primary">{MODE_META[mode].label} · {transaction === "sale" ? "Vente" : "Location"}</p>
              <p className="mt-0.5 text-[9.5px] font-semibold text-muted-foreground">Faible → élevé · données observées</p>
            </div>
            <span className="rounded-full bg-surface-muted px-2 py-1 text-[8.5px] font-bold text-muted-foreground">n={legend.availableCount}</span>
          </div>
          {legend.colors.length ? (
            <div className="mt-2 grid gap-1.5">
              {legend.colors.map((color, index) => (
                <div key={`${color}-${index}`} className="flex items-center gap-2 text-[9px] font-semibold text-text-secondary">
                  <span className="h-2.5 w-5 shrink-0 rounded-full border border-black/5" style={{ background: color }} aria-hidden="true" />
                  <span>{legendRangeLabel(index, legend.thresholds, legend.min, legend.max, mode)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[9.5px] font-bold text-muted-foreground">Aucune zone suffisamment fiable pour ce mode.</p>
          )}
          <div className="mt-2 flex items-center gap-2 border-t border-border pt-2 text-[8.5px] text-muted-foreground">
            <span className="h-2.5 w-5 rounded-full border border-black/5" style={{ background: legend.neutralColor }} aria-hidden="true" />
            <span>Neutre = donnée absente ou insuffisante</span>
          </div>
        </aside>
      ) : null}

      {selectedFeature ? (
        <RabatMarketZoneSheet
          feature={selectedFeature}
          mode={mode}
          modeLabel={MODE_META[mode].label}
          metricLabel={formatIntelligenceMetric(selectedFeature.properties.metricValue, mode)}
          searchHref={searchHref}
          navigationState={navigationState}
          onNavigationChange={onNavigationChange}
        />
      ) : null}
    </div>
  );
}
