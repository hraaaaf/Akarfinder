import type { Metadata } from "next";
import SearchFusionV2Preview from "@/components/ux/SearchFusionV2Preview";

export const metadata: Metadata = {
  title: "AkarFinder — Fusion UX V2",
  description: "Prévisualisation fusionnée de la SERP AkarFinder.",
  robots: { index: false, follow: false },
};

export default function FiltersV2Page() {
  return <SearchFusionV2Preview />;
}
