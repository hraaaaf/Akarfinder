import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LightZillowSearchShell } from "@/components/search/LightZillowSearchShell";
import { mockListings } from "@/lib/listings/mock-listings";
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
  const transactionType = normalizeTransactionType(
    pickFirst(params.type) ?? pickFirst(params.transaction_type)
  );
  const city = pickFirst(params.city) ?? "all";
  const mreOnly =
    (pickFirst(params.mre) ?? "").toLowerCase() === "true";

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <SiteHeader />
      <LightZillowSearchShell
        initialListings={mockListings}
        initialFilters={{
          transactionType,
          city,
          mreOnly,
        }}
      />
      <SiteFooter />
    </main>
  );
}
