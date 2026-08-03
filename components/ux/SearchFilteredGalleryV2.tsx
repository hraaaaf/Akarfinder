import { ChevronDown, MapPin, Search } from "lucide-react";
import type { Listing } from "@/lib/listings/types";
import { ListingCardV2 } from "@/components/ux/ListingCardV2";
import { SearchFiltersV2 } from "@/components/ux/SearchFiltersV2";

export function SearchFilteredGalleryV2({
  listings,
  total,
  query = "",
  city,
  propertyType,
}: {
  listings: Listing[];
  total: number;
  query?: string;
  city?: string;
  propertyType?: string;
}) {
  const visible = listings.filter(
    (listing) => listing.can_show_result !== false && listing.production_allowed !== false,
  );

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#f7f9fc] text-[#0B1F3A]">
      <form action="/search" className="border-b border-[#DCE8F5] bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-wrap gap-2 px-4 py-3 sm:px-6">
          <label className="flex h-12 min-w-[250px] flex-1 items-center gap-3 rounded-xl border border-[#DCE8F5] px-4 shadow-sm focus-within:border-[#0B63CE]">
            <Search size={18} className="text-slate-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Ville, quartier ou type de bien"
              className="w-full bg-transparent text-sm font-semibold outline-none"
            />
          </label>
          <button className="h-12 rounded-xl bg-[#0B63CE] px-7 text-sm font-extrabold text-white transition hover:bg-[#0958B8]">
            Rechercher
          </button>
        </div>
      </form>

      <div className="grid min-h-[calc(100vh-132px)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <SearchFiltersV2 total={total} city={city} propertyType={propertyType} />
        <section className="p-4 sm:p-6">
          <div className="mx-auto max-w-[920px]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-[-.04em]">
                  {total} annonce{total > 1 ? "s" : ""} trouvée{total > 1 ? "s" : ""}
                </h1>
                <button type="button" className="mt-2 flex items-center gap-2 text-sm font-semibold">
                  Tri : Pertinence <ChevronDown size={15} />
                </button>
              </div>
              <span className="hidden items-center gap-1 rounded-full bg-[#EEF6FF] px-4 py-2 text-xs font-extrabold text-[#0B63CE] sm:flex">
                <MapPin size={14} /> Résultats vérifiés
              </span>
            </div>

            {visible.length ? (
              <div className="grid gap-4">
                {visible.map((listing) => (
                  <ListingCardV2 key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h2 className="font-black">Aucun résultat exploitable</h2>
                <p className="mt-2 text-sm text-slate-500">Élargissez les critères.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
