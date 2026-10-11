"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapNeighborhoodClient } from "@/components/map/MapNeighborhoodClient";
import { MapLibreNeighborhood3D, type TargetPilotLandmark } from "@/components/map/MapLibreNeighborhood3D";
import { National3DBuildingsLayer } from "@/components/map/National3DBuildingsLayer";
import { NationalNeighborhoodOverlayBridge } from "@/components/map/NationalNeighborhoodOverlayBridge";
import { getNeighborhoodBySlug } from "@/lib/map/canonical-neighborhood-data";
import { MAARIF_TARGET_PILOT_BOUNDARY } from "@/lib/geo/maarif-target-pilot-boundary";
import { getPremiumMarketIntelligenceProvider } from "@/lib/map/premium-map-city-registry";
import { MAP_LAYER_EXPLORE, type MapNavigationState } from "@/lib/map/map-navigation-state";

const NationalTerritoryExperienceDynamic = dynamic(
  () => import("@/components/map/NationalTerritoryExperience").then((mod) => ({ default: mod.NationalTerritoryExperience })),
  { ssr: false },
);

type Props = { initialState: MapNavigationState; targetPilotLandmarks?: readonly TargetPilotLandmark[] };

// N2 provides sourced label candidates, not certified quartier footprints.
// Their point may be shown as a *reference* map; a polygon is never inferred.
type N2PointCandidate = {
  citySlug: string;
  districtSlug: string;
  districtLabel: string;
  lng: number;
  lat: number;
};
type NationalNeighborhoodCatalogResponse = {
  status: string;
  view: string;
  place?: { slug: string };
  neighborhoods?: Array<{
    slug: string;
    name: string;
    center: { lng: number; lat: number } | null;
    sourceKinds?: string[];
    boundaryStatus: string;
    publicationStatus: string;
  }>;
};

type NationalMapWindow = Window & {
  __AKARFINDER_NATIONAL_MAP__?: { resize: () => void };
};

function safeSlug(value: string | null): string | null {
  if (!value || value === "all") return null;
  const slug = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug && slug.length <= 90 ? slug : null;
}

