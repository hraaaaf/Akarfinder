import { after } from "next/server";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PropertySelectionProvider } from "@/components/search/PropertySelectionProvider";
import { SearchCompareDock } from "@/components/search/SearchCompareDock";
import { SearchPriceExplorerDock } from "@/components/search/SearchPriceExplorerDock";
import { SearchFilteredGalleryV2 } from "@/components/ux/SearchFilteredGalleryV2";
import { runOdmDualReadShadow } from "@/lib/odm/odm-dual-read-runner";
import { shouldRunOdmDualRead } from "@/lib/odm/odm-dual-read-shadow";
import {
  mapOdmPageToSearchResult,
  shouldServeOdmPublicCanary,
} from "@/lib/odm/odm-public-canary";
import { searchListings, type SearchQuery, type SearchResult } from "@/lib/search";
import {
  buildRawSearchPageQuery,
  buildSearchPageQuery,
  resolveSearchPagination,
} from "@/lib/search/search-page-query";
import { buildSearchStableKey } from "@/lib/search/search-request-query";
import {
  searchPublicRepresentations,
  type PublicSearchPage,
} from "@/lib/search-gateway/public-search-cursor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Rechercher un bien immobilier au Maroc — AkarFinder",
  description:
    "Comparez les résultats immobiliers au Maroc, consultez la source originale et trouvez des repères utiles pour mieux décider.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeTransactionType(raw?: string): string | undefined {
  switch (raw) {
    case "rent":
    case "location":
      return "rent";
    case "new":
    case "neuf":
      return "new";
    case "buy":
    case "sale":
    case "achat":
      return "buy";
    default:
      return undefined;
  }
}

function odmInput(query: SearchQuery) {
  return {
    q: query.q,
    city: query.city,
    propertyType: query.property_type,
    intent: query.transaction_type,
    minPrice: query.min_price,
    maxPrice: query.max_price,
    minSurface: query.min_surface,
    maxSurface: query.max_surface,
    limit: Math.min(query.limit ?? 50, 100),
  };
}

function scheduleOdmDualReadShadow(query: SearchQuery, legacyResult: SearchResult): void {
  // The shadow reader compares one cursor tranche. A numeric page starting
  // after the first result must not emit misleading divergence telemetry.
  if ((query.offset ?? 0) > 0) return;

  const stableKey = buildSearchStableKey(query);
  if (!shouldRunOdmDualRead(stableKey)) return;

  after(async () => {
    await runOdmDualReadShadow({
      stableKey,
      legacyResult,
      odmInput: odmInput(query),
    });
  });
}

async function searchOdmNumericPage(
  publicRequestQuery: SearchQuery,
  perPage: number,
): Promise<SearchResult> {
  const offset = Math.max(0, Math.trunc(publicRequestQuery.offset ?? 0));
  let remainingOffset = offset;
  let totalCount = 0;
  const results: PublicSearchPage["results"] = [];
  let currentPage = await searchPublicRepresentations(odmInput(publicRequestQuery));

  while (results.length < perPage) {
    totalCount = currentPage.total_count;
    if (!currentPage.results.length) break;

    if (remainingOffset >= currentPage.results.length) {
      remainingOffset -= currentPage.results.length;
    } else {
      const start = remainingOffset;
      remainingOffset = 0;
      const needed = perPage - results.length;
      results.push(...currentPage.results.slice(start, start + needed));
    }

    if (results.length >= perPage || !currentPage.has_more || !currentPage.next_cursor) break;

    currentPage = await searchPublicRepresentations({
      ...odmInput(publicRequestQuery),
      cursor: currentPage.next_cursor,
    });
  }

  const odmPage: PublicSearchPage = {
    results,
    results_count: results.length,
    total_count: totalCount,
    has_more: offset + results.length < totalCount,
    next_cursor: null,
  };

  return mapOdmPageToSearchResult(odmPage, publicRequestQuery);
}

async function searchVisibleInitialResult(
  resolvedQuery: SearchQuery,
  publicRequestQuery: SearchQuery,
  perPage: number,
): Promise<SearchResult> {
  const stableKey = buildSearchStableKey(publicRequestQuery);

  if (shouldServeOdmPublicCanary(stableKey)) {
    try {
      return await searchOdmNumericPage(publicRequestQuery, perPage);
    } catch (error) {
      console.warn("[search-page:odm-public-canary:fallback]", error);
      return searchListings(resolvedQuery);
    }
  }

  const legacyResult = await searchListings(resolvedQuery);
  scheduleOdmDualReadShadow(resolvedQuery, legacyResult);
  return legacyResult;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = searchParams ? await searchParams : {};
  const { page, perPage } = resolveSearchPagination(params);
  const publicRequestQuery = buildRawSearchPageQuery(params);
  const resolvedQuery = buildSearchPageQuery(params);
  const initialSearchResult = await searchVisibleInitialResult(
    resolvedQuery,
    publicRequestQuery,
    perPage,
  );
  const paginatedListings = initialSearchResult.listings.slice(0, perPage);
  const city = resolvedQuery.city;
  const propertyType = resolvedQuery.property_type;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="dark" />
      <PropertySelectionProvider>
        <SearchFilteredGalleryV2
          listings={paginatedListings}
          total={initialSearchResult.total}
          query={resolvedQuery.q ?? ""}
          city={city}
          propertyType={propertyType}
          transactionType={normalizeTransactionType(resolvedQuery.transaction_type)}
          minPrice={resolvedQuery.min_price}
          maxPrice={resolvedQuery.max_price}
          minSurface={resolvedQuery.min_surface}
          maxSurface={resolvedQuery.max_surface}
          page={page}
          perPage={perPage}
          insight={<SearchPriceExplorerDock />}
        />
        <SearchCompareDock />
      </PropertySelectionProvider>
      <SiteFooter />
    </main>
  );
}
