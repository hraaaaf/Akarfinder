"use client";

// SEARCH-RELOOKING-1 — filtres glass dark premium. Logique INCHANGÉE.
import { useState } from "react";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import type { Listing, ListingFiltersState } from "@/lib/listings/types";

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

  const fieldClass =
    "min-h-11 w-full rounded-xl border border-border/20 dark:border-white/12 bg-surface dark:bg-white/[0.06] px-3.5 text-[13.5px] font-semibold text-foreground dark:text-white outline-none transition placeholder:text-muted-foreground/50 dark:placeholder:text-white/35 hover:border-bronze-400/50 focus:border-bronze-400/70 focus:ring-2 focus:ring-bronze-400/20 lg:w-auto lg:rounded-full";
  const selectClass = `${fieldClass} dark:[color-scheme:dark]`;

  const activeCount =
    (filters.city !== "all" ? 1 : 0) +
    (filters.maxBudget ? 1 : 0) +
    (filters.minSurface ? 1 : 0) +
    (filters.propertyType !== "all" ? 1 : 0) +
    (filters.reliability !== "all" ? 1 : 0) +
    (filters.minReliabilityScore > 0 ? 1 : 0) +
    (filters.mreOnly ? 1 : 0) +
    (filters.packageScore !== "all" ? 1 : 0);

  return (
    <section className="rounded-2xl border border-border/15 dark:border-white/10 bg-card dark:bg-white/[0.05] p-2.5 shadow-[0_18px_50px_rgba(2,10,24,0.18)] dark:shadow-[0_18px_50px_rgba(2,10,24,0.35)] backdrop-blur-md sm:p-3.5">
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <label className="relative block" htmlFor="marketplace-search">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
            <Search size={19} strokeWidth={2.2} />
          </span>
          <input
            id="marketplace-search"
            type="text"
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Ville, quartier, projet, promoteur..."
            className="h-12 w-full rounded-2xl border border-border/20 dark:border-white/12 bg-surface dark:bg-white/[0.06] pl-11 pr-4 text-[15px] font-semibold text-foreground dark:text-white outline-none transition placeholder:text-muted-foreground/50 dark:placeholder:text-white/35 focus:border-bronze-400/70 focus:ring-4 focus:ring-bronze-400/15 sm:h-14"
          />
        </label>

        <div className="grid grid-cols-3 rounded-2xl border border-border/15 dark:border-white/10 bg-surface dark:bg-[#071B33]/70 p-1 lg:min-w-[320px]">
          {transactionTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange({ ...filters, transactionType: tab.value })}
              className={
                filters.transactionType === tab.value
                  ? "rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-3 py-2.5 text-[13px] font-extrabold text-white shadow-sm"
                  : "rounded-xl px-3 py-2.5 text-[13px] font-bold text-foreground/60 transition hover:text-foreground"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          aria-expanded={showFilters}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border/20 dark:border-white/12 bg-surface dark:bg-white/[0.06] px-4 py-2.5 text-[13.5px] font-extrabold text-foreground"
        >
          <SlidersHorizontal size={16} strokeWidth={2.2} aria-hidden="true" />
          Filtres
          {activeCount > 0 ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-bronze-500 px-1 text-[11px] font-extrabold text-white">
              {activeCount}
            </span>
          ) : null}
          <ChevronDown size={14} strokeWidth={2.6} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {activeCount > 0 ? (
          <button type="button" onClick={onReset} className="rounded-full px-3 py-2.5 text-[13px] font-bold text-muted-foreground transition hover:text-foreground">
            Effacer
          </button>
        ) : null}
      </div>

      <div className={`${showFilters ? "grid" : "hidden"} mt-2.5 gap-2 border-t border-border/12 dark:border-white/8 pt-3 sm:grid-cols-2 lg:mt-3 lg:flex lg:flex-wrap lg:items-center lg:gap-2 lg:border-t lg:pt-3`}>
        <select aria-label="Ville" value={filters.city} onChange={(e) => onChange({ ...filters, city: e.target.value, neighborhood: "all" })} className={selectClass}>
          <option value="all">Toutes les villes</option>
          {cities.map((city) => <option key={city} value={city}>{city}</option>)}
        </select>

        <input type="number" aria-label="Budget maximum" value={filters.maxBudget} onChange={(e) => onChange({ ...filters, maxBudget: e.target.value })} placeholder="Budget max" className={`${fieldClass} lg:w-36`} />

        <select aria-label="Type de bien" value={filters.propertyType} onChange={(e) => onChange({ ...filters, propertyType: e.target.value as ListingFiltersState["propertyType"] })} className={selectClass}>
          <option value="all">Type de bien</option>
          {propertyTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>

        <input type="number" aria-label="Surface minimum" value={filters.minSurface} onChange={(e) => onChange({ ...filters, minSurface: e.target.value })} placeholder="Surface min" className={`${fieldClass} lg:w-36`} />

        {/* Phase 1: Reliability filters hidden for external search results */}
        {/* Reserved for first-party / partner-authorized listings only */}
        {/*
        <select aria-label="Fiabilité" value={filters.reliability} onChange={(e) => onChange({ ...filters, reliability: e.target.value as ListingFiltersState["reliability"] })} className={selectClass}>
          <option value="all">Toutes fiabilités</option>
          <option value="top">Très fiable</option>
          <option value="high">Fiable</option>
          <option value="medium">À vérifier</option>
          <option value="low">Faible confiance</option>
        </select>

        <div className="flex min-h-11 flex-col justify-center gap-1 rounded-xl border border-border/20 dark:border-white/12 bg-surface dark:bg-white/[0.06] px-3.5 py-2 sm:col-span-2 lg:min-w-[200px] lg:rounded-full">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-foreground/80">Score min. fiabilité</span>
            <span className="text-[12px] font-extrabold text-bronze-300">{filters.minReliabilityScore === 0 ? "Tous" : `${filters.minReliabilityScore}/100`}</span>
          </div>
          <input type="range" min="0" max="100" step="5" value={filters.minReliabilityScore} onChange={(e) => onChange({ ...filters, minReliabilityScore: Number(e.target.value) })} aria-label="Score minimum de fiabilité" className="h-1.5 w-full cursor-pointer accent-bronze-500" />
        </div>

        <button type="button" onClick={() => onChange({ ...filters, mreOnly: !filters.mreOnly })} aria-pressed={filters.mreOnly}
          className={filters.mreOnly ? "min-h-11 rounded-xl bg-bronze-500/20 px-4 text-[13px] font-extrabold text-bronze-500 dark:text-bronze-300 ring-1 ring-bronze-500/40 lg:rounded-full" : "min-h-11 rounded-xl border border-border/20 dark:border-white/12 bg-surface dark:bg-white/[0.06] px-4 text-[13px] font-bold text-foreground/75 transition hover:border-bronze-400/50 lg:rounded-full"}>
          MRE-friendly
        </button>

        <button type="button" onClick={() => onChange({ ...filters, packageScore: filters.packageScore === "bon" ? "all" : "bon" })} aria-pressed={filters.packageScore === "bon"}
          className={filters.packageScore === "bon" ? "min-h-11 rounded-xl bg-emerald-500/20 px-4 text-[13px] font-extrabold text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/40 lg:rounded-full" : "min-h-11 rounded-xl border border-border/20 dark:border-white/12 bg-surface dark:bg-white/[0.06] px-4 text-[13px] font-bold text-foreground/75 transition hover:border-bronze-400/50 lg:rounded-full"}>
          Bon package
        </button>
        */}

        <button type="button" onClick={onReset} className="hidden min-h-11 rounded-full px-3 text-[13px] font-bold text-muted-foreground transition hover:bg-surface hover:text-foreground lg:ml-auto lg:block">
          Réinitialiser
        </button>
      </div>
    </section>
  );
}
