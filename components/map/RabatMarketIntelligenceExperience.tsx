"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { RabatMarketZoneSheet } from "@/components/map/RabatMarketZoneSheet";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getNeighborhoodCities } from "@/lib/map/canonical-neighborhood-data";
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
  const cities = useMemo(() => getNeighborhoodCities(), []);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleRevision, setStyleRevision] = useState(0);
  const [mode, setMode] = useState<IntelligenceMode>(navigationState.layer === "price" ? "price" : "price");
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
        zoom: 10.2,
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
        "fill-opacity": ["case", ["boolean", ["get", "neutral"], false], 0.38, theme === "dark" ? 0.62 : 0.7],
      },
    });
    map.addLayer({
      id: LINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: {
        "line-color": ["case", ["==", ["get", "zoneId"], selectedZoneId ?? ""], "#0B63CE", theme === "dark" ? "#D9E8FA" : "#FFFFFF"],
        "line-width": ["case", ["==", ["get", "zoneId"], selectedZoneId ?? ""], 3.2, 1.35],
        "line-opacity": 0.95,
      },
    });
    map.addLayer({
      id: LABEL_LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      layout: {
        "text-field": ["get", "displayName"],
        "text-size": 12,
        "text-font": ["Noto Sans Regular"],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": theme === "dark" ? "#F8FAFC" : "#071B33",
        "text-halo-color": theme === "dark" ? "#071426" : "#FFFFFF",
        "text-halo-width": 1.5,
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
        // A theme style swap may already have removed the layers/source.
      }
    };
  }, [mapLoaded, navigationState, onNavigationChange, payload, selectedZoneId, styleRevision, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getLayer(LINE_LAYER_ID)) return;
    map.setPaintProperty(
      LINE_LAYER_ID,
      "line-color",
      ["case", ["==", ["get", "zoneId"], selectedZoneId ?? ""], "#0B63CE", theme === "dark" ? "#D9E8FA" : "#FFFFFF"],
    );
    map.setPaintProperty(
      LINE_LAYER_ID,
      "line-width",
      ["case", ["==", ["get", "zoneId"], selectedZoneId ?? ""], 3.2, 1.35],
    );
  }, [mapLoaded, selectedZoneId, theme]);

  const legend = payload?.properties.legend ?? null;

  return (
    <div className="relative min-w-0 overflow-hidden bg-background" style={{ height: "calc(100svh - 64px)" }} data-akarfinder-market-intelligence-map>
      <div ref={mapContainerRef} className="absolute inset-0 bg-[#eaf1f7] dark:bg-[#071426]" />

      <section className="absolute inset-x-3 top-3 z-20 rounded-2xl border border-border-strong/70 bg-card/95 p-2.5 shadow-panel backdrop-blur-xl sm:left-4 sm:right-auto sm:top-4 sm:w-[min(760px,calc(100vw-32px))] sm:p-3" aria-label="Contrôles intelligence marché">
        <div className="flex items-center gap-2">
          <label className="min-w-0 flex-1 sm:w-[190px] sm:flex-none">
            <span className="sr-only">Ville</span>
            <select
              value="Rabat"
              onChange={(event) => onNavigationChange(withMapLocation(navigationState, event.target.value))}
              className="h-10 w-full rounded-xl border border-border-strong bg-surface px-3 text-[12px] font-extrabold text-foreground outline-none"
            >
              <option value="all">Tout le Maroc</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>

          <div className="flex min-w-0 flex-1 rounded-xl border border-border bg-surface-muted p-1" role="tablist" aria-label="Mode intelligence marché">
            {(Object.keys(MODE_META) as IntelligenceMode[]).map((candidate) => (
              <button
                key={candidate}
                type="button"
                role="tab"
                aria-selected={mode === candidate}
                onClick={() => setMode(candidate)}
                className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-[10.5px] font-extrabold transition sm:px-3 sm:text-[11px] ${mode === candidate ? "bg-brand-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                data-akarfinder-intelligence-mode={candidate}
              >
                {MODE_META[candidate].label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigationChange(withMapLocation(navigationState, "all"))}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted-foreground hover:text-foreground"
            aria-label="Revenir à la carte du Maroc"
            title="Tout le Maroc"
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
          <div className="inline-flex rounded-lg bg-surface-muted p-0.5" aria-label="Transaction">
            {(["sale", "rent"] as const).map((candidate) => (
              <button
                key={candidate}
                type="button"
                onClick={() => setTransaction(candidate)}
                className={`rounded-md px-2.5 py-1.5 text-[9.5px] font-extrabold ${transaction === candidate ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {candidate === "sale" ? "Vente" : "Location"}
              </button>
            ))}
          </div>
          <p className="truncate text-[9.5px] font-semibold text-muted-foreground">
            Données observées · zones AkarFinder non officielles
          </p>
        </div>
      </section>

      {!mapLoaded || loadingData ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#eef3f8]/70 backdrop-blur-[1px] dark:bg-[#06162d]/60">
          <div className="rounded-2xl border border-border bg-card/95 px-5 py-4 text-center shadow-card">
            <div className="mx-auto mb-2.5 h-6 w-6 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" />
            <p className="text-[11px] font-extrabold text-foreground">Chargement de l’intelligence marché…</p>
          </div>
        </div>
      ) : null}

      {dataError ? (
        <div className="absolute left-1/2 top-1/2 z-20 w-[min(88vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-card/95 p-5 text-center shadow-panel backdrop-blur-xl" role="status">
          <p className="text-[13px] font-extrabold text-foreground">Intelligence marché temporairement indisponible</p>
          <p className="mt-1 text-[10.5px] leading-4 text-muted-foreground">Aucune couleur de remplacement n’est inventée. La carte reste fail-closed.</p>
        </div>
      ) : null}

      {legend && !dataError ? (
        <aside className="absolute bottom-4 left-3 z-10 w-[min(72vw,310px)] rounded-2xl border border-border-strong/70 bg-card/94 p-3 shadow-card backdrop-blur-xl sm:left-4" aria-label={`Légende ${MODE_META[mode].label}`} data-akarfinder-intelligence-legend>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand-primary">{MODE_META[mode].label} · {transaction === "sale" ? "Vente" : "Location"}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">Faible → élevé · snapshot observé</p>
            </div>
            <span className="rounded-full bg-surface-muted px-2 py-1 text-[9px] font-bold text-muted-foreground">n={legend.availableCount}</span>
          </div>
          {legend.colors.length ? (
            <div className="mt-2 grid gap-1.5">
              {legend.colors.map((color, index) => (
                <div key={`${color}-${index}`} className="flex items-center gap-2 text-[9.5px] font-semibold text-text-secondary">
                  <span className="h-3 w-5 shrink-0 rounded-sm border border-black/5" style={{ background: color }} aria-hidden="true" />
                  <span>{legendRangeLabel(index, legend.thresholds, legend.min, legend.max, mode)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[10px] font-bold text-muted-foreground">Aucune zone suffisamment fiable pour ce mode.</p>
          )}
          <div className="mt-2 flex items-center gap-2 border-t border-border pt-2 text-[9px] text-muted-foreground">
            <span className="h-3 w-5 rounded-sm border border-black/5" style={{ background: legend.neutralColor }} aria-hidden="true" />
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