export function NationalMapRouter({ initialState, targetPilotLandmarks = [] }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const shellRef = useRef<HTMLDivElement>(null);
  const rawCity = params.get("city");
  const rawLayer = params.get("layer") ?? MAP_LAYER_EXPLORE;
  const selectedCitySlug = useMemo(() => safeSlug(rawCity), [rawCity]);
  const selectedDistrictSlug = useMemo(() => safeSlug(params.get("district")), [params]);
  const [n2Candidate, setN2Candidate] = useState<N2PointCandidate | null>(null);
  const selectedNeighborhood = useMemo(
    () => selectedCitySlug && selectedDistrictSlug
      ? getNeighborhoodBySlug(selectedCitySlug, selectedDistrictSlug)
      : null,
    [selectedCitySlug, selectedDistrictSlug],
  );
  // Only source-backed OSM/Barid locations with explicit N2 candidate status
  // qualify for indicative national maps. Never fabricate a center for postal
  // labels that have no coordinates.
  useEffect(() => {
    if (rawLayer !== MAP_LAYER_EXPLORE || !selectedCitySlug || !selectedDistrictSlug || selectedNeighborhood) {
      setN2Candidate(null);
      return;
    }
    const abort = new AbortController();
    setN2Candidate(null);
    void fetch(`/api/geo/national-territories?city=${encodeURIComponent(selectedCitySlug)}`, {
      signal: abort.signal,
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) return null;
      return response.json() as Promise<NationalNeighborhoodCatalogResponse>;
    }).then((data) => {
      if (abort.signal.aborted || !data || data.status !== "ok" || data.view !== "city"
        || data.place?.slug !== selectedCitySlug) return;
      const item = data.neighborhoods?.find((candidate) =>
        candidate.slug === selectedDistrictSlug
        && candidate.publicationStatus === "label_candidate"
        && candidate.boundaryStatus === "not_claimed"
        && candidate.sourceKinds?.some((source) =>
          source === "osm_neighborhood_label" || source === "barid_postal_neighborhood")
        && Number.isFinite(candidate.center?.lng) && Number.isFinite(candidate.center?.lat)
        && (candidate.center?.lng ?? 99) >= -14.5 && (candidate.center?.lng ?? -99) <= 2.5
        && (candidate.center?.lat ?? 99) >= 20.5 && (candidate.center?.lat ?? -99) <= 37.5);
      if (!item?.center) return;
      setN2Candidate({
        citySlug: selectedCitySlug,
        districtSlug: selectedDistrictSlug,
        districtLabel: item.name,
        lng: item.center.lng,
        lat: item.center.lat,
      });
    }).catch((error) => {
      if (!abort.signal.aborted) console.warn("[vivre-ici-n2-point] source unavailable", error);
    });
    return () => abort.abort();
  }, [rawLayer, selectedCitySlug, selectedDistrictSlug, selectedNeighborhood]);

  const resolvedN2Candidate = n2Candidate?.citySlug === selectedCitySlug
    && n2Candidate.districtSlug === selectedDistrictSlug ? n2Candidate : null;
  const useMapLibreNeighborhood = rawLayer === MAP_LAYER_EXPLORE
    && (Boolean(selectedNeighborhood) || Boolean(resolvedN2Candidate));
  const premiumProvider = getPremiumMarketIntelligenceProvider(selectedCitySlug ?? "all");
  const useNationalExplore = rawLayer === MAP_LAYER_EXPLORE
    && premiumProvider !== "rabat-market-intelligence"
    && !useMapLibreNeighborhood;

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

  if (useMapLibreNeighborhood && (selectedNeighborhood || resolvedN2Candidate)) {
    const isMaarifReference = selectedNeighborhood?.citySlug === "casablanca"
      && selectedNeighborhood.neighborhoodSlug === "maarif";
    const citySlug = selectedNeighborhood?.citySlug ?? resolvedN2Candidate!.citySlug;
    const districtSlug = selectedNeighborhood?.neighborhoodSlug ?? resolvedN2Candidate!.districtSlug;
    const districtLabel = selectedNeighborhood?.neighborhood ?? resolvedN2Candidate!.districtLabel;
    const center: [number, number] = selectedNeighborhood
      ? [selectedNeighborhood.lng, selectedNeighborhood.lat]
      : [resolvedN2Candidate!.lng, resolvedN2Candidate!.lat];
    return (
      <MapLibreNeighborhood3D
        citySlug={citySlug}
        cityLabel={selectedNeighborhood?.city ?? selectedCitySlug ?? ""}
        districtSlug={districtSlug}
        districtLabel={districtLabel}
        center={center}
        pointReferenceStatus={selectedNeighborhood ? "canonical" : "sourced-label-candidate"}
        boundaryGeometry={isMaarifReference ? MAARIF_TARGET_PILOT_BOUNDARY.geometry : null}
        desktopCameraOffset={isMaarifReference ? [0.0005, -0.0040] : [0, 0]}
        // National Vivre Ici rollout: all *registered* quartier routes share the
        // 2D AkarFinder vector renderer. Data and geometry stay per-city, per-district.
        targetComposition="context"
        targetPilotLandmarks={isMaarifReference ? targetPilotLandmarks : []}
      />
    );
  }

  if (!useNationalExplore) return <MapNeighborhoodClient initialState={initialState} />;

  return (
    <div ref={shellRef} className="relative h-[calc(100svh-64px)] min-h-[520px] overflow-hidden" data-vivre-ici-map-shell>
      <NationalTerritoryExperienceDynamic
        selectedCitySlug={selectedCitySlug}
        onSelectCity={selectCity}
        onBackToMorocco={backToMorocco}
      />
      <National3DBuildingsLayer citySlug={selectedCitySlug} districtSlug={selectedDistrictSlug} />
      <NationalNeighborhoodOverlayBridge
        citySlug={selectedCitySlug}
        districtSlug={selectedDistrictSlug}
        onSelectDistrict={selectDistrict}
      />
    </div>
  );
}
