"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Map, SearchX, X } from "lucide-react";
import { CompareBar } from "@/components/compare/CompareBar";
import { PhotoFirstListingCard } from "@/components/listings/PhotoFirstListingCard";
import { CityMapPanel } from "@/components/search/CityMapPanel";
import { MapSideCTA } from "@/components/search/MapSideCTA";
import { QuickFilters } from "@/components/search/QuickFilters";
import type { Listing, ListingFiltersState } from "@/lib/listings/types";
import {
  defaultListingFilters,
  getPropertyTypes,
  getSearchCities,
  sortListings,
  type SortBy,
} from "@/lib/listings/utils";
import { calculatePackageScore } from "@/lib/package-score/calculate-package-score";
import { getListingProximity } from "@/lib/proximity/get-listing-proximity";
import { getListingObservedPriceComparison } from "@/lib/market/get-market-reference";

type LightZillowSearchShellProps = {
  initialListings: Listing[];
  initialFilters?: Partial<{
    transactionType: "all" | "buy" | "rent" | "new";
    city: string;
    mreOnly: boolean;
  }>;
};

type ActiveTab = "Liste" | "Carte";

type ApiSearchResponse = {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
  source: "database" | "database_fallback" | "typesense" | "sqlite" | "supabase";
  generated_at: string;
};

const RELIABILITY_BADGE: Record<string, string> = {
  top: "Très fiable",
  high: "Fiable",
  medium: "À vérifier",
  low: "Faible confiance",
};

function buildSearchUrl(filters: ListingFiltersState, sortBy: SortBy): string {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.city !== "all") params.set("city", filters.city);
  if (filters.transactionType !== "all") params.set("transaction_type", filters.transactionType);
  if (filters.propertyType !== "all") params.set("property_type", filters.propertyType);
  if (filters.minReliabilityScore > 0) params.set("minReliabilityScore", String(filters.minReliabilityScore));
  if (filters.reliability !== "all") {
    const badge = RELIABILITY_BADGE[filters.reliability];
    if (badge) params.set("reliability_badge", badge);
  }
  if (sortBy === "price-asc") params.set("sort", "price_asc");
  else if (sortBy === "price-desc") params.set("sort", "price_desc");
  return `/api/search?${params.toString()}`;
}

function buildMapHref(filters: ListingFiltersState): string {
  const params = new URLSearchParams();
  if (filters.city !== "all") params.set("city", filters.city);
  if (filters.transactionType !== "all") params.set("type", filters.transactionType);
  if (filters.propertyType !== "all") params.set("property_type", filters.propertyType);
  if (filters.minBudget) params.set("min_price", filters.minBudget);
  if (filters.maxBudget) params.set("max_price", filters.maxBudget);
  if (filters.minReliabilityScore > 0) {
    params.set("minReliabilityScore", String(filters.minReliabilityScore));
  }

  const query = params.toString();
  return query ? `/map?${query}` : "/map";
}

function getIntentLabel(transactionType: string) {
  if (transactionType === "rent") return "Locations";
  if (transactionType === "new") return "Programmes neufs";
  if (transactionType === "buy") return "Biens à acheter";
  return "Tous les biens";
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[1.4rem] border border-[#eadfca] bg-white">
      <div className="h-[238px] bg-gray-200" />
      <div className="space-y-3 p-5">
        <div className="h-7 w-2/3 rounded-full bg-gray-200" />
        <div className="h-4 w-1/3 rounded-full bg-gray-200" />
        <div className="h-4 w-1/2 rounded-full bg-gray-200" />
        <div className="h-4 w-3/4 rounded-full bg-gray-200" />
        <div className="mt-2 h-11 rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[#d8c8a3] bg-white p-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f7f3ea]">
        <SearchX size={24} strokeWidth={2} className="text-gray-400" aria-hidden="true" />
      </span>
      <p className="mt-4 text-[1.1rem] font-extrabold text-gray-900">
        Aucune annonce trouvée
      </p>
      <p className="mt-2 text-[14px] leading-6 text-gray-500">
        Élargissez la ville, le budget ou le type de bien.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-full bg-deepblue px-5 py-2.5 text-[13px] font-extrabold text-white transition hover:bg-deepblue-700"
      >
        Réinitialiser les filtres
      </button>
    </div>
  );
}

