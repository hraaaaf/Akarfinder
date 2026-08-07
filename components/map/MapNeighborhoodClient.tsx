"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    <MapNeighborhoodExperienceDynamic
      navigationState={navigationState}
      onNavigationChange={handleNavigationChange}
    />
  );
}
