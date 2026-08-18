"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapLegend } from "@/components/map/MapLegend";
import { TerritorialExplorer } from "@/components/map/TerritorialExplorer";
import {
  resolveCityEntity,
  resolveNeighborhoodEntity,
} from "@/lib/geo/geo-entity-registry";
import {
  buildMapHref,
  mapNavigationStateFromUrlSearchParams,
  withMapLocation,
  type MapNavigationState,
} from "@/lib/map/map-navigation-state";
import { getPremiumMarketIntelligenceProvider } from "@/lib/map/premium-map-city-registry";

const FLAGSHIP_CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"] as const;

const loadingFallback = (
  <div className="flex h-[calc(100svh-64px)] items-center justify-center bg-[#eef3f8] dark:bg-[#06162d]">
    <div className="rounded-2xl border border-border-strong/70 bg-card/95 px-5 py-4 text-center text-card-foreground shadow-card backdrop-blur-xl">
      <div className="mx-auto mb-2.5 h-6 w-6 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" />
      <p className="text-[11px] font-extrabold text-foreground">Chargement de la carte…</p>
    </div>
  </div>
);

const MapNeighborhoodExperienceDynamic = dynamic(
  () =>
    import("@/components/map/MapNeighborhoodExperience").then((mod) => ({
      default: mod.MapNeighborhoodExperience,
    })),
  { ssr: false, loading: () => loadingFallback },
);

const RabatMarketIntelligenceExperienceDynamic = dynamic(
  () =>
    import("@/components/map/RabatMarketIntelligenceExperience").then((mod) => ({
      default: mod.RabatMarketIntelligenceExperience,
    })),
  { ssr: false, loading: () => loadingFallback },
);

type MapNeighborhoodClientProps = {
  initialState: MapNavigationState;
};

