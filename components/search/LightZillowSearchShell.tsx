"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Map as MapIcon, SearchX, X } from "lucide-react";
import { CompareBar } from "@/components/compare/CompareBar";
import { ExternalIndexedResultsSection } from "@/components/search/ExternalIndexedResultsSection";
import { QuickFilters } from "@/components/search/QuickFilters";
import { SearchListingCardDark } from "@/components/search/SearchListingCardDark";
import { SearchMapPanel, type CityCount } from "@/components/search/SearchMapPanel";
import { SearchViewSwitcher } from "@/components/search/SearchViewSwitcher";
import { useCanonicalSearchSession } from "@/components/search/useCanonicalSearchSession";
import type { Listing, ListingFiltersState } from "@/lib/listings/types";
import {
  defaultListingFilters,
  getPropertyTypes,
  getSearchCities,
  sortListings,
  type SortBy,
} from "@/lib/listings/utils";
import { getListingObservedPriceComparison } from "@/lib/market/get-market-reference";
import { calculatePackageScore } from "@/lib/package-score/calculate-package-score";
import { getListingProximity } from "@/lib/proximity/get-listing-proximity";
import { getCityCoord } from "@/lib/search/city-coords";
import { partitionCommercialSearchListings } from "@/lib/search/search-commercial-priority";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";
import { track } from "@/lib/tracking/track";
import type { SearchViewMode } from "@/lib/ux/contracts";
import { getSearchViewLayout } from "@/lib/ux/search-view";

type LightZillowSearchShellProps = {
  initialListings: Listing[];
  initialFilters?: Partial<ListingFiltersState>;
};

type ApiSearchResponse = {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
  source: string;
  generated_at: string;
};

type GatewaySearchResponse = {
  results: SearchGatewayNormalizedResult[];
  total_count?: number;
  next_cursor?: string | null;
  has_more?: boolean;
};

const RELIABILITY_BADGE: Record<string, string> = {
  top: "Information complete",
  high: "Information structuree",
  medium: "A completer",
  low: "Information limitee",
};

function buildSearchUrl(filters: ListingFiltersState, sortBy: SortBy): string {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.city !== "all") params.set("city", filters.city);
  if (filters.neighborhood && filters.neighborhood !== "all") params.set("district", filters.neighborhood);
  if (filters.transactionType !== "all") params.set("transaction_type", filters.transactionType);
  if (filters.propertyType !== "all") params.set("property_type", filters.propertyType);
  if (filters.minBudget) params.set("min_price", filters.minBudget);
  if (filters.maxBudget) params.set("max_price", filters.maxBudget);
  if (filters.minSurface) params.set("min_surface", filters.minSurface);
  if (filters.minReliabilityScore > 0) params.set("minReliabilityScore", String(filters.minReliabilityScore));
  if (filters.reliability !== "all") {
    const badge = RELIABILITY_BADGE[filters.reliability];
    if (badge) params.set("reliability_badge", badge);
  }
  if (sortBy === "price-asc") params.set("sort", "price_asc");
  else if (sortBy === "price-desc") params.set("sort", "price_desc");
  return `/api/search?${params.toString()}`;
}

function buildGatewayUrl(filters: ListingFiltersState, cursor?: string | null): string {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.city !== "all") params.set("city", filters.city);
  if (filters.neighborhood && filters.neighborhood !== "all") params.set("district", filters.neighborhood);
  if (filters.propertyType !== "all") params.set("property_type", filters.propertyType);
  if (filters.transactionType !== "all") params.set("intent", filters.transactionType);
  if (filters.minBudget) params.set("min_price", filters.minBudget);
  if (filters.maxBudget) params.set("max_price", filters.maxBudget);
  if (filters.minSurface) params.set("min_surface", filters.minSurface);
  if (cursor) params.set("cursor", cursor);
  return `/api/search/gateway?${params.toString()}`;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-border/15 bg-card dark:border-white/10 dark:bg-white/[0.04]">
      <div className="aspect-[4/3] bg-surface dark:bg-white/10" />
      <div className="space-y-2.5 p-3.5">
        <div className="h-4 w-4/5 rounded-full bg-surface dark:bg-white/10" />
        <div className="h-3 w-2/5 rounded-full bg-surface dark:bg-white/10" />
        <div className="h-5 w-3/5 rounded-full bg-surface dark:bg-white/10" />
      </div>
    </div>
  );
}

