import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { PropertyDetailV2 } from "@/components/listings/PropertyDetailV2";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { queryListingById } from "@/lib/db/index";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import { buildPublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";
import { canShowInternalListingDetail } from "@/lib/sources/source-access-registry";

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
    if (!dbListing) notFound();

    let listing;
    try {
      listing = mapDbRowToListing(dbListing);
    } catch (mapError) {
      console.error("[listings] mapDbRowToListing failed for id:", id, mapError);
      notFound();
    }

    if (!canShowInternalListingDetail(listing.source_name ?? "")) {
      notFound();
    }

    const detail = buildPublicPropertyDetailV2(listing, {
      source_name: dbListing.source_name ?? "",
      observed_at: dbListing.updated_at,
      created_at: dbListing.created_at,
    });

    if (!detail) notFound();

    return (
      <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
        <SiteHeader />
        <Container>
          <PropertyDetailV2 listing={listing} detail={detail} />
        </Container>
        <SiteFooter />
      </main>
    );
  } catch (error) {
    console.error("[listings] unexpected error loading listing:", id, error);
    notFound();
  }
}
