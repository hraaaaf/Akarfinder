"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

const field =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

type SearchFilterValues = {
  query?: string;
  city?: string;
  propertyType?: string;
  transactionType?: string;
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  maxSurface?: number;
};

function FilterFields({
  query,
  city,
  propertyType,
  transactionType,
  minPrice,
  maxPrice,
  minSurface,
  maxSurface,
}: SearchFilterValues) {
  return (
    <>
      {query ? <input type="hidden" name="q" value={query} /> : null}

      <label className="grid gap-2 text-sm font-extrabold">
        Localisation
        <input
          name="city"
          defaultValue={city ?? ""}
          placeholder="Casablanca"
          className={field}
        />
      </label>

      <div className="grid gap-2">
        <span className="text-sm font-extrabold">Prix (DH)</span>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="min_price"
            inputMode="numeric"
            defaultValue={minPrice ?? ""}
            placeholder="Min"
            className={field}
          />
          <input
            name="max_price"
            inputMode="numeric"
            defaultValue={maxPrice ?? ""}
            placeholder="Max"
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-extrabold">Surface (m²)</span>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="min_surface"
            inputMode="numeric"
            defaultValue={minSurface ?? ""}
            placeholder="Min"
            className={field}
          />
          <input
            name="max_surface"
            inputMode="numeric"
            defaultValue={maxSurface ?? ""}
            placeholder="Max"
            className={field}
          />
        </div>
      </div>

      <label className="grid gap-2 text-sm font-extrabold">
        Type de bien
        <select name="property_type" defaultValue={propertyType ?? ""} className={field}>
          <option value="">Tous les types</option>
          <option value="Appartement">Appartement</option>
          <option value="Villa">Villa</option>
          <option value="Maison">Maison</option>
          <option value="Terrain">Terrain</option>
          <option value="Studio">Studio</option>
          <option value="Bureau">Bureau</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm font-extrabold">
        Transaction
        <select name="transaction_type" defaultValue={transactionType ?? ""} className={field}>
          <option value="">Toutes</option>
          <option value="buy">Acheter</option>
          <option value="rent">Louer</option>
          <option value="new">Neuf</option>
        </select>
      </label>
    </>
  );
}

export function SearchFiltersV2({
  total,
  ...values
}: SearchFilterValues & { total: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="hidden border-r border-slate-200 bg-white p-5 lg:block">
        <form action="/search" className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Filtres</h2>
            <a href="/search" className="text-xs font-extrabold text-blue-700">
              Réinitialiser
            </a>
          </div>
          <FilterFields {...values} />
          <button className="h-11 w-full rounded-xl bg-blue-700 text-sm font-extrabold text-white">
            Voir {total} résultat{total > 1 ? "s" : ""}
          </button>
        </form>
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-extrabold text-white shadow-xl lg:hidden"
      >
        <SlidersHorizontal size={17} />
        Filtres
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/35 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">Filtres</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer les filtres"
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <form action="/search" className="space-y-5">
              <FilterFields {...values} />
              <div className="sticky bottom-0 -mx-5 border-t border-slate-100 bg-white p-5">
                <button className="h-12 w-full rounded-xl bg-blue-700 text-sm font-extrabold text-white">
                  Voir {total} résultat{total > 1 ? "s" : ""}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
