import { after } from "next/server";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LightZillowSearchShell } from "@/components/search/LightZillowSearchShell";
import { PropertyQuickPreview } from "@/components/search/PropertyQuickPreview";
import { PropertySelectionProvider } from "@/components/search/PropertySelectionProvider";
import { SearchCompareDock } from "@/components/search/SearchCompareDock";
import { SearchPriceExplorerDock } from "@/components/search/SearchPriceExplorerDock";
import { runOdmDualReadShadow } from "@/lib/odm/odm-dual-read-runner";
import { shouldRunOdmDualRead } from "@/lib/odm/odm-dual-read-shadow";
import { searchListings, type SearchQuery, type SearchResult } from "@/lib/search";
import { buildSearchPageQuery } from "@/lib/search/search-page-query";
import type { ListingFiltersState } from "@/lib/listings/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Annonces immobilières au Maroc — AkarFinder",
  description: "Consultez immédiatement les annonces immobilières disponibles au Maroc et affinez les résultats par ville, type, prix et surface.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTransactionType(raw?: string): ListingFiltersState["transactionType"] {
  if (raw === "rent" || raw === "location") return "rent";
  if (raw === "new" || raw === "neuf") return "new";
  if (raw === "buy" || raw === "sale" || raw === "achat") return "buy";
  return "all";
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

function scheduleOdmDualReadShadow(query: SearchQuery, legacyResult: SearchResult): void {
  const stableKey = stableSearchKey(query);
  if (!shouldRunOdmDualRead(stableKey)) return;

  after(async () => {
    await runOdmDualReadShadow({
      stableKey,
      legacyResult,
      odmInput: {
        q: query.q,
        city: query.city,
        propertyType: query.property_type,
        intent: query.transaction_type,
        minPrice: query.min_price,
        maxPrice: query.max_price,
        minSurface: query.min_surface,
        maxSurface: query.max_surface,
        limit: Math.min(query.limit ?? 50, 100),
      },
    });
  });
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = searchParams ? await searchParams : {};
  const resolvedQuery = buildSearchPageQuery(params);
  const initialSearchResult = await searchListings(resolvedQuery);
  scheduleOdmDualReadShadow(resolvedQuery, initialSearchResult);

  const transactionType = normalizeTransactionType(resolvedQuery.transaction_type);
  const city = resolvedQuery.city ?? "all";
  const propertyType = resolvedQuery.property_type ?? "all";
  const minBudget = pickFirst(params.min_price) ?? pickFirst(params.budget_min) ?? "";
  const maxBudget = pickFirst(params.max_price) ?? pickFirst(params.budget_max) ?? "";
  const mreOnly = (pickFirst(params.mre) ?? "").toLowerCase() === "true";
  const search = resolvedQuery.q ?? "";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />
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
    </main>
  );
}
