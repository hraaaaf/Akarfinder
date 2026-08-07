import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MapNeighborhoodClient } from "@/components/map/MapNeighborhoodClient";
import { parseMapNavigationState } from "@/lib/map/map-navigation-state";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Carte immobilière du Maroc — Repères quartier | AkarFinder",
  description:
    "Explorez les quartiers immobiliers marocains : repères prix indicatifs, commodités et proximité par zone. Données indicatives 2024–2025.",
};

type MapPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = searchParams ? await searchParams : {};
  const initialState = parseMapNavigationState(params);

  return (
    <main className="flex flex-col" style={{ minHeight: "100svh" }}>
      <SiteHeader />
      <div className="flex-1">
        <MapNeighborhoodClient initialState={initialState} />
      </div>
      <SiteFooter />
    </main>
  );
}
