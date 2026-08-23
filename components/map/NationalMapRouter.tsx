"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapNeighborhoodClient } from "@/components/map/MapNeighborhoodClient";
import { getPremiumMarketIntelligenceProvider } from "@/lib/map/premium-map-city-registry";
import { MAP_LAYER_EXPLORE, type MapNavigationState } from "@/lib/map/map-navigation-state";

const NationalTerritoryExperienceDynamic = dynamic(
  () => import("@/components/map/NationalTerritoryExperience").then((mod) => ({ default: mod.NationalTerritoryExperience })),
  { ssr: false },
);

type Props = { initialState: MapNavigationState };

function safeSlug(value: string | null): string | null {
  if (!value || value === "all") return null;
  const slug = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug && slug.length <= 90 ? slug : null;
}

export function NationalMapRouter({ initialState }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const rawCity = params.get("city");
  const rawLayer = params.get("layer") ?? MAP_LAYER_EXPLORE;
  const selectedCitySlug = useMemo(() => safeSlug(rawCity), [rawCity]);
  const premiumProvider = getPremiumMarketIntelligenceProvider(selectedCitySlug ?? "all");
  const useNationalExplore = rawLayer === MAP_LAYER_EXPLORE && premiumProvider !== "rabat-market-intelligence";

  const selectCity = useCallback((slug: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("city", slug);
    next.delete("district");
    next.set("layer", MAP_LAYER_EXPLORE);
    router.push(`/map?${next.toString()}`, { scroll: false });
  }, [params, router]);

  const backToMorocco = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("city");
    next.delete("district");
    next.set("layer", MAP_LAYER_EXPLORE);
    router.push(`/map?${next.toString()}`, { scroll: false });
  }, [params, router]);

  if (!useNationalExplore) return <MapNeighborhoodClient initialState={initialState} />;

  return (
    <NationalTerritoryExperienceDynamic
      selectedCitySlug={selectedCitySlug}
      onSelectCity={selectCity}
      onBackToMorocco={backToMorocco}
    />
  );
}
