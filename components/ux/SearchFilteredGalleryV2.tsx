import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Maximize2,
  Search,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";
import type { Listing } from "@/lib/listings/types";
import { ListingCardV2 } from "@/components/ux/ListingCardV2";
import { SearchFiltersV2 } from "@/components/ux/SearchFiltersV2";
import { SEARCH_PAGE_SIZES } from "@/lib/search/search-page-query";

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
  page: number;
  perPage: number;
  insight?: ReactNode;
};

type SearchLinkValues = Omit<SearchGalleryProps, "listings" | "total" | "insight">;

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function transactionLabel(value?: string) {
  if (value === "buy") return "À acheter";
  if (value === "rent") return "À louer";
  if (value === "new") return "Immobilier neuf";
  return null;
}

function searchHref(values: SearchLinkValues, overrides: Partial<Pick<SearchLinkValues, "page" | "perPage">> = {}) {
  const params = new URLSearchParams();
  const page = overrides.page ?? values.page;
  const perPage = overrides.perPage ?? values.perPage;

  if (values.query) params.set("q", values.query);
  if (values.city) params.set("city", values.city);
  if (values.propertyType) params.set("property_type", values.propertyType);
  if (values.transactionType) params.set("transaction_type", values.transactionType);
  if (values.minPrice != null) params.set("min_price", String(values.minPrice));
  if (values.maxPrice != null) params.set("max_price", String(values.maxPrice));
  if (values.minSurface != null) params.set("min_surface", String(values.minSurface));
  if (values.maxSurface != null) params.set("max_surface", String(values.maxSurface));
  if (page > 1) params.set("page", String(page));
  params.set("per_page", String(perPage));

  return `/search?${params.toString()}`;
}

function paginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages];
}

function PreservedFilters({
  city,
  propertyType,
  transactionType,
  minPrice,
  maxPrice,
  minSurface,
  maxSurface,
  perPage,
}: Omit<SearchGalleryProps, "listings" | "total" | "query" | "page" | "insight">) {
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
      <input type="hidden" name="per_page" value={perPage} />
    </>
  );
}

function ActiveSearchChips(values: SearchLinkValues) {
  const price =
    values.minPrice != null || values.maxPrice != null
      ? `${values.minPrice != null ? formatNumber(values.minPrice) : "0"} — ${
          values.maxPrice != null ? formatNumber(values.maxPrice) : "∞"
        } DH`
      : null;
  const surface =
    values.minSurface != null || values.maxSurface != null
      ? `${values.minSurface ?? 0} — ${values.maxSurface ?? "∞"} m²`
      : null;
  const transaction = transactionLabel(values.transactionType);
  const chips = [
    values.city ? { icon: MapPin, label: values.city } : null,
    values.propertyType ? { icon: Home, label: values.propertyType } : null,
    transaction ? { icon: SlidersHorizontal, label: transaction } : null,
    price ? { icon: WalletCards, label: price } : null,
    surface ? { icon: Maximize2, label: surface } : null,
  ].filter(Boolean) as Array<{ icon: typeof MapPin; label: string }>;

  if (!chips.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {chips.map(({ icon: Icon, label }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-xs font-extrabold text-blue-800"
        >
          <Icon size={13} />
          {label}
        </span>
      ))}
    </div>
  );
}

