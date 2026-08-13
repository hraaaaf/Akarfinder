"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Home, KeyRound, Search, SlidersHorizontal, Tag, X } from "lucide-react";
import { PropertyTypeVisualSelector } from "@/components/property-types/PropertyTypeVisualSelector";
import { ui } from "@/components/ui/design-system";
import type { Listing, ListingFiltersState } from "@/lib/listings/types";
import { OPTION_A_PROPERTY_TYPES } from "@/lib/property-types/presentation";

type QuickFiltersProps = {
  filters: ListingFiltersState;
  cities: string[];
  propertyTypes: Listing["property_type"][];
  onChange: (nextFilters: ListingFiltersState) => void;
  onReset: () => void;
};

const compactTransactionTabs = [
  { value: "all", label: "Tous" },
  { value: "buy", label: "Acheter" },
  { value: "rent", label: "Louer" },
  { value: "new", label: "Neuf" },
] as const;

export function QuickFilters({ filters, cities, propertyTypes, onChange, onReset }: QuickFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!showFilters || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [showFilters]);

  const allPropertyTypes = useMemo(
    () => Array.from(new Set<Listing["property_type"]>([
      ...OPTION_A_PROPERTY_TYPES.map((item) => item.value),
      ...propertyTypes,
    ])),
    [propertyTypes],
  );

  const activeCount =
    (filters.city !== "all" ? 1 : 0) +
    (filters.minBudget ? 1 : 0) +
    (filters.maxBudget ? 1 : 0) +
    (filters.minSurface ? 1 : 0) +
    (filters.propertyType !== "all" ? 1 : 0);

  const fieldClass = `${ui.field} h-11 px-3.5 text-[13px] font-semibold placeholder:text-muted-foreground/80`;

  const advancedFields = (
    <>
      <select aria-label="Ville" value={filters.city} onChange={(event) => onChange({ ...filters, city: event.target.value, neighborhood: "all" })} className={fieldClass}>
        <option value="all">Toutes les villes</option>
        {cities.map((city) => <option key={city} value={city}>{city}</option>)}
      </select>
      <input type="number" min="0" inputMode="numeric" aria-label="Budget minimum" value={filters.minBudget} onChange={(event) => onChange({ ...filters, minBudget: event.target.value })} placeholder="Budget min (DH)" className={fieldClass} />
      <input type="number" min="0" inputMode="numeric" aria-label="Budget maximum" value={filters.maxBudget} onChange={(event) => onChange({ ...filters, maxBudget: event.target.value })} placeholder="Budget max (DH)" className={fieldClass} />
      <input type="number" min="0" inputMode="numeric" aria-label="Surface minimum" value={filters.minSurface} onChange={(event) => onChange({ ...filters, minSurface: event.target.value })} placeholder="Surface min (m²)" className={fieldClass} />
      <select aria-label="Type de bien" value={filters.propertyType} onChange={(event) => onChange({ ...filters, propertyType: event.target.value as ListingFiltersState["propertyType"] })} className={fieldClass}>
        <option value="all">Tous les types</option>
        {allPropertyTypes.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
    </>
  );

  const propertyTypeSelector = (
    <PropertyTypeVisualSelector value={filters.propertyType} onChange={(propertyType) => onChange({ ...filters, propertyType })} showAll ariaLabel="Type de bien" className="min-w-0" />
  );

  const compactTransactionSelector = (
    <div data-search-compact-transaction>
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Transaction</p>
      <div role="group" aria-label="Type de transaction" className={`${ui.surfaceMuted} grid grid-cols-4 !rounded-xl p-1`}>
        {compactTransactionTabs.map((tab) => {
          const selected = filters.transactionType === tab.value;
          return (
            <button key={tab.value} type="button" onClick={() => onChange({ ...filters, transactionType: tab.value })} aria-pressed={selected} className={selected ? "min-h-11 rounded-lg bg-primary-token px-2 py-2 text-[12px] font-extrabold text-primary-token-foreground shadow-sm" : "min-h-11 rounded-lg px-2 py-2 text-[12px] font-bold text-foreground/65 transition hover:bg-card hover:text-foreground"}>
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const setTransaction = (transactionType: ListingFiltersState["transactionType"]) =>
    onChange({ ...filters, transactionType });

  return (
    <section aria-label="Filtres de recherche" data-search-quick-filters data-search-controls-theme="light" data-theme="light" data-premium-searchbar="ux-premium-searchbar-1" data-premium-quickfilters="ux-premium-quickfilters-1" className="space-y-3 text-foreground" style={{ colorScheme: "light" }}>
      <div data-search-primary-filter-row className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <label data-search-primary-search className="relative min-w-0" htmlFor="property-search">
          <Search size={20} strokeWidth={2.15} className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-[#6b7b91]" aria-hidden="true" />
          <input id="property-search" type="search" value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Ville, quartier, résidence ou mot-clé" className="premium-search-input min-w-0" />
        </label>

        <button data-search-filter-trigger type="button" onClick={() => setShowFilters((current) => !current)} aria-expanded={showFilters} aria-controls="advanced-search-filters" aria-label="Ouvrir les filtres" className="premium-filter-trigger">
          <SlidersHorizontal size={19} strokeWidth={2.2} aria-hidden="true" />
          <span className="hidden min-[640px]:inline">Filtres</span>
          {activeCount > 0 ? <span className="premium-filter-count">{activeCount}</span> : null}
        </button>
      </div>

      <div data-premium-quickfilters-row role="group" aria-label="Filtres rapides" className="premium-quickfilters-row">
        <button type="button" data-quickfilter="all" aria-pressed={filters.transactionType === "all"} onClick={() => setTransaction("all")} className="premium-quickfilter-chip">
          <Home size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>Tous</span>
        </button>
        <button type="button" data-quickfilter="buy" aria-pressed={filters.transactionType === "buy"} onClick={() => setTransaction("buy")} className="premium-quickfilter-chip">
          <Tag size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>À vendre</span>
        </button>
        <button type="button" data-quickfilter="rent" aria-pressed={filters.transactionType === "rent"} onClick={() => setTransaction("rent")} className="premium-quickfilter-chip">
          <KeyRound size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>À louer</span>
        </button>
        <button type="button" data-quickfilter="price" aria-expanded={showFilters} onClick={() => setShowFilters(true)} className="premium-quickfilter-chip">
          <span>Prix</span><ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <button type="button" data-quickfilter="filters" aria-expanded={showFilters} onClick={() => setShowFilters(true)} className="premium-quickfilter-chip">
          <span>Filtres</span><ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
          {activeCount > 0 ? <span className="premium-quickfilter-count">{activeCount}</span> : null}
        </button>
      </div>

      <div id="advanced-search-filters" data-search-advanced-filters className={`${showFilters ? "sm:block" : "sm:hidden"} hidden ${ui.surface} p-3`}>
        <div className="mb-3">{compactTransactionSelector}</div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">{advancedFields}</div>
        <div className="mt-3 border-t border-border/15 pt-3">{propertyTypeSelector}</div>
      </div>

      {showFilters ? (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-filters-title">
          <button type="button" aria-label="Fermer les filtres" onClick={() => setShowFilters(false)} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
          <div data-search-mobile-filter-sheet className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[1.5rem] border-t border-border/20 bg-card px-4 pt-3 text-foreground shadow-[0_-18px_60px_rgba(2,10,24,0.28)]" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))", colorScheme: "light" }}>
            <div className="mx-auto h-1.5 w-12 rounded-full bg-border-strong" aria-hidden="true" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div><h2 id="mobile-filters-title" className="text-[18px] font-extrabold text-foreground">Affiner la recherche</h2><p className="mt-0.5 text-[12px] text-muted-foreground">Transaction, ville, budget, surface et type de bien.</p></div>
              <button type="button" onClick={() => setShowFilters(false)} aria-label="Fermer" className="grid h-12 w-12 place-items-center rounded-full border border-border/20 bg-surface text-foreground"><X size={19} aria-hidden="true" /></button>
            </div>
            <div className="mt-4">{compactTransactionSelector}</div>
            <div className="mt-4 grid gap-3">{advancedFields}</div>
            <div className="mt-4 border-t border-border/15 pt-4">{propertyTypeSelector}</div>
            <div className="sticky bottom-0 mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-border/15 bg-card/95 pt-3 backdrop-blur-xl">
              <button type="button" onClick={onReset} className={`${ui.secondaryAction} min-h-12 px-4`}>Effacer</button>
              <button type="button" onClick={() => setShowFilters(false)} className={`${ui.primaryAction} min-h-12 bg-primary-token px-4 text-primary-token-foreground`}>Voir les résultats</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
