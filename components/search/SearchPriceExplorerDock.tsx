"use client";

import { useEffect, useMemo, useState } from "react";
import { PriceExplorerPanel } from "@/components/search/PriceExplorerPanel";
import { CANONICAL_SEARCH_SESSION_EVENT } from "@/components/search/useCanonicalSearchSession";
import { getPriceExplorerResult } from "@/lib/ux/price-explorer";

function readCanonicalSearch(): string {
  return typeof window === "undefined" ? "" : window.location.search;
}

export function SearchPriceExplorerDock() {
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

  const result = useMemo(() => {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const transaction = params.get("transaction_type");
    const transactionType = transaction === "buy" || transaction === "rent" ? transaction : "all";

    return getPriceExplorerResult({
      city: params.get("city") ?? "all",
      neighborhood: params.get("district"),
      propertyType: params.get("property_type") ?? "all",
      transactionType,
    });
  }, [search]);

  return (
    <section className="mx-auto max-w-[1480px] px-4 pt-5 sm:px-6" aria-label="Explorateur de prix synchronisé">
      <PriceExplorerPanel result={result} />
    </section>
  );
}
