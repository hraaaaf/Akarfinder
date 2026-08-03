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
  perPage?: number;
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
  perPage,
}: SearchFilterValues) {
  return (
    <>
      {query ? <input type="hidden" name="q" value={query} /> : null}
      <input type="hidden" name="per_page" value={perPage ?? 10} />

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
          <input name="min_price" inputMode="numeric" defaultValue={minPrice ?? ""} placeholder="Min" className={field} />
          <input name="max_price" inputMode="numeric" defaultValue={maxPrice ?? ""} placeholder="Max" className={field} />
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-extrabold">Surface (m²)</span>
        <div className="grid grid-cols-2 gap-2">
          <input name="min_surface" inputMode="numeric" defaultValue={minSurface ?? ""} placeholder="Min" className={field} />
          <input name="max_surface" inputMode="numeric" defaultValue={maxSurface ?? ""} placeholder="Max" className={field} />
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
          <option value="Riad">Riad</option>
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

export function SearchFiltersV2({ total, ...values }: SearchFilterValues & { total: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="hidden border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 max-h-screen overflow-y-auto p-5">
          <form action="/search" className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-blue-700">Affiner</p>
                <h2 className="mt-1 text-lg font-black">Filtres</h2>
              </div>
              <a href="/search?per_page=10" className="text-xs font-extrabold text-blue-700">Réinitialiser</a>
            </div>
            <FilterFields {...values} />
            <button className="h-11 w-full rounded-xl bg-blue-700 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-800">
              Afficher {new Intl.NumberFormat("fr-FR").format(total)} résultat{total > 1 ? "s" : ""}
            </button>
          </form>
        </div>
      </aside>

      <div className="flex justify-end border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm"
        >
          <SlidersHorizontal size={17} />
          Filtres
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/35 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-blue-700">Affiner les résultats</p>
                <h2 className="mt-1 text-xl font-black">Filtres</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer les filtres" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <form action="/search" className="space-y-5">
              <FilterFields {...values} />
              <div className="sticky bottom-0 -mx-5 border-t border-slate-100 bg-white p-5">
                <button className="h-12 w-full rounded-xl bg-blue-700 text-sm font-extrabold text-white shadow-sm">
                  Afficher {new Intl.NumberFormat("fr-FR").format(total)} résultat{total > 1 ? "s" : ""}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
