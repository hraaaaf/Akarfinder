import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LightZillowSearchShell } from "@/components/search/LightZillowSearchShell";
import { searchListings } from "@/lib/search";
import { buildSearchPageQuery } from "@/lib/search/search-page-query";
import type { ListingFiltersState } from "@/lib/listings/types";

export const dynamic = "force-dynamic";

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

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = searchParams ? await searchParams : {};
  const initialSearchResult = await searchListings(buildSearchPageQuery(params));
  const transactionType = normalizeTransactionType(
    pickFirst(params.type) ?? pickFirst(params.transaction_type)
  );
  const city = pickFirst(params.city) ?? "all";
  const mreOnly = (pickFirst(params.mre) ?? "").toLowerCase() === "true";

  // SEARCH-RELOOKING-1 — deep-links : property_type + prix min/max depuis l'URL.
  // GOOGLE-LIKE-SEARCH-QA-1 — q param from homepage hero search + budget_max.
  const propertyType = pickFirst(params.property_type) ?? "all";
  const minBudget = pickFirst(params.min_price) ?? pickFirst(params.budget_min) ?? "";
  const maxBudget = pickFirst(params.max_price) ?? pickFirst(params.budget_max) ?? "";
  const search = pickFirst(params.q) ?? "";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="dark" />
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
      <SiteFooter />
    </main>
  );
}
