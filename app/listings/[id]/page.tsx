import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { ListingDetail } from "@/components/listings/ListingDetail";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { queryListingById } from "@/lib/db/index";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
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
  const dbListing = await queryListingById(id);
  const listing = dbListing ? mapDbRowToListing(dbListing) : getListingById(id);

  if (!listing) {
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
}
