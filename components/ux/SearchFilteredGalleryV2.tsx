import type { ReactNode } from "react";
import { Search } from "lucide-react";
import type { Listing } from "@/lib/listings/types";
import { ListingCardV2 } from "@/components/ux/ListingCardV2";
import { SearchFiltersV2 } from "@/components/ux/SearchFiltersV2";

type SearchGalleryProps = {
  listings: Listing[];
  total: number;
  query?: string;
  city?: string;
  propertyType?: string;
  transactionType?: string;
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  maxSurface?: number;
  insight?: ReactNode;
};

function PreservedFilters({
  city,
  propertyType,
  transactionType,
  minPrice,
  maxPrice,
  minSurface,
  maxSurface,
}: Omit<SearchGalleryProps, "listings" | "total" | "query" | "insight">) {
  return (
    <>
      {city ? <input type="hidden" name="city" value={city} /> : null}
      {propertyType ? <input type="hidden" name="property_type" value={propertyType} /> : null}
      {transactionType ? (
        <input type="hidden" name="transaction_type" value={transactionType} />
      ) : null}
      {minPrice != null ? <input type="hidden" name="min_price" value={minPrice} /> : null}
      {maxPrice != null ? <input type="hidden" name="max_price" value={maxPrice} /> : null}
      {minSurface != null ? <input type="hidden" name="min_surface" value={minSurface} /> : null}
      {maxSurface != null ? <input type="hidden" name="max_surface" value={maxSurface} /> : null}
    </>
  );
}

export function SearchFilteredGalleryV2({
  listings,
  total,
  query = "",
  city,
  propertyType,
  transactionType,
  minPrice,
  maxPrice,
  minSurface,
  maxSurface,
  insight,
}: SearchGalleryProps) {
  const visible = listings.filter(
    (listing) => listing.can_show_result !== false && listing.production_allowed !== false,
  );
  const leadListings = visible.slice(0, 4);
  const remainingListings = visible.slice(4);

  const filterValues = {
    query,
    city,
    propertyType,
    transactionType,
    minPrice,
    maxPrice,
    minSurface,
    maxSurface,
  };

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#f7f9fc] text-[#0B1F3A]">
      <form action="/search" className="border-b border-[#DCE8F5] bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-wrap gap-2 px-4 py-3 sm:px-6">
          <PreservedFilters
            city={city}
            propertyType={propertyType}
            transactionType={transactionType}
            minPrice={minPrice}
            maxPrice={maxPrice}
            minSurface={minSurface}
            maxSurface={maxSurface}
          />
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
        <SearchFiltersV2 total={total} {...filterValues} />

        <section className="p-4 sm:p-6">
          <div className="mx-auto max-w-[920px]">
            <div className="mb-4">
              <h1 className="text-2xl font-black tracking-[-.04em]">
                {total} annonce{total > 1 ? "s" : ""} trouvée{total > 1 ? "s" : ""}
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-600">Tri : Pertinence</p>
            </div>

            {visible.length ? (
              <div className="grid gap-4">
                {leadListings.map((listing) => (
                  <ListingCardV2 key={listing.id} listing={listing} />
                ))}
                {insight ? <div className="my-1">{insight}</div> : null}
                {remainingListings.map((listing) => (
                  <ListingCardV2 key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h2 className="font-black">Aucun résultat exploitable</h2>
                <p className="mt-2 text-sm text-slate-500">Élargissez les critères de recherche.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