function SearchPagination({ values, totalPages }: { values: SearchLinkValues; totalPages: number }) {
  if (totalPages <= 1) return null;

  const items = paginationItems(values.page, totalPages);
  const baseClass =
    "grid h-10 min-w-10 place-items-center rounded-xl border px-3 text-sm font-extrabold transition";

  return (
    <nav
      aria-label="Pagination des annonces"
      className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      {values.page > 1 ? (
        <a
          href={searchHref(values, { page: values.page - 1 })}
          rel="prev"
          className={`${baseClass} border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700`}
          aria-label="Page précédente"
        >
          <ChevronLeft size={17} />
          <span className="sr-only">Précédente</span>
        </a>
      ) : (
        <span className={`${baseClass} cursor-not-allowed border-slate-100 text-slate-300`} aria-hidden="true">
          <ChevronLeft size={17} />
        </span>
      )}

      {items.map((item) =>
        typeof item === "number" ? (
          <a
            key={item}
            href={searchHref(values, { page: item })}
            aria-current={item === values.page ? "page" : undefined}
            className={`${baseClass} ${
              item === values.page
                ? "border-blue-700 bg-blue-700 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
            }`}
          >
            {item}
          </a>
        ) : (
          <span key={item} className="px-1 text-slate-400" aria-hidden="true">
            …
          </span>
        ),
      )}

      {values.page < totalPages ? (
        <a
          href={searchHref(values, { page: values.page + 1 })}
          rel="next"
          className={`${baseClass} border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700`}
          aria-label="Page suivante"
        >
          <ChevronRight size={17} />
          <span className="sr-only">Suivante</span>
        </a>
      ) : (
        <span className={`${baseClass} cursor-not-allowed border-slate-100 text-slate-300`} aria-hidden="true">
          <ChevronRight size={17} />
        </span>
      )}
    </nav>
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
  page,
  perPage,
  insight,
}: SearchGalleryProps) {
  const visible = listings.filter(
    (listing) => listing.can_show_result !== false && listing.production_allowed !== false,
  );
  const leadListings = visible.slice(0, 4);
  const remainingListings = visible.slice(4);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = total === 0 ? 0 : Math.min((page - 1) * perPage + visible.length, total);

  const values: SearchLinkValues = {
    query,
    city,
    propertyType,
    transactionType,
    minPrice,
    maxPrice,
    minSurface,
    maxSurface,
    page,
    perPage,
  };

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#f5f8fc] text-[#0B1F3A]">
      <form action="/search" className="border-b border-[#DCE8F5] bg-white shadow-[0_4px_18px_rgba(15,23,42,.03)]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap gap-2 px-4 py-3 sm:px-6">
          <PreservedFilters
            city={city}
            propertyType={propertyType}
            transactionType={transactionType}
            minPrice={minPrice}
            maxPrice={maxPrice}
            minSurface={minSurface}
            maxSurface={maxSurface}
            perPage={perPage}
          />
          <label className="flex h-12 min-w-[250px] flex-1 items-center gap-3 rounded-xl border border-[#DCE8F5] bg-white px-4 shadow-sm focus-within:border-[#0B63CE] focus-within:ring-2 focus-within:ring-blue-100">
            <Search size={18} className="text-slate-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Ville, quartier ou type de bien"
              className="w-full bg-transparent text-sm font-semibold outline-none"
            />
          </label>
          <button className="h-12 rounded-xl bg-[#0B63CE] px-7 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0958B8]">
            Rechercher
          </button>
        </div>
      </form>

      <div className="mx-auto grid max-w-[1280px] min-h-[calc(100vh-132px)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <SearchFiltersV2
          total={total}
          query={query}
          city={city}
          propertyType={propertyType}
          transactionType={transactionType}
          minPrice={minPrice}
          maxPrice={maxPrice}
          minSurface={minSurface}
          maxSurface={maxSurface}
          perPage={perPage}
        />

        <section className="min-w-0 p-4 sm:p-6 lg:p-7">
          <div className="mx-auto max-w-[940px]">
            <header className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,.045)] sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">
                    Résultats AkarFinder
                  </p>
                  <h1 className="mt-2 text-2xl font-black tracking-[-.04em] sm:text-[30px]">
                    {formatNumber(total)} annonce{total > 1 ? "s" : ""} trouvée{total > 1 ? "s" : ""}
                  </h1>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {total > 0
                      ? `Annonces ${formatNumber(rangeStart)} à ${formatNumber(rangeEnd)} · triées par pertinence`
                      : "Aucune annonce correspondant exactement à ces critères"}
                  </p>
                </div>

                <div className="shrink-0">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[.12em] text-slate-400">
                    Annonces par page
                  </p>
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    {SEARCH_PAGE_SIZES.map((size) => (
                      <a
                        key={size}
                        href={searchHref(values, { page: 1, perPage: size })}
                        aria-current={size === perPage ? "true" : undefined}
                        className={`grid h-9 min-w-11 place-items-center rounded-lg px-3 text-xs font-black transition ${
                          size === perPage
                            ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {size}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <ActiveSearchChips {...values} />
            </header>

            {visible.length ? (
              <div className="grid gap-4">
                {leadListings.map((listing, index) => (
                  <ListingCardV2
                    key={listing.id}
                    listing={listing}
                    position={(page - 1) * perPage + index + 1}
                  />
                ))}
                {page === 1 && insight ? <div className="my-1">{insight}</div> : null}
                {remainingListings.map((listing, index) => (
                  <ListingCardV2
                    key={listing.id}
                    listing={listing}
                    position={(page - 1) * perPage + leadListings.length + index + 1}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                <h2 className="font-black">Aucun résultat exploitable</h2>
                <p className="mt-2 text-sm text-slate-500">Élargissez les critères de recherche.</p>
                <a
                  href="/search?per_page=10"
                  className="mt-5 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white"
                >
                  Réinitialiser la recherche
                </a>
              </div>
            )}

            <SearchPagination values={values} totalPages={totalPages} />

            {total > perPage ? (
              <p className="mt-3 text-center text-xs font-semibold text-slate-500">
                Page {page} sur {totalPages} · {formatNumber(total)} annonces au total
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
