import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CesiumMaarifSpike } from "@/components/map/CesiumMaarifSpike";
import { CesiumTargetLens } from "@/components/map/CesiumTargetLens";
import { MaarifTargetRail } from "@/components/map/MaarifTargetRail";

export const metadata: Metadata = {
  title: "Vivre Ici Cesium Spike | AkarFinder",
  robots: { index: false, follow: false },
};

export default function CesiumSpikePage() {
  return (
    <main className="relative min-h-[100svh] bg-[#f4efe7]" data-vivre-ici-cesium-spike-page>
      <SiteHeader searchMode fluid />
      <CesiumTargetLens />
      <CesiumMaarifSpike />
      <MaarifTargetRail />
    </main>
  );
}
