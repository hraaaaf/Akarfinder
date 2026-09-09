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
      <style>{`
        @media (min-width: 1024px) {
          [data-vivre-ici-cesium-spike-page] .cesium-spike-map-atmosphere {
            background: linear-gradient(
              180deg,
              rgba(109, 196, 230, 0.68),
              rgba(127, 205, 234, 0.52) 44%,
              rgba(166, 220, 241, 0.20) 72%,
              rgba(209, 239, 249, 0) 100%
            ) !important;
          }
        }
      `}</style>
    </main>
  );
}
