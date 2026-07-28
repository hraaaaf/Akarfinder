"use client";

import { useEffect, useMemo, useState } from "react";
import { CertifiedNeighborhoodComparisonPanel } from "@/components/search/CertifiedNeighborhoodComparisonPanel";
import { CertifiedSimilarNeighborhoodsPanel } from "@/components/search/CertifiedSimilarNeighborhoodsPanel";
import { NeighborhoodIntelligencePanel } from "@/components/search/NeighborhoodIntelligencePanel";
import { PriceExplorerPanel } from "@/components/search/PriceExplorerPanel";
import { usePropertySelection } from "@/components/search/PropertySelectionProvider";
import { CANONICAL_SEARCH_SESSION_EVENT } from "@/components/search/useCanonicalSearchSession";
import { buildCertifiedLocalHeatmapModel } from "@/lib/ux/certified-local-heatmap";
import { buildCertifiedSimilarNeighborhoodsModel } from "@/lib/ux/certified-similar-neighborhoods";
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
      similarNeighborhoods: buildCertifiedSimilarNeighborhoodsModel({
        heatmap,
        selectedNeighborhood: neighborhood,
        visibleListings,
      }),
    };
  }, [search, visibleListings]);

  return (
    <section className="mx-auto max-w-[1480px] px-4 pt-5 sm:px-6" aria-label="Explorateur local synchronisé">
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
    </section>
  );
}
