import { notFound, redirect } from "next/navigation";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import { queryListingById } from "@/lib/db/index";
import { buildLivingHereForListing } from "@/lib/geo/living-here-service";
import { buildStreetRealityForListing } from "@/lib/geo/street-reality-service";
import type { Listing } from "@/lib/listings/types";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import { buildAkarEstimateHistoryRuntime } from "@/lib/property-detail/akar-estimate-history-runtime";
import { buildMarketComparablesRuntime } from "@/lib/property-detail/market-comparables-runtime";
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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function validProjectId(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw) ? raw : null;
}

async function renderListing(
  listing: Listing,
  detail: NonNullable<ReturnType<typeof buildPublicPropertyDetailV2>>,
  projectId: string | null,
) {
  let livingHere = null;
  let streetReality = null;
  let marketComparables = null;
  let akarEstimateHistory = null;
  try {
    livingHere = await buildLivingHereForListing(listing);
  } catch (error) {
    console.error("[listings] ANN-L6 living-here failed closed for id:", listing.id, error);
  }
  try {
    streetReality = await buildStreetRealityForListing(listing);
  } catch (error) {
    console.error("[listings] ANN-L7 street-reality failed closed for id:", listing.id, error);
  }
  try {
    marketComparables = await buildMarketComparablesRuntime(listing, {
      onError: (error) => console.error("[listings] ANN-L8 market-comparables failed closed for id:", listing.id, error),
    });
  } catch (error) {
    console.error("[listings] ANN-L8 market-comparables orchestration failed closed for id:", listing.id, error);
  }
  try {
    akarEstimateHistory = await buildAkarEstimateHistoryRuntime(listing, {
      onError: (error) => console.error("[listings] ANN-L9 history failed closed for id:", listing.id, error),
    });
  } catch (error) {
    console.error("[listings] ANN-L9 history orchestration failed closed for id:", listing.id, error);
  }
  return (
    <AnnouncementPageShell
      listing={listing}
      detail={detail}
      livingHere={livingHere}
      streetReality={streetReality}
      marketComparables={marketComparables}
      akarEstimateHistory={akarEstimateHistory}
      projectId={projectId}
    />
  );
}

export default async function ListingDetailPage({ params, searchParams }: ListingDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const projectId = validProjectId(resolvedSearchParams.project_id);

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
      return await renderListing(ownerListing, ownerDetail, projectId);
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
    return await renderListing(listing, detail, projectId);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("[listings] unexpected error loading listing:", id, error);
    notFound();
  }
}