export function LightZillowSearchShell({
  initialListings,
  initialFilters,
}: LightZillowSearchShellProps) {
  const [filters, setFilters] = useState({
    ...defaultListingFilters,
    transactionType:
      initialFilters?.transactionType ?? defaultListingFilters.transactionType,
    city: initialFilters?.city ?? defaultListingFilters.city,
    mreOnly: initialFilters?.mreOnly ?? defaultListingFilters.mreOnly,
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>("Liste");
  const [sortBy, setSortBy] = useState<SortBy>("recommended");
  const [listings, setListings] = useState(initialListings);
  const [isFallbackMock, setIsFallbackMock] = useState(true);
  const [dataSource, setDataSource] = useState<ApiSearchResponse["source"]>("database");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const delay = filters.search ? 300 : 0;

    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsLoading(true);
      try {
        const response = await fetch(buildSearchUrl(filters, sortBy), { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as ApiSearchResponse;
        if (!cancelled) {
          setListings(payload.listings);
          setIsFallbackMock(false);
          setDataSource(payload.source);
        }
      } catch {
        // Keep current listings silently on error.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters, sortBy]);

  const filteredListings = useMemo(() => {
    const minBudget = Number(filters.minBudget) || 0;
    const maxBudget = Number(filters.maxBudget) || Number.POSITIVE_INFINITY;
    const minSurface = Number(filters.minSurface) || 0;
    const clientFiltered = listings.filter((l) => {
      if (l.price < minBudget || l.price > maxBudget) return false;
      if (l.surface_m2 < minSurface) return false;
      if (filters.mreOnly && !l.is_mre_friendly) return false;
      if (filters.packageScore === "bon") {
        const tx = l.transaction_type === "rent" ? "rent" : "buy";
        const score = calculatePackageScore(
          l.reliability_score,
          l.reliability_available !== false,
          l.duplicate_score,
          getListingProximity(l.city, l.neighborhood),
          getListingObservedPriceComparison(l.city, l.neighborhood, l.property_type, tx, l.price_per_m2)
        );
        const label = score.overall_label;
        if (label !== "Excellent package" && label !== "Bon package") return false;
      }
      return true;
    });
    return sortListings(clientFiltered, sortBy);
  }, [listings, filters, sortBy]);

  const cities = useMemo(() => getSearchCities(listings), [listings]);
  const propertyTypes = useMemo(() => getPropertyTypes(listings), [listings]);
  const displayCity = filters.city === "all" ? "Maroc" : filters.city;

  const handleReset = () => setFilters(defaultListingFilters);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: Partial<ListingFiltersState> }> = [];
    if (filters.city !== "all") {
      chips.push({ key: "city", label: filters.city, clear: { city: "all", neighborhood: "all" } });
    }
    if (filters.transactionType !== "all") {
      const tLabels: Record<string, string> = { buy: "Acheter", rent: "Louer", new: "Neuf" };
      chips.push({ key: "tx", label: tLabels[filters.transactionType] ?? filters.transactionType, clear: { transactionType: "all" } });
    }
    if (filters.propertyType !== "all") {
      chips.push({ key: "pt", label: filters.propertyType, clear: { propertyType: "all" } });
    }
    if (filters.reliability !== "all") {
      const rLabels: Record<string, string> = { top: "Très fiable", high: "Fiable", medium: "À vérifier", low: "Faible confiance" };
      chips.push({ key: "rel", label: rLabels[filters.reliability] ?? filters.reliability, clear: { reliability: "all" } });
    }
    if (filters.minReliabilityScore > 0) {
      chips.push({ key: "score", label: `Score ≥ ${filters.minReliabilityScore}`, clear: { minReliabilityScore: 0 } });
    }
    if (filters.mreOnly) {
      chips.push({ key: "mre", label: "MRE-friendly", clear: { mreOnly: false } });
    }
    if (filters.packageScore === "bon") {
      chips.push({ key: "pkg", label: "Bon package", clear: { packageScore: "all" } });
    }
    if (filters.maxBudget) {
      chips.push({ key: "budget", label: `Budget max : ${Number(filters.maxBudget).toLocaleString("fr-FR")} DH`, clear: { maxBudget: "" } });
    }
    if (filters.minSurface) {
      chips.push({ key: "surface", label: `Surface ≥ ${filters.minSurface} m²`, clear: { minSurface: "" } });
    }
    return chips;
  }, [filters]);

  return (
    <div className="bg-[#f7f3ea]">
      <section className="border-b border-[#eadfca] bg-deepblue text-white">
        <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:py-8">
          <div className="mb-3.5 flex items-center justify-between gap-3 lg:mb-5 lg:items-end">
            <div className="min-w-0">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-bronze-400 sm:text-[11px]">
                Marketplace immobilier AkarFinder
              </p>
              <h1 className="mt-1.5 text-[1.5rem] font-extrabold tracking-[-0.045em] sm:text-[2.6rem] lg:mt-2">
                Trouvez votre bien au Maroc
              </h1>
              <p className="mt-2 hidden max-w-2xl text-[15px] leading-7 text-white/70 sm:block">
                Recherche simple, annonces regroupées, repères de lecture et
                source visible avant de décider.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <p className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-bold text-white/80 sm:px-4 sm:py-2 sm:text-[13px]">
                {"Données analysées"}
              </p>
            </div>
          </div>

          <QuickFilters
            filters={filters}
            cities={cities}
            propertyTypes={propertyTypes}
            onChange={setFilters}
            onReset={handleReset}
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-4 sm:px-6 lg:py-6">
        <div className="border-b border-[#eadfca] pb-3.5 lg:pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[1.05rem] font-extrabold tracking-[-0.02em] text-deepblue sm:text-[1.15rem]">
                {isLoading ? (
                  <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-gray-400" aria-hidden="true" />
                ) : null}
                {filteredListings.length} bien
                {filteredListings.length > 1 ? "s" : ""} à {displayCity}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[12.5px] font-medium text-gray-500 sm:text-[13.5px]">
                {getIntentLabel(filters.transactionType)} · tri recommandé
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={buildMapHref(filters)}
                className="hidden rounded-full border border-[#d8c8a3] bg-white px-4 py-2.5 text-[13px] font-extrabold text-deepblue transition hover:border-bronze-500 hover:bg-[#fff8e8] md:inline-flex"
              >
                Voir la carte
              </Link>
              <select
                aria-label="Trier les résultats"
                className="rounded-full border border-[#d8c8a3] bg-white px-3 py-2.5 text-[12px] font-bold text-deepblue outline-none sm:px-4 sm:text-[13px]"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="recommended">Tri recommandé</option>
                <option value="reliability">Meilleures annonces</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
              </select>

              <div className="flex rounded-full border border-[#d8c8a3] bg-white p-1 lg:hidden">
                {(["Liste", "Carte"] as ActiveTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={
                      activeTab === tab
                        ? "rounded-full bg-deepblue px-4 py-2 text-[13px] font-extrabold text-white"
                        : "rounded-full px-4 py-2 text-[13px] font-bold text-gray-500"
                    }
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, ...chip.clear }))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-deepblue/15 bg-deepblue/8 px-3 py-1.5 text-[12px] font-bold text-deepblue transition hover:bg-deepblue/15"
                >
                  {chip.label}
                  <X size={11} strokeWidth={2.6} aria-hidden="true" />
                </button>
              ))}
              {activeChips.length > 1 ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-full px-3 py-1.5 text-[12px] font-bold text-gray-500 transition hover:text-gray-700"
                >
                  Tout effacer
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:mt-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.6fr)] lg:items-start">
          <div
            className={`min-w-0 ${activeTab === "Carte" ? "hidden lg:block" : "block"}`}
          >
            {/* Skeleton while loading with empty results */}
            {isLoading && filteredListings.length === 0 ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {[1, 2, 3, 4].map((n) => (
                  <SkeletonCard key={n} />
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <EmptyState onReset={handleReset} />
            ) : (
              <div
                className={`grid grid-cols-1 gap-5 xl:grid-cols-2 transition-opacity duration-200 ${isLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}
              >
                {filteredListings.map((listing) => (
                  <PhotoFirstListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>

          <div
            className={`min-w-0 space-y-4 ${activeTab === "Liste" ? "hidden lg:block" : "block"} lg:sticky lg:top-5 lg:self-start`}
          >
            <CityMapPanel
              city={filters.city}
              listingCount={filteredListings.length}
            />
            <MapSideCTA city={displayCity} />

            {/* Onboarding CTA */}
            <div className="rounded-[1.4rem] border border-[#d8c8a3] bg-[#fffdf8] p-5 shadow-[0_6px_20px_rgba(7,27,51,0.05)]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-bronze-700">
                Profil de recherche
              </p>
              <p className="mt-2 text-[1rem] font-extrabold tracking-tight text-deepblue">
                Clarifier mon projet
              </p>
              <p className="mt-1.5 text-[13px] leading-5 text-gray-500">
                Budget, zone, type de bien et timing en 6 étapes.
              </p>
              <Link
                href="/onboarding"
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-deepblue px-4 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
              >
                Créer mon profil de recherche
              </Link>
            </div>
          </div>
        </div>
      </section>
      <CompareBar />
    </div>
  );
}
