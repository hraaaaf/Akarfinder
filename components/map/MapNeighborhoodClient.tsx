"use client";

import dynamic from "next/dynamic";

// MapLibre must only render client-side — ssr: false required
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
          <p className="text-[14px] font-bold text-white/72">
            Chargement de la carte…
          </p>
        </div>
      </div>
    ),
  }
);

type MapNeighborhoodClientProps = {
  initialCity?: string;
};

export function MapNeighborhoodClient(props: MapNeighborhoodClientProps) {
  return <MapNeighborhoodExperienceDynamic {...props} />;
}
