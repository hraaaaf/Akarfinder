import type { Metadata } from "next";
import { SearchDesktopV2Preview } from "@/components/ux/SearchDesktopV2Preview";

export const metadata: Metadata = {
  title: "AkarFinder — Aperçu SERP Desktop V2",
  description: "Prévisualisation isolée de la nouvelle expérience de recherche desktop AkarFinder.",
  robots: { index: false, follow: false },
};

export default function SearchDesktopV2PreviewPage() {
  return <SearchDesktopV2Preview />;
}
