"use client";

import { ChevronRight, Map, MapPin } from "lucide-react";
import { useEffect, useMemo } from "react";
import { resolveCityEntity } from "@/lib/geo/geo-entity-registry";
import {
  CITY_TERRITORIAL_COLOR_MEANING,
  findCityTerritorialColorInText,
  getCityTerritorialColor,
} from "@/lib/map/city-territorial-colors";
import {
  getNeighborhoodCities,
  getNeighborhoodsByCity,
} from "@/lib/map/canonical-neighborhood-data";
import {
  MAP_LAYER_EXPLORE,
  withMapLocation,
  type MapNavigationState,
} from "@/lib/map/map-navigation-state";

type TerritorialExplorerProps = {
  navigationState: MapNavigationState;
  onNavigationChange: (nextState: MapNavigationState) => void;
};

type CityEntry = {
  city: string;
  count: number;
};

type OriginalVisualState = {
  style: string;
  childStyles: string[];
};

export function TerritorialExplorer({
  navigationState,
  onNavigationChange,
}: TerritorialExplorerProps) {
  const cityEntity = useMemo(
    () => navigationState.city === "all" ? null : resolveCityEntity(navigationState.city),
    [navigationState.city],
  );
  const selectedCity = cityEntity?.canonical_name ?? null;
  const cityEntries = useMemo<CityEntry[]>(
    () => getNeighborhoodCities().map((city) => ({
      city,
      count: getNeighborhoodsByCity(city).length,
    })),
    [],
  );
  const districts = useMemo(
    () => selectedCity ? getNeighborhoodsByCity(selectedCity) : [],
    [selectedCity],
  );
  const selectedDistrict = useMemo(
    () => districts.find((point) => point.neighborhoodSlug === navigationState.district || point.neighborhood === navigationState.district) ?? null,
    [districts, navigationState.district],
  );
  const explorerWidthClass = selectedDistrict
    ? "sm:w-[min(720px,calc(100vw-32px))] md:w-[calc(100vw-438px)] md:max-w-[720px]"
    : "sm:w-[min(720px,calc(100vw-32px))]";

  useEffect(() => {
    if (navigationState.layer !== MAP_LAYER_EXPLORE || selectedCity) return;

    const mapCanvas = document.querySelector<HTMLElement>("[data-p4-map-canvas]");
    mapCanvas?.setAttribute("data-akarfinder-city-color-overview-active", "true");

    const originals = new globalThis.Map<HTMLElement, OriginalVisualState>();
    const remember = (node: HTMLElement) => {
      if (originals.has(node)) return;
      originals.set(node, {
        style: node.style.cssText,
        childStyles: [...node.children].map((child) => child instanceof HTMLElement ? child.style.cssText : ""),
      });
    };

    const applyColor = (node: HTMLElement) => {
      const meta = findCityTerritorialColorInText(node.textContent ?? "");
      if (!meta) return;
      remember(node);

      if (node.matches(".maplibre-cluster-marker")) {
        node.dataset.akarfinderCityColorOverview = "true";
        node.dataset.akarfinderCityColor = meta.slug;
        node.dataset.akarfinderCityColorMeaning = CITY_TERRITORIAL_COLOR_MEANING;
        node.style.borderColor = meta.color;
        node.style.backgroundColor = "#ffffff";
        node.style.boxShadow = `0 0 0 12px ${meta.color}24, 0 0 0 26px ${meta.color}0F, 0 6px 20px rgba(7,27,51,0.18)`;
        const badge = node.querySelector<HTMLElement>("span:first-child");
        if (badge) {
          badge.style.background = meta.color;
          badge.style.color = "#ffffff";
        }
        return;
      }

      node.dataset.akarfinderCityColorChip = meta.slug;
      node.dataset.akarfinderCityColorMeaning = CITY_TERRITORIAL_COLOR_MEANING;
      node.style.borderColor = `${meta.color}70`;
      node.style.backgroundColor = meta.soft;
      node.style.boxShadow = `inset 0 0 0 1px ${meta.color}18`;
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>(
        ".maplibre-cluster-marker, [data-p4-map-decision-rail] a",
      ).forEach(applyColor);
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const [node, original] of originals) {
        if (!node.isConnected) continue;
        node.style.cssText = original.style;
        [...node.children].forEach((child, index) => {
          if (child instanceof HTMLElement) child.style.cssText = original.childStyles[index] ?? "";
        });
        delete node.dataset.akarfinderCityColorOverview;
        delete node.dataset.akarfinderCityColor;
        delete node.dataset.akarfinderCityColorChip;
        delete node.dataset.akarfinderCityColorMeaning;
      }
      mapCanvas?.removeAttribute("data-akarfinder-city-color-overview-active");
    };
  }, [navigationState.layer, selectedCity]);

  // Once a semantic market layer is active, the map itself is the district
  // explorer. Keeping a second floating district rail on top of polygons makes
  // the intelligence harder to read and intercepts genuine map interactions.
  if (navigationState.layer !== MAP_LAYER_EXPLORE) return null;

  return (
    <>
      <style>{`
        @media (max-width: 639px) {
          [data-akarfinder-generic-map-shell="true"] nav[data-akarfinder-territorial-explorer] {
            top: 320px !important;
          }
          [data-akarfinder-generic-map-shell="true"] nav[data-akarfinder-territorial-explorer][data-akarfinder-selected-city="true"] > div:first-child {
            display: none !important;
          }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          [data-akarfinder-generic-map-shell="true"] nav[data-akarfinder-territorial-explorer] {
            top: 270px !important;
          }
        }
        @media (min-width: 1024px) {
          [data-akarfinder-generic-map-shell="true"] nav[data-akarfinder-territorial-explorer] {
            top: 266px !important;
          }
        }
      `}</style>
      <nav
        className={`pointer-events-auto absolute left-3 right-3 top-[112px] z-20 overflow-hidden rounded-2xl border border-border-strong/70 bg-card/94 text-card-foreground shadow-panel backdrop-blur-xl sm:left-4 sm:right-auto sm:top-[128px] lg:top-[96px] ${explorerWidthClass}`}
        aria-label="Exploration territoriale"
        data-akarfinder-territorial-explorer
        data-akarfinder-selected-city={selectedCity ? "true" : "false"}
        data-akarfinder-city-color-legend={!selectedCity ? CITY_TERRITORIAL_COLOR_MEANING : undefined}
      >
        <div className="flex min-w-0 items-center gap-1 border-b border-border px-2.5 py-1.5 sm:px-3.5">
          <button
            type="button"
            onClick={() => onNavigationChange(withMapLocation(navigationState, "all"))}
            className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-1.5 text-[11px] font-extrabold text-brand-primary transition hover:bg-brand-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35"
            aria-current={!selectedCity ? "location" : undefined}
          >
            <Map size={13} aria-hidden="true" />
            Maroc
          </button>
          {selectedCity ? (
            <>
              <ChevronRight size={12} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <button
                type="button"
                onClick={() => onNavigationChange(withMapLocation(navigationState, selectedCity))}
                className="min-h-8 min-w-0 truncate rounded-lg px-1.5 py-1 text-[11px] font-extrabold text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35"
                aria-current={!selectedDistrict ? "location" : undefined}
              >
                {selectedCity}
              </button>
            </>
          ) : null}
          {selectedDistrict ? (
            <>
              <ChevronRight size={12} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="inline-flex min-h-8 min-w-0 items-center truncate rounded-lg bg-brand-primary-soft px-2 text-[10.5px] font-extrabold text-brand-primary" aria-current="location">
                {selectedDistrict.neighborhood}
              </span>
            </>
          ) : null}
          <span className="ml-auto hidden shrink-0 rounded-full bg-surface-muted px-2 py-1 text-[9.5px] font-extrabold text-muted-foreground sm:inline-flex">
            {selectedCity
              ? `${districts.length} quartier${districts.length !== 1 ? "s" : ""}`
              : `${cityEntries.length} villes`}
          </span>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2">
          <p className="inline-flex shrink-0 items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground sm:text-[9.5px] sm:tracking-[0.1em]">
            {selectedCity ? <MapPin size={11} aria-hidden="true" /> : null}
            {selectedCity ? "Quartiers" : "Villes"}
            {!selectedCity ? (
              <span className="hidden normal-case tracking-normal text-muted-foreground/80 sm:inline">· couleur = repère</span>
            ) : null}
          </p>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {selectedCity
              ? districts.map((point) => {
                    const active = selectedDistrict?.id === point.id;
                    return (
                      <button
                        key={point.id}
                        type="button"
                        onClick={() => onNavigationChange(withMapLocation(navigationState, point.city, point.neighborhood))}
                        className={active
                          ? "h-10 shrink-0 rounded-full border border-brand-primary bg-brand-primary-soft px-3 text-[10.5px] font-extrabold text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 sm:h-9"
                          : "h-10 shrink-0 rounded-full border border-border bg-surface px-3 text-[10.5px] font-extrabold text-text-secondary transition hover:border-brand-primary/35 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 sm:h-9"}
                        aria-pressed={active}
                      >
                        {point.neighborhood}
                      </button>
                    );
                  })
                : cityEntries.map(({ city, count }) => {
                    const colorMeta = getCityTerritorialColor(city);
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => onNavigationChange(withMapLocation(navigationState, city))}
                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10.5px] font-extrabold text-foreground transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 sm:h-9"
                        style={colorMeta ? {
                          borderColor: `${colorMeta.color}70`,
                          backgroundColor: colorMeta.soft,
                          boxShadow: `inset 0 0 0 1px ${colorMeta.color}18`,
                        } : undefined}
                        data-akarfinder-city-color-chip={colorMeta?.slug}
                        data-akarfinder-city-color-meaning={colorMeta ? CITY_TERRITORIAL_COLOR_MEANING : undefined}
                      >
                        <span>{city}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </button>
                    );
                  })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