export function MapNeighborhoodClient({ initialState }: MapNeighborhoodClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const navigationState = useMemo(
    () => queryString
      ? mapNavigationStateFromUrlSearchParams(new URLSearchParams(queryString))
      : initialState,
    [initialState, queryString],
  );

  const canonicalHref = useMemo(
    () => buildMapHref(navigationState),
    [navigationState],
  );

  const unmappedDistrict = useMemo(() => {
    if (navigationState.city === "all" || !navigationState.district) return null;
    const city = resolveCityEntity(navigationState.city);
    if (!city) return null;
    const district = resolveNeighborhoodEntity(city.canonical_name, navigationState.district);
    return district && !district.map_eligible ? district : null;
  }, [navigationState.city, navigationState.district]);

  const activeCityName = useMemo(() => {
    if (navigationState.city === "all") return "Maroc";
    return resolveCityEntity(navigationState.city)?.canonical_name ?? navigationState.city;
  }, [navigationState.city]);

  useEffect(() => {
    const currentHref = queryString ? `/map?${queryString}` : "/map";
    if (currentHref !== canonicalHref) {
      router.replace(canonicalHref, { scroll: false });
    }
  }, [canonicalHref, queryString, router]);

  const handleNavigationChange = useCallback(
    (nextState: MapNavigationState) => {
      router.push(buildMapHref(nextState), { scroll: false });
    }, [router],
  );

  const marketIntelligenceProvider = getPremiumMarketIntelligenceProvider(navigationState.city);

  return (
    <div
      className="relative"
      data-akarfinder-generic-map-shell={marketIntelligenceProvider ? undefined : "true"}
      data-akarfinder-generic-map-selected={marketIntelligenceProvider ? undefined : navigationState.district ? "true" : "false"}
    >
      <style>{`
        @media (min-width: 1024px) {
          [data-akarfinder-generic-map-shell="true"] section[aria-label="Contrôles de la carte immobilière"] {
            top: 94px !important;
            left: 16px !important;
            right: auto !important;
            width: min(900px, calc(100vw - 430px)) !important;
            max-width: none !important;
            border-radius: 0 0 22px 22px !important;
            border-color: rgb(255 255 255 / 0.82) !important;
            background: rgb(255 255 255 / 0.94) !important;
            box-shadow: 0 18px 50px rgb(15 35 66 / 0.14) !important;
            padding: 10px 12px !important;
          }
          [data-akarfinder-generic-map-shell="true"] section[aria-label="Contrôles de la carte immobilière"] > div:first-child > div:first-child,
          [data-akarfinder-generic-map-shell="true"] section[aria-label="Contrôles de la carte immobilière"] > div:first-child > label {
            display: none !important;
          }
          [data-akarfinder-generic-map-shell="true"] section[aria-label="Contrôles de la carte immobilière"] > div:first-child {
            justify-content: flex-end !important;
          }
          [data-akarfinder-generic-map-shell="true"] aside[aria-label^="Fiche repère quartier"] {
            top: 156px !important;
            width: 390px !important;
            border-radius: 22px !important;
            border-color: rgb(255 255 255 / 0.82) !important;
            box-shadow: 0 22px 60px rgb(15 35 66 / 0.17) !important;
          }
        }
        @media (max-width: 1023px) {
          [data-akarfinder-generic-map-selected="true"] section[aria-label="Contrôles de la carte immobilière"],
          [data-akarfinder-generic-map-selected="true"] nav[aria-label="Exploration territoriale"],
          [data-akarfinder-generic-map-selected="true"] > aside[aria-label="Légende de la carte immobilière"] {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          [data-akarfinder-generic-map-selected="true"] aside[aria-label^="Fiche repère quartier"] {
            bottom: 84px !important;
            max-height: min(58svh, 520px) !important;
            border-radius: 22px !important;
            box-shadow: 0 18px 48px rgb(15 35 66 / 0.18) !important;
          }
        }
      `}</style>
      {marketIntelligenceProvider === "rabat-market-intelligence" ? (
        <>
          <h1 className="sr-only">Carte intelligence marché à Rabat</h1>
          <style>{`
            @media (max-width: 639px) {
              [data-akarfinder-market-intelligence-map] section[aria-label="Contrôles intelligence marché"] > div:first-child {
                flex-wrap: wrap;
              }
              [data-akarfinder-market-intelligence-map] section[aria-label="Contrôles intelligence marché"] > div:first-child > label {
                order: 1;
                flex: 1 1 calc(100% - 48px);
              }
              [data-akarfinder-market-intelligence-map] section[aria-label="Contrôles intelligence marché"] > div:first-child > [role="tablist"] {
                order: 3;
                flex: 1 0 100%;
                width: 100%;
              }
              [data-akarfinder-market-intelligence-map] section[aria-label="Contrôles intelligence marché"] > div:first-child > button[aria-label="Revenir à la carte du Maroc"] {
                order: 2;
              }
            }
          `}</style>
          <RabatMarketIntelligenceExperienceDynamic
            navigationState={navigationState}
            onNavigationChange={handleNavigationChange}
          />
        </>
      ) : (
        <>
          <section
            className="absolute left-4 top-4 z-40 hidden w-[min(900px,calc(100vw-430px))] rounded-t-[22px] border border-b-0 border-white/80 bg-card/94 px-3 py-3 shadow-[0_18px_50px_rgba(15,35,66,0.14)] backdrop-blur-xl lg:block"
            aria-label="Villes phares"
            data-akarfinder-generic-premium-citybar
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 shrink-0">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-brand-primary">Carte des quartiers</p>
                <p className="mt-0.5 truncate text-[14px] font-extrabold tracking-[-0.01em] text-foreground">{activeCityName} · exploration immobilière</p>
              </div>
              <div className="flex min-w-0 items-center justify-end gap-1.5 overflow-x-auto" role="navigation" aria-label="Sélection des villes phares">
                {FLAGSHIP_CITIES.map((city) => {
                  const active = city === activeCityName;
                  return (
                    <button
                      key={city}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleNavigationChange(withMapLocation(navigationState, city))}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-extrabold transition ${active ? "border-brand-primary bg-brand-primary text-white shadow-sm" : "border-border bg-surface/90 text-text-secondary hover:border-brand-primary/25 hover:text-foreground"}`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
          <MapNeighborhoodExperienceDynamic
            navigationState={navigationState}
            onNavigationChange={handleNavigationChange}
          />
          <TerritorialExplorer
            navigationState={navigationState}
            onNavigationChange={handleNavigationChange}
          />
          <MapLegend />
        </>
      )}
      {unmappedDistrict ? (
        <div className="pointer-events-none absolute left-1/2 top-[210px] z-30 w-[min(92vw,430px)] -translate-x-1/2 sm:top-[232px]">
          <div className="rounded-xl border border-amber-200/80 bg-white/95 px-3.5 py-2.5 text-center shadow-[0_8px_24px_rgba(7,27,51,0.14)] backdrop-blur">
            <p className="text-[11px] font-extrabold text-[#071B33]">
              {unmappedDistrict.canonical_name} reste appliqué à votre recherche
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Repère cartographique non publié pour ce quartier — la vue ville est affichée sans inventer de limite.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