function EmptyState({ onReset, city }: { onReset: () => void; city?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/20 bg-surface/50 p-8 text-center dark:border-white/15 dark:bg-white/[0.03] sm:p-12">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface dark:bg-white/5">
        <SearchX size={24} strokeWidth={2} className="text-muted-foreground" aria-hidden="true" />
      </span>
      <p className="mt-4 text-[1.1rem] font-extrabold text-foreground">Aucun résultat pour ces critères</p>
      <p className="mx-auto mt-2 max-w-xl text-[14px] leading-6 text-muted-foreground">
        {city && city !== "all"
          ? `Aucun résultat trouvé à ${city} avec ces filtres.`
          : "Essayez d'élargir la ville, le budget, la surface ou le type de bien."}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-full bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-2.5 text-[13px] font-extrabold text-white transition hover:from-bronze-600"
        >
          Élargir la recherche
        </button>
        <Link
          href="/compagnon"
          className="rounded-full border border-border/20 px-5 py-2.5 text-[13px] font-extrabold text-foreground transition hover:border-bronze-500/40"
        >
          Construire Mon Projet
        </Link>
      </div>
    </div>
  );
}

export function LightZillowSearchShell({ initialListings, initialFilters }: LightZillowSearchShellProps) {
  const [filters, setFilters] = useState<ListingFiltersState>({
    ...defaultListingFilters,
    transactionType: initialFilters?.transactionType ?? defaultListingFilters.transactionType,
    city: initialFilters?.city ?? defaultListingFilters.city,
    neighborhood: initialFilters?.neighborhood ?? defaultListingFilters.neighborhood,
    propertyType: (initialFilters?.propertyType as ListingFiltersState["propertyType"]) ?? defaultListingFilters.propertyType,
    maxBudget: initialFilters?.maxBudget ?? defaultListingFilters.maxBudget,
    minBudget: initialFilters?.minBudget ?? defaultListingFilters.minBudget,
    mreOnly: initialFilters?.mreOnly ?? defaultListingFilters.mreOnly,
    search: initialFilters?.search ?? defaultListingFilters.search,
  });
  const [view, setView] = useState<SearchViewMode>("list");
  const [sortBy, setSortBy] = useState<SortBy>("recommended");
  const [listings, setListings] = useState(initialListings);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreIndexed, setHasMoreIndexed] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [indexedTotalCount, setIndexedTotalCount] = useState<number | null>(null);

  const [gatewayResults, setGatewayResults] = useState<SearchGatewayNormalizedResult[]>([]);
  const gatewayEnabled = process.env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED !== "false";
  const [isGatewayLoading, setIsGatewayLoading] = useState(gatewayEnabled);
  const viewLayout = getSearchViewLayout(view);
  void indexedTotalCount;

  useCanonicalSearchSession({
    filters,
    sortBy,
    view,
    onRestore: (snapshot) => {
      setFilters((current) => ({ ...current, ...snapshot.filters }));
      setSortBy(snapshot.sortBy);
      setView(snapshot.view);
    },
  });

  function handleFilterChange(next: ListingFiltersState) {
    if (
      next.transactionType !== filters.transactionType ||
      next.city !== filters.city ||
      next.neighborhood !== filters.neighborhood ||
      next.propertyType !== filters.propertyType ||
      next.reliability !== filters.reliability
    ) {
      track({
        event_name: "search_filter_change",
        source_page: "/search",
        intent: next.transactionType,
        metadata: { city: next.city, district: next.neighborhood, property_type: next.propertyType },
      });
    }
    setFilters(next);
  }

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
        if (!cancelled) setListings(payload.listings);
      } catch {
        // Preserve the previous stable result set on transient failures.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters, sortBy]);

  async function handleLoadMoreIndexed() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(buildGatewayUrl(filters, nextCursor), { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as GatewaySearchResponse;
      if (!Array.isArray(payload.results)) return;
      setGatewayResults((current) => {
        const merged = new Map(
          current.map((result) => [result.original_url || result.display_url || result.id, result]),
        );
        for (const result of payload.results) {
          const key = result.original_url || result.display_url || result.id;
          if (!merged.has(key)) merged.set(key, result);
        }
        return [...merged.values()];
      });
      setNextCursor(payload.next_cursor ?? null);
      setHasMoreIndexed(payload.has_more === true && payload.next_cursor != null);
      if (typeof payload.total_count === "number") setIndexedTotalCount(payload.total_count);
    } catch {
      // Preserve the current indexed page on transient failures.
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!gatewayEnabled) {
      setGatewayResults([]);
      setNextCursor(null);
      setHasMoreIndexed(false);
      setIndexedTotalCount(null);
      setIsGatewayLoading(false);
      return;
    }
    let cancelled = false;
    const delay = filters.search ? 300 : 0;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsGatewayLoading(true);
      try {
        const response = await fetch(buildGatewayUrl(filters), { cache: "no-store" });
        if (!response.ok || cancelled) {
          setGatewayResults([]);
          setNextCursor(null);
          setHasMoreIndexed(false);
          setIndexedTotalCount(null);
          return;
        }
        const payload = (await response.json()) as GatewaySearchResponse;
        if (!cancelled && Array.isArray(payload.results)) {
          setGatewayResults(payload.results);
          setNextCursor(payload.next_cursor ?? null);
          setHasMoreIndexed(payload.has_more === true && payload.next_cursor != null);
          setIndexedTotalCount(typeof payload.total_count === "number" ? payload.total_count : null);
        }
      } catch {
        if (!cancelled) {
          setGatewayResults([]);
          setNextCursor(null);
          setHasMoreIndexed(false);
          setIndexedTotalCount(null);
        }
      } finally {
        if (!cancelled) setIsGatewayLoading(false);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters, gatewayEnabled]);

  const filteredListings = useMemo(() => {
    const minBudget = Number(filters.minBudget) || 0;
    const maxBudget = Number(filters.maxBudget) || Number.POSITIVE_INFINITY;
    const minSurface = Number(filters.minSurface) || 0;
    const clientFiltered = listings.filter((listing) => {
      if (listing.price == null) {
        if (minBudget > 0 || maxBudget !== Number.POSITIVE_INFINITY) return false;
      } else if (listing.price < minBudget || listing.price > maxBudget) {
        return false;
      }
      if (listing.surface_m2 < minSurface) return false;
      if (filters.packageScore === "bon") {
        const tx = listing.transaction_type === "rent" ? "rent" : "buy";
        const score = calculatePackageScore(
          listing.reliability_score,
          listing.reliability_available !== false,
          listing.duplicate_score,
          getListingProximity(listing.city, listing.neighborhood),
          getListingObservedPriceComparison(
            listing.city,
            listing.neighborhood,
            listing.property_type,
            tx,
            listing.price_per_m2,
          ),
        );
        if (score.overall_label !== "Excellent package" && score.overall_label !== "Bon package") return false;
      }
      return true;
    });
    return sortListings(clientFiltered, sortBy);
  }, [listings, filters, sortBy]);

  const commercialGroups = useMemo(
    () => partitionCommercialSearchListings(filteredListings),
    [filteredListings],
  );
  const continuousListings = useMemo(
    () => [
      ...commercialGroups.promoterPremium,
      ...commercialGroups.agencyPartner,
      ...commercialGroups.directUser,
      ...commercialGroups.publicIndexed.analyzed,
      ...commercialGroups.publicIndexed.partial,
      ...commercialGroups.publicIndexed.observed,
    ],
    [commercialGroups],
  );

  const cities = useMemo(() => getSearchCities(listings), [listings]);
  const propertyTypes = useMemo(() => getPropertyTypes(listings), [listings]);
  const handleReset = () => setFilters(defaultListingFilters);

  const { cityCounts, otherCount, avgIndex } = useMemo(() => {
    const counts = new Map<string, number>();
    let other = 0;
    let idxSum = 0;
    let idxN = 0;
    for (const listing of filteredListings) {
      if (listing.data_completeness_score != null) {
        idxSum += listing.data_completeness_score;
        idxN += 1;
      }
      if (listing.city && getCityCoord(listing.city)) counts.set(listing.city, (counts.get(listing.city) ?? 0) + 1);
      else other += 1;
    }
    return {
      cityCounts: [...counts.entries()].map(([city, count]) => ({ city, count })) as CityCount[],
      otherCount: other,
      avgIndex: idxN ? Math.round(idxSum / idxN) : null,
    };
  }, [filteredListings]);

  const listRef = useRef<HTMLDivElement>(null);
  const handleSelectCity = (city: string) => {
    track({ event_name: "search_map_pin_click", source_page: "/search", metadata: { city } });
    setFilters((current) => ({
      ...current,
      city: current.city.toLowerCase() === city.toLowerCase() ? "all" : city,
      neighborhood: "all",
    }));
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: Partial<ListingFiltersState> }> = [];
    if (filters.city !== "all") chips.push({ key: "city", label: filters.city, clear: { city: "all", neighborhood: "all" } });
    if (filters.neighborhood && filters.neighborhood !== "all") chips.push({ key: "district", label: filters.neighborhood, clear: { neighborhood: "all" } });
    if (filters.transactionType !== "all") {
      const labels: Record<string, string> = { buy: "Acheter", rent: "Louer", new: "Neuf" };
      chips.push({ key: "tx", label: labels[filters.transactionType] ?? filters.transactionType, clear: { transactionType: "all" } });
    }
    if (filters.propertyType !== "all") chips.push({ key: "pt", label: filters.propertyType, clear: { propertyType: "all" } });
    if (filters.maxBudget) chips.push({ key: "budget", label: `Max ${Number(filters.maxBudget).toLocaleString("fr-FR")} DH`, clear: { maxBudget: "" } });
    if (filters.minSurface) chips.push({ key: "surface", label: `≥ ${filters.minSurface} m²`, clear: { minSurface: "" } });
    return chips;
  }, [filters]);

  const displayedCount = filteredListings.length + gatewayResults.length;
  const isSearching = isLoading || isGatewayLoading;
  const hasAnyResults = displayedCount > 0;
  const showSkeleton = isLoading && filteredListings.length === 0 && gatewayResults.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/12 bg-surface/95 dark:border-white/8 dark:bg-deepblue/95">
        <div className="mx-auto max-w-[1480px] px-4 py-3 sm:px-6 sm:py-3.5">
          <QuickFilters filters={filters} cities={cities} propertyTypes={propertyTypes} onChange={handleFilterChange} onReset={handleReset} />
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-2.5 border-b border-border/12 pb-3 dark:border-white/8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            {isSearching ? <Loader2 size={15} strokeWidth={2.5} className="shrink-0 animate-spin text-bronze-500" aria-hidden="true" /> : null}
            <h1 className="min-w-0 truncate text-[14px] font-extrabold text-foreground sm:text-[15px]">
              {isSearching && displayedCount === 0
                ? "Recherche…"
                : `${displayedCount} résultat${displayedCount !== 1 ? "s" : ""}${filters.search.trim() ? ` pour “${filters.search.trim()}”` : ""}`}
            </h1>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <SearchViewSwitcher value={view} onChange={setView} />
            <select
              aria-label="Trier les résultats"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              className="h-10 shrink-0 rounded-full border border-border/20 bg-surface px-3 text-[12px] font-bold text-foreground outline-none dark:border-white/12 dark:bg-white/[0.06] dark:[color-scheme:dark]"
            >
              <option value="recommended">Recommandé</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilters((current) => ({ ...current, ...chip.clear }))}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/20 bg-surface px-2.5 py-1 text-[11px] font-bold text-foreground/75 transition hover:border-bronze-500/35 hover:text-foreground"
              >
                {chip.label}<X size={10} strokeWidth={2.6} aria-hidden="true" />
              </button>
            ))}
            {activeChips.length > 1 ? (
              <button type="button" onClick={handleReset} className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition hover:text-foreground">Tout effacer</button>
            ) : null}
          </div>
        ) : null}

        <div data-search-view-layout={view} className={`mt-3 grid grid-cols-1 gap-5 ${view === "split" ? "lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]" : "lg:grid-cols-1"} lg:items-start`}>
          {viewLayout.showList ? (
            <div ref={listRef} data-search-list-pane className="min-w-0">
              {showSkeleton ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {[1, 2, 3, 4].map((number) => <SkeletonCard key={number} />)}
                </div>
              ) : (
                <div className="space-y-5" data-search-continuous-flow>
                  {continuousListings.length > 0 ? (
                    <div className={`grid grid-cols-2 gap-x-3 gap-y-5 transition-opacity duration-200 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 ${isLoading ? "opacity-60" : "opacity-100"}`}>
                      {continuousListings.map((listing) => (
                        <SearchListingCardDark key={listing.id} listing={listing} />
                      ))}
                    </div>
                  ) : null}

                  <ExternalIndexedResultsSection
                    results={gatewayResults}
                    isLoading={isGatewayLoading}
                    showHeader={false}
                  />

                  {!hasAnyResults && !isSearching ? <EmptyState onReset={handleReset} city={filters.city} /> : null}
                </div>
              )}

              {hasMoreIndexed ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMoreIndexed}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 rounded-full border border-bronze-500/35 bg-bronze-500/10 px-5 py-2.5 text-[13px] font-extrabold text-bronze-300 transition hover:bg-bronze-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingMore ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
                    Afficher plus de résultats
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {viewLayout.showMap ? (
            <div data-search-map-pane className="min-w-0 space-y-4 lg:sticky lg:top-5 lg:self-start">
              <SearchMapPanel
                cityCounts={cityCounts}
                otherCount={otherCount}
                activeCity={filters.city}
                onSelectCity={handleSelectCity}
                stats={{ total: filteredListings.length, citiesCovered: cityCounts.length, avgIndex, updatedLabel: "Récent" }}
              />

              <div data-search-map-secondary="project" className={`${view === "split" ? "hidden" : ""} overflow-hidden rounded-2xl border border-border/15 bg-card backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]`}>
                <div className="px-5 py-4">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-500 dark:text-bronze-400">Mon Projet AkarFinder</p>
                  <p className="mt-1.5 text-[1rem] font-extrabold text-foreground">Clarifier mes priorités</p>
                  <p className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground">Budget, zones, types, contraintes et préférences dans un seul projet réutilisable.</p>
                </div>
                <div className="border-t border-border/12 px-5 py-3 dark:border-white/8">
                  <Link href="/compagnon" className="flex items-center justify-between text-[13px] font-extrabold text-foreground/80 transition hover:text-foreground dark:text-white/85 dark:hover:text-white">
                    Construire Mon Projet<ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <Link
                href={`/map${filters.city !== "all" ? `?city=${encodeURIComponent(filters.city)}` : ""}`}
                data-search-map-secondary="full-map"
                className={`${view === "split" ? "hidden" : ""} flex items-center justify-center gap-2 rounded-2xl border border-border/20 bg-card px-4 py-3 text-[13px] font-extrabold text-foreground/75 transition hover:border-bronze-500/40 hover:text-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-white/80 dark:hover:text-white`}
              >
                <MapIcon size={15} aria-hidden="true" /> Ouvrir la carte complète
              </Link>
            </div>
          ) : null}
        </div>
      </section>
      <CompareBar />
    </div>
  );
}
