"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Map as MapIcon, SearchX, X } from "lucide-react";
import { CompareBar } from "@/components/compare/CompareBar";
import { ExternalIndexedResultsSection } from "@/components/search/ExternalIndexedResultsSection";
import { QuickFilters } from "@/components/search/QuickFilters";
import { SearchListingCardDark } from "@/components/search/SearchListingCardDark";
import { SearchMapPanel, type CityCount } from "@/components/search/SearchMapPanel";
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
import { partitionStructuredListings } from "@/lib/search/search-truth-tier";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";
import { track } from "@/lib/tracking/track";

type LightZillowSearchShellProps = {
  initialListings: Listing[];
  initialFilters?: Partial<{
    transactionType: "all" | "buy" | "rent" | "new";
    city: string;
    propertyType: string;
    maxBudget: string;
    minBudget: string;
    mreOnly: boolean;
    search: string;
  }>;
};

type ActiveTab = "Liste" | "Carte";

type ApiSearchResponse = {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
  next_cursor?: number | null;
  has_more?: boolean;
  source: string;
  generated_at: string;
};

const RELIABILITY_BADGE: Record<string, string> = {
  top: "Information complete",
  high: "Information structuree",
  medium: "A completer",
  low: "Information limitee",
};

function buildSearchUrl(filters: ListingFiltersState, sortBy: SortBy, cursor?: number | null): string {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.city !== "all") params.set("city", filters.city);
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
  if (cursor != null) params.set("cursor", String(cursor));
  return `/api/search?${params.toString()}`;
}

