import type { Listing } from "@/lib/listings/types";
import type { ListingEnrichment } from "@/lib/listings/enrichment";
import { PricePositionBlock } from "@/components/price-position/PricePositionBlock";

type MarketReferenceBlockProps = {
  listing: Listing;
  enrichment: ListingEnrichment;
};

export function MarketReferenceBlock({ listing }: MarketReferenceBlockProps) {
  return <PricePositionBlock listing={listing} />;
}
