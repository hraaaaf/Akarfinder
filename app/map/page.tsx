import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MapExperienceClient } from "@/components/map/MapExperienceClient";
import { geoEnrichedMockListings } from "@/lib/listings/mock-listings";
import type {
  ListingPropertyType,
  ListingTransactionType,
} from "@/lib/listings/types";
import type { MapFilters } from "@/lib/map/listing-map";

export const dynamic = "force-dynamic";

type MapPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeTransactionType(
  raw?: string
): MapFilters["transactionType"] {
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

function normalizePropertyType(raw?: string): MapFilters["propertyType"] {
  if (
    raw === "Appartement" ||
    raw === "Villa" ||
    raw === "Terrain" ||
    raw === "Studio" ||
    raw === "Bureau" ||
    raw === "Maison"
  ) {
    return raw as ListingPropertyType;
  }
  return "all";
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = searchParams ? await searchParams : {};
  const type = normalizeTransactionType(
    pickFirst(params.type) ?? pickFirst(params.transaction_type)
  );
  const propertyType = normalizePropertyType(pickFirst(params.property_type));
  const city = pickFirst(params.city) ?? "all";
  const minReliabilityScore =
    Number(pickFirst(params.minReliabilityScore)) || 50;

  return (
    <main className="flex flex-col" style={{ minHeight: "100svh" }}>
      <SiteHeader />
      <div className="flex-1">
        <MapExperienceClient
          listings={geoEnrichedMockListings}
          initialFilters={{
            city,
            transactionType: type as "all" | ListingTransactionType,
            propertyType,
            maxBudget: pickFirst(params.max_price) ?? "",
            minBudget: pickFirst(params.min_price) ?? "",
            minReliabilityScore,
          }}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
