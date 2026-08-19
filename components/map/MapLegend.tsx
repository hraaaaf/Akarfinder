"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { ui } from "@/components/ui/design-system";
import type {
  CityMarketIntelligenceDistrict,
  CityMarketIntelligencePayload,
} from "@/lib/map/city-market-intelligence-payload";
import { formatCityMarketMetric } from "@/lib/map/city-market-intelligence-payload";
import type { IntelligenceMode } from "@/lib/map/intelligence-scale";
import {
  buildMapHref,
  intelligenceModeToMapLayer,
  mapLayerToIntelligenceMode,
  mapNavigationStateFromUrlSearchParams,
  withMapLayer,
} from "@/lib/map/map-navigation-state";

const MODE_META: Record<IntelligenceMode, { label: string; short: string }> = {
  price: { label: "Prix", short: "DH/m²" },
  density: { label: "Densité", short: "ann./km²" },
  listings: { label: "Annonces", short: "annonces" },
};

function observedModeLabel(mode: IntelligenceMode): string {
  if (mode === "density") return "Densité observée";
  if (mode === "listings") return "Annonces observées";
  return "Prix observé";
}

function formatLegendValue(value: number | null, mode: IntelligenceMode): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (mode === "price") return `${Math.round(value).toLocaleString("fr-FR")} DH/m²`;
  if (mode === "density") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/km²`;
  return Math.round(value).toLocaleString("fr-FR");
}

function metricSourceLabel(district: CityMarketIntelligenceDistrict): string {
  if (district.mode === "density") {
    if (district.areaBasis === "casablanca_osm_shadow") return "Surface OSM shadow · non officielle";
    if (district.areaBasis === "rabat_market_zone_shadow") return "Zone marché AkarFinder · non officielle";
    return "Surface quartier indisponible";
  }
  if (district.mode === "price") {
    return `Échantillon prix n=${district.marketMetrics.priceSampleCount}`;
  }
  return district.marketMetrics.listingCount == null
    ? "Résolution quartier indisponible"
    : "Annonces observées dédupliquées";
}

export function MapLegend() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const navigationState = useMemo(
    () => mapNavigationStateFromUrlSearchParams(new URLSearchParams(queryString)),
    [queryString],
  );
  const mode = mapLayerToIntelligenceMode(navigationState.layer);
  const transaction = navigationState.transaction_type === "rent" ? "rent" : "sale";
  const [payload, setPayload] = useState<CityMarketIntelligencePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [tabTarget, setTabTarget] = useState<HTMLElement | null>(null);
  const [compactHost, setCompactHost] = useState<HTMLElement | null>(null);
  const [panelHost, setPanelHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (navigationState.city === "all") {
      setPayload(null);
      setLoading(false);
      setError(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void fetch(
      `/api/geo/market-intelligence?city=${encodeURIComponent(navigationState.city)}&mode=${mode}&transaction=${transaction}`,
      { credentials: "same-origin", cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`market intelligence HTTP ${response.status}`);
        return response.json() as Promise<CityMarketIntelligencePayload>;
      })
      .then((nextPayload) => {
        if (controller.signal.aborted) return;
        setPayload(nextPayload);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        console.error("[AkarFinderMap:city-market-intelligence]", fetchError);
        setPayload(null);
        setError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [mode, navigationState.city, transaction]);

  useEffect(() => {
    const findTabTarget = () => {
      const target = document.querySelector<HTMLElement>(
        '[data-akarfinder-generic-premium-toolbar] [role="tablist"][aria-label="Mode carte multi-villes"]',
      );
      setTabTarget((current) => current === target ? current : target);
    };
    findTabTarget();
    const observer = new MutationObserver(findTabTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let currentCompactHost: HTMLElement | null = null;
    let currentPanelHost: HTMLElement | null = null;

    const syncHosts = () => {
      const compactPanel = document.querySelector<HTMLElement>("[data-akarfinder-mobile-compact-panel]");
      const compactTitle = compactPanel?.querySelector<HTMLElement>("h2");
      if (compactTitle && !compactPanel?.querySelector("[data-akarfinder-lot9-compact-host]")) {
        const host = document.createElement("div");
        host.dataset.akarfinderLot9CompactHost = "true";
        compactTitle.insertAdjacentElement("afterend", host);
        currentCompactHost = host;
        setCompactHost(host);
      } else if (!compactPanel) {
        setCompactHost(null);
      } else {
        setCompactHost(compactPanel.querySelector<HTMLElement>("[data-akarfinder-lot9-compact-host]"));
      }

      const fullPanel = document.querySelector<HTMLElement>('aside[aria-label^="Fiche repère quartier"]');
      if (fullPanel && !fullPanel.querySelector("[data-akarfinder-lot9-panel-host]")) {
        const host = document.createElement("div");
        host.dataset.akarfinderLot9PanelHost = "true";
        const reference = fullPanel.children.item(1);
        fullPanel.insertBefore(host, reference ?? null);
        currentPanelHost = host;
        setPanelHost(host);
      } else if (!fullPanel) {
        setPanelHost(null);
      } else {
        setPanelHost(fullPanel.querySelector<HTMLElement>("[data-akarfinder-lot9-panel-host]"));
      }
    };

    syncHosts();
    const observer = new MutationObserver(syncHosts);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (currentCompactHost?.isConnected) currentCompactHost.remove();
      if (currentPanelHost?.isConnected) currentPanelHost.remove();
    };
  }, [navigationState.district]);

  const selectedDistrict = useMemo(
    () => navigationState.district
      ? payload?.districts.find((district) => district.districtSlug === navigationState.district) ?? null
      : null,
    [navigationState.district, payload],
  );

  const switchMode = (nextMode: IntelligenceMode) => {
    const nextState = withMapLayer(navigationState, intelligenceModeToMapLayer(nextMode));
    router.push(buildMapHref(nextState), { scroll: false });
  };

  const tabs = tabTarget ? createPortal(
    <div className="contents" data-akarfinder-lot9-tabs>
      {(Object.keys(MODE_META) as IntelligenceMode[]).map((candidate) => (
        <button
          key={candidate}
          type="button"
          role="tab"
          aria-selected={mode === candidate}
          onClick={() => switchMode(candidate)}
          className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-[9.5px] font-extrabold transition sm:px-2.5 sm:text-[10.5px] ${mode === candidate ? "bg-brand-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          data-akarfinder-intelligence-mode={candidate}
        >
          {MODE_META[candidate].label}
        </button>
      ))}
    </div>,
    tabTarget,
  ) : null;

  const compactMetric = compactHost ? createPortal(
    <p className="mt-1 text-[11px] font-extrabold text-brand-primary" data-akarfinder-lot9-compact-metric>
      {loading ? "Calcul du marché…" : error ? "Données marché indisponibles" : formatCityMarketMetric(selectedDistrict)}
    </p>,
    compactHost,
  ) : null;

  const panelMetric = panelHost ? createPortal(
    <div className="mt-3 rounded-2xl border border-brand-primary/20 bg-brand-primary-soft/65 p-3.5" data-akarfinder-lot9-panel-metric>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-primary">
          {observedModeLabel(mode)} · {transaction === "sale" ? "Vente" : "Location"}
        </p>
        {selectedDistrict ? (
          <span className="rounded-full border border-border bg-surface px-2 py-1 text-[9px] font-bold text-muted-foreground">
            {selectedDistrict.freshnessStatus === "fresh_confirmed" ? "Fraîcheur confirmée" : selectedDistrict.freshnessStatus === "mixed" ? "Fraîcheur mixte" : "Fraîcheur non confirmée"}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[1.15rem] font-extrabold tracking-[-0.02em] text-foreground">
        {loading ? "Calcul en cours…" : error ? "Indisponible" : formatCityMarketMetric(selectedDistrict)}
      </p>
      <p className="mt-1 text-[10px] font-medium text-muted-foreground">
        {selectedDistrict ? metricSourceLabel(selectedDistrict) : "Aucune métrique fabriquée en cas de donnée insuffisante."}
      </p>
    </div>,
    panelHost,
  ) : null;

  return (
    <>
      <style>{`
        [data-akarfinder-generic-premium-toolbar] [role="tablist"][aria-label="Mode carte multi-villes"] > button {
          display: none !important;
        }
        [data-akarfinder-lot9-compact-host] + p {
          display: none !important;
        }
        [data-akarfinder-lot9-panel-host] + div {
          display: none !important;
        }
        .maplibre-neighborhood-marker > span:nth-child(n+2) {
          display: none !important;
        }
      `}</style>
      {tabs}
      {compactMetric}
      {panelMetric}

      <aside
        aria-label="Légende de la carte immobilière"
        className={`${ui.surfaceGlass} pointer-events-auto absolute bottom-[86px] left-3 z-30 w-[min(270px,calc(100vw-24px))] p-3 sm:bottom-4 sm:left-4 sm:w-[286px]`}
        data-akarfinder-intelligence-legend={navigationState.city === "all" ? "territory" : mode}
      >
        {navigationState.city === "all" ? (
          <>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">Explorer le Maroc</p>
            <p className="mt-2 text-[10px] leading-4 text-slate-600">
              Choisissez une ville pour activer les lectures automatiques Prix, Densité et Annonces.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">
                  {MODE_META[mode].label} · {transaction === "sale" ? "Vente" : "Location"}
                </p>
                <p className="mt-0.5 text-[9.5px] font-semibold text-slate-500">Faible → élevé · stock observé</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[8.5px] font-bold text-slate-500">
                n={payload?.legend.availableCount ?? 0}
              </span>
            </div>

            {loading ? (
              <p className="mt-3 text-[10px] font-semibold text-slate-600">Calcul des annonces observées…</p>
            ) : error ? (
              <p className="mt-3 text-[10px] font-semibold text-slate-600">Données marché temporairement indisponibles.</p>
            ) : payload?.legend.availableCount ? (
              <>
                <div className="mt-2 flex gap-1" aria-hidden="true">
                  {payload.legend.colors.map((color, index) => (
                    <span key={`${color}-${index}`} className="h-2.5 flex-1 rounded-full border border-black/5" style={{ background: color }} />
                  ))}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[8.5px] font-semibold text-slate-500">
                  <span>{formatLegendValue(payload.legend.min, mode)}</span>
                  <span>{formatLegendValue(payload.legend.max, mode)}</span>
                </div>
              </>
            ) : (
              <p className="mt-3 text-[10px] font-semibold leading-4 text-slate-600">
                {mode === "density"
                  ? "Densité indisponible sans surface de quartier admissible."
                  : "Aucun quartier ne passe encore le seuil de donnée pour ce mode."}
              </p>
            )}

            {selectedDistrict ? (
              <div className="mt-2.5 border-t border-slate-200 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[9.5px] font-extrabold text-slate-700">{selectedDistrict.displayName}</span>
                  <span className="shrink-0 text-[9.5px] font-extrabold text-primary">{formatCityMarketMetric(selectedDistrict)}</span>
                </div>
              </div>
            ) : null}

            <p className="mt-2.5 border-t border-slate-200 pt-2 text-[8.5px] leading-4 text-slate-500">
              Agrégation automatique par ville + quartier. Aucun prix ni surface n’est interpolé lorsque la preuve manque.
            </p>
          </>
        )}
      </aside>
    </>
  );
}
