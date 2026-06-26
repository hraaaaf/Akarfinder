"use client";

import dynamic from "next/dynamic";
import type { Listing } from "@/lib/listings/types";
import type { MapFilters } from "@/lib/map/listing-map";

// MapLibre must only render client-side — ssr: false required here in a 'use client' component
const MapExperienceDynamic = dynamic(
  () =>
    import("@/components/map/MapExperience").then((mod) => ({
      default: mod.MapExperience,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-deepblue">
        <div className="text-center text-white">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-[14px] font-bold text-white/72">
            Chargement de la carte…
          </p>
        </div>
      </div>
    ),
  }
);

type MapExperienceClientProps = {
  listings: Listing[];
  initialFilters?: Partial<MapFilters>;
  totalAnalyzed?: number;
  positionedCount?: number;
};

export function MapExperienceClient(props: MapExperienceClientProps) {
  return <MapExperienceDynamic {...props} />;
}
