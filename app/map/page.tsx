import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { NationalMapRouter } from "@/components/map/NationalMapRouter";
import { P4MapDecisionRail } from "@/components/map/P4MapDecisionRail";
import { parseMapNavigationState } from "@/lib/map/map-navigation-state";
import "./mockup-convergence-l2.css";
import "./p4-map-shell.css";
import "./market-convergence-correction.css";
import "./p0-polish.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Carte immobilière du Maroc — Villes et quartiers | AkarFinder",
  description:
    "Explorez le Maroc par ville puis quartier. Les contours publiés sont des repères AkarFinder sourcés, sans prétention de frontière administrative officielle.",
};

type MapPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = searchParams ? await searchParams : {};
  const initialState = parseMapNavigationState(params);

  return (
    <main className="flex min-h-[100svh] flex-col bg-[#F8FAFC] text-[#0B1F3A]">
      <SiteHeader searchMode fluid />
      <div className="flex-1" data-p4-map-layout>
        <div data-p4-map-canvas>
          <NationalMapRouter initialState={initialState} />
        </div>
        <P4MapDecisionRail />
      </div>
      <div className="l2-secondary-footer">
        <SiteFooter />
      </div>
    </main>
  );
}
