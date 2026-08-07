import { after } from "next/server";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ActiveProjectBanner } from "@/components/search/ActiveProjectBanner";
import { LightZillowSearchShell } from "@/components/search/LightZillowSearchShell";
import { PropertyQuickPreview } from "@/components/search/PropertyQuickPreview";
import { PropertySelectionProvider } from "@/components/search/PropertySelectionProvider";
import { SearchCompareDock } from "@/components/search/SearchCompareDock";
import { SearchPriceExplorerDock } from "@/components/search/SearchPriceExplorerDock";
import { runOdmDualReadShadow } from "@/lib/odm/odm-dual-read-runner";
import { shouldRunOdmDualRead } from "@/lib/odm/odm-dual-read-shadow";
import {
  buildOdmPublicSearchInput,
  routePublicSearch,
} from "@/lib/odm/odm-public-routing";
import type { SearchQuery, SearchResult } from "@/lib/search";
import {
  buildRawSearchPageQuery,
  buildSearchPageQuery,
} from "@/lib/search/search-page-query";
import { buildSearchStableKey } from "@/lib/search/search-request-query";
import { searchPublicRepresentationsWithOwner } from "@/lib/search-gateway/public-search-with-owner";
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

function scheduleOdmDualReadShadow(query: SearchQuery, legacyResult: SearchResult): void {
  const stableKey = buildSearchStableKey(query);
  if (!shouldRunOdmDualRead(stableKey)) return;

  after(async () => {
    await runOdmDualReadShadow({
      stableKey,
      legacyResult,
      odmInput: buildOdmPublicSearchInput(query),
    });
  });
}

async function searchVisibleInitialResult(
  resolvedQuery: SearchQuery,
  publicRequestQuery: SearchQuery,
): Promise<SearchResult> {
  const stableKey = buildSearchStableKey(publicRequestQuery);
  const routed = await routePublicSearch({
    stableKey,
    publicQuery: publicRequestQuery,
    legacyQuery: resolvedQuery,
    surface: "search_page",
  }, {
    searchOdm: searchPublicRepresentationsWithOwner,
  });

  if (routed.lane === "legacy_primary") {
    scheduleOdmDualReadShadow(resolvedQuery, routed.result);
  }

  return routed.result;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = searchParams ? await searchParams : {};
  const publicRequestQuery = buildRawSearchPageQuery(params);
  const resolvedQuery = buildSearchPageQuery(params);
  const initialSearchResult = await searchVisibleInitialResult(
    resolvedQuery,
    publicRequestQuery,
  );
  const transactionType = normalizeTransactionType(resolvedQuery.transaction_type);
  const city = resolvedQuery.city ?? "all";
  const mreOnly = (pickFirst(params.mre) ?? "").toLowerCase() === "true";
  const propertyType = resolvedQuery.property_type ?? "all";
  const minBudget = pickFirst(params.min_price) ?? pickFirst(params.budget_min) ?? "";
  const maxBudget = pickFirst(params.max_price) ?? pickFirst(params.budget_max) ?? "";
  const search = resolvedQuery.q ?? "";
  const requestedProjectId = pickFirst(params.project_id);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="dark" />
      <ActiveProjectBanner requestedProjectId={requestedProjectId} />
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