function getIntentLabel(t: string) {
  if (t === "rent") return "Locations";
  if (t === "new") return "Programmes neufs";
  if (t === "buy") return "Biens à acheter";
  return "Tous les biens";
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-border/15 bg-card dark:border-white/10 dark:bg-white/[0.04]">
      <div className="h-[210px] bg-surface dark:bg-white/10" />
      <div className="space-y-3 p-5">
        <div className="h-6 w-2/3 rounded-full bg-surface dark:bg-white/10" />
        <div className="h-4 w-1/3 rounded-full bg-surface dark:bg-white/10" />
        <div className="h-4 w-1/2 rounded-full bg-surface dark:bg-white/10" />
        <div className="mt-2 h-10 rounded-xl bg-surface dark:bg-white/10" />
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
          ? `Aucun résultat exploitable trouvé à ${city} avec cette combinaison de filtres.`
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

function StructuredTruthSection({
  kind,
  listings,
  isLoading,
}: {
  kind: "analyzed" | "partial";
  listings: Listing[];
  isLoading: boolean;
}) {
  if (listings.length === 0) return null;
  const analyzed = kind === "analyzed";
  return (
    <section className="space-y-4" aria-label={analyzed ? "Analysé par AkarFinder" : "Analyse partielle"}>
      <div className="border-t border-border/15 pt-6 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[16px] font-extrabold text-foreground dark:text-white/90 sm:text-[18px]">
            {analyzed ? "Analysé par AkarFinder" : "Analyse partielle"}
          </h2>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${analyzed ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200" : "border-amber-400/25 bg-amber-500/10 text-amber-700 dark:text-amber-200"}`}>
            {listings.length} affiché{listings.length > 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-[12px] leading-5 text-muted-foreground dark:text-white/50 sm:text-[13px]">
          {analyzed
            ? "Fiches structurées pour lesquelles AkarFinder dispose d'une analyse documentaire. Analysé ne signifie pas vérifié, certifié ni garanti."
            : "Fiches structurées mais encore incomplètes : AkarFinder montre ce qui est disponible sans inventer les informations manquantes."}
        </p>
      </div>
      <div className={`grid grid-cols-1 gap-5 xl:grid-cols-2 transition-opacity duration-200 ${isLoading ? "opacity-60" : "opacity-100"}`}>
        {listings.map((listing) => (
          <SearchListingCardDark key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}

function ObservedResultsSection({
  persistedListings,
  gatewayResults,
  isLoading,
  isGatewayLoading,
}: {
  persistedListings: Listing[];
  gatewayResults: SearchGatewayNormalizedResult[];
  isLoading: boolean;
  isGatewayLoading: boolean;
}) {
  if (persistedListings.length === 0 && gatewayResults.length === 0 && !isGatewayLoading) return null;
  const displayed = persistedListings.length + gatewayResults.length;
  return (
    <section className="mt-8 space-y-4" aria-label="Offres observées sur le web">
      <div className="border-t border-border/15 pt-6 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[16px] font-extrabold text-foreground dark:text-white/90 sm:text-[18px]">Offres observées sur le web</h2>
          {displayed > 0 ? (
            <span className="rounded-full border border-slate-400/25 bg-slate-500/10 px-2.5 py-1 text-[10px] font-extrabold text-slate-700 dark:text-white/65">
              {displayed} affiché{displayed > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-3xl text-[12px] leading-5 text-muted-foreground dark:text-white/50 sm:text-[13px]">
          Résultats publics avec niveau d'analyse limité. La présence ici n'est pas une validation de fiabilité : vérifiez le prix, la disponibilité et les détails sur la source originale.
        </p>
      </div>

      {persistedListings.length > 0 ? (
        <div className={`grid grid-cols-1 gap-5 xl:grid-cols-2 transition-opacity duration-200 ${isLoading ? "opacity-60" : "opacity-100"}`}>
          {persistedListings.map((listing) => (
            <SearchListingCardDark key={listing.id} listing={listing} />
          ))}
        </div>
      ) : null}

      <ExternalIndexedResultsSection
        results={gatewayResults}
        isLoading={isGatewayLoading}
        showHeader={false}
      />
    </section>
  );
}

export function LightZillowSearchShell({ initialListings, initialFilters }: LightZillowSearchShellProps) {
  const [filters, setFilters] = useState<ListingFiltersState>({
    ...defaultListingFilters,
    transactionType: initialFilters?.transactionType ?? defaultListingFilters.transactionType,
    city: initialFilters?.city ?? defaultListingFilters.city,
    propertyType: (initialFilters?.propertyType as ListingFiltersState["propertyType"]) ?? defaultListingFilters.propertyType,
    maxBudget: initialFilters?.maxBudget ?? defaultListingFilters.maxBudget,
    minBudget: initialFilters?.minBudget ?? defaultListingFilters.minBudget,
    mreOnly: initialFilters?.mreOnly ?? defaultListingFilters.mreOnly,
    search: initialFilters?.search ?? defaultListingFilters.search,
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>("Liste");
  const [sortBy, setSortBy] = useState<SortBy>("recommended");
  const [listings, setListings] = useState(initialListings);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMoreIndexed, setHasMoreIndexed] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [gatewayResults, setGatewayResults] = useState<SearchGatewayNormalizedResult[]>([]);
  const gatewayEnabled = process.env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED === "true";
  const [isGatewayLoading, setIsGatewayLoading] = useState(gatewayEnabled);

  function handleFilterChange(next: ListingFiltersState) {
    if (
      next.transactionType !== filters.transactionType ||
      next.city !== filters.city ||
      next.propertyType !== filters.propertyType ||
      next.reliability !== filters.reliability
    ) {
      track({
        event_name: "search_filter_change",
        source_page: "/search",
        intent: next.transactionType,
        metadata: { city: next.city, property_type: next.propertyType },
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
        if (!cancelled) {
          setListings(payload.listings);
          setNextCursor(payload.next_cursor ?? null);
          setHasMoreIndexed(payload.has_more === true && payload.next_cursor != null);
        }
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
    if (nextCursor == null || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(buildSearchUrl(filters, sortBy, nextCursor), { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as ApiSearchResponse;
      setListings((current) => {
        const merged = new Map(current.map((listing) => [listing.id, listing]));
        for (const listing of payload.listings) merged.set(listing.id, listing);
        return [...merged.values()];
      });
      setNextCursor(payload.next_cursor ?? null);
      setHasMoreIndexed(payload.has_more === true && payload.next_cursor != null);
    } catch {
      // Preserve the current page on transient failures.
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!gatewayEnabled) {
      setGatewayResults([]);
      return;
    }
    let cancelled = false;
    const delay = filters.search ? 300 : 0;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsGatewayLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.search.trim()) params.set("q", filters.search.trim());
        if (filters.city !== "all") params.set("city", filters.city);
        if (filters.propertyType !== "all") params.set("property_type", filters.propertyType);
        if (filters.transactionType !== "all") params.set("intent", filters.transactionType);
        const response = await fetch(`/api/search/gateway?${params.toString()}`, { cache: "no-store" });
        if (!response.ok || cancelled) {
          setGatewayResults([]);
          return;
        }
        const payload = await response.json();
        if (!cancelled && Array.isArray(payload.results)) setGatewayResults(payload.results);
      } catch {
        if (!cancelled) setGatewayResults([]);
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

  const truthGroups = useMemo(() => partitionStructuredListings(filteredListings), [filteredListings]);
  const analyzedListings = truthGroups.analyzed;
  const partialListings = truthGroups.partial;
  const observedIndexedListings = truthGroups.observed;

  const cities = useMemo(() => getSearchCities(listings), [listings]);
  const propertyTypes = useMemo(() => getPropertyTypes(listings), [listings]);
  const displayCity = filters.city === "all" ? "Maroc" : filters.city;
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
    if (filters.transactionType !== "all") {
      const labels: Record<string, string> = { buy: "Acheter", rent: "Louer", new: "Neuf" };
      chips.push({ key: "tx", label: labels[filters.transactionType] ?? filters.transactionType, clear: { transactionType: "all" } });
    }
    if (filters.propertyType !== "all") chips.push({ key: "pt", label: filters.propertyType, clear: { propertyType: "all" } });
    if (filters.maxBudget) chips.push({ key: "budget", label: `Budget max : ${Number(filters.maxBudget).toLocaleString("fr-FR")} DH`, clear: { maxBudget: "" } });
    if (filters.minSurface) chips.push({ key: "surface", label: `Surface ≥ ${filters.minSurface} m²`, clear: { minSurface: "" } });
    return chips;
  }, [filters]);

  const displayedCount = filteredListings.length + gatewayResults.length;
  const observedCount = observedIndexedListings.length + gatewayResults.length;
  const isSearching = isLoading || isGatewayLoading;
  const hasAnyResults = displayedCount > 0;
  const showSkeleton = isLoading && filteredListings.length === 0 && gatewayResults.length === 0;
  const sortExplanation =
    sortBy === "recommended"
      ? "Tri recommandé : pertinence de la recherche d’abord, puis qualité des informations disponibles. Un résultat hors sujet ne passe pas devant un résultat pertinent parce qu’il est mieux rempli."
      : "Le tri par prix s’applique aux fiches structurées. Les offres observées sur le web restent des aperçus dans l’ordre fourni par leur source de découverte.";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/12 bg-surface dark:border-white/8 dark:bg-deepblue">
        <div className="pointer-events-none absolute inset-0 hidden dark:block" style={{ background: "radial-gradient(ellipse 70% 60% at 60% 20%, rgba(34,72,132,0.6) 0%, transparent 62%)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bronze-500/40 to-transparent" />
        <div className="relative mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:py-9">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="h-px w-7 bg-bronze-500/70" aria-hidden="true" />
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400 sm:text-[11px]">Moteur de recherche immobilier</p>
              </div>
              <h1 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.045em] text-foreground sm:text-[2.7rem]">Trouvez votre bien au Maroc</h1>
              <p className="mt-2 hidden max-w-2xl text-[14.5px] leading-7 text-muted-foreground sm:block">
                Pertinence d’abord, niveau d’information explicite, source visible avant de décider.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-border/20 bg-surface px-3 py-1.5 text-[11px] font-bold text-foreground/75 dark:border-white/12 dark:bg-white/[0.06] sm:px-4 sm:py-2 sm:text-[12.5px]">
              {isSearching && displayedCount === 0
                ? "Recherche…"
                : `${displayedCount} résultat${displayedCount !== 1 ? "s" : ""} affiché${displayedCount !== 1 ? "s" : ""}`}
            </span>
          </div>

          <QuickFilters filters={filters} cities={cities} propertyTypes={propertyTypes} onChange={handleFilterChange} onReset={handleReset} />

          <p className="mt-2.5 text-[12px] font-semibold text-muted-foreground">
            Besoin de clarifier vos priorités ?{" "}
            <Link href="/compagnon" className="font-extrabold text-bronze-400 underline underline-offset-2 transition hover:text-bronze-300">
              Construire Mon Projet avec le Compagnon
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:py-6">
        <div className="border-b border-border/12 pb-3.5 dark:border-white/8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[1.05rem] font-extrabold tracking-[-0.02em] text-foreground sm:text-[1.15rem]">
                {isSearching ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-bronze-400" aria-hidden="true" /> : null}
                <span>
                  {filters.search.trim()
                    ? `Résultats pour "${filters.search.trim()}"${filters.city !== "all" ? ` à ${filters.city}` : ""}`
                    : `Résultats immobiliers à ${displayCity}`}
                </span>
              </p>
              <p className="mt-0.5 text-[12.5px] font-medium text-muted-foreground sm:text-[13.5px]">
                {[
                  analyzedListings.length > 0 && `${analyzedListings.length} analysé${analyzedListings.length > 1 ? "s" : ""}`,
                  partialListings.length > 0 && `${partialListings.length} analyse${partialListings.length > 1 ? "s" : ""} partielle${partialListings.length > 1 ? "s" : ""}`,
                  observedCount > 0 && `${observedCount} offre${observedCount > 1 ? "s" : ""} observée${observedCount > 1 ? "s" : ""}`,
                ].filter(Boolean).join(" · ") || (isSearching ? "Recherche en cours…" : getIntentLabel(filters.transactionType))}
              </p>
              <p className="mt-1 max-w-3xl text-[11px] leading-5 text-muted-foreground/85">{sortExplanation}</p>
            </div>

            <select
              aria-label="Trier les fiches structurées"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              className="shrink-0 rounded-full border border-border/20 bg-surface px-3 py-2.5 text-[12px] font-bold text-foreground outline-none dark:border-white/12 dark:bg-white/[0.06] dark:[color-scheme:dark] sm:px-4 sm:text-[13px]"
            >
              <option value="recommended">Tri recommandé</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </div>

          <div className="mt-2.5 flex rounded-full border border-border/20 bg-surface p-1 dark:border-white/12 dark:bg-white/[0.06] lg:hidden">
            {(["Liste", "Carte"] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-pressed={activeTab === tab}
                className={`flex-1 rounded-full py-2 text-[13px] font-extrabold transition ${activeTab === tab ? "bg-gradient-to-br from-bronze-500 to-bronze-700 text-white" : "text-foreground/55"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeChips.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setFilters((current) => ({ ...current, ...chip.clear }))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-bronze-500/30 bg-bronze-500/10 px-3 py-1.5 text-[12px] font-bold text-bronze-200 transition hover:bg-bronze-500/20"
                >
                  {chip.label}<X size={11} strokeWidth={2.6} aria-hidden="true" />
                </button>
              ))}
              {activeChips.length > 1 ? (
                <button type="button" onClick={handleReset} className="rounded-full px-3 py-1.5 text-[12px] font-bold text-muted-foreground transition hover:text-foreground">Tout effacer</button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:mt-5 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.62fr)] lg:items-start">
          <div ref={listRef} className={`min-w-0 ${activeTab === "Carte" ? "hidden lg:block" : "block"}`}>
            {showSkeleton ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {[1, 2, 3, 4].map((number) => <SkeletonCard key={number} />)}
              </div>
            ) : (
              <div className="space-y-8">
                <StructuredTruthSection kind="analyzed" listings={analyzedListings} isLoading={isLoading} />
                <StructuredTruthSection kind="partial" listings={partialListings} isLoading={isLoading} />
                <ObservedResultsSection
                  persistedListings={observedIndexedListings}
                  gatewayResults={gatewayResults}
                  isLoading={isLoading}
                  isGatewayLoading={isGatewayLoading}
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
                  Afficher plus de résultats indexés
                </button>
              </div>
            ) : null}
          </div>

          <div className={`min-w-0 space-y-4 ${activeTab === "Liste" ? "hidden lg:block" : "block"} lg:sticky lg:top-5 lg:self-start`}>
            <SearchMapPanel
              cityCounts={cityCounts}
              otherCount={otherCount}
              activeCity={filters.city}
              onSelectCity={handleSelectCity}
              stats={{ total: filteredListings.length, citiesCovered: cityCounts.length, avgIndex, updatedLabel: "Récent" }}
            />

            <div className="overflow-hidden rounded-2xl border border-border/15 bg-card backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <div className="px-5 py-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-500 dark:text-bronze-400">Mon Projet AkarFinder</p>
                <p className="mt-1.5 text-[1rem] font-extrabold text-foreground">Clarifier mes priorités</p>
                <p className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground">Budget, zones, types, contraintes et préférences dans un seul projet réutilisable.</p>
              </div>
              <div className="border-t border-border/12 px-5 py-3 dark:border-white/8">
                <Link href="/compagnon" className="flex items-center justify-between text-[13px] font-extrabold text-foreground/80 transition hover:text-foreground dark:text-white/85">
                  Construire Mon Projet<ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <Link
              href={`/map${filters.city !== "all" ? `?city=${encodeURIComponent(filters.city)}` : ""}`}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border/20 bg-card px-4 py-3 text-[13px] font-extrabold text-foreground/75 transition hover:border-bronze-500/40 hover:text-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-white/80 dark:hover:text-white"
            >
              <MapIcon size={15} aria-hidden="true" /> Ouvrir la carte complète
            </Link>
          </div>
        </div>
      </section>
      <CompareBar />
    </div>
  );
}
