import type { Metadata } from "next";
import { SearchV2MobilePreview } from "@/components/ux-preview/SearchV2MobilePreview";

export const metadata: Metadata = {
  title: "Preview SERP Mobile V2 — AkarFinder",
  robots: { index: false, follow: false },
};

export default function SearchV2MobilePreviewPage() {
  return (
    <main className="min-h-screen bg-slate-200 py-0 sm:py-8">
      <SearchV2MobilePreview />
    </main>
  );
}
