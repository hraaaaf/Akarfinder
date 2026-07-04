"use client";

// SEARCH-RELOOKING-1 — Shell /search dark premium ("cockpit AkarFinder").
// Logique de recherche/filtres/tri/fetch INCHANGÉE ; thème refondu en dark premium.
// SEARCH-GATEWAY-MULTISOURCE-SERP-UI-INTEGRATION-1 — External indexed results integration
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Map as MapIcon, SearchX, X, BellPlus, ArrowRight } from "lucide-react";
import { CompareBar } from "@/components/compare/CompareBar";
import { SearchListingCardDark } from "@/components/search/SearchListingCardDark";
import { ExternalIndexedResultsSection } from "@/components/search/ExternalIndexedResultsSection";
import { SearchMapPanel, type CityCount } from "@/components/search/SearchMapPanel";
import { QuickFilters } from "@/components/search/QuickFilters";
import { track } from "@/lib/tracking/track";
import { getCityCoord } from "@/lib/search/city-coords";
import type { Listing, ListingFiltersState } from "@/lib/listings/types";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";
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
  source: string;
  generated_at: string;
};

// Phase 1: Reliability filters disabled for external search results
// Reserved for first-party / partner-authorized listings only
const RELIABILITY_BADGE: Record<string, string> = {
  top: "Très fiable", high: "Fiable", medium: "À vérifier", low: "Faible confiance",
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

function getIntentLabel(t: string) {
  if (t === "rent") return "Locations";
  if (t === "new") return "Programmes neufs";
  if (t === "buy") return "Biens à acheter";
  return "Tous les biens";
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-border/15 dark:border-white/10 bg-card dark:bg-white/[0.04]">
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

function EmptyState({ onReset, city, hasWebResults }: { onReset: () => void; city?: string; hasWebResults?: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/20 dark:border-white/15 bg-surface/50 dark:bg-white/[0.03] p-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface dark:bg-white/5">
        <SearchX size={24} strokeWidth={2} className="text-muted-foreground" aria-hidden="true" />
      </span>
      <p className="mt-4 text-[1.1rem] font-extrabold text-foreground">Aucune annonce structurée AkarFinder</p>
      <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
        {city && city !== "all"
          ? `Aucune annonce AkarFinder trouvée à ${city} pour ces filtres.`
          : "Élargissez la ville, le budget ou le type de bien."}
        {hasWebResults ? <span className="block mt-1 text-blue-500 dark:text-blue-400">Des résultats du web sont disponibles ci-dessous.</span> : null}
      </p>
      <button type="button" onClick={onReset} className="mt-5 rounded-full bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-2.5 text-[13px] font-extrabold text-white transition hover:from-bronze-600">
        Réinitialiser les filtres
      </button>
    </div>
  );
}

// SERP-PURE-GATEWAY-FIRST-1 — secondary section for partner / first-party listings
// Shows only when there are authorized structured listings (first_party / partner_authorized).
function PartnerListingsSection({
  listings,
  isLoading,
}: {
  listings: Listing[];
  isLoading: boolean;
}) {
  return (
    <section className="mt-8 space-y-4" aria-label="Annonces partenaires AkarFinder">
      <div className="border-t border-border/15 dark:border-white/10 pt-6">
        <h2 className="text-[15px] sm:text-[16px] font-bold text-foreground dark:text-white/90">
          Annonces partenaires AkarFinder
        </h2>
        <p className="mt-0.5 text-[12px] sm:text-[13px] text-muted-foreground dark:text-white/50">
          Annonces intégrées directement par nos partenaires.
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

// SERP-PURE-GATEWAY-FIRST-1 — shown when no structured partner listings exist.
// Does NOT replace gateway results — it appears below them as a contextual note.
function PartnerEmptyNote({ city }: { city: string }) {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-border/20 dark:border-white/10 bg-surface/50 dark:bg-white/[0.02] px-5 py-4">
      <p className="text-[13px] font-semibold text-foreground/70 dark:text-white/60">
        Aucune annonce partenaire AkarFinder{city !== "all" ? ` à ${city}` : ""} pour cette recherche.
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground dark:text-white/40">
        Voici les résultats trouvés sur les sources originales ci-dessus.
      </p>
    </div>
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

  // Search Gateway — external indexed results
  const [gatewayResults, setGatewayResults] = useState<SearchGatewayNormalizedResult[]>([]);
  // Initialize as true when gateway is enabled so the section shows a loading skeleton
  // immediately on first render — avoids a flash of empty content before the fetch fires.
  const gatewayEnabled = process.env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED === "true";
  const [isGatewayLoading, setIsGatewayLoading] = useState(gatewayEnabled);

  // Tracking filtre (non bloquant) — clés structurantes seulement.
  function handleFilterChange(next: ListingFiltersState) {
    if (
      next.transactionType !== filters.transactionType ||
      next.city !== filters.city ||
      next.propertyType !== filters.propertyType ||
      next.reliability !== filters.reliability
    ) {
      track({ event_name: "search_filter_change", source_page: "/search", intent: next.transactionType, metadata: { city: next.city, property_type: next.propertyType } });
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
      } catch { /* keep current silently */ }
      finally { if (!cancelled) setIsLoading(false); }
    }, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [filters, sortBy]);

  // Search Gateway — fetch external indexed results in parallel
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
        // SEARCH-GATEWAY-INTENT-TEST-HARDENING-1 — forward /acheter, /louer,
        // /neuf intent (buy/rent/new) so the Gateway can favor matching results.
        if (filters.transactionType !== "all") params.set("intent", filters.transactionType);
        const url = `/api/search/gateway?${params.toString()}`;
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok || cancelled) {
          setGatewayResults([]);
          return;
        }
        const payload = await response.json();
        if (!cancelled && payload.results && Array.isArray(payload.results)) {
          setGatewayResults(payload.results);
        }
      } catch {
        // Fail silently, keep current
      } finally {
        if (!cancelled) setIsGatewayLoading(false);
      }
    }, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [filters, gatewayEnabled]);

  const filteredListings = useMemo(() => {
    const minBudget = Number(filters.minBudget) || 0;
    const maxBudget = Number(filters.maxBudget) || Number.POSITIVE_INFINITY;
    const minSurface = Number(filters.minSurface) || 0;
    const clientFiltered = listings.filter((l) => {
      if (l.price < minBudget || l.price > maxBudget) return false;
      if (l.surface_m2 < minSurface) return false;
      // SEARCH-FILTERS-RELEVANCE-FIX-1: MRE filter disabled — is_mre_friendly field does not exist in DB/types
      // TODO: Re-enable once is_mre_friendly is properly defined and populated
      // if (filters.mreOnly && !l.is_mre_friendly) return false;
      if (filters.packageScore === "bon") {
        const tx = l.transaction_type === "rent" ? "rent" : "buy";
        const score = calculatePackageScore(
          l.reliability_score, l.reliability_available !== false, l.duplicate_score,
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

  // ── Stats + clusters carte ────────────────────────────────────────────────
  const { cityCounts, otherCount, avgIndex } = useMemo(() => {
    const counts = new Map<string, number>();
    let other = 0;
    let idxSum = 0, idxN = 0;
    for (const l of filteredListings) {
      if (l.data_completeness_score != null) { idxSum += l.data_completeness_score; idxN++; }
      if (l.city && getCityCoord(l.city)) counts.set(l.city, (counts.get(l.city) ?? 0) + 1);
      else other++;
    }
    const cc: CityCount[] = [...counts.entries()].map(([city, count]) => ({ city, count }));
    return { cityCounts: cc, otherCount: other, avgIndex: idxN ? Math.round(idxSum / idxN) : null };
  }, [filteredListings]);

  const listRef = useRef<HTMLDivElement>(null);

  const handleSelectCity = (city: string) => {
    track({ event_name: "search_map_pin_click", source_page: "/search", metadata: { city } });
    setFilters((f) => ({ ...f, city: f.city.toLowerCase() === city.toLowerCase() ? "all" : city, neighborhood: "all" }));
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: Partial<ListingFiltersState> }> = [];
    if (filters.city !== "all") chips.push({ key: "city", label: filters.city, clear: { city: "all", neighborhood: "all" } });
    if (filters.transactionType !== "all") {
      const t: Record<string, string> = { buy: "Acheter", rent: "Louer", new: "Neuf" };
      chips.push({ key: "tx", label: t[filters.transactionType] ?? filters.transactionType, clear: { transactionType: "all" } });
    }
    if (filters.propertyType !== "all") chips.push({ key: "pt", label: filters.propertyType, clear: { propertyType: "all" } });
    // Phase 1: Reliability/MRE/Package filters hidden for external search results
    // Reserved for first-party / partner-authorized listings only
    /*
    if (filters.reliability !== "all") {
      const r: Record<string, string> = { top: "Très fiable", high: "Fiable", medium: "À vérifier", low: "Faible confiance" };
      chips.push({ key: "rel", label: r[filters.reliability] ?? filters.reliability, clear: { reliability: "all" } });
    }
    if (filters.minReliabilityScore > 0) chips.push({ key: "score", label: `Score ≥ ${filters.minReliabilityScore}`, clear: { minReliabilityScore: 0 } });
    if (filters.mreOnly) chips.push({ key: "mre", label: "MRE-friendly", clear: { mreOnly: false } });
    if (filters.packageScore === "bon") chips.push({ key: "pkg", label: "Bon package", clear: { packageScore: "all" } });
    */
    if (filters.maxBudget) chips.push({ key: "budget", label: `Budget max : ${Number(filters.maxBudget).toLocaleString("fr-FR")} DH`, clear: { maxBudget: "" } });
    if (filters.minSurface) chips.push({ key: "surface", label: `Surface ≥ ${filters.minSurface} m²`, clear: { minSurface: "" } });
    return chips;
  }, [filters]);

  const showSkeleton = isLoading && filteredListings.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero + filtres */}
      <section className="relative overflow-hidden border-b border-border/12 dark:border-white/8 bg-surface dark:bg-deepblue">
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
                Sources originales, repères indicatifs et source visible avant de décider.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-border/20 dark:border-white/12 bg-surface dark:bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-foreground/75 sm:px-4 sm:py-2 sm:text-[12.5px]">
              {(() => {
                const total = filteredListings.length + gatewayResults.length;
                return gatewayEnabled
                  ? `${total} résultat${total !== 1 ? "s" : ""}`
                  : `${filteredListings.length} annonce${filteredListings.length !== 1 ? "s" : ""} partenaire${filteredListings.length !== 1 ? "s" : ""}`;
              })()}
            </span>
          </div>

          <QuickFilters filters={filters} cities={cities} propertyTypes={propertyTypes} onChange={handleFilterChange} onReset={handleReset} />
        </div>
      </section>

      {/* Résultats */}
      <section className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:py-6">
        <div className="border-b border-border/12 dark:border-white/8 pb-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[1.05rem] font-extrabold tracking-[-0.02em] text-foreground sm:text-[1.15rem]">
                {(isLoading || isGatewayLoading) ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-bronze-400" aria-hidden="true" /> : null}
                <span>
                  {filters.search.trim()
                    ? `Résultats pour "${filters.search.trim()}"${filters.city !== "all" ? ` à ${filters.city}` : ""}`
                    : gatewayEnabled
                      ? `Résultats immobiliers à ${displayCity}`
                      : `${filteredListings.length} annonce${filteredListings.length !== 1 ? "s" : ""} partenaire${filteredListings.length !== 1 ? "s" : ""} à ${displayCity}`}
                </span>
              </p>
              <p className="mt-0.5 line-clamp-1 text-[12.5px] font-medium text-muted-foreground sm:text-[13.5px]">
                {filters.search.trim()
                  ? ([
                      gatewayResults.length > 0 && `${gatewayResults.length} résultat${gatewayResults.length !== 1 ? "s" : ""} web`,
                      filteredListings.length > 0 && `${filteredListings.length} annonce${filteredListings.length !== 1 ? "s" : ""} partenaire`,
                    ].filter(Boolean).join(" · ") || (isGatewayLoading || isLoading ? "Recherche en cours…" : ""))
                  : `${getIntentLabel(filters.transactionType)} · tri ${sortBy === "recommended" ? "recommandé" : sortBy === "reliability" ? "fiabilité" : sortBy === "price-asc" ? "prix ↑" : "prix ↓"}`}
              </p>
            </div>

            <select aria-label="Trier les résultats" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="shrink-0 rounded-full border border-border/20 dark:border-white/12 bg-surface dark:bg-white/[0.06] px-3 py-2.5 text-[12px] font-bold text-foreground outline-none dark:[color-scheme:dark] sm:px-4 sm:text-[13px]">
              <option value="recommended">Tri recommandé</option>
              <option value="reliability">Meilleures annonces</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </div>

          {/* Onglets Liste/Carte sur leur propre rangée mobile — évite de voler
              l'espace du count "X biens à Maroc" */}
          <div className="mt-2.5 flex rounded-full border border-border/20 dark:border-white/12 bg-surface dark:bg-white/[0.06] p-1 lg:hidden">
            {(["Liste", "Carte"] as ActiveTab[]).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-full py-2 text-[13px] font-extrabold transition ${activeTab === tab ? "bg-gradient-to-br from-bronze-500 to-bronze-700 text-white" : "text-foreground/55"}`}>
                {tab}
              </button>
            ))}
          </div>

          {activeChips.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button key={chip.key} type="button" onClick={() => setFilters((f) => ({ ...f, ...chip.clear }))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-bronze-500/30 bg-bronze-500/10 px-3 py-1.5 text-[12px] font-bold text-bronze-200 transition hover:bg-bronze-500/20">
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
          {/* Liste */}
          <div ref={listRef} className={`min-w-0 ${activeTab === "Carte" ? "hidden lg:block" : "block"}`}>
            {gatewayEnabled ? (
              <>
                {/* PRIMARY: Sources originales — web results first */}
                <ExternalIndexedResultsSection
                  results={gatewayResults}
                  isLoading={isGatewayLoading}
                />

                {/* SECONDARY: Partner / first-party structured listings */}
                {showSkeleton ? null : filteredListings.length > 0 ? (
                  <PartnerListingsSection listings={filteredListings} isLoading={isLoading} />
                ) : isLoading ? null : (
                  <PartnerEmptyNote city={filters.city} />
                )}
              </>
            ) : (
              <>
                {/* Fallback: gateway disabled, structured listings are primary */}
                {showSkeleton ? (
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} />)}
                  </div>
                ) : filteredListings.length === 0 ? (
                  <EmptyState onReset={handleReset} city={filters.city} hasWebResults={false} />
                ) : (
                  <div className={`grid grid-cols-1 gap-5 xl:grid-cols-2 transition-opacity duration-200 ${isLoading ? "opacity-60" : "opacity-100"}`}>
                    {filteredListings.map((listing) => <SearchListingCardDark key={listing.id} listing={listing} />)}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Carte + CTAs */}
          <div className={`min-w-0 space-y-4 ${activeTab === "Liste" ? "hidden lg:block" : "block"} lg:sticky lg:top-5 lg:self-start`}>
            <SearchMapPanel
              cityCounts={cityCounts}
              otherCount={otherCount}
              activeCity={filters.city}
              onSelectCity={handleSelectCity}
              stats={{ total: filteredListings.length, citiesCovered: cityCounts.length, avgIndex, updatedLabel: "Récent" }}
            />

            {/* Phase 1: Alerts disabled for external web results (no persistence guarantee) */}
            {/* Reserved for future P18A when first-party listings available */}

            {/* Dossier acheteur/locataire */}
            <div className="overflow-hidden rounded-2xl border border-border/15 dark:border-white/10 bg-card dark:bg-white/[0.04] backdrop-blur-sm">
              <div className="px-5 py-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-500 dark:text-bronze-400">Accompagnement</p>
                <p className="mt-1.5 text-[1rem] font-extrabold text-foreground">Clarifier mon projet</p>
                <p className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground">Budget, zone, type de bien et timing — recevez les biens compatibles.</p>
              </div>
              <div className="border-t border-border/12 dark:border-white/8 px-5 py-3">
                <Link href="/onboarding" className="flex items-center justify-between text-[13px] font-extrabold text-foreground/80 dark:text-white/85 transition hover:text-foreground">
                  Créer mon dossier<ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Voir la carte plein écran */}
            <Link href={`/map${filters.city !== "all" ? `?city=${encodeURIComponent(filters.city)}` : ""}`}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border/20 dark:border-white/12 bg-card dark:bg-white/[0.04] px-4 py-3 text-[13px] font-extrabold text-foreground/75 dark:text-white/80 transition hover:border-bronze-500/40 hover:text-foreground dark:hover:text-white">
              <MapIcon size={15} aria-hidden="true" /> Ouvrir la carte complète
            </Link>
          </div>
        </div>
      </section>
      <CompareBar />
    </div>
  );
}
