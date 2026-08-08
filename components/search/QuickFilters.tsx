"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
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

const transactionTabs = [
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
      <select
        aria-label="Type de bien"
        value={filters.propertyType}
        onChange={(event) => onChange({ ...filters, propertyType: event.target.value as ListingFiltersState["propertyType"] })}
        className={fieldClass}
      >
        <option value="all">Tous les types</option>
        {allPropertyTypes.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
    </>
  );

  return (
    <section aria-label="Filtres de recherche" className="space-y-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <label className="relative col-span-2 block lg:col-span-1" htmlFor="property-search">
          <Search size={18} strokeWidth={2.2} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="property-search"
            type="search"
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Ville, quartier, résidence ou mot-clé"
            className={`${ui.field} h-11 pl-11 pr-4 text-[14px] font-semibold placeholder:text-muted-foreground/80 sm:h-12 sm:text-[15px]`}
          />
        </label>

        <div role="group" aria-label="Type de transaction" className={`${ui.surfaceMuted} grid min-w-0 grid-cols-3 p-1 lg:min-w-[300px]`}>
          {transactionTabs.map((tab) => {
            const selected = filters.transactionType === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onChange({ ...filters, transactionType: tab.value })}
                aria-pressed={filters.transactionType === tab.value}
                className={selected
                  ? "min-h-10 rounded-xl bg-primary px-2 py-2 text-[12px] font-extrabold text-primary-foreground shadow-sm sm:px-3 sm:text-[12.5px]"
                  : "min-h-10 rounded-xl px-2 py-2 text-[12px] font-bold text-foreground/65 transition hover:bg-card hover:text-foreground sm:px-3 sm:text-[12.5px]"}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((current) => !current)}
          aria-expanded={showFilters}
          aria-controls="advanced-search-filters"
          className={`${ui.secondaryAction} min-h-11 gap-1.5 rounded-full px-3 text-[12.5px] sm:px-4 sm:text-[13px]`}
        >
          <SlidersHorizontal size={16} strokeWidth={2.2} aria-hidden="true" />
          <span className="hidden xs:inline">Filtres</span>
          {activeCount > 0 ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-extrabold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
          <ChevronDown size={14} strokeWidth={2.6} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>

      <div id="advanced-search-filters" className={`${showFilters ? "sm:grid" : "sm:hidden"} hidden gap-2.5 ${ui.surfaceMuted} p-3 sm:grid-cols-2 lg:grid-cols-5`}>
        {advancedFields}
      </div>

      {showFilters ? (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-filters-title">
          <button
            type="button"
            aria-label="Fermer les filtres"
            onClick={() => setShowFilters(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[1.5rem] border-t border-border/20 bg-card px-4 pt-3 shadow-[0_-18px_60px_rgba(2,10,24,0.28)]"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-border-strong" aria-hidden="true" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="mobile-filters-title" className="text-[18px] font-extrabold text-foreground">Affiner la recherche</h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Ville, budget, surface et type de bien.</p>
              </div>
              <button type="button" onClick={() => setShowFilters(false)} aria-label="Fermer" className="grid h-11 w-11 place-items-center rounded-full border border-border/20 bg-surface text-foreground">
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid gap-3">{advancedFields}</div>
            <div className="sticky bottom-0 mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-border/15 bg-card/95 pt-3 backdrop-blur-xl">
              <button type="button" onClick={onReset} className={`${ui.secondaryAction} px-4`}>Effacer</button>
              <button type="button" onClick={() => setShowFilters(false)} className={`${ui.primaryAction} px-4`}>Voir les résultats</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
