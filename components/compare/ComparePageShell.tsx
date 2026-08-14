"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Scale, SearchX } from "lucide-react";
import { CompareSummary } from "@/components/compare/CompareSummary";
import { CompareTable } from "@/components/compare/CompareTable";
import { useCompareSelection } from "@/components/compare/useCompareSelection";
import { ui } from "@/components/ui/design-system";
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
    <section className={ui.emptyState}>
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-primary">
        <Scale size={24} strokeWidth={2.3} aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[1.5rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A]">Comparateur de biens</h1>
      <p className="mx-auto mt-2 max-w-xl text-[14px] leading-7 text-slate-500">
        Ajoutez 2 à 4 biens depuis la recherche ou une fiche détail pour voir les signaux indicatifs côte à côte.
      </p>
      <Link href="/search" className={`mt-5 ${ui.primaryActionPill}`}>Explorer les biens</Link>
    </section>
  );
}

function OneItemState() {
  return (
    <section className={ui.emptyState}>
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-primary">
        <SearchX size={24} strokeWidth={2.3} aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[1.5rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A]">Ajoutez au moins 2 biens</h1>
      <p className="mx-auto mt-2 max-w-xl text-[14px] leading-7 text-slate-500">
        Le comparateur devient utile à partir de 2 biens. Vous pouvez en sélectionner jusqu’à {MAX_COMPARE_LISTINGS}.
      </p>
      <Link href="/search" className={`mt-5 ${ui.primaryActionPill}`}>Ajouter un autre bien</Link>
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
    <section className="pb-24 pt-5 sm:pt-7 lg:pt-8">
      <div className={`${ui.surfacePremium} px-5 py-6 sm:px-7 sm:py-7`}>
        <p className={ui.eyebrow}>Comparer</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[1.9rem] font-extrabold tracking-[-0.05em] text-[#0B1F3A] sm:text-[2.35rem]">Comparez avant de contacter</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-500">
              Prix, fiabilité, package score, doublon possible et proximité utile restent indicatifs et à confirmer avant décision.
            </p>
          </div>
          {selectedListings.length > 0 ? (
            <span className="inline-flex w-fit rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-primary">
              {selectedListings.length}/{MAX_COMPARE_LISTINGS} biens
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
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

        {isLoading ? <p className="mt-4 text-[12px] font-medium text-slate-400">Chargement des biens comparables…</p> : null}
      </div>
    </section>
  );
}
