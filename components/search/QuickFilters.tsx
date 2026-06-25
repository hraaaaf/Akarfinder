"use client";

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

  const selectClass =
    "min-h-11 w-full rounded-xl border border-[#e2d4b4] bg-white px-3.5 text-[13.5px] font-semibold text-deepblue outline-none transition hover:border-bronze-500 focus:border-bronze-500 focus:ring-2 focus:ring-bronze-500/20 lg:w-auto lg:rounded-full";
  const inputClass =
    "min-h-11 w-full rounded-xl border border-[#e2d4b4] bg-white px-3.5 text-[13.5px] font-semibold text-deepblue outline-none transition placeholder:text-gray-400 hover:border-bronze-500 focus:border-bronze-500 focus:ring-2 focus:ring-bronze-500/20 lg:rounded-full";

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
    <section className="rounded-[1.4rem] border border-[#eadfca] bg-[#fffdf8] p-2.5 shadow-[0_18px_55px_rgba(7,27,51,0.10)] sm:p-3.5">
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <label className="relative block" htmlFor="marketplace-search">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7280]" aria-hidden="true">
            <Search size={19} strokeWidth={2.2} />
          </span>
          <input
            id="marketplace-search"
            type="text"
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Ville, quartier, projet, promoteur..."
            className="h-12 w-full rounded-2xl border border-[#eadfca] bg-white pl-11 pr-4 text-[15px] font-semibold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-bronze-500 focus:ring-4 focus:ring-bronze-500/15 sm:h-14"
          />
        </label>

        <div className="grid grid-cols-3 rounded-2xl bg-deepblue p-1 text-white shadow-[0_12px_24px_rgba(7,27,51,0.20)] lg:min-w-[320px]">
          {transactionTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange({ ...filters, transactionType: tab.value })}
              className={
                filters.transactionType === tab.value
                  ? "rounded-xl bg-white px-3 py-2.5 text-[13px] font-extrabold text-deepblue shadow-sm"
                  : "rounded-xl px-3 py-2.5 text-[13px] font-bold text-white/70 transition hover:text-white"
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
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#e2d4b4] bg-white px-4 py-2.5 text-[13.5px] font-extrabold text-deepblue"
        >
          <SlidersHorizontal size={16} strokeWidth={2.2} aria-hidden="true" />
          Filtres
          {activeCount > 0 ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-bronze-700 px-1 text-[11px] font-extrabold text-white">
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
            className="rounded-full px-3 py-2.5 text-[13px] font-bold text-gray-500 transition hover:text-gray-800"
          >
            Effacer
          </button>
        ) : null}
      </div>

      <div
        className={`${showFilters ? "grid" : "hidden"} mt-2.5 gap-2 border-t border-[#f0e6d2] pt-3 sm:grid-cols-2 lg:mt-3 lg:flex lg:flex-wrap lg:items-center lg:gap-2 lg:border-t lg:pt-3`}
      >
        <select
          aria-label="Ville"
          value={filters.city}
          onChange={(event) => onChange({ ...filters, city: event.target.value, neighborhood: "all" })}
          className={selectClass}
        >
          <option value="all">Toutes les villes</option>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <input
          type="number"
          aria-label="Budget maximum"
          value={filters.maxBudget}
          onChange={(event) => onChange({ ...filters, maxBudget: event.target.value })}
          placeholder="Budget max"
          className={`${inputClass} lg:w-36`}
        />

        <select
          aria-label="Type de bien"
          value={filters.propertyType}
          onChange={(event) => onChange({ ...filters, propertyType: event.target.value as ListingFiltersState["propertyType"] })}
          className={selectClass}
        >
          <option value="all">Type de bien</option>
          {propertyTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <input
          type="number"
          aria-label="Surface minimum"
          value={filters.minSurface}
          onChange={(event) => onChange({ ...filters, minSurface: event.target.value })}
          placeholder="Surface min"
          className={`${inputClass} lg:w-36`}
        />

        <select
          aria-label="Fiabilité"
          value={filters.reliability}
          onChange={(event) => onChange({ ...filters, reliability: event.target.value as ListingFiltersState["reliability"] })}
          className={selectClass}
        >
          <option value="all">Toutes fiabilités</option>
          <option value="top">Très fiable</option>
          <option value="high">Fiable</option>
          <option value="medium">À vérifier</option>
          <option value="low">Faible confiance</option>
        </select>

        <div className="flex min-h-11 flex-col justify-center gap-1 rounded-xl border border-[#e2d4b4] bg-white px-3.5 py-2 sm:col-span-2 lg:min-w-[200px] lg:rounded-full">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-deepblue">Score min. fiabilité</span>
            <span className="text-[12px] font-extrabold text-deepblue">
              {filters.minReliabilityScore === 0 ? "Tous" : `${filters.minReliabilityScore}/100`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={filters.minReliabilityScore}
            onChange={(e) => onChange({ ...filters, minReliabilityScore: Number(e.target.value) })}
            aria-label="Score minimum de fiabilité"
            aria-valuenow={filters.minReliabilityScore}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-full cursor-pointer accent-deepblue"
          />
        </div>

        <button
          type="button"
          onClick={() => onChange({ ...filters, mreOnly: !filters.mreOnly })}
          className={
            filters.mreOnly
              ? "min-h-11 rounded-xl bg-deepblue px-4 text-[13px] font-extrabold text-bronze-400 lg:rounded-full"
              : "min-h-11 rounded-xl border border-[#e2d4b4] bg-white px-4 text-[13px] font-bold text-deepblue transition hover:border-bronze-500 lg:rounded-full"
          }
          aria-pressed={filters.mreOnly}
        >
          MRE-friendly
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...filters, packageScore: filters.packageScore === "bon" ? "all" : "bon" })}
          className={
            filters.packageScore === "bon"
              ? "min-h-11 rounded-xl bg-emerald-700 px-4 text-[13px] font-extrabold text-white lg:rounded-full"
              : "min-h-11 rounded-xl border border-[#e2d4b4] bg-white px-4 text-[13px] font-bold text-deepblue transition hover:border-bronze-500 lg:rounded-full"
          }
          aria-pressed={filters.packageScore === "bon"}
        >
          Bon package
        </button>

        <button
          type="button"
          onClick={onReset}
          className="hidden min-h-11 rounded-full px-3 text-[13px] font-bold text-gray-400 transition hover:bg-white hover:text-gray-700 lg:ml-auto lg:block"
        >
          Réinitialiser
        </button>
      </div>
    </section>
  );
}
