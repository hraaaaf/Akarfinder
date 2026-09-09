import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MapLibreMaarifSpike } from "@/components/map/MapLibreMaarifSpike";
import { MaarifTargetRail } from "@/components/map/MaarifTargetRail";

export const metadata: Metadata = {
  title: "Vivre Ici MapLibre Morocco Spike | AkarFinder",
  robots: { index: false, follow: false },
};

export default function MapLibreSpikePage() {
  return (
    <main className="relative min-h-[100svh] bg-[#f4efe7]" data-vivre-ici-maplibre-spike-page>
      <SiteHeader searchMode fluid />
      <MapLibreMaarifSpike />
      <MaarifTargetRail />
    </main>
  );
}
