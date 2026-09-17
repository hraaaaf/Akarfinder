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
              rgba(126, 207, 238, 0.82),
              rgba(146, 216, 241, 0.68) 44%,
              rgba(183, 229, 245, 0.30) 72%,
              rgba(219, 243, 251, 0) 100%
            ) !important;
          }
        }
      `}</style>
    </main>
  );
}
