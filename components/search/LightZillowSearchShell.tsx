"use client";

// SEARCH-RELOOKING-1 — Shell /search dark premium ("cockpit AkarFinder").
// Logique de recherche/filtres/tri/fetch INCHANGÉE ; thème refondu en dark premium.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Map as MapIcon, SearchX, X, BellPlus, ArrowRight } from "lucide-react";
import { CompareBar } from "@/components/compare/CompareBar";
import { SearchListingCardDark } from "@/components/search/SearchListingCardDark";
import { SearchMapPanel, type CityCount } from "@/components/search/SearchMapPanel";
import { QuickFilters } from "@/components/search/QuickFilters";
import { track } from "@/lib/tracking/track";
import { getCityCoord } from "@/lib/search/city-coords";
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
    propertyType: string;
    maxBudget: string;
    minBudget: string;
    mreOnly: boolean;
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
    <div className="animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="h-[210px] bg-white/10" />
      <div className="space-y-3 p-5">
        <div className="h-6 w-2/3 rounded-full bg-white/10" />
        <div className="h-4 w-1/3 rounded-full bg-white/10" />
        <div className="h-4 w-1/2 rounded-full bg-white/10" />
        <div className="mt-2 h-10 rounded-xl bg-white/10" />
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/5">
        <SearchX size={24} strokeWidth={2} className="text-white/40" aria-hidden="true" />
      </span>
      <p className="mt-4 text-[1.1rem] font-extrabold text-white">Aucune annonce trouvée</p>
      <p className="mt-2 text-[14px] leading-6 text-white/50">Élargissez la ville, le budget ou le type de bien.</p>
      <button type="button" onClick={onReset} className="mt-5 rounded-full bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-2.5 text-[13px] font-extrabold text-white transition hover:from-bronze-600">
        Réinitialiser les filtres
      </button>
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
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>("Liste");
  const [sortBy, setSortBy] = useState<SortBy>("recommended");
  const [listings, setListings] = useState(initialListings);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleSelectCity = (city: string) => {
    track({ event_name: "search_map_pin_click", source_page: "/search", metadata: { city } });
    setFilters((f) => ({ ...f, city: f.city.toLowerCase() === city.toLowerCase() ? "all" : city, neighborhood: "all" }));
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
    if (filters.reliability !== "all") {
      const r: Record<string, string> = { top: "Très fiable", high: "Fiable", medium: "À vérifier", low: "Faible confiance" };
      chips.push({ key: "rel", label: r[filters.reliability] ?? filters.reliability, clear: { reliability: "all" } });
    }
    if (filters.minReliabilityScore > 0) chips.push({ key: "score", label: `Score ≥ ${filters.minReliabilityScore}`, clear: { minReliabilityScore: 0 } });
    if (filters.mreOnly) chips.push({ key: "mre", label: "MRE-friendly", clear: { mreOnly: false } });
    if (filters.packageScore === "bon") chips.push({ key: "pkg", label: "Bon package", clear: { packageScore: "all" } });
    if (filters.maxBudget) chips.push({ key: "budget", label: `Budget max : ${Number(filters.maxBudget).toLocaleString("fr-FR")} DH`, clear: { maxBudget: "" } });
    if (filters.minSurface) chips.push({ key: "surface", label: `Surface ≥ ${filters.minSurface} m²`, clear: { minSurface: "" } });
    return chips;
  }, [filters]);

  const showSkeleton = isLoading && filteredListings.length === 0;

  return (
    <div className="min-h-screen bg-[#061027] text-white">
      {/* Hero + filtres */}
      <section className="relative overflow-hidden border-b border-white/8 bg-deepblue">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 60% at 60% 20%, rgba(34,72,132,0.6) 0%, transparent 62%)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bronze-500/40 to-transparent" />
        <div className="relative mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:py-9">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="h-px w-7 bg-bronze-500/70" aria-hidden="true" />
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400 sm:text-[11px]">Marketplace immobilier AkarFinder</p>
              </div>
              <h1 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.045em] text-white sm:text-[2.7rem]">Trouvez votre bien au Maroc</h1>
              <p className="mt-2 hidden max-w-2xl text-[14.5px] leading-7 text-white/60 sm:block">
                Annonces analysées, repères de lecture et source visible avant de décider.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/75 sm:px-4 sm:py-2 sm:text-[12.5px]">
              {filteredListings.length} bien{filteredListings.length > 1 ? "s" : ""} analysé{filteredListings.length > 1 ? "s" : ""}
            </span>
          </div>

          <QuickFilters filters={filters} cities={cities} propertyTypes={propertyTypes} onChange={handleFilterChange} onReset={handleReset} />
        </div>
      </section>

      {/* Résultats */}
      <section className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:py-6">
        <div className="border-b border-white/8 pb-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[1.05rem] font-extrabold tracking-[-0.02em] text-white sm:text-[1.15rem]">
                {isLoading ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-bronze-400" aria-hidden="true" /> : null}
                <span>{filteredListings.length} bien{filteredListings.length > 1 ? "s" : ""} à {displayCity}</span>
              </p>
              <p className="mt-0.5 line-clamp-1 text-[12.5px] font-medium text-white/45 sm:text-[13.5px]">
                {getIntentLabel(filters.transactionType)} · tri {sortBy === "recommended" ? "recommandé" : sortBy === "reliability" ? "fiabilité" : sortBy === "price-asc" ? "prix ↑" : "prix ↓"}
              </p>
            </div>

            <select aria-label="Trier les résultats" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="shrink-0 rounded-full border border-white/12 bg-white/[0.06] px-3 py-2.5 text-[12px] font-bold text-white outline-none [color-scheme:dark] sm:px-4 sm:text-[13px]">
              <option value="recommended">Tri recommandé</option>
              <option value="reliability">Meilleures annonces</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </div>

          {/* Onglets Liste/Carte sur leur propre rangée mobile — évite de voler
              l'espace du count "X biens à Maroc" */}
          <div className="mt-2.5 flex rounded-full border border-white/12 bg-white/[0.06] p-1 lg:hidden">
            {(["Liste", "Carte"] as ActiveTab[]).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-full py-2 text-[13px] font-extrabold transition ${activeTab === tab ? "bg-gradient-to-br from-bronze-500 to-bronze-700 text-white" : "text-white/55"}`}>
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
                <button type="button" onClick={handleReset} className="rounded-full px-3 py-1.5 text-[12px] font-bold text-white/45 transition hover:text-white">Tout effacer</button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:mt-5 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.62fr)] lg:items-start">
          {/* Liste */}
          <div className={`min-w-0 ${activeTab === "Carte" ? "hidden lg:block" : "block"}`}>
            {showSkeleton ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">{[1, 2, 3, 4].map((n) => <SkeletonCard key={n} />)}</div>
            ) : filteredListings.length === 0 ? (
              <EmptyState onReset={handleReset} />
            ) : (
              <div className={`grid grid-cols-1 gap-5 xl:grid-cols-2 transition-opacity duration-200 ${isLoading ? "opacity-60" : "opacity-100"}`}>
                {filteredListings.map((listing) => <SearchListingCardDark key={listing.id} listing={listing} />)}
              </div>
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

            {/* Sauvegarder ma recherche (→ alertes P18A) */}
            <div className="overflow-hidden rounded-2xl border border-bronze-500/25 bg-gradient-to-br from-bronze-500/[0.14] to-bronze-500/[0.03] backdrop-blur-sm">
              <div className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="inline-grid h-9 w-9 place-items-center rounded-xl bg-bronze-500/20 text-bronze-300 ring-1 ring-bronze-500/30"><BellPlus size={16} strokeWidth={2.2} aria-hidden="true" /></span>
                  <p className="text-[13.5px] font-extrabold text-bronze-100">Sauvegarder ma recherche</p>
                </div>
                <p className="mt-2 text-[12.5px] leading-5 text-white/60">Soyez informé selon disponibilité des annonces correspondant à vos critères.</p>
              </div>
              <div className="border-t border-bronze-500/20 bg-bronze-500/[0.06] px-5 py-3">
                <Link href="/louer#alerte" onClick={() => track({ event_name: "search_save_click", source_page: "/search", intent: filters.transactionType, metadata: { city: filters.city } })}
                  className="flex items-center justify-between text-[13px] font-extrabold text-bronze-300 transition hover:text-bronze-200">
                  Créer une alerte<ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Dossier acheteur/locataire */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm">
              <div className="px-5 py-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-400">Accompagnement</p>
                <p className="mt-1.5 text-[1rem] font-extrabold text-white">Clarifier mon projet</p>
                <p className="mt-1.5 text-[12.5px] leading-5 text-white/55">Budget, zone, type de bien et timing — recevez les biens compatibles.</p>
              </div>
              <div className="border-t border-white/8 px-5 py-3">
                <Link href="/onboarding" className="flex items-center justify-between text-[13px] font-extrabold text-white/85 transition hover:text-white">
                  Créer mon dossier<ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Voir la carte plein écran */}
            <Link href={`/map${filters.city !== "all" ? `?city=${encodeURIComponent(filters.city)}` : ""}`}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[13px] font-extrabold text-white/80 transition hover:border-bronze-500/40 hover:text-white">
              <MapIcon size={15} aria-hidden="true" /> Ouvrir la carte complète
            </Link>
          </div>
        </div>
      </section>
      <CompareBar />
    </div>
  );
}
