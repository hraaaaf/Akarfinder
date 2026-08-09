"use client";

import { useEffect, useMemo, useState } from "react";
import { CasablancaNeighborhoodChoropleth } from "@/components/search/CasablancaNeighborhoodChoropleth";
import { CertifiedLocalHeatmapPanel } from "@/components/search/CertifiedLocalHeatmapPanel";
import { CityNeighborhoodExplorerPanel } from "@/components/search/CityNeighborhoodExplorerPanel";
import { CANONICAL_SEARCH_SESSION_EVENT } from "@/components/search/useCanonicalSearchSession";
import { buildCertifiedLocalHeatmapModel } from "@/lib/ux/certified-local-heatmap";
import { buildCityNeighborhoodExplorerModel } from "@/lib/ux/city-neighborhood-explorer";

function readCanonicalSearch(): string {
  return typeof window === "undefined" ? "" : window.location.search;
}

export function SearchMapNeighborhoodDock() {
  const [search, setSearch] = useState(readCanonicalSearch);

  useEffect(() => {
    const sync = () => setSearch(readCanonicalSearch());
    sync();
    window.addEventListener(CANONICAL_SEARCH_SESSION_EVENT, sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener(CANONICAL_SEARCH_SESSION_EVENT, sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const context = useMemo(() => {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const city = params.get("city") ?? "all";
    const neighborhood = params.get("district");
    const propertyType = params.get("property_type") ?? "all";

    return {
      explorer: buildCityNeighborhoodExplorerModel({
        propertyType,
        selectedCity: city,
        selectedNeighborhood: neighborhood,
      }),
      heatmap: buildCertifiedLocalHeatmapModel({ city, propertyType }),
      selectedNeighborhood: neighborhood,
      geometryCanaryRequested: city.trim().toLowerCase() === "casablanca",
    };
  }, [search]);

  const hasUsefulNeighborhoodContent =
    context.explorer.status === "available" ||
    context.heatmap.status === "available" ||
    context.geometryCanaryRequested;

  if (!hasUsefulNeighborhoodContent) return null;

  return (
    <div className="space-y-4 border-t border-[#eef2f8] bg-[#f8fafc] p-4 sm:p-5" aria-label="Exploration ville et quartier">
      <CityNeighborhoodExplorerPanel model={context.explorer} />
      <CasablancaNeighborhoodChoropleth
        model={context.heatmap}
        selectedNeighborhood={context.selectedNeighborhood}
        canaryRequested={context.geometryCanaryRequested}
      />
      <CertifiedLocalHeatmapPanel model={context.heatmap} />
      <p className="rounded-xl border border-dashed border-[#dfe7f3] bg-white px-3 py-2.5 text-[10.5px] leading-4 text-slate-500">
        Les couleurs comparent uniquement les références publiques de prix demandé disponibles pour la ville et le type de bien sélectionnés. Aucune limite de quartier n’est dessinée sans géométrie officielle ou certifiée. Cette visualisation reste indicative et ne modifie ni les résultats ni leur classement.
      </p>
    </div>
  );
}
