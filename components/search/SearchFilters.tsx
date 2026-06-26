"use client";

import type { Listing, ListingFiltersState } from "@/lib/listings/types";

type SearchFiltersProps = {
  filters: ListingFiltersState;
  cities: string[];
  neighborhoods: string[];
  propertyTypes: Listing["property_type"][];
  onChange: (nextFilters: ListingFiltersState) => void;
  onReset: () => void;
};

const transactionTabs = [
  { value: "all", label: "Tout" },
  { value: "buy", label: "Acheter" },
  { value: "rent", label: "Louer" },
  { value: "new", label: "Neuf" }
] as const;

export function SearchFilters({
  filters,
  cities,
  neighborhoods,
  propertyTypes,
  onChange,
  onReset
}: SearchFiltersProps) {
  return (
    <section className="rounded-[1.8rem] border border-navy/10 bg-white p-5 shadow-[0_18px_60px_rgba(9,28,58,0.07)] sm:p-6">
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#145ee8]">
            Recherche immobilière
          </p>
          <h1 className="mt-2 text-[1.9rem] font-bold tracking-[-0.04em] text-navy sm:text-[2.4rem]">
            Comparez les annonces du Maroc dans une seule interface.
          </h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-stone">
            Annonces analysées depuis plusieurs sources marocaines. Repères indicatifs à confirmer auprès de la source.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-navy">
              Recherche
            </span>
            <input
              type="text"
              value={filters.search}
              onChange={(event) =>
                onChange({ ...filters, search: event.target.value })
              }
              placeholder="Appartement Maarif, villa Marrakech, terrain..."
              className="min-h-[3.5rem] w-full rounded-xl border border-navy/10 bg-[#fbfcff] px-4 text-[15px] outline-none transition focus:border-[#145ee8]"
            />
          </label>

          <div>
            <span className="mb-2 block text-[13px] font-semibold text-navy">
              Transaction
            </span>
            <div className="grid min-h-[3.5rem] grid-cols-4 gap-1 rounded-xl border border-navy/10 bg-[#fbfcff] p-1">
              {transactionTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...filters,
                      transactionType: tab.value
                    })
                  }
                  className={
                    filters.transactionType === tab.value
                      ? "rounded-lg bg-[#145ee8] text-[13px] font-semibold text-white"
                      : "rounded-lg text-[13px] font-medium text-navy/70 transition hover:bg-white"
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-navy">
              Ville
            </span>
            <select
              value={filters.city}
              onChange={(event) =>
                onChange({
                  ...filters,
                  city: event.target.value,
                  neighborhood: "all"
                })
              }
              className="min-h-[3.4rem] w-full rounded-xl border border-navy/10 bg-[#fbfcff] px-4 text-[14px] outline-none"
            >
              <option value="all">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-navy">
              Quartier
            </span>
            <select
              value={filters.neighborhood}
              onChange={(event) =>
                onChange({ ...filters, neighborhood: event.target.value })
              }
              className="min-h-[3.4rem] w-full rounded-xl border border-navy/10 bg-[#fbfcff] px-4 text-[14px] outline-none"
            >
              <option value="all">Tous les quartiers</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood} value={neighborhood}>
                  {neighborhood}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-navy">
              Budget min
            </span>
            <input
              type="number"
              value={filters.minBudget}
              onChange={(event) =>
                onChange({ ...filters, minBudget: event.target.value })
              }
              placeholder="0"
              className="min-h-[3.4rem] w-full rounded-xl border border-navy/10 bg-[#fbfcff] px-4 text-[14px] outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-navy">
              Budget max
            </span>
            <input
              type="number"
              value={filters.maxBudget}
              onChange={(event) =>
                onChange({ ...filters, maxBudget: event.target.value })
              }
              placeholder="3 000 000"
              className="min-h-[3.4rem] w-full rounded-xl border border-navy/10 bg-[#fbfcff] px-4 text-[14px] outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-navy">
              Surface min
            </span>
            <input
              type="number"
              value={filters.minSurface}
              onChange={(event) =>
                onChange({ ...filters, minSurface: event.target.value })
              }
              placeholder="40"
              className="min-h-[3.4rem] w-full rounded-xl border border-navy/10 bg-[#fbfcff] px-4 text-[14px] outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-navy">
              Type de bien
            </span>
            <select
              value={filters.propertyType}
              onChange={(event) =>
                onChange({
                  ...filters,
                  propertyType: event.target.value as ListingFiltersState["propertyType"]
                })
              }
              className="min-h-[3.4rem] w-full rounded-xl border border-navy/10 bg-[#fbfcff] px-4 text-[14px] outline-none"
            >
              <option value="all">Tous les types</option>
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-navy">
              Fiabilite
            </span>
            <select
              value={filters.reliability}
              onChange={(event) =>
                onChange({
                  ...filters,
                  reliability: event.target.value as ListingFiltersState["reliability"]
                })
              }
              className="min-h-[3.4rem] w-full rounded-xl border border-navy/10 bg-[#fbfcff] px-4 text-[14px] outline-none"
            >
              <option value="all">Tous les niveaux</option>
              <option value="high">Fiabilite elevee</option>
              <option value="medium">A verifier</option>
              <option value="review">Doublon possible</option>
            </select>
          </label>

          <label className="flex min-h-[3.4rem] items-center gap-3 rounded-xl border border-navy/10 bg-[#fbfcff] px-4">
            <input
              type="checkbox"
              checked={filters.mreOnly}
              onChange={(event) =>
                onChange({ ...filters, mreOnly: event.target.checked })
              }
              className="h-4 w-4 accent-[#145ee8]"
            />
            <span className="text-[14px] font-semibold text-navy">
              MRE-friendly uniquement
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-navy/12 bg-white px-4 py-2.5 text-[14px] font-semibold text-navy transition hover:bg-[#f5f8fc]"
          >
            Reinitialiser les filtres
          </button>
          <p className="text-[13px] text-stone">
            Repères indicatifs — données à confirmer auprès de la source avant tout engagement.
          </p>
        </div>
      </div>
    </section>
  );
}
