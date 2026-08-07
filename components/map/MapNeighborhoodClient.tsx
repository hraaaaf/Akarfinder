"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TerritorialExplorer } from "@/components/map/TerritorialExplorer";
import {
  resolveCityEntity,
  resolveNeighborhoodEntity,
} from "@/lib/geo/geo-entity-registry";
import {
  buildMapHref,
  mapNavigationStateFromUrlSearchParams,
  type MapNavigationState,
} from "@/lib/map/map-navigation-state";

const MapNeighborhoodExperienceDynamic = dynamic(
  () =>
    import("@/components/map/MapNeighborhoodExperience").then((mod) => ({
      default: mod.MapNeighborhoodExperience,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100svh-64px)] items-center justify-center bg-[#eef3f8] dark:bg-[#06162d]">
        <div className="rounded-2xl border border-border-strong/70 bg-card/95 px-5 py-4 text-center text-card-foreground shadow-card backdrop-blur-xl">
          <div className="mx-auto mb-2.5 h-6 w-6 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" />
          <p className="text-[11px] font-extrabold text-foreground">Chargement de la carte…</p>
        </div>
      </div>
    ),
  },
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

  useEffect(() => {
    const currentHref = queryString ? `/map?${queryString}` : "/map";
    if (currentHref !== canonicalHref) {
      router.replace(canonicalHref, { scroll: false });
    }
  }, [canonicalHref, queryString, router]);

  const handleNavigationChange = useCallback(
    (nextState: MapNavigationState) => {
      router.push(buildMapHref(nextState), { scroll: false });
    },
    [router],
  );

  return (
    <div className="relative">
      <MapNeighborhoodExperienceDynamic
        navigationState={navigationState}
        onNavigationChange={handleNavigationChange}
      />
      <TerritorialExplorer
        navigationState={navigationState}
        onNavigationChange={handleNavigationChange}
      />
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
