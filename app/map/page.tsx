import type { Metadata } from "next";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PremiumInteractiveMap } from "@/components/map/PremiumInteractiveMap";
import "./premium-interactive-map-fixes.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vivre ici au Maroc — Villes, quartiers et vie locale | AkarFinder",
  description:
    "Explorez où vivre au Maroc : régions, villes, quartiers et repères de vie locale, puis accédez aux biens disponibles sans fausse précision géographique.",
  alternates: { canonical: "/map" },
};

export default function MapPage() {
  return (
    <div className="min-h-[100svh] bg-background text-foreground" data-vivre-ici-page>
      <SiteHeader searchMode fluid />
      <PremiumInteractiveMap />
      <SiteFooter />
    </div>
  );
}
