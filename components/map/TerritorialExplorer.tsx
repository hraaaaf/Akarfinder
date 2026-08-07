"use client";

import { ChevronRight, Map, MapPin } from "lucide-react";
import { useMemo } from "react";
import { resolveCityEntity } from "@/lib/geo/geo-entity-registry";
import {
  getNeighborhoodCities,
  getNeighborhoodsByCity,
} from "@/lib/map/canonical-neighborhood-data";
import {
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

  return (
    <nav
      className="pointer-events-auto absolute left-3 right-3 top-[92px] z-20 overflow-hidden rounded-2xl border border-border-strong/70 bg-card/94 text-card-foreground shadow-panel backdrop-blur-xl sm:left-4 sm:right-auto sm:top-[96px] sm:w-[min(720px,calc(100vw-32px))]"
      aria-label="Exploration territoriale"
    >
      <div className="flex min-w-0 items-center gap-1 border-b border-border px-3 py-2 sm:px-3.5">
        <button
          type="button"
          onClick={() => onNavigationChange(withMapLocation(navigationState, "all"))}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-1.5 text-[10.5px] font-extrabold text-brand-primary transition hover:bg-brand-primary-soft"
          aria-current={!selectedCity ? "location" : undefined}
        >
          <Map size={12} aria-hidden="true" />
          Maroc
        </button>
        {selectedCity ? (
          <>
            <ChevronRight size={12} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <button
              type="button"
              onClick={() => onNavigationChange(withMapLocation(navigationState, selectedCity))}
              className="min-w-0 truncate rounded-lg px-1.5 py-1.5 text-[10.5px] font-extrabold text-foreground transition hover:bg-surface-muted"
              aria-current={!selectedDistrict ? "location" : undefined}
            >
              {selectedCity}
            </button>
          </>
        ) : null}
        {selectedDistrict ? (
          <>
            <ChevronRight size={12} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 truncate rounded-lg bg-brand-primary-soft px-2 py-1.5 text-[10.5px] font-extrabold text-brand-primary" aria-current="location">
              {selectedDistrict.neighborhood}
            </span>
          </>
        ) : null}
        <span className="ml-auto shrink-0 text-[9px] font-bold text-muted-foreground">
          {selectedCity
            ? `${districts.length} quartier${districts.length !== 1 ? "s" : ""}`
            : `${cityEntries.length} villes`}
        </span>
      </div>

      <div className="px-3 py-2.5 sm:px-3.5">
        <div className="flex items-center gap-2">
          <p className="inline-flex shrink-0 items-center gap-1 text-[8.5px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground">
            {selectedCity ? <MapPin size={10} aria-hidden="true" /> : null}
            {selectedCity ? "Quartiers" : "Villes"}
          </p>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {selectedCity
                ? districts.map((point) => {
                    const active = selectedDistrict?.id === point.id;
                    return (
                      <button
                        key={point.id}
                        type="button"
                        onClick={() => onNavigationChange(withMapLocation(navigationState, point.city, point.neighborhood))}
                        className={active
                          ? "h-8 shrink-0 rounded-full border border-brand-primary bg-brand-primary-soft px-3 text-[10px] font-extrabold text-brand-primary"
                          : "h-8 shrink-0 rounded-full border border-border bg-surface px-3 text-[10px] font-bold text-text-secondary transition hover:border-brand-primary/35 hover:text-brand-primary"}
                        aria-pressed={active}
                      >
                        {point.neighborhood}
                      </button>
                    );
                  })
                : cityEntries.map(({ city, count }) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => onNavigationChange(withMapLocation(navigationState, city))}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10px] font-extrabold text-foreground transition hover:border-brand-primary/35 hover:bg-brand-primary-soft/60"
                    >
                      <span>{city}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </button>
                  ))}
            </div>
          </div>
        </div>
        <p className="mt-1.5 truncate text-[8.5px] font-semibold text-muted-foreground sm:text-[9px]">
          {selectedCity
            ? "Choisissez un quartier · Maroc pour changer de ville"
            : "Maroc → ville → quartier · repères canoniques publiés"}
        </p>
      </div>
    </nav>
  );
}
