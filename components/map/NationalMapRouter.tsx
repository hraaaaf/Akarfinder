"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapNeighborhoodClient } from "@/components/map/MapNeighborhoodClient";
import { MapLibreNeighborhood3D } from "@/components/map/MapLibreNeighborhood3D";
import { NationalNeighborhoodOverlayBridge } from "@/components/map/NationalNeighborhoodOverlayBridge";
import { getNeighborhoodBySlug } from "@/lib/map/canonical-neighborhood-data";
import { MAARIF_TARGET_PILOT_BOUNDARY } from "@/lib/map/maarif-osm-arrondissement-shadow";
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
  // Shadow OSM geometry only in an explicitly enabled local QA preview.
  // Never treated as a reviewed or official border in public production.
  const allowShadowAdministrativePreview = process.env.NEXT_PUBLIC_VIVRE_ICI_ADMIN_SHADOW_PREVIEW === "true";
  const rawCity = params.get("city");
  const rawLayer = params.get("layer") ?? MAP_LAYER_EXPLORE;
  const selectedCitySlug = useMemo(() => safeSlug(rawCity), [rawCity]);
  const selectedDistrictSlug = useMemo(() => safeSlug(params.get("district")), [params]);
  const selectedNeighborhood = useMemo(
    () => selectedCitySlug && selectedDistrictSlug
      ? getNeighborhoodBySlug(selectedCitySlug, selectedDistrictSlug)
      : null,
    [selectedCitySlug, selectedDistrictSlug],
  );
  // L4-B: the historical seeded neighborhood center is not sufficient to
  // claim a mapped location. Gate district MapLibre on the source V5 label
  // having a real OSM center; absent center => city + honest text preview.
  const districtSourceKey = selectedCitySlug && selectedDistrictSlug
    ? `${selectedCitySlug}/${selectedDistrictSlug}` : null;
  const [sourceCenter, setSourceCenter] = useState<{ key: string; center: [number, number] | null } | null>(null);
  const hasCanonicalNeighborhood = Boolean(selectedNeighborhood);

  useEffect(() => {
    if (!districtSourceKey || !hasCanonicalNeighborhood || rawLayer !== MAP_LAYER_EXPLORE) return;
    const controller = new AbortController();
    const citySlug = selectedCitySlug!;
    const districtSlug = selectedDistrictSlug!;
    void fetch(`/api/geo/national-territories?city=${encodeURIComponent(citySlug)}`, {
      cache: "no-store", signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`neighborhood source HTTP ${response.status}`);
        return response.json() as Promise<{
          status: string;
          place?: { slug?: string };
          neighborhoods?: Array<{
            slug: string;
            center: { lng: number; lat: number } | null;
            sourceKinds: string[];
          }>;
        }>;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        const expectedSourceSlug = citySlug === "mohammedia" ? "mohammadia" : citySlug;
        const candidate = payload.status === "ok" && payload.place?.slug === expectedSourceSlug
          ? payload.neighborhoods?.find((item) => item.slug === districtSlug) : null;
        const center = candidate?.sourceKinds?.includes("osm_neighborhood_label") &&
          candidate.center && Number.isFinite(candidate.center.lng) &&
          Number.isFinite(candidate.center.lat) &&
          Math.abs(candidate.center.lng) <= 180 && Math.abs(candidate.center.lat) <= 90
            ? [candidate.center.lng, candidate.center.lat] as [number, number]
            : null;
        setSourceCenter({ key: districtSourceKey, center });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSourceCenter({ key: districtSourceKey, center: null });
      });
    return () => controller.abort();
  }, [districtSourceKey, hasCanonicalNeighborhood, rawLayer, selectedCitySlug, selectedDistrictSlug]);

  const verifiedCenter = sourceCenter && sourceCenter.key === districtSourceKey ? sourceCenter.center : null;
  const useMapLibreNeighborhood = rawLayer === MAP_LAYER_EXPLORE
    && hasCanonicalNeighborhood && Boolean(verifiedCenter);
  // Vivre Ici's sourced Explore path is consistent in all eight cities,
  // including Rabat. Dedicated market intelligence remains on non-Explore layers.
  const useNationalExplore = rawLayer === MAP_LAYER_EXPLORE && !useMapLibreNeighborhood;

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

  if (useMapLibreNeighborhood && selectedNeighborhood) {
    const isMaarifReference = selectedNeighborhood.citySlug === "casablanca"
      && selectedNeighborhood.neighborhoodSlug === "maarif";
    return (
      <MapLibreNeighborhood3D
        citySlug={selectedNeighborhood.citySlug}
        cityLabel={selectedNeighborhood.city}
        districtSlug={selectedNeighborhood.neighborhoodSlug}
        districtLabel={selectedNeighborhood.neighborhood}
        center={verifiedCenter!}
        desktopCameraOffset={isMaarifReference ? [-0.0055, 0.0090] : [0, 0]}
        administrativeBoundaryPreview={isMaarifReference && allowShadowAdministrativePreview
          && MAARIF_TARGET_PILOT_BOUNDARY.status === "shadow-reference"
          && MAARIF_TARGET_PILOT_BOUNDARY.reviewed === false
          && MAARIF_TARGET_PILOT_BOUNDARY.publicationStatus === "shadow"
            ? MAARIF_TARGET_PILOT_BOUNDARY.geometry : null}
      />
    );
  }

  if (!useNationalExplore) return <MapNeighborhoodClient initialState={initialState} />;

  return (
    <div ref={shellRef} className="relative h-[calc(100svh-64px)] min-h-[520px] overflow-hidden" data-vivre-ici-map-shell>
      <NationalTerritoryExperienceDynamic
        selectedCitySlug={selectedCitySlug}
        selectedDistrictSlug={selectedDistrictSlug}
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
