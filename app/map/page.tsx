import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MapNeighborhoodClient } from "@/components/map/MapNeighborhoodClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Carte immobilière du Maroc — Repères quartier | AkarFinder",
  description:
    "Explorez les quartiers immobiliers marocains : repères prix indicatifs, commodités et proximité par zone. Données indicatives 2024–2025.",
};

type MapPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = searchParams ? await searchParams : {};
  const city = pickFirst(params.city) ?? "all";

  return (
    <main className="flex flex-col" style={{ minHeight: "100svh" }}>
      <SiteHeader />
      <div className="flex-1">
        <MapNeighborhoodClient initialCity={city} />
      </div>
      <SiteFooter />
    </main>
  );
}
