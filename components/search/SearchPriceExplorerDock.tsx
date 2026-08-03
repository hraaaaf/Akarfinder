"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CertifiedLocalHeatmapPanel } from "@/components/search/CertifiedLocalHeatmapPanel";
import { CertifiedNeighborhoodComparisonPanel } from "@/components/search/CertifiedNeighborhoodComparisonPanel";
import { CertifiedSimilarNeighborhoodsPanel } from "@/components/search/CertifiedSimilarNeighborhoodsPanel";
import { CityNeighborhoodExplorerPanel } from "@/components/search/CityNeighborhoodExplorerPanel";
import { NeighborhoodIntelligencePanel } from "@/components/search/NeighborhoodIntelligencePanel";
import { PriceExplorerPanel } from "@/components/search/PriceExplorerPanel";
import { usePropertySelection } from "@/components/search/PropertySelectionProvider";
import { CANONICAL_SEARCH_SESSION_EVENT } from "@/components/search/useCanonicalSearchSession";
import { buildCertifiedLocalHeatmapModel } from "@/lib/ux/certified-local-heatmap";
import { buildCertifiedSimilarNeighborhoodsModel } from "@/lib/ux/certified-similar-neighborhoods";
import { buildCityNeighborhoodExplorerModel } from "@/lib/ux/city-neighborhood-explorer";
import { buildNeighborhoodIntelligenceModel } from "@/lib/ux/neighborhood-intelligence";
import { getPriceExplorerResult } from "@/lib/ux/price-explorer";

function readCanonicalSearch(): string {
  return typeof window === "undefined" ? "" : window.location.search;
}

export function SearchPriceExplorerDock() {
  const [search, setSearch] = useState(readCanonicalSearch);
  const { visibleListings } = usePropertySelection();

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
    const transaction = params.get("transaction_type");
    const transactionType = transaction === "buy" || transaction === "rent" ? transaction : "all";
    const city = params.get("city") ?? "all";
    const neighborhood = params.get("district");
    const propertyType = params.get("property_type") ?? "all";
    const priceReference = getPriceExplorerResult({ city, neighborhood, propertyType, transactionType });
    const heatmap = buildCertifiedLocalHeatmapModel({ city, propertyType });

    return {
      priceReference,
      neighborhoodIntelligence: buildNeighborhoodIntelligenceModel({
        visibleListings,
        city,
        neighborhood,
        priceReference,
      }),
      heatmap,
      explorer: buildCityNeighborhoodExplorerModel({
        propertyType,
        selectedCity: city,
        selectedNeighborhood: neighborhood,
      }),
      similarNeighborhoods: buildCertifiedSimilarNeighborhoodsModel({
        heatmap,
        selectedNeighborhood: neighborhood,
        visibleListings,
      }),
    };
  }, [search, visibleListings]);

  return (
    <section className="border-t border-[#DCE8F5] bg-[#f7f9fc]" aria-label="Intelligence immobilière secondaire">
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
        <details className="group rounded-2xl border border-[#DCE8F5] bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <div>
              <p className="text-sm font-black text-[#071B33]">Approfondir cette recherche</p>
              <p className="mt-1 text-xs text-slate-500">Prix locaux, intelligence quartier et comparaison — uniquement sur demande.</p>
            </div>
            <span className="flex shrink-0 items-center gap-2 text-xs font-extrabold text-[#0B63CE]">
              Voir l’analyse
              <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
            </span>
          </summary>

          <div className="border-t border-[#DCE8F5] p-4 sm:p-6">
            <div className="hidden" aria-hidden="true">
              <CityNeighborhoodExplorerPanel model={context.explorer} />
              <CertifiedLocalHeatmapPanel model={context.heatmap} />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <PriceExplorerPanel result={context.priceReference} />
              <NeighborhoodIntelligencePanel model={context.neighborhoodIntelligence} />
            </div>
            <div className="mt-4">
              <CertifiedNeighborhoodComparisonPanel heatmap={context.heatmap} visibleListings={visibleListings} />
            </div>
            <div className="mt-4">
              <CertifiedSimilarNeighborhoodsPanel model={context.similarNeighborhoods} />
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
