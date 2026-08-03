import { after } from "next/server";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LightZillowSearchShell } from "@/components/search/LightZillowSearchShell";
import { PropertyQuickPreview } from "@/components/search/PropertyQuickPreview";
import { PropertySelectionProvider } from "@/components/search/PropertySelectionProvider";
import { SearchCompareDock } from "@/components/search/SearchCompareDock";
import { SearchPriceExplorerDock } from "@/components/search/SearchPriceExplorerDock";
import { runOdmDualReadShadow } from "@/lib/odm/odm-dual-read-runner";
import { shouldRunOdmDualRead } from "@/lib/odm/odm-dual-read-shadow";
import {
  mapOdmPageToSearchResult,
  shouldServeOdmPublicCanary,
} from "@/lib/odm/odm-public-canary";
import { searchListings, type SearchQuery, type SearchResult } from "@/lib/search";
import { buildSearchPageQuery } from "@/lib/search/search-page-query";
import { searchPublicRepresentations } from "@/lib/search-gateway/public-search-cursor";
import type { ListingFiltersState } from "@/lib/listings/types";

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

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeTransactionType(raw?: string): ListingFiltersState["transactionType"] {
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
      return "all";
  }
}

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
    limit: Math.min(query.limit ?? 50, 100),
  };
}

function scheduleOdmDualReadShadow(query: SearchQuery, legacyResult: SearchResult): void {
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

async function searchVisibleInitialResult(query: SearchQuery): Promise<SearchResult> {
  const stableKey = stableSearchKey(query);

  if (shouldServeOdmPublicCanary(stableKey)) {
    try {
      const odmPage = await searchPublicRepresentations(odmInput(query));
      return mapOdmPageToSearchResult(odmPage, query);
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
  const transactionType = normalizeTransactionType(resolvedQuery.transaction_type);
  const city = resolvedQuery.city ?? "all";
  const mreOnly = (pickFirst(params.mre) ?? "").toLowerCase() === "true";
  const propertyType = resolvedQuery.property_type ?? "all";
  const minBudget = pickFirst(params.min_price) ?? pickFirst(params.budget_min) ?? "";
  const maxBudget = pickFirst(params.max_price) ?? pickFirst(params.budget_max) ?? "";
  const search = resolvedQuery.q ?? "";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="dark" />
      <PropertySelectionProvider>
        <SearchPriceExplorerDock />
        <SearchCompareDock />
        <PropertyQuickPreview />
        <LightZillowSearchShell
          initialListings={initialSearchResult.listings}
          initialFilters={{
            transactionType,
            city,
            propertyType,
            minBudget,
            maxBudget,
            mreOnly,
            search,
          }}
        />
      </PropertySelectionProvider>
      <SiteFooter />
    </main>
  );
}
