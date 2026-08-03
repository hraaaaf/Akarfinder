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
import { buildSearchPageQuery } from "@/lib/search/search-page-query";
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

function stableSearchKey(query: SearchQuery): string {
  return JSON.stringify({
    q: query.q ?? null,
    city: query.city ?? null,
    property_type: query.property_type ?? null,
    transaction_type: query.transaction_type ?? null,
    min_price: query.min_price ?? null,
    max_price: query.max_price ?? null,
    min_surface: query.min_surface ?? null,
    max_surface: query.max_surface ?? null,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  });
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
    limit: Math.min((query.offset ?? 0) + (query.limit ?? 10), 100),
  };
}

function scheduleOdmDualReadShadow(query: SearchQuery, legacyResult: SearchResult): void {
  // The v1 shadow reader compares one cursor page. Avoid emitting misleading
  // divergence telemetry for a numeric page that starts after the first result.
  if ((query.offset ?? 0) > 0) return;

  const stableKey = stableSearchKey(query);
  if (!shouldRunOdmDualRead(stableKey)) return;

  after(async () => {
    await runOdmDualReadShadow({
      stableKey,
      legacyResult,
      odmInput: odmInput(query),
    });
  });
}

async function searchOdmNumericPage(query: SearchQuery): Promise<SearchResult> {
  const limit = Math.max(1, Math.min(Math.trunc(query.limit ?? 10), 100));
  const offset = Math.max(0, Math.trunc(query.offset ?? 0));
  let remainingOffset = offset;
  let totalCount = 0;
  const results: PublicSearchPage["results"] = [];
  let currentPage = await searchPublicRepresentations(odmInput(query));

  while (results.length < limit) {
    totalCount = currentPage.total_count;
    if (!currentPage.results.length) break;

    const needed = limit - results.length;
    const start = Math.min(remainingOffset, currentPage.results.length);
    remainingOffset = Math.max(0, remainingOffset - currentPage.results.length);

    if (remainingOffset === 0 && start < currentPage.results.length) {
      results.push(...currentPage.results.slice(start, start + needed));
    }

    if (results.length >= limit || !currentPage.has_more || !currentPage.next_cursor) break;

    const nextNeeded = limit - results.length;
    const batchLimit = Math.min(100, Math.max(nextNeeded, remainingOffset + nextNeeded));
    currentPage = await searchPublicRepresentations({
      ...odmInput(query),
      limit: batchLimit,
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

  return mapOdmPageToSearchResult(odmPage, query);
}

async function searchVisibleInitialResult(query: SearchQuery): Promise<SearchResult> {
  const stableKey = stableSearchKey(query);

  if (shouldServeOdmPublicCanary(stableKey)) {
    try {
      return await searchOdmNumericPage(query);
    } catch (error) {
      console.warn("[search-page:odm-public-canary:fallback]", error);
      return searchListings(query);
    }
  }

  const legacyResult = await searchListings(query);
  scheduleOdmDualReadShadow(query, legacyResult);
  return legacyResult;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = searchParams ? await searchParams : {};
  const resolvedQuery = buildSearchPageQuery(params);
  const initialSearchResult = await searchVisibleInitialResult(resolvedQuery);
  const city = resolvedQuery.city;
  const propertyType = resolvedQuery.property_type;
  const perPage = resolvedQuery.limit ?? 10;
  const page = Math.floor((resolvedQuery.offset ?? 0) / perPage) + 1;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="dark" />
      <PropertySelectionProvider>
        <SearchFilteredGalleryV2
          listings={initialSearchResult.listings}
          total={initialSearchResult.total}
          query={resolvedQuery.q ?? ""}
          city={city}
          propertyType={propertyType}
          transactionType={resolvedQuery.transaction_type}
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
