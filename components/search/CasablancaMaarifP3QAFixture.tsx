"use client";

import { PropertySelectionProvider } from "@/components/search/PropertySelectionProvider";
import { SearchListingCardDark } from "@/components/search/SearchListingCardDark";
import type { Listing } from "@/lib/listings/types";

const cases = [
  { index: 1, expected: "casablanca-maarif-signature-v1", type: "Appartement" },
  { index: 2, expected: "casablanca-maarif-immobilier-v1", type: "Appartement" },
  { index: 7, expected: "casablanca-maarif-lifestyle-v1", type: "Villa" },
] as const;

function listing(index: number, propertyType: string): Listing {
  return {
    id: `p3-maarif-${index}`,
    title: `Aperçu contexte Maârif ${index}`,
    city: "Casablanca",
    neighborhood: "Maarif",
    price: 1650000 + index * 75000,
    currency: "DH",
    surface_m2: 95 + index * 4,
    property_type: propertyType,
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    listing_url: `https://example.test/casablanca/maarif/${index}`,
    display_images: { policy: "no_listing_image" },
    production_allowed: true,
    can_show_result: true,
  } as unknown as Listing;
}

export function CasablancaMaarifP3QAFixture() {
  return (
    <PropertySelectionProvider>
      <section data-p3-maarif-grid className="grid grid-cols-2 gap-x-2.5 gap-y-6 lg:grid-cols-3 lg:gap-x-3">
        {cases.map((entry) => (
          <div key={entry.index} data-p3-maarif-card data-expected-visual={entry.expected} className="min-w-0">
            <SearchListingCardDark listing={listing(entry.index, entry.type)} />
          </div>
        ))}
      </section>
    </PropertySelectionProvider>
  );
}
