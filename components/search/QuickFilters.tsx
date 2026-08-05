"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { PropertyTypeVisualSelector } from "@/components/property-types/PropertyTypeVisualSelector";
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

  const allPropertyTypes = useMemo(
    () =>
      Array.from(
        new Set<Listing["property_type"]>([
          ...OPTION_A_PROPERTY_TYPES.map((item) => item.value),
          ...propertyTypes,
        ]),
      ),
    [propertyTypes],
  );

  const activeCount =
    (filters.city !== "all" ? 1 : 0) +
    (filters.minBudget ? 1 : 0) +
    (filters.maxBudget ? 1 : 0) +
    (filters.minSurface ? 1 : 0) +
    (filters.propertyType !== "all" ? 1 : 0);

  const fieldClass =
    "h-11 w-full rounded-xl border border-border/20 bg-surface px-3.5 text-[13px] font-semibold text-foreground outline-none transition placeholder:text-muted-foreground hover:border-bronze-400/45 focus:border-bronze-500 focus:ring-2 focus:ring-bronze-500/15 dark:border-white/12 dark:bg-white/[0.055] dark:text-white";

  return (
    <section
      aria-label="Filtres de recherche"
      className="rounded-2xl border border-border/15 bg-card p-3 shadow-[0_18px_55px_rgba(2,10,24,0.12)] dark:border-white/10 dark:bg-white/[0.045] sm:p-4"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <label className="relative block" htmlFor="property-search">
          <Search
            size={19}
            strokeWidth={2.2}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="property-search"
            type="search"
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Ville, quartier, résidence ou mot-clé"
            className="h-12 w-full rounded-2xl border border-border/20 bg-surface pl-11 pr-4 text-[15px] font-semibold text-foreground outline-none transition placeholder:text-muted-foreground focus:border-bronze-500 focus:ring-4 focus:ring-bronze-500/15 dark:border-white/12 dark:bg-white/[0.055] dark:text-white sm:h-14"
          />
        </label>

        <div
          role="group"
          aria-label="Type de transaction"
          className="grid grid-cols-3 rounded-2xl border border-border/15 bg-surface p-1 dark:border-white/10 dark:bg-[#071B33]/70 xl:min-w-[330px]"
        >
          {transactionTabs.map((tab) => {
            const selected = filters.transactionType === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onChange({ ...filters, transactionType: tab.value })}
                aria-pressed={selected}
                className={
                  selected
                    ? "rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-3 py-2.5 text-[13px] font-extrabold text-white shadow-sm"
                    : "rounded-xl px-3 py-2.5 text-[13px] font-bold text-foreground/65 transition hover:bg-card hover:text-foreground dark:text-white/65 dark:hover:bg-white/8 dark:hover:text-white"
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 border-t border-border/12 pt-3 dark:border-white/8">
        <PropertyTypeVisualSelector
          value={filters.propertyType}
          onChange={(propertyType) => onChange({ ...filters, propertyType })}
          showAll
          ariaLabel="Choisir le type de bien"
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilters((current) => !current)}
          aria-expanded={showFilters}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border/20 bg-surface px-4 text-[13px] font-extrabold text-foreground transition hover:border-bronze-500/45 dark:border-white/12 dark:bg-white/[0.055] dark:text-white sm:flex-none"
        >
          <SlidersHorizontal size={16} strokeWidth={2.2} aria-hidden="true" />
          Filtres
          {activeCount > 0 ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-bronze-600 px-1 text-[11px] font-extrabold text-white">
              {activeCount}
            </span>
          ) : null}
          <ChevronDown
            size={14}
            strokeWidth={2.6}
            className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-muted-foreground transition hover:bg-surface hover:text-foreground dark:hover:bg-white/8 dark:hover:text-white"
          >
            <X size={14} aria-hidden="true" />
            Effacer
          </button>
        ) : null}
      </div>

      <div
        className={`${showFilters ? "grid" : "hidden"} mt-3 gap-2.5 rounded-2xl border border-border/12 bg-surface/60 p-3 dark:border-white/8 dark:bg-white/[0.025] sm:grid-cols-2 lg:grid-cols-5`}
      >
        <select
          aria-label="Ville"
          value={filters.city}
          onChange={(event) =>
            onChange({ ...filters, city: event.target.value, neighborhood: "all" })
          }
          className={fieldClass}
        >
          <option value="all">Toutes les villes</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="0"
          inputMode="numeric"
          aria-label="Budget minimum"
          value={filters.minBudget}
          onChange={(event) => onChange({ ...filters, minBudget: event.target.value })}
          placeholder="Budget min (DH)"
          className={fieldClass}
        />

        <input
          type="number"
          min="0"
          inputMode="numeric"
          aria-label="Budget maximum"
          value={filters.maxBudget}
          onChange={(event) => onChange({ ...filters, maxBudget: event.target.value })}
          placeholder="Budget max (DH)"
          className={fieldClass}
        />

        <input
          type="number"
          min="0"
          inputMode="numeric"
          aria-label="Surface minimum"
          value={filters.minSurface}
          onChange={(event) => onChange({ ...filters, minSurface: event.target.value })}
          placeholder="Surface min (m²)"
          className={fieldClass}
        />

        <select
          aria-label="Type de bien"
          value={filters.propertyType}
          onChange={(event) =>
            onChange({
              ...filters,
              propertyType: event.target.value as ListingFiltersState["propertyType"],
            })
          }
          className={fieldClass}
        >
          <option value="all">Tous les types</option>
          {allPropertyTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
