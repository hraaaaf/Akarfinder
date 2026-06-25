import { ListingCard } from "@/components/listings/ListingCard";
import type { Listing } from "@/lib/listings/types";

type SearchResultsGridProps = {
  listings: Listing[];
};

export function SearchResultsGrid({ listings }: SearchResultsGridProps) {
  if (listings.length === 0) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-navy/16 bg-white p-10 text-center text-stone shadow-[0_18px_60px_rgba(9,28,58,0.05)]">
        Aucun bien ne correspond a ces filtres mock. Essayez une ville differente ou reinitialisez la recherche.
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
