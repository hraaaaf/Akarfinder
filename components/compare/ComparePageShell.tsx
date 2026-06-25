"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Scale, SearchX } from "lucide-react";
import { CompareSummary } from "@/components/compare/CompareSummary";
import { CompareTable } from "@/components/compare/CompareTable";
import { useCompareSelection } from "@/components/compare/useCompareSelection";
import { mockListings } from "@/lib/listings/mock-listings";
import {
  clearCompareIds,
  dispatchCompareUpdated,
  removeCompareId,
} from "@/lib/compare/compare-storage";
import { buildCompareListingInsights, buildCompareSummary } from "@/lib/compare/compare-summary";
import { MAX_COMPARE_LISTINGS, MIN_COMPARE_LISTINGS } from "@/lib/compare/types";
import type { Listing } from "@/lib/listings/types";

type ApiSearchResponse = {
  listings: Listing[];
};

function EmptyState() {
  return (
    <section className="rounded-[1.6rem] border border-dashed border-[#d8c8a3] bg-white p-10 text-center shadow-[0_8px_24px_rgba(7,27,51,0.04)]">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f7f3ea]">
        <Scale size={24} strokeWidth={2.3} className="text-bronze-700" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[1.5rem] font-extrabold tracking-[-0.04em] text-deepblue">
        Comparateur de biens
      </h1>
      <p className="mt-2 text-[14px] leading-7 text-gray-500">
        Ajoutez 2 à 4 biens depuis la recherche ou une fiche détail pour voir les signaux indicatifs côte à côte.
      </p>
      <Link
        href="/search"
        className="mt-5 inline-flex items-center justify-center rounded-full bg-deepblue px-5 py-3 text-[13px] font-extrabold text-white transition hover:bg-deepblue-700"
      >
        Explorer les biens
      </Link>
    </section>
  );
}

function OneItemState() {
  return (
    <section className="rounded-[1.6rem] border border-[#eadfca] bg-white p-10 text-center shadow-[0_8px_24px_rgba(7,27,51,0.04)]">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f7f3ea]">
        <SearchX size={24} strokeWidth={2.3} className="text-bronze-700" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[1.5rem] font-extrabold tracking-[-0.04em] text-deepblue">
        Ajoutez au moins 2 biens
      </h1>
      <p className="mt-2 text-[14px] leading-7 text-gray-500">
        Le comparateur devient utile à partir de 2 biens. Vous pouvez en sélectionner jusqu’à {MAX_COMPARE_LISTINGS}.
      </p>
      <Link
        href="/search"
        className="mt-5 inline-flex items-center justify-center rounded-full bg-deepblue px-5 py-3 text-[13px] font-extrabold text-white transition hover:bg-deepblue-700"
      >
        Ajouter un autre bien
      </Link>
    </section>
  );
}

export function ComparePageShell() {
  const { ids } = useCompareSelection();
  const [availableListings, setAvailableListings] = useState<Listing[]>(mockListings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/search?limit=100", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as ApiSearchResponse;
        if (!cancelled && Array.isArray(payload.listings) && payload.listings.length > 0) {
          setAvailableListings(payload.listings);
        }
      } catch {
        // Keep mock fallback silently.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadListings();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedListings = useMemo(() => {
    const byId = new Map(availableListings.map((listing) => [listing.id, listing]));
    return ids
      .map((id) => byId.get(id) ?? mockListings.find((listing) => listing.id === id))
      .filter((listing): listing is Listing => Boolean(listing));
  }, [availableListings, ids]);

  const compareItems = useMemo(
    () => selectedListings.map((listing) => buildCompareListingInsights(listing)),
    [selectedListings]
  );

  const summary = useMemo(() => buildCompareSummary(compareItems), [compareItems]);

  function handleRemove(id: string) {
    if (typeof window === "undefined") return;
    const result = removeCompareId(id, window.localStorage);
    if (result.ok) dispatchCompareUpdated(result.ids);
  }

  function handleClear() {
    if (typeof window === "undefined") return;
    const result = clearCompareIds(window.localStorage);
    if (result.ok) dispatchCompareUpdated(result.ids);
  }

  return (
    <section className="pb-16 pt-8 lg:pt-10">
      <div className="rounded-[1.7rem] border border-[#eadfca] bg-deepblue px-6 py-7 text-white shadow-[0_18px_42px_rgba(7,27,51,0.16)]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-400">
          P15A — Comparateur de biens
        </p>
        <h1 className="mt-2 text-[2rem] font-extrabold tracking-[-0.05em] sm:text-[2.6rem]">
          Comparez avant de contacter
        </h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-7 text-white/72">
          Fiabilité visible, prix observé, package score, doublon possible et proximité utile. Les signaux restent indicatifs et à confirmer avant décision.
        </p>
      </div>

      <div className="mt-6">
        {selectedListings.length === 0 ? (
          <EmptyState />
        ) : selectedListings.length < MIN_COMPARE_LISTINGS ? (
          <OneItemState />
        ) : (
          <div className="space-y-5">
            <CompareSummary summary={summary} />
            <CompareTable items={compareItems} onRemove={handleRemove} onClear={handleClear} />
          </div>
        )}

        {isLoading ? (
          <p className="mt-4 text-[12px] font-medium text-gray-400">
            Chargement des biens comparables…
          </p>
        ) : null}
      </div>
    </section>
  );
}
