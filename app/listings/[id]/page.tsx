import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { ListingDetail } from "@/components/listings/ListingDetail";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { queryListingById } from "@/lib/db/index";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import { canShowInternalListingDetail } from "@/lib/sources/source-access-registry";
import { getListingById } from "@/lib/listings/utils";

type ListingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { id } = await params;

  try {
    const dbListing = await queryListingById(id);
    let listing;
    try {
      listing = dbListing ? mapDbRowToListing(dbListing) : getListingById(id);
    } catch (mapError) {
      console.error("[listings] mapDbRowToListing failed for id:", id, mapError);
      notFound();
    }

    if (!listing) {
      notFound();
    }

    // LISTING-DETAIL-BOUNDARY-HARDENING-1: only first_party and partner_authorized
    // sources may be served as full internal detail pages.
    if (!canShowInternalListingDetail(listing.source_name ?? "")) {
      notFound();
    }

    return (
      <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
        <SiteHeader />
        <Container>
          <ListingDetail listing={listing} />
        </Container>
        <SiteFooter />
      </main>
    );
  } catch (error) {
    console.error("[listings] unexpected error loading listing:", id, error);
    notFound();
  }
}
