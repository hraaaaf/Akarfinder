import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { PropertyDetailV2 } from "@/components/listings/PropertyDetailV2";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { queryListingById } from "@/lib/db/index";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import { buildPublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";
import { canShowInternalListingDetail } from "@/lib/sources/source-access-registry";

function isSafeHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

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

    // External/indexed offers never get an internal AkarFinder detail page.
    // When a public card still resolves through /listings/:id, preserve the
    // source-original contract by redirecting to the canonical source URL.
    if (!canShowInternalListingDetail(listing.source_name ?? "")) {
      if (listing.original_source_required === true && isSafeHttpUrl(listing.listing_url)) {
        redirect(listing.listing_url);
      }
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
    // Next.js redirect/notFound errors must propagate; only unexpected failures
    // should be converted to a 404.
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("[listings] unexpected error loading listing:", id, error);
    notFound();
  }
}
