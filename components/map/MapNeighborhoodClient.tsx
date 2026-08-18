"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronUp, MapPin, RotateCcw, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapLegend } from "@/components/map/MapLegend";
import { TerritorialExplorer } from "@/components/map/TerritorialExplorer";
import {
  resolveCityEntity,
  resolveNeighborhoodEntity,
} from "@/lib/geo/geo-entity-registry";
import {
  getBenchmarkLabel,
  getNeighborhoodBySlug,
} from "@/lib/map/canonical-neighborhood-data";
import { getMapConfidenceMeta } from "@/lib/map/map-design-system";
import {
  buildMapHref,
  buildMapSearchHref,
  buildNeighborhoodPageHref,
  MAP_LAYER_EXPLORE,
  MAP_LAYER_PRICE,
  mapNavigationStateFromUrlSearchParams,
  withMapLayer,
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
  const [mobilePanelExpanded, setMobilePanelExpanded] = useState(false);

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

  const genericSearchHref = useMemo(
    () => buildMapSearchHref(navigationState),
    [navigationState],
  );

  const selectedGenericNeighborhoodHref = useMemo(
    () => buildNeighborhoodPageHref(navigationState),
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

  const selectedGenericPoint = useMemo(() => {
    if (navigationState.city === "all" || !navigationState.district) return null;
    const city = resolveCityEntity(navigationState.city);
    if (!city) return null;
    return getNeighborhoodBySlug(city.slug, navigationState.district);
  }, [navigationState.city, navigationState.district]);

  const selectedGenericConfidence = useMemo(
    () => selectedGenericPoint ? getMapConfidenceMeta(selectedGenericPoint.confidence) : null,
    [selectedGenericPoint],
  );

  useEffect(() => {
    const currentHref = queryString ? `/map?${queryString}` : "/map";
    if (currentHref !== canonicalHref) {
      router.replace(canonicalHref, { scroll: false });
    }
  }, [canonicalHref, queryString, router]);

  useEffect(() => {
    setMobilePanelExpanded(false);
  }, [navigationState.city, navigationState.district]);

  const handleNavigationChange = useCallback(
    (nextState: MapNavigationState) => {
      router.push(buildMapHref(nextState), { scroll: false });
    }, [router],
  );

  const marketIntelligenceProvider = getPremiumMarketIntelligenceProvider(navigationState.city);
  const genericPriceMode = navigationState.layer === MAP_LAYER_PRICE && navigationState.city !== "all";

  return (
    <div
      className="relative min-h-[calc(100svh-64px)] bg-background"
      data-akarfinder-generic-map-shell={marketIntelligenceProvider ? undefined : "true"}
      data-akarfinder-generic-map-selected={marketIntelligenceProvider ? undefined : navigationState.district ? "true" : "false"}
      data-akarfinder-mobile-panel-expanded={marketIntelligenceProvider ? undefined : mobilePanelExpanded ? "true" : "false"}
    >
      <style>{`
        [data-akarfinder-generic-map-shell="true"] section[aria-label="Contrôles de la carte immobilière"] {
          display: none !important;
        }
        @media (min-width: 1024px) {
          [data-akarfinder-generic-map-shell="true"] nav[aria-label="Exploration territoriale"] {
            top: 176px !important;
          }
          [data-akarfinder-generic-map-shell="true"] aside[aria-label^="Fiche repère quartier"] {
            top: 176px !important;
            width: 390px !important;
            border-radius: 22px !important;
            border-color: rgb(255 255 255 / 0.82) !important;
            box-shadow: 0 22px 60px rgb(15 35 66 / 0.17) !important;
          }
        }
        @media (max-width: 1023px) {
          [data-akarfinder-generic-map-selected="true"] [data-akarfinder-generic-premium-toolbar],
          [data-akarfinder-generic-map-selected="true"] nav[aria-label="Exploration territoriale"],
          [data-akarfinder-generic-map-selected="true"] > aside[aria-label="Légende de la carte immobilière"] {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          [data-akarfinder-generic-map-selected="true"][data-akarfinder-mobile-panel-expanded="false"] > div:has(> .maplibregl-map) {
            height: min(100vw, 430px) !important;
            max-height: 430px !important;
            overflow: hidden !important;
            border-radius: 0 0 24px 24px !important;
            box-shadow: 0 10px 28px rgb(15 35 66 / 0.12) !important;
          }
          [data-akarfinder-mobile-panel-expanded="false"] aside[aria-label^="Fiche repère quartier"] {
            display: none !important;
          }
          [data-akarfinder-generic-map-selected="true"][data-akarfinder-mobile-panel-expanded="false"] [data-akarfinder-mobile-compact-panel] {
            top: calc(min(100vw, 430px) + 10px) !important;
            bottom: auto !important;
          }
          [data-akarfinder-mobile-panel-expanded="true"] aside[aria-label^="Fiche repère quartier"] {
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
            className="absolute inset-x-3 top-3 z-40 rounded-[22px] border border-white/80 bg-card/94 p-3 shadow-[0_18px_50px_rgba(15,35,66,0.14)] backdrop-blur-xl sm:inset-x-auto sm:left-4 sm:right-4 sm:top-4 lg:right-auto lg:w-[min(900px,calc(100vw-430px))]"
            aria-label="Contrôles carte des quartiers multi-villes"
            data-akarfinder-generic-premium-toolbar
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-brand-primary">Carte des quartiers</p>
                <p className="mt-0.5 truncate text-[13px] font-extrabold tracking-[-0.01em] text-foreground sm:text-[15px]">{activeCityName} · exploration immobilière</p>
              </div>
              <button
                type="button"
                onClick={() => handleNavigationChange(withMapLocation({ ...navigationState, layer: MAP_LAYER_EXPLORE }, "all"))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:border-brand-primary/30 hover:text-brand-primary"
                aria-label="Revenir à la carte du Maroc"
                title="Tout le Maroc"
              >
                <RotateCcw size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 hidden gap-1.5 overflow-x-auto pb-0.5 sm:flex" role="navigation" aria-label="Sélection des villes phares">
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

            <label className="mt-3 block sm:hidden">
              <span className="sr-only">Ville</span>
              <select
                value={activeCityName === "Maroc" ? "Casablanca" : activeCityName}
                onChange={(event) => handleNavigationChange(withMapLocation(navigationState, event.target.value))}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-[11px] font-extrabold text-foreground outline-none"
              >
                {FLAGSHIP_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </label>

            <div className="mt-3 flex flex-col gap-2 border-t border-border/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 rounded-xl border border-border bg-surface-muted/80 p-1" role="tablist" aria-label="Mode carte multi-villes">
                <button
                  type="button"
                  role="tab"
                  aria-selected={!genericPriceMode}
                  onClick={() => handleNavigationChange(withMapLayer(navigationState, MAP_LAYER_EXPLORE))}
                  className={`min-w-0 flex-1 rounded-lg px-2.5 py-2 text-[10px] font-extrabold transition sm:text-[10.5px] ${!genericPriceMode ? "bg-brand-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Zones / Quartiers
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={genericPriceMode}
                  disabled={navigationState.city === "all"}
                  onClick={() => handleNavigationChange(withMapLayer(navigationState, MAP_LAYER_PRICE))}
                  className={`min-w-0 flex-1 rounded-lg px-2.5 py-2 text-[10px] font-extrabold transition sm:text-[10.5px] ${genericPriceMode ? "bg-brand-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Prix observés
                </button>
              </div>

              <Link
                href={genericSearchHref}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-4 text-[11px] font-extrabold text-white shadow-accent transition hover:bg-brand-primary-hover"
              >
                <Search size={14} aria-hidden="true" />
                Rechercher cette zone
              </Link>
            </div>
          </section>

          {selectedGenericPoint && !mobilePanelExpanded ? (
            <aside
              className="absolute inset-x-3 bottom-[84px] z-50 rounded-[22px] border border-white/85 bg-card/96 p-3.5 shadow-[0_18px_48px_rgba(15,35,66,0.18)] backdrop-blur-xl md:hidden"
              aria-label={`Aperçu quartier ${selectedGenericPoint.neighborhood}`}
              data-akarfinder-mobile-compact-panel
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-brand-primary">
                    <MapPin size={11} aria-hidden="true" />
                    {selectedGenericPoint.city} · quartier sélectionné
                  </p>
                  <h2 className="mt-1 truncate text-[18px] font-extrabold tracking-[-0.025em] text-foreground">
                    {selectedGenericPoint.neighborhood}
                  </h2>
                  <p className="mt-1 text-[11px] font-extrabold text-brand-primary">
                    {getBenchmarkLabel(selectedGenericPoint)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigationChange(withMapLocation(navigationState, selectedGenericPoint.city))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted-foreground"
                  aria-label="Fermer le quartier sélectionné"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {selectedGenericConfidence ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-extrabold"
                    style={{
                      color: selectedGenericConfidence.color,
                      borderColor: `${selectedGenericConfidence.color}40`,
                      background: selectedGenericConfidence.soft,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: selectedGenericConfidence.color }} aria-hidden="true" />
                    {selectedGenericConfidence.label}
                  </span>
                ) : null}
                <span className="rounded-full border border-border bg-surface-muted px-2 py-1 text-[9px] font-bold text-muted-foreground">
                  Données {selectedGenericPoint.benchmark.period}
                </span>
              </div>

              {selectedGenericPoint.highlights.length > 0 ? (
                <div className="mt-2 flex gap-1.5 overflow-hidden" aria-label="Vie autour du quartier">
                  {selectedGenericPoint.highlights.slice(0, 3).map((highlight, index) => (
                    <span
                      key={`${highlight.label}-${index}`}
                      className="min-w-0 truncate rounded-full border border-border bg-surface px-2 py-1 text-[9px] font-semibold text-text-secondary"
                    >
                      <span aria-hidden="true">{highlight.icon}</span> {highlight.label}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <Link
                  href={genericSearchHref}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-3 text-[11.5px] font-extrabold text-white shadow-accent"
                >
                  <Search size={14} aria-hidden="true" />
                  Rechercher ici
                </Link>
                <button
                  type="button"
                  onClick={() => setMobilePanelExpanded(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border-strong bg-surface px-3 text-[11px] font-extrabold text-foreground"
                  aria-label="Afficher les détails du quartier"
                >
                  Détails
                  <ChevronUp size={14} aria-hidden="true" />
                </button>
              </div>

              {selectedGenericNeighborhoodHref ? (
                <Link
                  href={selectedGenericNeighborhoodHref}
                  className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-border bg-surface text-[10.5px] font-extrabold text-foreground"
                >
                  Voir la page quartier
                </Link>
              ) : null}
            </aside>
          ) : null}

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
