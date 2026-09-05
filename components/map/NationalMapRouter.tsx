"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapNeighborhoodClient } from "@/components/map/MapNeighborhoodClient";
import { NationalNeighborhoodOverlayBridge } from "@/components/map/NationalNeighborhoodOverlayBridge";
import { getPremiumMarketIntelligenceProvider } from "@/lib/map/premium-map-city-registry";
import { MAP_LAYER_EXPLORE, type MapNavigationState } from "@/lib/map/map-navigation-state";

const NationalTerritoryExperienceDynamic = dynamic(
  () => import("@/components/map/NationalTerritoryExperience").then((mod) => ({ default: mod.NationalTerritoryExperience })),
  { ssr: false },
);

type Props = { initialState: MapNavigationState };

type NationalMapWindow = Window & {
  __AKARFINDER_NATIONAL_MAP__?: { resize: () => void };
};

function safeSlug(value: string | null): string | null {
  if (!value || value === "all") return null;
  const slug = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug && slug.length <= 90 ? slug : null;
}

export function NationalMapRouter({ initialState }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const shellRef = useRef<HTMLDivElement>(null);
  const rawCity = params.get("city");
  const rawLayer = params.get("layer") ?? MAP_LAYER_EXPLORE;
  const selectedCitySlug = useMemo(() => safeSlug(rawCity), [rawCity]);
  const selectedDistrictSlug = useMemo(() => safeSlug(params.get("district")), [params]);
  const premiumProvider = getPremiumMarketIntelligenceProvider(selectedCitySlug ?? "all");
  const useNationalExplore = rawLayer === MAP_LAYER_EXPLORE && premiumProvider !== "rabat-market-intelligence";

  useEffect(() => {
    if (!useNationalExplore || !shellRef.current) return;

    let frame = 0;
    const resizeMap = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        (window as NationalMapWindow).__AKARFINDER_NATIONAL_MAP__?.resize();
      });
    };

    resizeMap();
    const observer = new ResizeObserver(resizeMap);
    observer.observe(shellRef.current);
    window.addEventListener("orientationchange", resizeMap);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("orientationchange", resizeMap);
    };
  }, [useNationalExplore]);

  const selectCity = useCallback((slug: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("city", slug);
    next.delete("district");
    next.set("layer", MAP_LAYER_EXPLORE);
    router.push(`/map?${next.toString()}`, { scroll: false });
  }, [params, router]);

  const selectDistrict = useCallback((slug: string) => {
    if (!selectedCitySlug) return;
    const next = new URLSearchParams(params.toString());
    next.set("city", selectedCitySlug);
    next.set("district", slug);
    next.set("layer", MAP_LAYER_EXPLORE);
    router.push(`/map?${next.toString()}`, { scroll: false });
  }, [params, router, selectedCitySlug]);

  const backToMorocco = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("city");
    next.delete("district");
    next.set("layer", MAP_LAYER_EXPLORE);
    router.push(`/map?${next.toString()}`, { scroll: false });
  }, [params, router]);

  if (!useNationalExplore) return <MapNeighborhoodClient initialState={initialState} />;

  return (
    <div ref={shellRef} className="relative h-[calc(100svh-64px)] min-h-[520px] overflow-hidden" data-vivre-ici-map-shell>
      <NationalTerritoryExperienceDynamic
        selectedCitySlug={selectedCitySlug}
        onSelectCity={selectCity}
        onBackToMorocco={backToMorocco}
      />
      <NationalNeighborhoodOverlayBridge
        citySlug={selectedCitySlug}
        districtSlug={selectedDistrictSlug}
        onSelectDistrict={selectDistrict}
      />
    </div>
  );
}
