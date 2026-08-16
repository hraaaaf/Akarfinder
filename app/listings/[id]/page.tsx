import { notFound, redirect } from "next/navigation";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import { queryListingById } from "@/lib/db/index";
import type { Listing } from "@/lib/listings/types";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import { buildPublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";
import { queryOwnerListingDetail } from "@/lib/seller/owner-listing-detail";
import { canShowInternalListingDetail } from "@/lib/sources/source-access-registry";

// Owner media uses short-lived signed Storage URLs. Never freeze a listing detail
// response into a static artifact that could outlive those credentials.
export const dynamic = "force-dynamic";

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
  params: Promise<{ id: string }>;
};

function renderListing(listing: Listing, detail: NonNullable<ReturnType<typeof buildPublicPropertyDetailV2>>) {
  return <AnnouncementPageShell listing={listing} detail={detail} />;
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;

  try {
    if (id.startsWith("owner-")) {
      const ownerListing = await queryOwnerListingDetail(id.slice("owner-".length));
      if (!ownerListing) notFound();
      const ownerDetail = buildPublicPropertyDetailV2(ownerListing, {
        source_name: "Propriétaire",
        observed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      if (!ownerDetail) notFound();
      return renderListing(ownerListing, ownerDetail);
    }

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
    return renderListing(listing, detail);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("[listings] unexpected error loading listing:", id, error);
    notFound();
  }
}
