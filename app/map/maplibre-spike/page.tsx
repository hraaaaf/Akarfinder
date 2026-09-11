import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MapLibreNeighborhood3D } from "@/components/map/MapLibreNeighborhood3D";
import { MaarifTargetRail } from "@/components/map/MaarifTargetRail";
import { CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW } from "@/lib/geo/casablanca-neighborhood-geometry-shadow";
import { getNeighborhoodBySlug } from "@/lib/map/canonical-neighborhood-data";

export const metadata: Metadata = {
  title: "Vivre Ici MapLibre Morocco Spike | AkarFinder",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ city?: string; district?: string }>;

export default async function MapLibreSpikePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedCity = String(params.city ?? "casablanca").trim().toLowerCase();
  const requestedDistrict = String(params.district ?? "maarif").trim().toLowerCase();
  const point = getNeighborhoodBySlug(requestedCity, requestedDistrict)
    ?? getNeighborhoodBySlug("casablanca", "maarif");

  if (!point) {
    throw new Error("MapLibre Morocco spike requires at least the canonical Casablanca/Maârif pilot.");
  }

  const isMaarifReference = point.citySlug === "casablanca" && point.neighborhoodSlug === "maarif";
  const boundaryGeometry = isMaarifReference
    ? CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW.find(
        (entry) => entry.neighborhoodCanonicalId === "maarif",
      )?.geometry ?? null
    : null;

  return (
    <main className="relative min-h-[100svh] bg-[#f4efe7]" data-vivre-ici-maplibre-spike-page>
      <SiteHeader searchMode fluid />
      <MapLibreNeighborhood3D
        citySlug={point.citySlug}
        cityLabel={point.city}
        districtSlug={point.neighborhoodSlug}
        districtLabel={point.neighborhood}
        center={[point.lng, point.lat]}
        boundaryGeometry={boundaryGeometry}
        desktopCameraOffset={isMaarifReference ? [-0.0055, 0.0090] : [0, 0]}
        reserveRail={isMaarifReference}
      />
      {isMaarifReference ? <MaarifTargetRail /> : null}
    </main>
  );
}
