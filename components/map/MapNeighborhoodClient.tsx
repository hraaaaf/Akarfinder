"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-deepblue">
        <div className="text-center text-white">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-[14px] font-bold text-white/72">Chargement de la carte…</p>
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
      {unmappedDistrict ? (
        <div className="pointer-events-none absolute left-1/2 top-[118px] z-30 w-[min(92vw,430px)] -translate-x-1/2 sm:top-[150px]">
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
